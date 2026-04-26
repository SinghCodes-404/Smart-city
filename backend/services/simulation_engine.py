"""
Simulation Engine — generates realistic waste data for 17 simulated bins.

Runs as an asyncio background task inside FastAPI. Each tick:
  - Increments fill levels using zone-based rates + time-of-day multipliers
  - Generates discrete waste events with weighted random waste types
  - Detects dispatch threshold crossings and queues bins
  - Broadcasts all changes via WebSocket to connected dashboard clients

Phase 3 will replace _run_dispatch() stub with full route optimization + truck movement.
"""

import asyncio
import random
from datetime import datetime
from typing import Optional

from database import SessionLocal
from models import Bin, WasteEvent

# ── Configuration ─────────────────────────────────────────────────────────────

TICK_INTERVAL_SECONDS = 5.0

# Fill % added per tick at 1x speed, per zone
FILL_RATE_PER_TICK: dict[str, tuple[float, float]] = {
    "residential": (0.1, 0.5),
    "commercial":  (0.3, 0.8),
    "industrial":  (0.2, 0.6),
    "university":  (0.1, 0.4),
}

# Probability weights for each waste type per zone
WASTE_DISTRIBUTION: dict[str, dict[str, float]] = {
    "residential": {"paper": 0.65, "battery": 0.10, "plastic": 0.20, "other": 0.05},
    "commercial":  {"paper": 0.50, "battery": 0.05, "plastic": 0.35, "other": 0.10},
    "industrial":  {"paper": 0.20, "battery": 0.30, "plastic": 0.25, "other": 0.25},
    "university":  {"paper": 0.70, "battery": 0.08, "plastic": 0.15, "other": 0.07},
}

# Hour-of-day activity multipliers (start_hour, end_hour_exclusive, multiplier)
TIME_PATTERNS = [
    (8,  11, 1.8),   # morning peak
    (12, 14, 1.5),   # lunch peak
    (17, 20, 1.6),   # evening peak
    (20, 24, 0.4),   # late night
    (0,   6, 0.2),   # deep night
]

DISPATCH_THRESHOLD_PCT = 80.0
COLLECTION_RESET_PCT = 5.0
DISPATCH_BATCH_SIZE = 2     # fire dispatch when this many bins are critical
DISPATCH_TICK_INTERVAL = 30  # also fire dispatch every N ticks if queue non-empty


# ── Helpers ───────────────────────────────────────────────────────────────────

def _time_multiplier() -> float:
    hour = datetime.utcnow().hour
    for start, end, mult in TIME_PATTERNS:
        if start <= hour < end:
            return mult
    return 1.0


def _weighted_choice(weights: dict) -> str:
    return random.choices(list(weights.keys()), weights=list(weights.values()), k=1)[0]


# ── Engine ────────────────────────────────────────────────────────────────────

class SimulationEngine:
    def __init__(self):
        self.running: bool = False
        self.speed_multiplier: float = 1.0
        self.tick_count: int = 0
        # Bins that crossed 80% fill and are waiting for a truck
        self.dispatch_queue: set[str] = set()
        self._task: Optional[asyncio.Task] = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    async def start(self):
        if self.running:
            return
        self.running = True
        self._task = asyncio.create_task(self._loop())
        print(f"[Sim] Started at {self.speed_multiplier}x speed")

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        print("[Sim] Stopped")

    def set_speed(self, multiplier: float):
        self.speed_multiplier = max(0.1, min(100.0, multiplier))
        print(f"[Sim] Speed → {self.speed_multiplier}x")

    def get_status(self) -> dict:
        return {
            "running": self.running,
            "speed_multiplier": self.speed_multiplier,
            "tick_count": self.tick_count,
            "dispatch_queue": sorted(self.dispatch_queue),
            "queued_count": len(self.dispatch_queue),
        }

    # ── Main loop ─────────────────────────────────────────────────────────────

    async def _loop(self):
        while self.running:
            interval = TICK_INTERVAL_SECONDS / self.speed_multiplier
            await asyncio.sleep(interval)
            try:
                await self._tick()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                print(f"[Sim] Tick error: {exc}")

    # ── Tick ──────────────────────────────────────────────────────────────────

    async def _tick(self):
        # Import here to avoid circular import at module load time
        from services.websocket_manager import manager

        self.tick_count += 1
        time_mult = _time_multiplier()

        # Collect all side-effects first; broadcast after DB session closes
        bin_updates: list[dict] = []
        new_events: list[dict] = []
        newly_critical: list[str] = []

        db = SessionLocal()
        try:
            simulated_bins = (
                db.query(Bin)
                .filter(Bin.status == "active", Bin.is_hardware.is_(False))
                .all()
            )

            for b in simulated_bins:
                zone = b.zone
                min_rate, max_rate = FILL_RATE_PER_TICK.get(zone, (0.1, 0.5))
                fill_inc = random.uniform(min_rate, max_rate) * time_mult
                old_fill = b.current_fill_pct
                b.current_fill_pct = min(100.0, b.current_fill_pct + fill_inc)

                # Discrete waste event — probability scales with fill rate
                event_label: Optional[str] = None
                if random.random() < min(0.85, fill_inc * 2.5):
                    dist = WASTE_DISTRIBUTION.get(zone, WASTE_DISTRIBUTION["residential"])
                    event_label = _weighted_choice(dist)
                    confidence = round(random.uniform(0.74, 0.99), 2)
                    ts = datetime.utcnow()
                    db.add(WasteEvent(
                        bin_id=b.id,
                        label=event_label,
                        confidence=confidence,
                        source="simulation",
                        timestamp=ts,
                    ))
                    new_events.append({
                        "bin_id": b.id,
                        "label": event_label,
                        "confidence": confidence,
                        "source": "simulation",
                        "timestamp": ts.isoformat(),
                    })

                bin_updates.append({
                    "bin_id": b.id,
                    "fill_pct": round(b.current_fill_pct, 1),
                    "last_event": event_label,
                })

                # Edge-trigger: only add to queue on the crossing tick
                if (
                    old_fill < DISPATCH_THRESHOLD_PCT
                    and b.current_fill_pct >= DISPATCH_THRESHOLD_PCT
                    and b.id not in self.dispatch_queue
                ):
                    self.dispatch_queue.add(b.id)
                    newly_critical.append(b.id)

            db.commit()
        finally:
            db.close()

        # ── WebSocket broadcasts ───────────────────────────────────────────────

        for evt in new_events:
            await manager.broadcast({"type": "waste_event", "data": evt})

        for upd in bin_updates:
            await manager.broadcast({"type": "bin_update", "data": upd})

        for bin_id in newly_critical:
            print(f"[Sim] {bin_id} crossed {DISPATCH_THRESHOLD_PCT}% → dispatch queue")
            await manager.broadcast({
                "type": "dispatch_alert",
                "data": {
                    "bin_id": bin_id,
                    "reason": "fill_threshold",
                    "threshold_pct": DISPATCH_THRESHOLD_PCT,
                },
            })

        # ── Auto-dispatch trigger ─────────────────────────────────────────────

        should_dispatch = (
            len(self.dispatch_queue) >= DISPATCH_BATCH_SIZE
            or (self.tick_count % DISPATCH_TICK_INTERVAL == 0 and self.dispatch_queue)
        )
        if should_dispatch:
            await self._run_dispatch()

    # ── Dispatch ──────────────────────────────────────────────────────────────

    async def _run_dispatch(self):
        if not self.dispatch_queue:
            return

        pending = sorted(self.dispatch_queue)
        print(f"[Sim] Dispatch trigger — {len(pending)} bins: {pending}")

        from services.fleet_manager import dispatch_pending_bins
        dispatched = await dispatch_pending_bins(pending)

        # Remove bins that were successfully handed to a truck
        for bid in dispatched:
            self.dispatch_queue.discard(bid)


# Singleton — imported by routes/simulation.py and Phase 3 dispatcher
engine = SimulationEngine()
