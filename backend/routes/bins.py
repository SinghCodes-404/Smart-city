from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from models import Bin, WasteEvent
from services.websocket_manager import manager

router = APIRouter()

FILL_INCREMENT_PER_ITEM = 3.0   # % added to fill per detected waste item
DISPATCH_THRESHOLD_PCT = 80.0   # auto-dispatch trigger level


class WasteEventIn(BaseModel):
    label: str
    confidence: float = 1.0
    timestamp: Optional[str] = None


def _bin_summary(b: Bin, last_event: Optional[WasteEvent]) -> dict:
    return {
        "id": b.id,
        "name": b.name,
        "zone": b.zone,
        "latitude": b.latitude,
        "longitude": b.longitude,
        "capacity_liters": b.capacity_liters,
        "current_fill_pct": round(b.current_fill_pct, 1),
        "is_hardware": b.is_hardware,
        "status": b.status,
        "last_collection": b.last_collection.isoformat() if b.last_collection else None,
        "last_event": last_event.label if last_event else None,
        "last_event_time": last_event.timestamp.isoformat() if last_event else None,
    }


@router.get("/bins")
def list_bins(db: Session = Depends(get_db)):
    bins = db.query(Bin).order_by(Bin.id).all()
    result = []
    for b in bins:
        last_event = (
            db.query(WasteEvent)
            .filter(WasteEvent.bin_id == b.id)
            .order_by(desc(WasteEvent.timestamp))
            .first()
        )
        result.append(_bin_summary(b, last_event))
    return result


@router.get("/bins/{bin_id}")
def get_bin(bin_id: str, db: Session = Depends(get_db)):
    b = db.query(Bin).filter(Bin.id == bin_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Bin not found")

    recent = (
        db.query(WasteEvent)
        .filter(WasteEvent.bin_id == bin_id)
        .order_by(desc(WasteEvent.timestamp))
        .limit(10)
        .all()
    )

    label_counts: dict = {}
    for e in recent:
        label_counts[e.label] = label_counts.get(e.label, 0) + 1

    return {
        **_bin_summary(b, recent[0] if recent else None),
        "recent_composition": label_counts,
        "recent_events": [
            {
                "id": e.id,
                "label": e.label,
                "confidence": e.confidence,
                "source": e.source,
                "timestamp": e.timestamp.isoformat(),
            }
            for e in recent
        ],
    }


@router.get("/bins/{bin_id}/events")
def get_bin_events(
    bin_id: str, page: int = 1, limit: int = 20, db: Session = Depends(get_db)
):
    if not db.query(Bin).filter(Bin.id == bin_id).first():
        raise HTTPException(status_code=404, detail="Bin not found")

    offset = (page - 1) * limit
    events = (
        db.query(WasteEvent)
        .filter(WasteEvent.bin_id == bin_id)
        .order_by(desc(WasteEvent.timestamp))
        .offset(offset)
        .limit(limit)
        .all()
    )
    total = db.query(WasteEvent).filter(WasteEvent.bin_id == bin_id).count()

    return {
        "bin_id": bin_id,
        "total": total,
        "page": page,
        "limit": limit,
        "events": [
            {
                "id": e.id,
                "label": e.label,
                "confidence": e.confidence,
                "source": e.source,
                "timestamp": e.timestamp.isoformat(),
            }
            for e in events
        ],
    }


@router.post("/bins/{bin_id}/event")
async def record_event(
    bin_id: str, payload: WasteEventIn, db: Session = Depends(get_db)
):
    b = db.query(Bin).filter(Bin.id == bin_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Bin not found")

    ts = datetime.utcnow()
    if payload.timestamp:
        try:
            ts = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            pass

    source = "hardware" if b.is_hardware else "api"
    event = WasteEvent(
        bin_id=bin_id,
        label=payload.label,
        confidence=payload.confidence,
        source=source,
        timestamp=ts,
    )
    db.add(event)

    b.current_fill_pct = min(100.0, b.current_fill_pct + FILL_INCREMENT_PER_ITEM)
    db.commit()
    db.refresh(event)

    # Broadcast waste_event and bin_update to all connected dashboard clients
    await manager.broadcast({
        "type": "waste_event",
        "data": {
            "bin_id": bin_id,
            "label": payload.label,
            "confidence": payload.confidence,
            "source": source,
            "timestamp": ts.isoformat(),
        },
    })
    await manager.broadcast({
        "type": "bin_update",
        "data": {
            "bin_id": bin_id,
            "fill_pct": round(b.current_fill_pct, 1),
            "last_event": payload.label,
        },
    })

    threshold_crossed = b.current_fill_pct >= DISPATCH_THRESHOLD_PCT

    return {
        "status": "ok",
        "bin_id": bin_id,
        "event_id": event.id,
        "fill_pct": round(b.current_fill_pct, 1),
        "threshold_crossed": threshold_crossed,
    }


@router.post("/bins/{bin_id}/collect")
async def collect_bin(bin_id: str, db: Session = Depends(get_db)):
    b = db.query(Bin).filter(Bin.id == bin_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Bin not found")

    old_fill = b.current_fill_pct
    b.current_fill_pct = 5.0
    b.last_collection = datetime.utcnow()
    db.commit()

    await manager.broadcast({
        "type": "collection",
        "data": {
            "bin_id": bin_id,
            "old_fill_pct": round(old_fill, 1),
            "fill_reset": 5.0,
            "collected_at": b.last_collection.isoformat(),
        },
    })

    return {"status": "ok", "bin_id": bin_id, "fill_pct": 5.0}
