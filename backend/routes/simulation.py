import random
from datetime import datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel

from services.simulation_engine import engine as sim_engine

router = APIRouter()


class SpeedRequest(BaseModel):
    multiplier: float = 1.0


@router.post("/simulation/start")
async def start_simulation():
    await sim_engine.start()
    return {"status": "ok", **sim_engine.get_status()}


@router.post("/simulation/stop")
async def stop_simulation():
    await sim_engine.stop()
    return {"status": "ok", **sim_engine.get_status()}


@router.post("/simulation/speed")
async def set_speed(req: SpeedRequest):
    sim_engine.set_speed(req.multiplier)
    return {"status": "ok", **sim_engine.get_status()}


@router.get("/simulation/status")
async def simulation_status():
    return sim_engine.get_status()


@router.post("/simulation/demo-reset")
async def demo_reset():
    """
    Stops simulation, wipes and re-seeds the database with bins at
    varied fill levels (some near-critical for an immediate demo payoff),
    then auto-starts the simulation at 1x speed.
    """
    await sim_engine.stop()
    sim_engine.tick_count = 0
    sim_engine.dispatch_queue.clear()

    # Re-seed via seed module logic but with demo-tuned fill levels
    from database import SessionLocal
    from models import Bin, Truck, WasteEvent, DispatchRoute, Collection, YardIntake
    from seed import BINS, TRUCKS, YARD_LAT, YARD_LNG

    db = SessionLocal()
    try:
        db.query(YardIntake).delete()
        db.query(Collection).delete()
        db.query(DispatchRoute).delete()
        db.query(WasteEvent).delete()
        db.query(Bin).delete()
        db.query(Truck).delete()
        db.commit()

        now = datetime.utcnow()

        # Seed bins with demo-friendly fills:
        # hardware bin → 0%, a few bins near-critical, rest spread out
        demo_fills = [0, 82, 78, 55, 45, 63, 0, 38, 71, 29, 42, 35, 66, 51, 74, 68, 43, 57]

        for i, b in enumerate(BINS):
            if b["hw"]:
                fill = 0.0
                last_col = now - timedelta(hours=1)
            else:
                fill = float(demo_fills[i]) if i < len(demo_fills) else random.uniform(20, 70)
                last_col = now - timedelta(hours=random.randint(3, 24))

            db.add(Bin(
                id=b["id"],
                name=b["name"],
                zone=b["zone"],
                latitude=b["lat"],
                longitude=b["lng"],
                capacity_liters=120,
                current_fill_pct=round(fill, 1),
                is_hardware=b["hw"],
                status="active",
                last_collection=last_col,
            ))

        for t in TRUCKS:
            db.add(Truck(
                id=t["id"],
                type=t["type"],
                status="idle",
                current_lat=YARD_LAT,
                current_lng=YARD_LNG,
                capacity_kg=t["capacity_kg"],
                current_load_kg=0.0,
            ))

        db.commit()
    finally:
        db.close()

    # Pre-populate dispatch queue with the already-critical bins
    sim_engine.dispatch_queue = {"BIN-02", "BIN-03"}  # matches demo_fills[1]=82, [2]=78

    await sim_engine.start()
    return {
        "status": "ok",
        "message": "Demo reset complete — simulation started",
        **sim_engine.get_status(),
    }
