import { createContext, useContext, useReducer } from 'react'

const AppContext = createContext(null)

const initialState = {
  bins: [],
  trucks: [],
  events: [],       // rolling last 50 waste events for live feed
  alerts: [],       // dispatch alerts shown in banner
  yardStats: null,
  simStatus: { running: false, speed_multiplier: 1.0, tick_count: 0, dispatch_queue: [] },
  summary: null,
  wsStatus: 'connecting', // 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
}

function reducer(state, action) {
  switch (action.type) {

    // ── REST initialization ──────────────────────────────────────────
    case 'INIT_BINS':    return { ...state, bins: action.payload }
    case 'INIT_TRUCKS':  return { ...state, trucks: action.payload }
    case 'INIT_SUMMARY': return { ...state, summary: action.payload }
    case 'SIM_STATUS':   return { ...state, simStatus: { ...state.simStatus, ...action.payload } }
    case 'WS_STATUS':    return { ...state, wsStatus: action.payload }

    // ── WebSocket: bin fill change ───────────────────────────────────
    case 'bin_update': {
      const { bin_id, fill_pct, last_event } = action.data
      return {
        ...state,
        bins: state.bins.map(b =>
          b.id === bin_id
            ? { ...b, current_fill_pct: fill_pct, ...(last_event ? { last_event } : {}) }
            : b
        ),
        // Keep summary critical count in sync
        summary: state.summary
          ? { ...state.summary, critical_bins: state.bins.filter(b => b.current_fill_pct >= 80).length }
          : null,
      }
    }

    // ── WebSocket: new waste event ───────────────────────────────────
    case 'waste_event': {
      return {
        ...state,
        events: [action.data, ...state.events].slice(0, 50),
        summary: state.summary
          ? {
              ...state.summary,
              items_today: state.summary.items_today + 1,
              ewaste_today: action.data.label === 'battery'
                ? state.summary.ewaste_today + 1
                : state.summary.ewaste_today,
            }
          : null,
      }
    }

    // ── WebSocket: truck position / status ───────────────────────────
    case 'truck_update': {
      const { truck_id, status, lat, lng, load_kg } = action.data
      return {
        ...state,
        trucks: state.trucks.map(t =>
          t.id === truck_id
            ? { ...t, status, current_lat: lat, current_lng: lng,
                ...(load_kg !== undefined ? { current_load_kg: load_kg } : {}) }
            : t
        ),
      }
    }

    // ── WebSocket: auto-dispatch fired ───────────────────────────────
    case 'dispatch_alert': {
      const alert = { id: Date.now() + Math.random(), ...action.data, ts: Date.now() }
      return { ...state, alerts: [alert, ...state.alerts].slice(0, 8) }
    }

    // ── WebSocket: bin collected, fill reset ─────────────────────────
    case 'collection': {
      const { bin_id, fill_reset } = action.data
      return {
        ...state,
        bins: state.bins.map(b =>
          b.id === bin_id ? { ...b, current_fill_pct: fill_reset } : b
        ),
      }
    }

    // ── WebSocket: truck returned to yard ────────────────────────────
    case 'yard_intake': return state  // Yard page refreshes on navigation

    // ── UI actions ───────────────────────────────────────────────────
    case 'DISMISS_ALERT':
      return { ...state, alerts: state.alerts.filter(a => a.id !== action.id) }

    default: return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}
