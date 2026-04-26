export const API_BASE = 'http://localhost:8000/api'
export const WS_URL = 'ws://localhost:8000/ws/live'

export const MAP_CONFIG = {
  center: [30.7333, 76.7794],
  zoom: 13,
  tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
}

export const YARD = { lat: 30.6950, lng: 76.7400, name: 'Dadumajra Waste Yard' }

// ── Fill level color system ───────────────────────────────────────
export function getFillColor(pct, isHardware = false) {
  if (isHardware) return '#3b82f6'
  if (pct >= 90) return '#ef4444'
  if (pct >= 70) return '#f97316'
  if (pct >= 40) return '#f59e0b'
  return '#22c55e'
}

export function getFillLabel(pct) {
  if (pct >= 90) return 'critical'
  if (pct >= 70) return 'high'
  if (pct >= 40) return 'medium'
  return 'low'
}

// Label colors for waste types
export const WASTE_COLORS = {
  battery:  '#06b6d4',
  paper:    '#3b82f6',
  plastic:  '#f59e0b',
  other:    '#8b5cf6',
}

export const WASTE_ICONS = {
  battery: '🔋',
  paper:   '📄',
  plastic: '♻️',
  other:   '🗑️',
}

export const TRUCK_STATUS_COLORS = {
  idle:        '#64748b',
  en_route:    '#3b82f6',
  collecting:  '#22c55e',
  returning:   '#f59e0b',
}

export const TRUCK_TYPE_COLORS = {
  dry_waste: '#3b82f6',
  e_waste:   '#06b6d4',
  mixed:     '#8b5cf6',
}
