from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, SessionLocal
from services.websocket_manager import manager
from routes import bins, fleet, yard, analytics, simulation


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="SmartCity Waste Intelligence API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bins.router, prefix="/api", tags=["bins"])
app.include_router(fleet.router, prefix="/api", tags=["fleet"])
app.include_router(yard.router, prefix="/api", tags=["yard"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(simulation.router, prefix="/api", tags=["simulation"])


@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Server pushes data to client; this keeps the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/api/system/status", tags=["system"])
def system_status():
    from models import Bin, Truck, WasteEvent
    from datetime import datetime

    db = SessionLocal()
    try:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        return {
            "status": "ok",
            "bins_total": db.query(Bin).count(),
            "bins_critical": db.query(Bin).filter(Bin.current_fill_pct >= 80).count(),
            "trucks_total": db.query(Truck).count(),
            "trucks_idle": db.query(Truck).filter(Truck.status == "idle").count(),
            "events_today": db.query(WasteEvent).filter(WasteEvent.timestamp >= today_start).count(),
            "ws_clients": len(manager.active_connections),
        }
    finally:
        db.close()
