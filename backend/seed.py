"""
Run once to initialize the database and seed all bins + trucks.
Safe to re-run: clears existing data first.
"""
import random
from datetime import datetime, timedelta

from database import SessionLocal, init_db
from models import Bin, Truck, WasteEvent, DispatchRoute, Collection, YardIntake

BINS = [
    {"id": "BIN-01", "name": "Sector 9 Park",          "lat": 30.7580, "lng": 76.7870, "zone": "residential", "hw": False},
    {"id": "BIN-02", "name": "Sector 10 Market",        "lat": 30.7550, "lng": 76.7780, "zone": "commercial",  "hw": False},
    {"id": "BIN-03", "name": "Sector 22 Bus Stand",     "lat": 30.7340, "lng": 76.7690, "zone": "commercial",  "hw": False},
    {"id": "BIN-04", "name": "Sector 35 Gate",          "lat": 30.7230, "lng": 76.7560, "zone": "residential", "hw": False},
    {"id": "BIN-05", "name": "Sector 15 Garden",        "lat": 30.7450, "lng": 76.7850, "zone": "residential", "hw": False},
    {"id": "BIN-06", "name": "Sector 26 Grain Mkt",     "lat": 30.7280, "lng": 76.7730, "zone": "industrial",  "hw": False},
    {"id": "BIN-07", "name": "Sector 17 Plaza",         "lat": 30.7410, "lng": 76.7790, "zone": "commercial",  "hw": True},
    {"id": "BIN-08", "name": "Sector 43 Colony",        "lat": 30.7190, "lng": 76.7650, "zone": "residential", "hw": False},
    {"id": "BIN-09", "name": "Sector 20 Crossing",      "lat": 30.7370, "lng": 76.7720, "zone": "commercial",  "hw": False},
    {"id": "BIN-10", "name": "Sector 38 West",          "lat": 30.7250, "lng": 76.7800, "zone": "residential", "hw": False},
    {"id": "BIN-11", "name": "CU Main Gate",            "lat": 30.7700, "lng": 76.5760, "zone": "university",  "hw": False},
    {"id": "BIN-12", "name": "CU Library",              "lat": 30.7710, "lng": 76.5780, "zone": "university",  "hw": False},
    {"id": "BIN-13", "name": "Sector 44 Market",        "lat": 30.7160, "lng": 76.7580, "zone": "commercial",  "hw": False},
    {"id": "BIN-14", "name": "Sector 7 Residential",    "lat": 30.7620, "lng": 76.7900, "zone": "residential", "hw": False},
    {"id": "BIN-15", "name": "Industrial Area Ph-1",    "lat": 30.7100, "lng": 76.7450, "zone": "industrial",  "hw": False},
    {"id": "BIN-16", "name": "Industrial Area Ph-2",    "lat": 30.7050, "lng": 76.7500, "zone": "industrial",  "hw": False},
    {"id": "BIN-17", "name": "Sector 32 Park",          "lat": 30.7300, "lng": 76.7620, "zone": "residential", "hw": False},
    {"id": "BIN-18", "name": "PGI Hospital Road",       "lat": 30.7640, "lng": 76.7760, "zone": "commercial",  "hw": False},
]

TRUCKS = [
    {"id": "TRUCK-A", "type": "dry_waste", "capacity_kg": 1000.0},
    {"id": "TRUCK-B", "type": "e_waste",   "capacity_kg":  500.0},
    {"id": "TRUCK-C", "type": "mixed",     "capacity_kg":  800.0},
]

YARD_LAT = 30.6950
YARD_LNG = 76.7400


def seed():
    init_db()
    db = SessionLocal()
    try:
        # Clear all tables in dependency order
        db.query(YardIntake).delete()
        db.query(Collection).delete()
        db.query(DispatchRoute).delete()
        db.query(WasteEvent).delete()
        db.query(Bin).delete()
        db.query(Truck).delete()
        db.commit()

        now = datetime.utcnow()

        for b in BINS:
            if b["hw"]:
                # Hardware bin starts empty and fresh
                fill = 0.0
                last_col = now - timedelta(hours=1)
            else:
                # Simulated bins start at varied realistic levels for an interesting demo
                fill = random.uniform(15, 72)
                last_col = now - timedelta(hours=random.randint(3, 36))

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
        print(f"✓ Seeded {len(BINS)} bins and {len(TRUCKS)} trucks.")
        print("  BIN-07 (Sector 17 Plaza) = live hardware bin, fill = 0%")
        print("  All trucks start at Dadumajra Waste Yard")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
