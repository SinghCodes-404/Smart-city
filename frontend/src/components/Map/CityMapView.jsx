import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useApp } from '../../context/AppContext'
import BinPopup from './BinPopup'
import { getFillColor, MAP_CONFIG, YARD, TRUCK_STATUS_COLORS } from '../../utils/constants'

// CSS transition duration for truck movement: shorter at higher speeds
function truckTransMs(speed) { return Math.min(460, Math.max(45, 460 / speed)) }

// ── Icon cache — prevents react-leaflet calling setIcon() on unchanged bins ──
// Without this, every bin fill update triggers setIcon() on ALL bins,
// which replaces the DOM element and closes any open popup.
const _binIconCache = {}
function getCachedBinIcon(bin) {
  const key = `${Math.round(bin.current_fill_pct)}:${bin.is_hardware ? 1 : 0}`
  const cached = _binIconCache[bin.id]
  if (!cached || cached.key !== key) {
    _binIconCache[bin.id] = { key, icon: createBinIcon(bin) }
  }
  return _binIconCache[bin.id].icon
}

// ── Icon factories ────────────────────────────────────────────────────────────

function createBinIcon(bin) {
  const color = getFillColor(bin.current_fill_pct, bin.is_hardware)
  const pct = Math.round(bin.current_fill_pct)
  const label = pct < 10 ? `${pct}` : `${pct}`
  const glow = bin.current_fill_pct >= 70 ? `0 0 10px ${color}80` : ''

  const pulseRing = bin.is_hardware
    ? `<div style="
          position:absolute;inset:-8px;border-radius:50%;
          border:2px solid ${color};
          animation:bin-pulse 2s ease-out infinite;
        "></div>`
    : ''

  return L.divIcon({
    html: `<div style="position:relative;width:38px;height:38px;">
             ${pulseRing}
             <div style="
               width:38px;height:38px;border-radius:50%;
               background:${color};
               border:2px solid rgba(255,255,255,0.25);
               display:flex;align-items:center;justify-content:center;
               font-size:10px;font-weight:700;color:#fff;font-family:monospace;
               box-shadow:${glow};
               transition:all 0.3s;
             ">${label}%</div>
           </div>`,
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  })
}

function createTruckIcon(truck) {
  const color = TRUCK_STATUS_COLORS[truck.status] ?? '#64748b'
  const emoji = truck.type === 'e_waste' ? '⚡🚛' : '🚛'
  return L.divIcon({
    html: `<div style="
             width:34px;height:34px;border-radius:10px;
             background:${color};
             display:flex;align-items:center;justify-content:center;
             font-size:15px;
             box-shadow:0 0 12px ${color}60, 0 2px 8px rgba(0,0,0,0.4);
             border:1.5px solid rgba(255,255,255,0.2);
           ">${truck.status === 'idle' ? '🅿' : emoji}</div>`,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -22],
  })
}

function createYardIcon() {
  return L.divIcon({
    html: `<div style="
             width:36px;height:36px;border-radius:8px;
             background:linear-gradient(135deg,#1e3a5f,#0f2545);
             display:flex;align-items:center;justify-content:center;
             font-size:16px;
             border:1.5px solid rgba(59,130,246,0.4);
             box-shadow:0 0 12px rgba(59,130,246,0.3);
           ">🏭</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  })
}

// ── Map click auto-pan ────────────────────────────────────────────────────────
function MapController({ panTo }) {
  const map = useMap()
  useEffect(() => {
    if (panTo) map.flyTo(panTo, 15, { duration: 0.8 })
  }, [map, panTo])
  return null
}

// ── Bin markers layer (re-renders only when bins change) ─────────────────────
function BinLayer({ bins, onBinClick }) {
  return bins.map(bin => (
    <Marker
      key={bin.id}
      position={[bin.latitude, bin.longitude]}
      icon={getCachedBinIcon(bin)}
      eventHandlers={{ click: () => onBinClick?.(bin) }}
    >
      <Popup>
        <BinPopup bin={bin} />
      </Popup>
    </Marker>
  ))
}

// ── Truck markers layer — imperative for smooth CSS-transition animation ──────
function TruckLayer({ trucks }) {
  const map = useMap()
  const { state } = useApp()
  const refs = useRef({}) // { truck_id: { marker, lastStatus } }

  // Update CSS transitions whenever speed changes
  useEffect(() => {
    const ms = truckTransMs(state.simStatus.speed_multiplier)
    Object.values(refs.current).forEach(({ marker }) => {
      if (marker._icon) marker._icon.style.transition = `transform ${ms}ms linear`
    })
  }, [state.simStatus.speed_multiplier])

  // Sync marker positions / icons with truck state
  useEffect(() => {
    const ms = truckTransMs(state.simStatus.speed_multiplier)
    const applyTrans = (icon) => { if (icon) icon.style.transition = `transform ${ms}ms linear` }

    trucks.forEach(truck => {
      if (!truck.current_lat || !truck.current_lng) return
      const pos = [truck.current_lat, truck.current_lng]
      const ref = refs.current[truck.id]

      if (ref) {
        if (ref.lastStatus !== truck.status) {
          ref.marker.setIcon(createTruckIcon(truck))
          ref.lastStatus = truck.status
          requestAnimationFrame(() => applyTrans(ref.marker._icon))
        }
        ref.marker.setLatLng(pos)
      } else {
        const marker = L.marker(pos, { icon: createTruckIcon(truck) }).addTo(map)
        marker.bindPopup(`
          <div style="padding:10px;min-width:140px">
            <b style="color:#fff;font-size:13px">${truck.id}</b>
            <p style="color:#94a3b8;font-size:11px;margin:2px 0">${truck.type.replace(/_/g,' ')} truck</p>
            <p style="color:#cbd5e1;font-size:11px">Status: ${truck.status}</p>
          </div>`)
        refs.current[truck.id] = { marker, lastStatus: truck.status }
        requestAnimationFrame(() => applyTrans(marker._icon))
      }
    })

    // Remove markers for trucks no longer present
    const live = new Set(trucks.map(t => t.id))
    for (const [id, { marker }] of Object.entries(refs.current)) {
      if (!live.has(id)) { marker.remove(); delete refs.current[id] }
    }
  }, [trucks, map, state.simStatus.speed_multiplier])

  // Cleanup on unmount
  useEffect(() => () => {
    Object.values(refs.current).forEach(({ marker }) => { try { marker.remove() } catch {} })
    refs.current = {}
  }, [])

  return null
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CityMapView({ panTo, showTrucks = true, showYard = true }) {
  const { state } = useApp()
  const [selectedBin, setSelectedBin] = useState(null)

  return (
    <MapContainer
      center={MAP_CONFIG.center}
      zoom={MAP_CONFIG.zoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer url={MAP_CONFIG.tileUrl} attribution={MAP_CONFIG.attribution} />
      <MapController panTo={panTo} />

      <BinLayer bins={state.bins} onBinClick={setSelectedBin} />

      {showTrucks && <TruckLayer trucks={state.trucks} />}

      {showYard && (
        <Marker position={[YARD.lat, YARD.lng]} icon={createYardIcon()}>
          <Popup>
            <div className="p-3">
              <p className="text-sm font-bold text-white">{YARD.name}</p>
              <p className="text-xs text-slate-400 mt-1">Fleet staging + waste processing</p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}
