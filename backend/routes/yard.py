from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import WasteEvent, YardIntake

router = APIRouter()


@router.get("/yard/today")
def yard_today(db: Session = Depends(get_db)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    intakes = db.query(YardIntake).filter(YardIntake.processed_at >= today_start).all()

    total = sum(i.total_weight_kg for i in intakes)
    ewaste = sum(i.ewaste_kg for i in intakes)
    dry = sum(i.dry_waste_kg for i in intakes)
    landfill = sum(i.landfill_kg for i in intakes)

    return {
        "date": today_start.date().isoformat(),
        "total_weight_kg": round(total, 1),
        "ewaste_kg": round(ewaste, 1),
        "dry_waste_kg": round(dry, 1),
        "landfill_kg": round(landfill, 1),
        "routes_completed": len(intakes),
    }


@router.get("/yard/composition")
def yard_composition(days: int = 7, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(WasteEvent.label, func.count(WasteEvent.id))
        .filter(WasteEvent.timestamp >= since)
        .group_by(WasteEvent.label)
        .all()
    )
    total = sum(count for _, count in rows)
    return {
        "period_days": days,
        "total_events": total,
        "breakdown": [
            {
                "label": label,
                "count": count,
                "pct": round(count / total * 100, 1) if total else 0,
            }
            for label, count in sorted(rows, key=lambda x: -x[1])
        ],
    }


@router.get("/yard/environmental")
def yard_environmental(db: Session = Depends(get_db)):
    intakes = db.query(YardIntake).all()

    total_ewaste = sum(i.ewaste_kg for i in intakes)
    total_dry = sum(i.dry_waste_kg for i in intakes)
    total_landfill = sum(i.landfill_kg for i in intakes)

    # Approximate CO2 offsets: 2.5 kg CO2 / kg e-waste diverted, 0.5 / kg dry recycled
    co2_offset_kg = total_ewaste * 2.5 + total_dry * 0.5

    hazardous_pct = (
        round(total_ewaste / (total_ewaste + total_landfill) * 100, 1)
        if (total_ewaste + total_landfill) > 0
        else 0
    )

    return {
        "total_ewaste_diverted_kg": round(total_ewaste, 1),
        "total_materials_recovered_kg": round(total_dry, 1),
        "total_landfill_kg": round(total_landfill, 1),
        "co2_offset_kg": round(co2_offset_kg, 1),
        "co2_offset_tonnes": round(co2_offset_kg / 1000, 3),
        "hazardous_diverted_pct": hazardous_pct,
    }
