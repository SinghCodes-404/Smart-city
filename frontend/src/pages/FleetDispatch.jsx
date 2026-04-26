import { useEffect, useRef, useState } from 'react'
import { Truck, Route, Clock, Zap, Navigation } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useApp } from '../context/AppContext'
import { useApi } from '../hooks/useApi'
import StatCard from '../components/Layout/StatCard'
import TruckCard from '../components/Fleet/TruckCard'
import DispatchQueue from '../components/Fleet/DispatchQueue'
import { MAP_CONFIG, YARD, TRUCK_STATUS_COLORS, TRUCK_TYPE_COLORS } from '../utils/constants'

function truckTransMs(speed) { return Math.min(460, Math.max(45, 460 / speed)) }

function mkTruckIcon(truck) {
  const color = TRUCK_STATUS_COLORS[truck.status] ?? '#64748b'
  const emoji = truck.type === 'e_waste' ? '⚡🚛' : '🚛'
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 12px ${color}70;border:1.5px solid rgba(255,255,255,0.2);">${truck.status === 'idle' ? '🅿' : emoji}</div>`,
    className: '', iconSize: [30, 30], iconAnchor: [15, 15],
  })
}
function mkBinIcon(fill) {
  const color = fill >= 80 ? '#ef4444' : fill >= 60 ? '#f97316' : '#f59e0b'
  return L.divIcon({
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;font-family:monospace;">${Math.round(fill)}</div>`,
    className: '', iconSize: [22, 22], iconAnchor: [11, 11],
  })
}
function mkYardIcon() {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#1e3a5f,#0f2545);display:flex;align-items:center;justify-content:center;font-size:15px;border:1.5px solid rgba(59,130,246,0.4);">🏭</div>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 16],
  })
}

// ── Imperative truck markers for smooth CSS-transition animation ──────────────
function TruckMarkersImperative() {
  const { state } = useApp()
  const map = useMap()
  const refs = useRef({})

  useEffect(() => {
    const ms = truckTransMs(state.simStatus.speed_multiplier)
    Object.values(refs.current).forEach(({ marker }) => {
      if (marker._icon) marker._icon.style.transition = `transform ${ms}ms linear`
    })
  }, [state.simStatus.speed_multiplier])

  useEffect(() => {
    const ms = truckTransMs(state.simStatus.speed_multiplier)
    const applyTrans = (icon) => { if (icon) icon.style.transition = `transform ${ms}ms linear` }

    state.trucks.filter(t => t.current_lat).forEach(truck => {
      const pos = [truck.current_lat, truck.current_lng]
      const ref = refs.current[truck.id]
      if (ref) {
        if (ref.lastStatus !== truck.status) {
          ref.marker.setIcon(mkTruckIcon(truck))
          ref.lastStatus = truck.status
          requestAnimationFrame(() => applyTrans(ref.marker._icon))
        }
        ref.marker.setLatLng(pos)
      } else {
        const marker = L.marker(pos, { icon: mkTruckIcon(truck) }).addTo(map)
        marker.bindPopup(`<div style="padding:8px"><b style="color:#fff">${truck.id}</b> — ${truck.status}</div>`)
        refs.current[truck.id] = { marker, lastStatus: truck.status }
        requestAnimationFrame(() => applyTrans(marker._icon))
      }
    })

    const live = new Set(state.trucks.map(t => t.id))
    for (const [id, { marker }] of Object.entries(refs.current)) {
      if (!live.has(id)) { marker.remove(); delete refs.current[id] }
    }
  }, [state.trucks, map, state.simStatus.speed_multiplier])

  useEffect(() => () => {
    Object.values(refs.current).forEach(({ marker }) => { try { marker.remove() } catch {} })
    refs.current = {}
  }, [])

  return null
}

function RouteLines({ routes, bins }) {
  const binMap = Object.fromEntries(bins.map(b => [b.id, b]))
  return routes.map(r => {
    const pts = [[YARD.lat, YARD.lng],
      ...r.bin_sequence.map(id => binMap[id] ? [binMap[id].latitude, binMap[id].longitude] : null).filter(Boolean),
      [YARD.lat, YARD.lng]]
    const color = r.truck_id === 'TRUCK-B' ? '#06b6d4' : '#3b82f6'
    return (
      <Polyline key={r.id} positions={pts}
        pathOptions={{ color, weight: 2, opacity: 0.8, dashArray: '6 4' }} />
    )
  })
}

export default function FleetDispatch() {
  const { state } = useApp()
  const { get, post } = useApi()
  const [routes, setRoutes] = useState([])
  const [dispatching, setDispatching] = useState(false)

  useEffect(() => {
    get('/dispatch/active').then(setRoutes).catch(() => {})
    const iv = setInterval(() => get('/dispatch/active').then(setRoutes).catch(() => {}), 3000)
    return () => clearInterval(iv)
  }, [get])

  const handleDispatch = async () => {
    setDispatching(true)
    try {
      await post('/dispatch/trigger')
      setTimeout(() => get('/dispatch/active').then(setRoutes).catch(() => {}), 500)
    } catch(e) { console.error(e) }
    finally { setTimeout(() => setDispatching(false), 1500) }
  }

  const activeTrucks  = state.trucks.filter(t => t.status !== 'idle').length
  const idleTrucks    = state.trucks.filter(t => t.status === 'idle').length
  const pendingBins   = state.bins.filter(b => b.current_fill_pct >= 70 && !b.is_hardware).length
  const avgRouteKm    = routes.length ? (routes.reduce((s,r) => s + r.distance_km, 0) / routes.length).toFixed(1) : 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pt-3 pb-2">
        <StatCard icon={Truck}      label="Active Trucks"  value={activeTrucks}  sub={`${idleTrucks} idle`}    color="blue"   />
        <StatCard icon={Navigation} label="Active Routes"  value={routes.length} sub="collecting now"          color="violet" />
        <StatCard icon={Route}      label="Avg Route"      value={`${avgRouteKm} km`} sub="nearest-neighbor"  color="cyan"   />
        <StatCard icon={Zap}        label="Pending Bins"   value={pendingBins}   sub="≥70% fill"               color={pendingBins > 3 ? 'red' : 'amber'} />
      </div>

      {/* Map + queue */}
      <div className="flex-1 flex gap-3 px-4 pb-2 min-h-0">
        {/* Fleet map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-800/60 min-h-0">
          <MapContainer center={MAP_CONFIG.center} zoom={12}
                        style={{ height: '100%', width: '100%' }}>
            <TileLayer url={MAP_CONFIG.tileUrl} attribution={MAP_CONFIG.attribution} />
            <RouteLines routes={routes} bins={state.bins} />
            {state.bins.map(b => (
              <Marker key={b.id} position={[b.latitude, b.longitude]} icon={mkBinIcon(b.current_fill_pct)} />
            ))}
            <TruckMarkersImperative />
            <Marker position={[YARD.lat, YARD.lng]} icon={mkYardIcon()} />
          </MapContainer>
        </div>

        {/* Dispatch panel */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          {/* Dispatch now button */}
          <button onClick={handleDispatch} disabled={dispatching}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 active:scale-95 disabled:opacity-50">
            <Truck size={15} />
            {dispatching ? 'Dispatching…' : 'Dispatch Now'}
          </button>

          {/* Route queue */}
          <div className="flex-1 glass-card flex flex-col overflow-hidden border border-slate-800/60">
            <div className="px-3 py-2.5 border-b border-slate-800/60">
              <span className="text-xs font-semibold text-slate-300">Active Routes</span>
            </div>
            <DispatchQueue />
          </div>
        </div>
      </div>

      {/* Truck cards */}
      <div className="shrink-0 flex gap-3 px-4 pb-3">
        {state.trucks.map(t => <TruckCard key={t.id} truck={t} />)}
      </div>
    </div>
  )
}
