"""
Fleet Manager — truck dispatch, route execution, and collection recording.

dispatch_pending_bins() is called by the simulation engine when the dispatch
queue fires. It:
  1. Classifies bins as e_waste or dry_waste (by recent event composition)
  2. Assigns the most appropriate idle truck per group
  3. Runs nearest-neighbor route optimization
  4. Creates DispatchRoute records and starts asyncio movement tasks

_drive_route() runs as a background asyncio task per dispatched truck:
  yard → bin₁ → bin₂ → … → binₙ → yard
  It writes to DB only at key events (collection, yard return) and broadcasts
  truck_update + bin_update + collection + yard_intake WebSocket messages.
"""

import asyncio
import json
from datetime import datetime
from typing import Optional

from database import SessionLocal
from models import Bin, Collection, DispatchRoute, Truck, WasteEvent, YardIntake
from services.route_optimizer import haversine, optimize_route
from services.websocket_manager import manager

# ── Constants ─────────────────────────────────────────────────────────────────

YARD = (30.6950, 76.7400)       # Dadumajra Waste Yard
CITY_SPEED_KMH = 30.0            # average truck speed in city
POS_UPDATE_INTERVAL_S = 2.0      # real seconds between position broadcasts

# Preferred truck order per waste type — falls back down the list if busy
TRUCK_PREFERENCE: dict[str, list[str]] = {
    "e_waste":   ["TRUCK-B", "TRUCK-C", "TRUCK-A"],
    "dry_waste": ["TRUCK-A", "TRUCK-C", "TRUCK-B"],
}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _classify_bin(bin_id: str, db) -> str:
    """Returns "e_waste" if recent events are battery-heavy, else "dry_waste"."""
    recent = (
        db.query(WasteEvent)
        .filter(WasteEvent.bin_id == bin_id)
        .order_by(WasteEvent.timestamp.desc())
        .limit(10)
        .all()
    )
    if not recent:
        return "dry_waste"
    battery_ratio = sum(1 for e in recent if e.label == "battery") / len(recent)
    return "e_waste" if battery_ratio >= 0.25 else "dry_waste"


def _pick_idle_truck(waste_type: str, db) -> Optional[Truck]:
    """Returns the best available idle truck for the waste type, or None."""
    for tid in TRUCK_PREFERENCE.get(waste_type, ["TRUCK-C"]):
        truck = db.query(Truck).filter(Truck.id == tid, Truck.status == "idle").first()
        if truck:
            return truck
    # All preferred trucks busy — try any idle truck
    return db.query(Truck).filter(Truck.status == "idle").first()


def _estimate_weight(fill_pct: float, capacity_liters: int) -> float:
    """Rough weight estimate: 0.5 kg per litre of fill."""
    return round((fill_pct / 100.0) * capacity_liters * 0.5, 1)


# ── Public dispatch entry point ───────────────────────────────────────────────

async def dispatch_pending_bins(bin_ids: list[str]) -> list[str]:
    """
    Assigns trucks to pending bins, creates DispatchRoute records, and launches
    truck movement coroutines as asyncio background tasks.

    Returns the list of bin_ids that were successfully dispatched (so the
    simulation engine can remove them from its dispatch_queue).
    """
    if not bin_ids:
        return []

    db = SessionLocal()
    dispatched_bin_ids: list[str] = []
    tasks_to_launch: list[dict] = []

    try:
        # Classify each bin
        e_waste_bins = [bid for bid in bin_ids if _classify_bin(bid, db) == "e_waste"]
        dry_waste_bins = [bid for bid in bin_ids if bid not in e_waste_bins]

        for waste_type, group in [("e_waste", e_waste_bins), ("dry_waste", dry_waste_bins)]:
            if not group:
                continue

            truck = _pick_idle_truck(waste_type, db)
            if not truck:
                print(f"[Fleet] No idle truck for {waste_type} — deferring {group}")
                continue

            bins = db.query(Bin).filter(Bin.id.in_(group)).all()
            if not bins:
                continue

            ordered_bins, distance_km, est_min = optimize_route(YARD, bins)
            bin_sequence = [b.id for b in ordered_bins]

            route = DispatchRoute(
                truck_id=truck.id,
                bin_sequence=json.dumps(bin_sequence),
                status="active",
                distance_km=distance_km,
                estimated_time_min=est_min,
                started_at=datetime.utcnow(),
            )
            db.add(route)
            truck.status = "en_route"
            truck.current_load_kg = 0.0
            db.commit()
            db.refresh(route)

            dispatched_bin_ids.extend(bin_sequence)
            tasks_to_launch.append({
                "route_id": route.id,
                "truck_id": truck.id,
                "bins": bin_sequence,
                "distance_km": distance_km,
                "estimated_time_min": est_min,
            })

            print(
                f"[Fleet] {truck.id} → {bin_sequence} | "
                f"{distance_km:.1f}km | ~{est_min}min"
            )

    finally:
        db.close()

    # Broadcast dispatch alerts and launch movement coroutines
    for task in tasks_to_launch:
        await manager.broadcast({
            "type": "dispatch_alert",
            "data": {
                "truck_id": task["truck_id"],
                "bins": task["bins"],
                "reason": "auto_dispatch",
                "distance_km": task["distance_km"],
                "estimated_time_min": task["estimated_time_min"],
            },
        })
        asyncio.create_task(
            _drive_route(task["route_id"], task["truck_id"], task["bins"])
        )

    return dispatched_bin_ids


# ── Truck movement coroutine ──────────────────────────────────────────────────

async def _drive_route(route_id: int, truck_id: str, bin_sequence: list[str]):
    """
    Executes a full collection route as a background asyncio task.
    Reads engine.speed_multiplier dynamically so speed changes take effect mid-route.
    """
    # Late import avoids circular dependency (fleet_manager ↔ simulation_engine)
    from services.simulation_engine import engine

    cur_lat, cur_lng = YARD
    total_kg = ewaste_kg = dry_kg = 0.0

    # ── Drive to each bin and collect ─────────────────────────────────────────
    for bin_id in bin_sequence:
        # Fetch target coordinates
        db = SessionLocal()
        try:
            b = db.query(Bin).filter(Bin.id == bin_id).first()
            tgt_lat, tgt_lng = b.latitude, b.longitude
        finally:
            db.close()

        # Animate travel
        await _animate_to(truck_id, cur_lat, cur_lng, tgt_lat, tgt_lng, "en_route", engine)

        # Collect bin
        db = SessionLocal()
        try:
            b = db.query(Bin).filter(Bin.id == bin_id).first()
            t = db.query(Truck).filter(Truck.id == truck_id).first()

            weight = _estimate_weight(b.current_fill_pct, b.capacity_liters)
            total_kg += weight

            # Determine waste type from recent events for collection record
            recent = (
                db.query(WasteEvent)
                .filter(WasteEvent.bin_id == bin_id)
                .order_by(WasteEvent.timestamp.desc())
                .limit(10)
                .all()
            )
            bat_ratio = (
                sum(1 for e in recent if e.label == "battery") / len(recent)
                if recent else 0
            )
            wtype = "e_waste" if bat_ratio >= 0.25 else "dry_waste"
            if wtype == "e_waste":
                ewaste_kg += weight
            else:
                dry_kg += weight

            db.add(Collection(
                bin_id=bin_id,
                truck_id=truck_id,
                route_id=route_id,
                waste_type=wtype,
                weight_kg=weight,
                collected_at=datetime.utcnow(),
            ))

            b.current_fill_pct = 5.0
            b.last_collection = datetime.utcnow()
            t.current_lat = tgt_lat
            t.current_lng = tgt_lng
            t.current_load_kg = round(t.current_load_kg + weight, 1)
            t.status = "collecting"
            db.commit()
        finally:
            db.close()

        await manager.broadcast({
            "type": "collection",
            "data": {
                "bin_id": bin_id,
                "truck_id": truck_id,
                "fill_reset": 5.0,
                "weight_kg": weight,
            },
        })
        await manager.broadcast({
            "type": "bin_update",
            "data": {"bin_id": bin_id, "fill_pct": 5.0, "last_event": None},
        })

        cur_lat, cur_lng = tgt_lat, tgt_lng

        # Brief dwell at bin (scales with sim speed so it doesn't feel instant)
        await asyncio.sleep(max(0.3, 2.0 / engine.speed_multiplier))

    # ── Return to yard ────────────────────────────────────────────────────────
    await _animate_to(truck_id, cur_lat, cur_lng, YARD[0], YARD[1], "returning", engine)

    # ── Finalize: yard intake + reset truck ───────────────────────────────────
    db = SessionLocal()
    try:
        t = db.query(Truck).filter(Truck.id == truck_id).first()
        route = db.query(DispatchRoute).filter(DispatchRoute.id == route_id).first()

        t.status = "idle"
        t.current_lat = YARD[0]
        t.current_lng = YARD[1]
        t.current_load_kg = 0.0

        route.status = "completed"
        route.completed_at = datetime.utcnow()

        db.add(YardIntake(
            route_id=route_id,
            total_weight_kg=round(total_kg, 1),
            ewaste_kg=round(ewaste_kg, 1),
            dry_waste_kg=round(dry_kg, 1),
            landfill_kg=0.0,
            processed_at=datetime.utcnow(),
        ))
        db.commit()
    finally:
        db.close()

    await manager.broadcast({
        "type": "yard_intake",
        "data": {
            "truck_id": truck_id,
            "total_kg": round(total_kg, 1),
            "ewaste_kg": round(ewaste_kg, 1),
            "dry_waste_kg": round(dry_kg, 1),
        },
    })
    await manager.broadcast({
        "type": "truck_update",
        "data": {"truck_id": truck_id, "status": "idle", "lat": YARD[0], "lng": YARD[1]},
    })

    print(
        f"[Fleet] {truck_id} done. {len(bin_sequence)} bins | "
        f"{total_kg:.1f}kg total | {ewaste_kg:.1f}kg e-waste"
    )


# ── Position animation helper ─────────────────────────────────────────────────

async def _animate_to(
    truck_id: str,
    from_lat: float, from_lng: float,
    to_lat: float, to_lng: float,
    status: str,
    engine,
):
    """
    Interpolates truck position A → B and broadcasts truck_update messages.

    Uses simulated time so speed changes take effect immediately mid-route:
    each real-time sleep of TICK_S advances sim time by TICK_S × speed_multiplier.
    This means setting 20x mid-route instantly speeds up the remaining travel.
    """
    dist_km = haversine(from_lat, from_lng, to_lat, to_lng)
    if dist_km < 0.01:
        # Same location — just broadcast final position
        await manager.broadcast({
            "type": "truck_update",
            "data": {"truck_id": truck_id, "status": status, "lat": to_lat, "lng": to_lng},
        })
        return

    # Total simulated seconds to travel this segment at city speed
    travel_sim_s = (dist_km / CITY_SPEED_KMH) * 3600

    sim_elapsed = 0.0
    while sim_elapsed < travel_sim_s:
        t = sim_elapsed / travel_sim_s
        lat = from_lat + (to_lat - from_lat) * t
        lng = from_lng + (to_lng - from_lng) * t

        await manager.broadcast({
            "type": "truck_update",
            "data": {
                "truck_id": truck_id,
                "status": status,
                "lat": round(lat, 6),
                "lng": round(lng, 6),
            },
        })

        # Adaptive tick: faster speed → smaller real-time steps → smoother animation
        current_speed = engine.speed_multiplier
        tick_s = min(0.5, max(0.05, 0.5 / current_speed))
        await asyncio.sleep(tick_s)
        sim_elapsed += tick_s * current_speed

    # Final broadcast at exact destination
    await manager.broadcast({
        "type": "truck_update",
        "data": {"truck_id": truck_id, "status": status, "lat": to_lat, "lng": to_lng},
    })
