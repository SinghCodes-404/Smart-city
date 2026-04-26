from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


def _utcnow():
    return datetime.utcnow()


class Bin(Base):
    __tablename__ = "bins"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    zone = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_liters = Column(Integer, default=120)
    current_fill_pct = Column(Float, default=0.0)
    is_hardware = Column(Boolean, default=False)
    status = Column(String, default="active")
    last_collection = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    events = relationship("WasteEvent", back_populates="bin", lazy="dynamic")


class WasteEvent(Base):
    __tablename__ = "waste_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bin_id = Column(String, ForeignKey("bins.id"), nullable=False)
    label = Column(String, nullable=False)
    confidence = Column(Float, default=1.0)
    source = Column(String, default="simulation")
    timestamp = Column(DateTime, default=_utcnow)

    bin = relationship("Bin", back_populates="events")


class Truck(Base):
    __tablename__ = "trucks"

    id = Column(String, primary_key=True)
    type = Column(String, nullable=False)
    status = Column(String, default="idle")
    current_lat = Column(Float)
    current_lng = Column(Float)
    capacity_kg = Column(Float, default=1000.0)
    current_load_kg = Column(Float, default=0.0)

    routes = relationship("DispatchRoute", back_populates="truck", lazy="dynamic")


class DispatchRoute(Base):
    __tablename__ = "dispatch_routes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    truck_id = Column(String, ForeignKey("trucks.id"), nullable=False)
    bin_sequence = Column(Text, nullable=False)  # JSON array of bin_ids
    status = Column(String, default="planned")
    distance_km = Column(Float, default=0.0)
    estimated_time_min = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    truck = relationship("Truck", back_populates="routes")
    collections = relationship("Collection", back_populates="route")


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bin_id = Column(String, ForeignKey("bins.id"), nullable=False)
    truck_id = Column(String, ForeignKey("trucks.id"), nullable=False)
    route_id = Column(Integer, ForeignKey("dispatch_routes.id"), nullable=True)
    waste_type = Column(String, nullable=False)
    weight_kg = Column(Float, default=0.0)
    collected_at = Column(DateTime, default=_utcnow)

    route = relationship("DispatchRoute", back_populates="collections")


class YardIntake(Base):
    __tablename__ = "yard_intake"

    id = Column(Integer, primary_key=True, autoincrement=True)
    route_id = Column(Integer, ForeignKey("dispatch_routes.id"), nullable=True)
    total_weight_kg = Column(Float, default=0.0)
    ewaste_kg = Column(Float, default=0.0)
    dry_waste_kg = Column(Float, default=0.0)
    landfill_kg = Column(Float, default=0.0)
    processed_at = Column(DateTime, default=_utcnow)
