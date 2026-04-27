import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Bin, DispatchRoute, Truck

router = APIRouter()


@router.get("/trucks")
def list_trucks(db: Session = Depends(get_db)):
    trucks = db.query(Truck).order_by(Truck.id).all()
    return [
        {
            "id": t.id,
            "type": t.type,
            "status": t.status,
            "current_lat": t.current_lat,
            "current_lng": t.current_lng,
            "capacity_kg": t.capacity_kg,
            "current_load_kg": t.current_load_kg,
        }
        for t in trucks
    ]


@router.get("/dispatch/active")
def active_routes(db: Session = Depends(get_db)):
    routes = (
        db.query(DispatchRoute)
        .filter(DispatchRoute.status.in_(["planned", "active"]))
        .order_by(DispatchRoute.id.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "truck_id": r.truck_id,
            "bin_sequence": json.loads(r.bin_sequence),
            "status": r.status,
            "distance_km": r.distance_km,
            "estimated_time_min": r.estimated_time_min,
            "started_at": r.started_at.isoformat() if r.started_at else None,
        }
        for r in routes
    ]


@router.get("/dispatch/history")
def dispatch_history(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    routes = (
        db.query(DispatchRoute)
        .filter(DispatchRoute.status == "completed")
        .order_by(DispatchRoute.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    total = db.query(DispatchRoute).filter(DispatchRoute.status == "completed").count()
    return {
        "total": total,
        "page": page,
        "routes": [
            {
                "id": r.id,
                "truck_id": r.truck_id,
                "bin_sequence": json.loads(r.bin_sequence),
                "status": r.status,
                "distance_km": r.distance_km,
                "estimated_time_min": r.estimated_time_min,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            }
            for r in routes
        ],
    }


@router.post("/dispatch/trigger")
async def trigger_dispatch(db: Session = Depends(get_db)):
    """
    Manual dispatch: collects all bins at ≥70% fill that aren't already
    assigned to an active route. Used by the 'Dispatch Now' button on the
    Fleet Dispatch page during the demo.
    """
    # Find bins already in an active route
    active_routes = db.query(DispatchRoute).filter(
        DispatchRoute.status.in_(["planned", "active"])
    ).all()
    already_dispatched: set[str] = set()
    for r in active_routes:
        for bid in json.loads(r.bin_sequence):
            already_dispatched.add(bid)

    # Collect all bins above threshold not already dispatched (including hardware bins)
    pending_bins = (
        db.query(Bin)
        .filter(
            Bin.current_fill_pct >= 70.0,
            Bin.status == "active",
            Bin.id.notin_(already_dispatched),
        )
        .order_by(Bin.current_fill_pct.desc())
        .all()
    )

    if not pending_bins:
        return {"status": "nothing_to_dispatch", "bins": []}

    bin_ids = [b.id for b in pending_bins]

    from services.fleet_manager import dispatch_pending_bins
    dispatched = await dispatch_pending_bins(bin_ids)

    # Also update simulation engine's queue
    from services.simulation_engine import engine as sim_engine
    for bid in dispatched:
        sim_engine.dispatch_queue.discard(bid)

    return {
        "status": "ok",
        "dispatched_bins": dispatched,
        "count": len(dispatched),
    }
