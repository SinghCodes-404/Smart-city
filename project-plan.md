# SmartCity Waste Intelligence Platform — Project Plan

**Project:** Real-Time Municipal Waste Segregation Using Edge Computing
**Scope:** Full-stack software platform + hardware integration
**Team:** Gurpreet Singh, Divyanshu Rai, Bhavishay, Moksha Sisodia
**Guide:** Dr. Monika Mehra, Chandigarh University

---

## 1. System Architecture Overview

The platform is a three-tier system:

```
┌──────────────────────────────────────────────────────────┐
│  EDGE LAYER (Hardware)                                   │
│  ESP32-CAM → TinyML inference → Wi-Fi HTTP POST         │
│  NodeMCU ESP8266 → simulated second bin node             │
└──────────────────┬───────────────────────────────────────┘
                   │ HTTP / WebSocket
┌──────────────────▼───────────────────────────────────────┐
│  BACKEND LAYER (Python FastAPI on laptop)                │
│  REST API + WebSocket server + Simulation Engine         │
│  SQLite database + Route optimization logic              │
└──────────────────┬───────────────────────────────────────┘
                   │ WebSocket (real-time) + REST (queries)
┌──────────────────▼───────────────────────────────────────┐
│  FRONTEND LAYER (React + Vite)                           │
│  City Map │ Fleet Dispatch │ Waste Yard │ Analytics      │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** SQLite (via SQLAlchemy ORM) — lightweight, no setup, portable
- **Real-time:** WebSockets (FastAPI native support)
- **Task scheduling:** APScheduler (for simulation ticks)
- **Route optimization:** Custom greedy nearest-neighbor TSP implementation
- **CORS:** FastAPI CORSMiddleware

### Frontend
- **Framework:** React 18 + Vite (fast dev server, instant HMR)
- **Styling:** Tailwind CSS
- **Map:** Leaflet.js + react-leaflet (free, no API key needed)
- **Charts:** Recharts (React-native charting)
- **Real-time:** Native WebSocket API
- **Routing:** React Router v6
- **State:** React Context + useReducer (no Redux needed at this scale)
- **Icons:** Lucide React

### Hardware Communication
- **Protocol:** HTTP POST from ESP32-CAM to FastAPI endpoint
- **Payload:** JSON `{ bin_id, label, confidence, timestamp }`
- **Fallback:** Serial monitor logging if Wi-Fi is unavailable

---

## 3. Database Schema

### Table: `bins`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | e.g. "BIN-07" |
| name | TEXT | e.g. "Sector 17 Market" |
| zone | TEXT | e.g. "Zone A - Residential" |
| latitude | REAL | Map coordinate |
| longitude | REAL | Map coordinate |
| capacity_liters | INT | Max capacity (default 120L) |
| current_fill_pct | REAL | 0.0 to 100.0 |
| is_hardware | BOOL | True for real ESP32-CAM bin |
| status | TEXT | "active" / "maintenance" / "offline" |
| last_collection | DATETIME | Timestamp of last emptying |
| created_at | DATETIME | |

### Table: `waste_events`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK AUTO | |
| bin_id | TEXT FK→bins | Which bin |
| label | TEXT | "battery" / "paper" / "plastic" etc. |
| confidence | REAL | 0.0 to 1.0 |
| source | TEXT | "hardware" / "simulation" |
| timestamp | DATETIME | When detected |

### Table: `trucks`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | e.g. "TRUCK-A" |
| type | TEXT | "dry_waste" / "e_waste" / "mixed" |
| status | TEXT | "idle" / "en_route" / "collecting" / "returning" |
| current_lat | REAL | Current position |
| current_lng | REAL | Current position |
| capacity_kg | REAL | Max load |
| current_load_kg | REAL | Current load |

### Table: `dispatch_routes`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK AUTO | |
| truck_id | TEXT FK→trucks | |
| bin_sequence | TEXT | JSON array of bin_ids in order |
| status | TEXT | "planned" / "active" / "completed" |
| distance_km | REAL | Estimated total distance |
| estimated_time_min | INT | Estimated completion time |
| started_at | DATETIME | |
| completed_at | DATETIME | |

### Table: `collections`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK AUTO | |
| bin_id | TEXT FK→bins | |
| truck_id | TEXT FK→trucks | |
| waste_type | TEXT | |
| weight_kg | REAL | Amount collected |
| collected_at | DATETIME | |

### Table: `yard_intake`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK AUTO | |
| route_id | INT FK→dispatch_routes | |
| total_weight_kg | REAL | |
| ewaste_kg | REAL | |
| dry_waste_kg | REAL | |
| landfill_kg | REAL | |
| processed_at | DATETIME | |

---

## 4. Backend API Design

### 4.1 REST Endpoints

**Bins**
```
GET    /api/bins                  → List all bins with current status
GET    /api/bins/{bin_id}         → Single bin detail
GET    /api/bins/{bin_id}/events  → Waste events for a bin (paginated)
POST   /api/bins/{bin_id}/event   → Record a new waste event (from hardware)
POST   /api/bins/{bin_id}/collect → Mark bin as collected (reset fill)
```

**Fleet**
```
GET    /api/trucks                → List all trucks with status
GET    /api/dispatch/active       → Currently active routes
POST   /api/dispatch/trigger      → Manually trigger dispatch optimization
GET    /api/dispatch/history      → Past routes (paginated)
```

**Yard**
```
GET    /api/yard/today            → Today's intake summary
GET    /api/yard/composition      → Waste composition breakdown
GET    /api/yard/environmental    → CO2 offset, materials recovered
```

**Analytics**
```
GET    /api/analytics/daily?days=7       → Daily volume for last N days
GET    /api/analytics/zones              → Zone-wise breakdown
GET    /api/analytics/forecast           → Fill-level predictions
GET    /api/analytics/summary            → KPI summary cards
```

**System**
```
GET    /api/system/status         → Overall system health
POST   /api/simulation/start      → Start simulation engine
POST   /api/simulation/stop       → Stop simulation engine
POST   /api/simulation/speed      → Set simulation speed multiplier
```

### 4.2 WebSocket Channels

```
ws://localhost:8000/ws/live
```

Server pushes JSON messages to all connected clients:

```json
{ "type": "bin_update",     "data": { "bin_id": "BIN-07", "fill_pct": 62, "last_event": "battery" } }
{ "type": "waste_event",    "data": { "bin_id": "BIN-07", "label": "battery", "confidence": 0.94, "source": "hardware" } }
{ "type": "truck_update",   "data": { "truck_id": "TRUCK-A", "status": "en_route", "lat": 30.74, "lng": 76.78 } }
{ "type": "dispatch_alert", "data": { "truck_id": "TRUCK-A", "bins": ["BIN-04","BIN-03"], "reason": "fill_threshold" } }
{ "type": "collection",     "data": { "bin_id": "BIN-04", "truck_id": "TRUCK-A", "fill_reset": 5 } }
{ "type": "yard_intake",    "data": { "total_kg": 45.2, "ewaste_kg": 8.1 } }
```

### 4.3 Hardware Ingestion Endpoint (for ESP32-CAM)

```
POST /api/bins/{bin_id}/event
Content-Type: application/json

{
  "label": "battery",
  "confidence": 0.94,
  "timestamp": "2026-04-25T14:32:00Z"
}
```

On receiving this:
1. Insert into `waste_events` table with `source = "hardware"`
2. Update `bins.current_fill_pct` (increment by configured amount per item)
3. Broadcast WebSocket message to all clients
4. Check if fill threshold crossed → trigger dispatch if needed

---

## 5. Simulation Engine

The simulation engine generates realistic data for 17 simulated bins (the 18th is real hardware). It runs as a background task in the FastAPI server.

### 5.1 Simulation Parameters

```python
SIMULATION_CONFIG = {
    "tick_interval_seconds": 5,        # How often the sim runs
    "speed_multiplier": 1,             # 1x = real time, 10x = fast demo
    "bins_count": 17,                  # Simulated bins
    "fill_rate_per_tick": {            # % fill increase per tick
        "residential": (0.1, 0.5),     # (min, max) random range
        "commercial":  (0.3, 0.8),
        "industrial":  (0.2, 0.6),
        "university":  (0.1, 0.4),
    },
    "waste_distribution": {            # Probability of each waste type
        "residential": {"paper": 0.65, "battery": 0.10, "plastic": 0.20, "other": 0.05},
        "commercial":  {"paper": 0.50, "battery": 0.05, "plastic": 0.35, "other": 0.10},
        "industrial":  {"paper": 0.20, "battery": 0.30, "plastic": 0.25, "other": 0.25},
        "university":  {"paper": 0.70, "battery": 0.08, "plastic": 0.15, "other": 0.07},
    },
    "dispatch_threshold_pct": 80,      # Auto-dispatch when bin hits this
    "collection_reset_pct": 5,         # Fill level after collection
    "time_patterns": {                 # Hour-of-day activity multipliers
        "morning_peak": (8, 11, 1.8),  # (start_hour, end_hour, multiplier)
        "lunch_peak":   (12, 14, 1.5),
        "evening_peak": (17, 20, 1.6),
        "night_low":    (22, 6, 0.2),
    }
}
```

### 5.2 Simulation Tick Logic (runs every N seconds)

```
FOR each simulated bin:
    1. Determine zone type → get fill_rate range and waste_distribution
    2. Apply time-of-day multiplier based on current simulated hour
    3. Generate random fill increment within range × multiplier
    4. Update bin fill_pct
    5. With probability proportional to fill_rate, generate a waste_event:
       - Pick waste type using weighted random from distribution
       - Insert into waste_events with source="simulation"
       - Broadcast via WebSocket
    6. IF fill_pct >= dispatch_threshold:
       - Check if a truck is already assigned
       - If not, queue bin for next dispatch cycle

EVERY 30 ticks (or when dispatch queue has 2+ bins):
    1. Run route optimization on queued bins
    2. Assign best available truck
    3. Create dispatch_route record
    4. Start truck movement simulation (interpolate lat/lng over time)
    5. Broadcast dispatch_alert via WebSocket

WHEN truck "arrives" at a bin:
    1. Set bin fill_pct = collection_reset_pct
    2. Record collection
    3. Broadcast collection event
    4. Move truck to next bin in route (or return to yard)

WHEN truck completes route (returns to yard):
    1. Calculate total collected weight by waste type
    2. Insert yard_intake record
    3. Update truck status to "idle"
```

### 5.3 Route Optimization Algorithm

We use a greedy nearest-neighbor approach (practical for demo, easy to explain):

```
FUNCTION optimize_route(yard_location, pending_bins):
    current = yard_location
    route = []
    remaining = copy(pending_bins)
    
    WHILE remaining is not empty:
        nearest = find_closest(current, remaining)  # Haversine distance
        route.append(nearest)
        current = nearest.location
        remaining.remove(nearest)
    
    route.append(yard_location)  # Return to yard
    
    total_distance = sum of segment distances
    estimated_time = total_distance / avg_speed_kmh * 60
    
    RETURN route, total_distance, estimated_time
```

For the demo, this is sufficient. If you want to mention improvements in your report, you can reference 2-opt swaps or simulated annealing as future optimizations.

---

## 6. Frontend Structure

### 6.1 Project Structure

```
frontend/
├── src/
│   ├── main.jsx                    # Entry point
│   ├── App.jsx                     # Router + layout
│   ├── context/
│   │   └── AppContext.jsx          # Global state (bins, trucks, events)
│   ├── hooks/
│   │   ├── useWebSocket.js         # WebSocket connection + reconnect
│   │   └── useApi.js               # REST API fetch wrapper
│   ├── pages/
│   │   ├── CityMap.jsx             # Screen 1: Map + bin popups + alerts
│   │   ├── FleetDispatch.jsx       # Screen 2: Truck routes + queue
│   │   ├── WasteYard.jsx           # Screen 3: Processing flow + env stats
│   │   └── Analytics.jsx           # Screen 4: Charts + forecasts
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Navbar.jsx          # Top nav with tabs + system status
│   │   │   └── StatCard.jsx        # Reusable metric card
│   │   ├── Map/
│   │   │   ├── CityMapView.jsx     # Leaflet map wrapper
│   │   │   ├── BinMarker.jsx       # Color-coded bin pin
│   │   │   ├── BinPopup.jsx        # Click popup with stats
│   │   │   └── TruckMarker.jsx     # Moving truck icon
│   │   ├── Fleet/
│   │   │   ├── RouteMap.jsx        # Fleet map with route lines
│   │   │   ├── DispatchQueue.jsx   # Table of active/queued routes
│   │   │   └── TruckCard.jsx       # Individual truck status
│   │   ├── Yard/
│   │   │   ├── ProcessingFlow.jsx  # Sankey-style flow diagram
│   │   │   ├── CompositionChart.jsx# Waste type bar chart
│   │   │   └── EnvironmentCard.jsx # CO2, materials, hazardous stats
│   │   ├── Analytics/
│   │   │   ├── DailyVolumeChart.jsx# Bar chart of daily waste
│   │   │   ├── ZoneBreakdown.jsx   # Zone-wise table
│   │   │   └── ForecastChart.jsx   # Predictive fill bars
│   │   └── common/
│   │       ├── AlertBanner.jsx     # Dismissable alert
│   │       ├── StatusPill.jsx      # Color-coded status badge
│   │       └── ProgressBar.jsx     # Fill level bar
│   └── utils/
│       ├── constants.js            # API URLs, map defaults, thresholds
│       └── formatters.js           # Date, number, percentage formatters
├── public/
│   └── favicon.svg
├── index.html
├── tailwind.config.js
├── vite.config.js
└── package.json
```

### 6.2 Key Frontend Behaviors

**WebSocket Connection (`useWebSocket.js`)**
- Connect on app mount
- Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)
- Parse incoming messages and dispatch to global state
- Connection status indicator in Navbar ("Connected" / "Reconnecting...")

**Global State (`AppContext.jsx`)**
- `bins[]` — all bin objects with current fill, last event, zone
- `trucks[]` — all trucks with status, position, current route
- `events[]` — rolling buffer of last 50 waste events (for live feed)
- `alerts[]` — active alerts (dispatch triggers, threshold warnings)
- `yardStats` — today's processing summary
- Reducer handles WebSocket message types and REST responses

**City Map Page**
- Leaflet map centered on Chandigarh (30.7333° N, 76.7794° E), zoom 13
- Custom markers using Leaflet DivIcon (colored pins matching our design)
- Bin #07 gets a special pulsing blue marker (live hardware indicator)
- Click marker → popup with fill level, composition, last collection, live/sim badge
- Alert banner below map for threshold crossings and forecasts
- Auto-pan to bin on alert click

**Fleet Dispatch Page**
- Same Leaflet map but zoomed to show active routes only
- Polyline overlays for each active route (dashed, color-coded by waste type)
- Truck markers that interpolate position along route over time
- Dispatch queue table with status pills, ETAs, clickable rows
- "Dispatch Now" button to manually trigger optimization (for demo)

**Waste Yard Page**
- Static flow diagram (React component, not a chart library)
- Animated numbers that count up on page load
- Composition horizontal bar chart (Recharts)
- Environmental impact cards with trend arrows

**Analytics Page**
- Daily volume bar chart (Recharts BarChart, 7-day default)
- Zone breakdown as a simple ranked list with inline bars
- Forecast section: per-bin fill predictions as progress bars
- Date range selector for historical queries

### 6.3 Map Configuration (Chandigarh)

```javascript
const MAP_CONFIG = {
  center: [30.7333, 76.7794],
  zoom: 13,
  tileLayer: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  bounds: [[30.69, 76.72], [30.78, 76.84]],
};

const BIN_LOCATIONS = [
  { id: "BIN-01", name: "Sector 9 Park",       lat: 30.7580, lng: 76.7870, zone: "residential" },
  { id: "BIN-02", name: "Sector 10 Market",    lat: 30.7550, lng: 76.7780, zone: "commercial"  },
  { id: "BIN-03", name: "Sector 22 Bus Stand", lat: 30.7340, lng: 76.7690, zone: "commercial"  },
  { id: "BIN-04", name: "Sector 35 Gate",      lat: 30.7230, lng: 76.7560, zone: "residential" },
  { id: "BIN-05", name: "Sector 15 Garden",    lat: 30.7450, lng: 76.7850, zone: "residential" },
  { id: "BIN-06", name: "Sector 26 Grain Mkt", lat: 30.7280, lng: 76.7730, zone: "industrial"  },
  { id: "BIN-07", name: "Sector 17 Plaza",     lat: 30.7410, lng: 76.7790, zone: "commercial", is_hardware: true },
  { id: "BIN-08", name: "Sector 43 Colony",    lat: 30.7190, lng: 76.7650, zone: "residential" },
  { id: "BIN-09", name: "Sector 20 Crossing",  lat: 30.7370, lng: 76.7720, zone: "commercial"  },
  { id: "BIN-10", name: "Sector 38 West",      lat: 30.7250, lng: 76.7800, zone: "residential" },
  { id: "BIN-11", name: "CU Main Gate",        lat: 30.7700, lng: 76.5760, zone: "university"  },
  { id: "BIN-12", name: "CU Library",          lat: 30.7710, lng: 76.5780, zone: "university"  },
  { id: "BIN-13", name: "Sector 44 Market",    lat: 30.7160, lng: 76.7580, zone: "commercial"  },
  { id: "BIN-14", name: "Sector 7 Residential",lat: 30.7620, lng: 76.7900, zone: "residential" },
  { id: "BIN-15", name: "Industrial Area Ph-1",lat: 30.7100, lng: 76.7450, zone: "industrial"  },
  { id: "BIN-16", name: "Industrial Area Ph-2",lat: 30.7050, lng: 76.7500, zone: "industrial"  },
  { id: "BIN-17", name: "Sector 32 Park",      lat: 30.7300, lng: 76.7620, zone: "residential" },
  { id: "BIN-18", name: "PGI Hospital Road",   lat: 30.7640, lng: 76.7760, zone: "commercial"  },
];

const YARD_LOCATION = { lat: 30.6950, lng: 76.7400, name: "Dadumajra Waste Yard" };
```

---

## 7. Implementation Phases

### Phase 1: Backend Foundation (Day 1-2)

**Goal:** API server running, database seeded, basic endpoints working.

Step-by-step:
1. Set up Python project with FastAPI, SQLAlchemy, uvicorn
2. Define all SQLAlchemy models (bins, waste_events, trucks, etc.)
3. Write database initialization script that seeds 18 bins + 3 trucks
4. Implement bin CRUD endpoints (`GET /api/bins`, `GET /api/bins/{id}`)
5. Implement hardware ingestion endpoint (`POST /api/bins/{id}/event`)
6. Implement WebSocket endpoint (`/ws/live`) with connection manager
7. Test with Postman / curl: POST a fake event, verify DB insert + WS broadcast
8. Add CORS middleware for frontend dev server

**Deliverable:** You can POST a waste event and see it in the database and via WebSocket.

### Phase 2: Simulation Engine (Day 2-3)

**Goal:** Simulated bins generating realistic data patterns.

Step-by-step:
1. Implement SimulationEngine class with configurable tick rate
2. Add time-of-day activity multipliers
3. Add zone-based waste distribution probabilities
4. Wire simulation ticks to database writes + WebSocket broadcasts
5. Implement auto-dispatch trigger (when fill >= 80%)
6. Add `/api/simulation/start`, `/stop`, `/speed` endpoints
7. Test: start simulation, watch bins fill up over time via WebSocket
8. Add speed multiplier for fast demo mode (10x, 50x)

**Deliverable:** Bins fill realistically, events stream in, dispatch triggers fire.

### Phase 3: Route Optimization + Fleet Logic (Day 3-4)

**Goal:** Trucks get dispatched, follow optimized routes, collect waste.

Step-by-step:
1. Implement Haversine distance function
2. Implement nearest-neighbor route optimization
3. Implement dispatch logic: select idle truck, compute route, create record
4. Implement truck movement simulation (interpolate position along route segments)
5. Implement collection event: reset bin fill, record collection, update yard intake
6. Implement truck return-to-yard logic
7. Wire fleet endpoints (`GET /api/trucks`, `GET /api/dispatch/active`)
8. Broadcast truck position updates via WebSocket

**Deliverable:** Trucks dispatch automatically, move on map, collect bins, return to yard.

### Phase 4: Frontend — Layout + City Map (Day 4-6)

**Goal:** React app running with navbar, routing, and live city map.

Step-by-step:
1. Scaffold React + Vite + Tailwind project
2. Set up React Router with four page routes
3. Build Navbar component with tabs + connection status
4. Build AppContext with useReducer for global state
5. Build useWebSocket hook with auto-reconnect
6. Build useApi hook for REST calls
7. Build CityMap page:
   - Leaflet map with OpenStreetMap tiles
   - BinMarker component (color by fill level, pulse for hardware bin)
   - BinPopup component (fill, composition, last collection, live badge)
   - StatCard row at top (total bins, avg fill, items today, e-waste count)
   - AlertBanner below map
8. Connect WebSocket — bin markers update in real-time

**Deliverable:** Live map showing bins updating in real-time.

### Phase 5: Frontend — Fleet Dispatch (Day 6-7)

**Goal:** Fleet page showing routes, truck positions, dispatch queue.

Step-by-step:
1. Build RouteMap component (Leaflet with polyline overlays)
2. Build TruckMarker (truck icon that moves along route)
3. Build DispatchQueue table component
4. Build "Dispatch Now" manual trigger button
5. Connect to WebSocket for live truck position updates
6. Add color-coded route lines (blue = dry waste, red = e-waste)
7. Stats row: active trucks, pending bins, avg route time, fuel saved

**Deliverable:** Trucks visible on map, routes drawn, queue updating live.

### Phase 6: Frontend — Waste Yard + Analytics (Day 7-8)

**Goal:** Complete all four screens.

Step-by-step:
1. Build ProcessingFlow component (incoming → sorting → three output streams)
2. Build CompositionChart (horizontal stacked bars via Recharts)
3. Build EnvironmentCard (CO2, materials, hazardous diverted)
4. Build Analytics page:
   - DailyVolumeChart (Recharts BarChart)
   - ZoneBreakdown (ranked list with inline progress bars)
   - ForecastChart (per-bin prediction bars)
5. Wire all to REST endpoints
6. Add animated number counting on page load

**Deliverable:** All four screens functional with live + historical data.

### Phase 7: Polish + Hardware Integration (Day 8-10)

**Goal:** Production-ready demo experience.

Step-by-step:
1. UI polish: transitions between pages, loading skeletons, empty states
2. Responsive design check (laptop screen resolution for demo)
3. Dark mode support (optional but impressive)
4. Update ESP32-CAM firmware to POST to FastAPI endpoint over Wi-Fi
5. Test end-to-end: drop battery → servo sorts → map updates → alert fires
6. Add "demo mode" button: resets all data, starts simulation at 10x speed
7. Test full demo flow: open dashboard, start sim, drop real item, show all screens
8. Error handling: what if hardware disconnects? Show offline status on map

**Deliverable:** Complete demo-ready system.

---

## 8. ESP32-CAM Firmware Changes

The existing firmware needs minimal changes to send data over Wi-Fi:

```cpp
// Add to existing code after classification result
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* serverUrl = "http://LAPTOP_IP:8000/api/bins/BIN-07/event";

// After getting bb.label and bb.value in the classification loop:
if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    String payload = "{\"label\":\"" + String(bb.label) + 
                     "\",\"confidence\":" + String(bb.value) + 
                     ",\"timestamp\":\"" + getTimestamp() + "\"}";
    
    int httpCode = http.POST(payload);
    http.end();
}
```

The ESP32-CAM and the laptop running the backend just need to be on the same Wi-Fi network.

---

## 9. Demo Script (for Evaluation)

This is the sequence to follow during your practical evaluation:

1. **Open the dashboard** on your laptop. The map loads with 18 bins.
2. **Start simulation** — bins begin filling with realistic patterns. Point out the time-of-day patterns, zone differences.
3. **Show the city map** — click on different bins, explain the color coding, show the hardware bin (blue) with its "Live hardware" badge.
4. **Drop a battery** into the real dustbin. The servo sorts it. Wait 2-3 seconds.
5. **Point at the screen** — Bin #07's marker updates, fill percentage increases, a waste event toast appears, the "Items sorted today" counter increments.
6. **Drop paper** — same thing, different classification label appears on the map popup.
7. **Switch to Fleet Dispatch** — show that Bin #04 (simulated) has crossed 80%, a truck was auto-dispatched, the route is drawn on the map, the truck is moving.
8. **Switch to Waste Yard** — show the processing flow, how much was recycled vs landfilled, the environmental impact metrics.
9. **Switch to Analytics** — show weekly trends, zone breakdown, fill-level forecasts.
10. **Explain the architecture** — edge inference on ESP32-CAM, Wi-Fi to FastAPI backend, WebSocket to React frontend, route optimization algorithm.

**Key talking points for evaluators:**
- Edge AI (TinyML on ESP32-CAM) — no cloud dependency
- Real-time full-stack system (WebSocket, not polling)
- Route optimization (TSP variant) — reduces collection costs
- Scalable architecture — add more bins without code changes
- Simulation engine with realistic patterns — demonstrates system at city scale

---

## 10. File Deliverables

By the end, your project repository should contain:

```
smartcity-waste-platform/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── models.py               # SQLAlchemy models
│   ├── database.py             # DB connection + init
│   ├── seed.py                 # Seed bins, trucks data
│   ├── routes/
│   │   ├── bins.py
│   │   ├── fleet.py
│   │   ├── yard.py
│   │   ├── analytics.py
│   │   └── simulation.py
│   ├── services/
│   │   ├── simulation_engine.py
│   │   ├── route_optimizer.py
│   │   └── websocket_manager.py
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/                    # (structure from Section 6.1)
│   ├── package.json
│   └── README.md
├── firmware/
│   ├── smart_dustbin.ino       # Updated ESP32-CAM code
│   ├── collect_images.ino      # Image collection script
│   └── README.md
├── docs/
│   ├── project_report.pdf
│   ├── architecture_diagram.png
│   └── demo_script.md
└── README.md                   # Project overview + setup instructions
```

---

## 11. Quick-Start Commands

**Backend:**
```bash
cd backend
pip install fastapi uvicorn sqlalchemy apscheduler
python seed.py          # Initialize DB with bins + trucks
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm create vite@latest . -- --template react
npm install react-router-dom react-leaflet leaflet recharts lucide-react
npm install -D tailwindcss @tailwindcss/vite
npm run dev
```

**Test hardware endpoint:**
```bash
curl -X POST http://localhost:8000/api/bins/BIN-07/event \
  -H "Content-Type: application/json" \
  -d '{"label":"battery","confidence":0.94}'
```
