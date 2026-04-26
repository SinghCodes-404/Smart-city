# CLAUDE CODE CONTEXT BRIEFING
# SmartCity Waste Intelligence Platform

> **This file is a context transfer from a Claude.ai conversation. Read this FIRST before reading `project-plan.md`. This contains the reasoning, constraints, and decisions behind the plan.**

---

## Who is the developer?

Gurpreet Singh, B.E. Computer Science student at Chandigarh University. This is his final practical evaluation project (not just a lab assignment). He needs to physically demo this in front of evaluators — the project must work live, look impressive, and demonstrate CSE-level depth across embedded ML, full-stack development, real-time systems, and algorithmic thinking.

He is comfortable with code and has the tools to be ambitious. Do not simplify or dumb down the implementation.

---

## Project Origin & Evolution

Gurpreet originally built a **simple smart dustbin** for an EDT lab assignment:
- ESP32-CAM captures images of waste
- TinyML model (trained via Edge Impulse) classifies items as "battery" or "paper"
- Servo motor physically sorts waste into two compartments
- Originally displayed results on a local OLED screen

**The upgrade:** This simple dustbin is now just ONE hardware node in a much larger **SmartCity Waste Intelligence Platform**. The dustbin becomes a live hardware prototype embedded in a city-wide waste management dashboard. The software system is the main project; the dustbin is the physical demo piece that proves the edge-computing concept works.

---

## Hardware Gurpreet Actually Has

- **NodeMCU ESP8266** — can act as a second simulated bin node or relay
- **ESP32-S camera module** (ESP32-CAM equivalent) — the main vision + ML unit
- **FT232RL** — USB-to-serial adapter for programming the ESP32
- **SG90 servo motor** — for physical waste sorting
- **No OLED display** — this is why we moved from local display to web dashboard

The ESP32-CAM runs the TinyML model locally (Edge Impulse C++ library). It will POST classification results to the backend over Wi-Fi. The laptop running the backend and frontend must be on the same Wi-Fi network as the ESP32-CAM during demo.

---

## Key Design Decisions Made During Conversation

1. **17 simulated bins + 1 real hardware bin = 18 total.** The simulation engine generates realistic data for 17 bins. Bin #07 ("Sector 17 Plaza") is the real hardware bin. During demo, Gurpreet drops actual items into the physical dustbin and that specific bin updates live on the map. Evaluators see both simulated city-scale operation and real hardware working together.

2. **Four dashboard screens were agreed upon:**
   - **City Map** — Leaflet map of Chandigarh with 18 color-coded bin pins, click popups, real-time alerts
   - **Fleet Dispatch** — Truck routing with optimized routes (nearest-neighbor TSP), dispatch queue, moving truck markers
   - **Waste Yard** — Processing flow visualization (incoming → sorting → recycling/pulp/landfill streams), environmental impact metrics
   - **Analytics** — Daily volume charts, zone breakdown, fill-level forecasting (simple trend extrapolation)

3. **No AI/NLP query feature.** Gurpreet explicitly decided to skip the "ask questions about your data" intelligence feature. Keep it out.

4. **Tech stack decisions:**
   - Backend: FastAPI (Python) — chosen because Gurpreet is already in the Python/ML ecosystem
   - Frontend: React + Vite + Tailwind + Leaflet + Recharts
   - Database: SQLite (portable, no setup)
   - Real-time: WebSockets (not polling)
   - No Docker, no cloud deployment — everything runs locally on laptop

5. **The UI should be polished and impressive.** Gurpreet specifically praised the mockup visualization and wants the final product to look professional. This is a demo for evaluators — visual quality matters.

6. **Simulation engine must feel realistic.** Time-of-day patterns (morning/lunch/evening peaks), zone-based waste distributions (residential vs commercial vs industrial vs university), and configurable speed multiplier for fast demos.

7. **Route optimization uses greedy nearest-neighbor.** Simple enough to implement and explain, with 2-opt mentioned as a future improvement in the report.

8. **City: Chandigarh.** Map centered on Chandigarh with bins placed at real sector locations. Waste yard at Dadumajra. All coordinates are in the project plan.

---

## The Demo Flow (Critical — Build With This in Mind)

The entire system is designed around this 5-minute demo sequence:

1. Open dashboard → map loads with 18 bins
2. Start simulation → bins begin filling with realistic patterns
3. Click bins on map → show popups with stats
4. **Drop a real battery into the physical dustbin** → servo sorts it → Bin #07 updates on screen within 2-3 seconds
5. **Drop real paper** → same thing, different label
6. Switch to Fleet Dispatch → show auto-dispatched truck with optimized route
7. Switch to Waste Yard → show processing flow and environmental impact
8. Switch to Analytics → show trends and forecasts

**Everything must work smoothly for this sequence.** The WebSocket latency between hardware event and map update should be under 3 seconds. The simulation should already have some bins at various fill levels when the demo starts.

---

## Implementation Order

Follow this order strictly — each phase depends on the previous:

1. **Phase 1:** Backend foundation (FastAPI + SQLAlchemy models + seed data + basic endpoints)
2. **Phase 2:** Simulation engine (background task generating realistic bin data)
3. **Phase 3:** Route optimization + fleet logic (dispatch, truck movement, collection)
4. **Phase 4:** Frontend — layout + city map page (the most important screen)
5. **Phase 5:** Frontend — fleet dispatch page
6. **Phase 6:** Frontend — waste yard + analytics pages
7. **Phase 7:** Polish + hardware integration + demo mode

---

## What the Project Plan File Contains

The `project-plan.md` file has:
- Complete database schema (6 tables)
- All REST API endpoints with routes and payloads
- WebSocket message format specifications
- Simulation engine configuration and tick logic (pseudocode)
- Route optimization algorithm (pseudocode)
- Full frontend file/component structure
- Map configuration with 18 bin coordinates in Chandigarh
- ESP32-CAM firmware changes needed (HTTP POST code snippet)
- Quick-start commands for both backend and frontend
- Final repository structure

**Use `project-plan.md` as the technical specification. Use THIS file as the context for WHY decisions were made.**

---

## Things to Watch Out For

- The hardware bin (BIN-07) must be visually distinct on the map (blue color, pulsing animation, "Live hardware" badge in popup)
- WebSocket reconnection is important — if connection drops during demo, it should auto-reconnect without page refresh
- The simulation should have a "demo mode" that pre-fills some bins to interesting levels so the demo doesn't start from zero
- SQLite file should be gitignored but the seed script should recreate it from scratch
- CORS must be configured for localhost dev (React on port 5173, FastAPI on port 8000)
- The frontend should handle the case where backend is not running (show connection error, not blank screen)

---

## Tone & Quality Bar

This is a final-year practical evaluation project at Chandigarh University. The code should be:
- Clean and well-structured (evaluators may look at code)
- Properly commented where logic is non-obvious
- Production-quality UI (not a prototype look)
- Robust enough to survive a live demo without crashing

Gurpreet said "we can be ambitious" and "don't stop on the basis of technical limitations." Build it properly.
