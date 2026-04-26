from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Bin, WasteEvent

router = APIRouter()

# Estimated fill rate per hour by zone (% per hour) for forecast
_FILL_RATE = {
    "commercial": 2.0,
    "industrial": 1.8,
    "residential": 1.2,
    "university": 1.0,
}


@router.get("/analytics/daily")
def daily_analytics(days: int = 7, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(
            func.date(WasteEvent.timestamp).label("date"),
            func.count(WasteEvent.id).label("count"),
        )
        .filter(WasteEvent.timestamp >= since)
        .group_by(func.date(WasteEvent.timestamp))
        .order_by(func.date(WasteEvent.timestamp))
        .all()
    )
    return {
        "days": days,
        "data": [{"date": str(r.date), "count": r.count} for r in rows],
    }


@router.get("/analytics/zones")
def zone_analytics(db: Session = Depends(get_db)):
    bins = db.query(Bin).all()
    zone_map: dict = {}

    for b in bins:
        z = b.zone
        if z not in zone_map:
            zone_map[z] = {"zone": z, "bins": 0, "fills": []}
        zone_map[z]["bins"] += 1
        zone_map[z]["fills"].append(b.current_fill_pct)

    result = []
    for data in zone_map.values():
        avg = sum(data["fills"]) / len(data["fills"]) if data["fills"] else 0
        result.append(
            {
                "zone": data["zone"],
                "bins": data["bins"],
                "avg_fill_pct": round(avg, 1),
            }
        )

    return sorted(result, key=lambda x: -x["avg_fill_pct"])


@router.get("/analytics/forecast")
def fill_forecast(db: Session = Depends(get_db)):
    bins = db.query(Bin).filter(Bin.status == "active").order_by(Bin.id).all()
    result = []
    for b in bins:
        rate = _FILL_RATE.get(b.zone, 1.0)
        hours_to_full = (100 - b.current_fill_pct) / rate if rate > 0 else 999

        result.append(
            {
                "bin_id": b.id,
                "name": b.name,
                "zone": b.zone,
                "current_fill_pct": round(b.current_fill_pct, 1),
                "estimated_hours_to_full": round(hours_to_full, 1),
                "priority": (
                    "high" if b.current_fill_pct >= 70
                    else "medium" if b.current_fill_pct >= 40
                    else "low"
                ),
            }
        )

    return sorted(result, key=lambda x: -x["current_fill_pct"])


@router.get("/analytics/summary")
def analytics_summary(db: Session = Depends(get_db)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_bins = db.query(Bin).count()
    active_bins = db.query(Bin).filter(Bin.status == "active").count()
    avg_fill = db.query(func.avg(Bin.current_fill_pct)).scalar() or 0.0
    critical_bins = db.query(Bin).filter(Bin.current_fill_pct >= 80).count()

    items_today = (
        db.query(WasteEvent)
        .filter(WasteEvent.timestamp >= today_start)
        .count()
    )
    ewaste_today = (
        db.query(WasteEvent)
        .filter(WasteEvent.timestamp >= today_start, WasteEvent.label == "battery")
        .count()
    )

    return {
        "total_bins": total_bins,
        "active_bins": active_bins,
        "avg_fill_pct": round(avg_fill, 1),
        "critical_bins": critical_bins,
        "items_today": items_today,
        "ewaste_today": ewaste_today,
    }
