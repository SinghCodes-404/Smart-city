# CLAUDE CODE: Hardware Simulator Integration Plan

> **Context:** This is part of the SmartCity Waste Intelligence Platform. The full system (React frontend + FastAPI backend) is already built and working. Read `claude-code-context.md` and `project-plan.md` for full background.
>
> **What happened:** The real ESP32-CAM hardware works for detection but has a power/jitter issue that prevents stable live integration with the software via Wi-Fi. We need a polished software replacement that simulates what the hardware bin would do — sending waste detection events to the backend as if the ESP32-CAM were connected.
>
> **This is NOT a throwaway debug tool.** It will be shown to evaluators during the final practical evaluation. It must look like a deliberate, professional part of the system — a "Hardware Control Panel" or "Edge Node Simulator" that demonstrates how the real bin would feed data into the platform.

---

## What to Build

A **Hardware Simulation Panel** — a dedicated UI component integrated into the existing React dashboard. It represents the physical smart dustbin (BIN-07, the one marked as `is_hardware: true`) and lets the user manually trigger waste detection events that flow through the exact same backend pipeline as real hardware would.

Think of it as a digital twin of the physical bin. It should feel like a professional IoT device management interface, not a debug panel.

---

## UI Design Specification

### Where it lives

Add it as a **slide-out panel or modal** accessible from the City Map page. There should be a button near BIN-07's marker or in the top navbar area — something like a small chip/badge that says "Edge Node" or "Hardware Panel" with a pulsing dot. Clicking it opens the panel.

Alternatively, it can be a **fifth tab** in the navbar called "Edge Node" or "Hardware" — this might actually be better since it gives it equal weight with the other screens and makes it feel like a proper part of the system rather than a hidden tool.

**Go with the fifth tab approach.** Call it "Edge Node" in the navbar.

### Panel Layout (single page, no scrolling needed)

The page should have two main sections side by side:

**Left side: The Virtual Bin (roughly 60% width)**

This is a visual representation of the dustbin. Design it as a stylized top-down or front view of a bin with two compartments:
- Left compartment labeled "Non-biodegradable" (for pen caps / e-waste)
- Right compartment labeled "Biodegradable" (for paper / dry waste)
- A flap/divider in the center that visually animates when waste is sorted (mimicking the servo)
- The bin should show its current fill level visually — like a liquid/solid fill that rises as more items are added
- Two prominent buttons below or beside the bin:
  - **"Detect Paper"** — styled in green/earthy tones, with a paper icon
  - **"Detect Pen Cap"** — styled in amber/orange tones, with a small object icon
- When a button is clicked:
  1. A brief camera-flash animation plays on the bin (simulating the ESP32-CAM capturing an image)
  2. A "classification" result appears with a label and confidence score (randomize confidence between 0.88 and 0.99 for realism)
  3. The flap animates to the correct side
  4. The fill level visually increases
  5. The event is POSTed to the backend (`POST /api/bins/BIN-07/event`)
  6. A small toast/notification confirms "Event sent to platform"

**Right side: Live Feed & Stats (roughly 40% width)**

- **Connection status** indicator at the top: "Edge Node: BIN-07 — Sector 17 Plaza" with a green dot and "Connected" label
- **Device info card:**
  - Device: ESP32-CAM (AI Thinker)
  - Model: Edge Impulse TinyML
  - Classes: paper, pencap
  - Inference time: ~713ms (from the real serial monitor logs)
  - Status: Online
- **Recent detections log:** A scrolling list showing the last 10-15 events from this session, each with:
  - Timestamp
  - Label detected
  - Confidence score
  - Small colored dot (green for paper, amber for pencap)
- **Session stats:**
  - Total items detected this session
  - Paper count
  - Pen cap count
  - Current fill level of BIN-07

### Visual Style

Match the existing dashboard aesthetic exactly — same background colors, card styles, border radius, font sizes, stat card patterns. Use the same Tailwind classes and design language as the other four screens. The bin visualization should use SVG or clean CSS — not a cartoon, but a clean schematic/technical illustration style that fits a smart city dashboard.

The detection buttons should be large enough to tap comfortably during a live demo (the evaluator might be watching over Gurpreet's shoulder). They should have satisfying visual feedback — a brief press animation, the camera flash effect, and the classification result appearing.

---

## Backend Integration

### What already exists

The backend already has the endpoint that the real ESP32-CAM would POST to:

```
POST /api/bins/{bin_id}/event
Body: { "label": "paper", "confidence": 0.94 }
```

This endpoint:
1. Inserts into `waste_events` table with `source = "hardware"`
2. Updates `bins.current_fill_pct`
3. Broadcasts via WebSocket to all connected clients
4. Checks if fill threshold is crossed → triggers dispatch if needed

### What the simulator does

When the user clicks "Detect Paper" or "Detect Pen Cap", the frontend:

1. Generates a realistic confidence score: `0.88 + Math.random() * 0.11` (range 0.88–0.99)
2. POSTs to `POST /api/bins/BIN-07/event` with:
   ```json
   {
     "label": "paper",          // or "pencap"
     "confidence": 0.94,        // randomized
     "source": "simulator"      // so we can distinguish from real hardware
   }
   ```
3. The backend processes it through the exact same pipeline — this is critical. No separate endpoint, no special handling. The event flows through the same WebSocket broadcast, the same fill-level update, the same dispatch trigger logic.
4. The City Map page (if open in another tab or when you switch back to it) will show BIN-07 updated in real-time because it received the WebSocket broadcast.

### Backend change needed

The `POST /api/bins/{bin_id}/event` endpoint may need a minor update to accept an optional `source` field. Check the current implementation:
- If `source` is already accepted, just pass `"simulator"` from the frontend
- If not, add it as an optional field defaulting to `"hardware"`
- Store it in the `waste_events` table so we can distinguish real vs simulated events in analytics

This is a tiny change — one optional field in the Pydantic model and the database insert.

---

## Technical Implementation Details

### New files to create

```
frontend/src/pages/EdgeNode.jsx          # Main page component
frontend/src/components/EdgeNode/
  ├── VirtualBin.jsx                      # SVG bin visualization with animation
  ├── DetectionButton.jsx                 # Paper / Pencap trigger buttons  
  ├── DeviceInfoCard.jsx                  # ESP32-CAM device details
  ├── DetectionLog.jsx                    # Scrolling recent events list
  └── SessionStats.jsx                    # Running totals for this session
```

### Router change

Add the new route in `App.jsx`:
```jsx
<Route path="/edge-node" element={<EdgeNode />} />
```

### Navbar change

Add a fifth tab: "Edge Node" — use a chip/cpu icon from Lucide (maybe `Cpu` or `Radio` or `Wifi`).

### State management

The EdgeNode page manages its own local state for:
- `sessionEvents[]` — array of events triggered this session (for the log)
- `sessionPaperCount` / `sessionPencapCount` — counters
- `isAnimating` — controls the camera flash + flap animation
- `lastDetection` — { label, confidence, timestamp } for the result display

It reads BIN-07's current `fill_pct` from the global AppContext (which updates via WebSocket).

### Animation sequence (when a detection button is clicked)

```
0ms     — Button press animation (scale down briefly)
0ms     — Disable both buttons (prevent double-click)
100ms   — Camera flash overlay appears on bin SVG (white flash, 200ms fade)
300ms   — "Classifying..." text appears where result will show
300ms   — POST request fires to backend
800ms   — Classification result appears: "Detected: paper (0.94)" with a fade-in
800ms   — Bin flap animates: rotates to the correct side (CSS transform, 400ms)
1200ms  — Fill level bar/visual increments smoothly (CSS transition)
1200ms  — Toast notification: "Event sent to platform"
1600ms  — Flap returns to center
1600ms  — Event added to detection log (prepended, with slide-in animation)
1600ms  — Session stats update
2000ms  — Re-enable both buttons
```

Total animation cycle: ~2 seconds. Fast enough for demo, slow enough to see what's happening.

### The bin SVG design

Keep it simple and technical — a rectangular bin outline viewed from the front, with:
- Two compartments separated by a central divider (the "flap")
- The flap should be a line/shape that visually rotates left or right during sorting
- Each compartment has a fill indicator (a colored rectangle that grows upward)
- Left compartment fill: amber/orange (non-biodegradable)
- Right compartment fill: green (biodegradable)
- Labels below each compartment
- A small camera icon at the top center of the bin (representing the ESP32-CAM)
- The camera icon flashes white during the "capture" animation

### Confidence score generation

Make it look realistic based on the actual serial monitor logs we have:
```javascript
// Paper tends to have higher confidence in the real model
const generateConfidence = (label) => {
  if (label === 'paper') {
    return 0.89 + Math.random() * 0.10;  // 0.89 - 0.99 (paper is usually 0.85-0.97)
  } else {
    return 0.85 + Math.random() * 0.12;  // 0.85 - 0.97 (pencap slightly lower)
  }
};
```

### Fill increment per item

Each detection should increase BIN-07's fill level by a small amount. Check what the backend currently uses for `fill_increment_per_event` — it's likely around 1-3%. If the backend handles this automatically when it receives the POST, the frontend doesn't need to calculate it. If not, include a reasonable increment in the POST payload.

---

## Demo Flow With This Panel

Here's how Gurpreet will use this during evaluation:

1. Open dashboard, show the City Map with all 18 bins
2. Switch to **Edge Node** tab — the hardware panel appears
3. Explain: "This represents our physical smart dustbin with ESP32-CAM. In a production deployment, this data comes directly from the microcontroller over Wi-Fi. Let me show you the classification pipeline."
4. Click **"Detect Paper"** — camera flash, classification result, flap swings right, fill increases
5. Click **"Detect Pen Cap"** — same sequence, flap swings left
6. Do this 4-5 times rapidly to build up some events in the log
7. Switch back to **City Map** tab — BIN-07 (the blue pin) now shows increased fill level and the latest detection events
8. If BIN-07 crosses 80%, a dispatch is auto-triggered — switch to Fleet Dispatch to show the truck
9. Point out: "Every event I triggered flowed through the same REST API and WebSocket pipeline that the real ESP32-CAM uses. The only difference is I pressed a button instead of the camera capturing an image."

---

## Important Notes

- **Do not make this look like a testing tool.** No debug labels, no raw JSON displays, no "TEST MODE" banners. It should look like a legitimate "Edge Node Management" interface that a smart city operator would use.
- **The detection log should look like a real device log** — timestamps, labels, confidence scores in a clean table format. Think of how an IoT device management dashboard shows recent telemetry.
- **Match existing UI quality exactly.** Same card styles, same stat card component, same color scheme, same typography. It should feel like it was always part of the app.
- **Keep the detection buttons prominent and easy to click.** During the demo, Gurpreet will be clicking these while explaining to the evaluator — they should be large, clear, and responsive.
- **The session stats are local only** (reset when you leave the page). The actual bin data persists in the backend and shows on City Map.

---

## Files to Modify

1. `frontend/src/App.jsx` — add EdgeNode route
2. `frontend/src/components/Layout/Navbar.jsx` — add fifth tab
3. `backend/routes/bins.py` (or wherever the POST endpoint is) — accept optional `source` field
4. `backend/models.py` — ensure `waste_events.source` can store "simulator" value

## Files to Create

1. `frontend/src/pages/EdgeNode.jsx`
2. `frontend/src/components/EdgeNode/VirtualBin.jsx`
3. `frontend/src/components/EdgeNode/DetectionButton.jsx`
4. `frontend/src/components/EdgeNode/DeviceInfoCard.jsx`
5. `frontend/src/components/EdgeNode/DetectionLog.jsx`
6. `frontend/src/components/EdgeNode/SessionStats.jsx`
