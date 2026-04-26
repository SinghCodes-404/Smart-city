import { useEffect, useState } from 'react'
import { useApi } from '../../hooks/useApi'
import StatusPill from '../common/StatusPill'
import { TRUCK_TYPE_COLORS } from '../../utils/constants'

export default function DispatchQueue() {
  const { get } = useApi()
  const [routes, setRoutes] = useState([])

  useEffect(() => {
    get('/dispatch/active').then(setRoutes).catch(() => {})
    const iv = setInterval(() => get('/dispatch/active').then(setRoutes).catch(() => {}), 4000)
    return () => clearInterval(iv)
  }, [get])

  if (!routes.length) return (
    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
      No active routes
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
      {routes.map(r => {
        const typeColor = TRUCK_TYPE_COLORS[r.truck_id === 'TRUCK-B' ? 'e_waste' : 'dry_waste'] ?? '#3b82f6'
        return (
          <div key={r.id} className="px-3 py-2.5 rounded-xl border border-slate-800/60 hover:border-slate-700/80 transition-colors"
               style={{ background: typeColor + '08' }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{r.truck_id}</span>
                <StatusPill status={r.status} />
              </div>
              <span className="text-xs text-slate-500">{r.distance_km?.toFixed(1)} km</span>
            </div>
            <p className="text-xs text-slate-400 mb-1.5">
              {r.bin_sequence.join(' → ')}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>~{r.estimated_time_min} min</span>
              <span>{r.bin_sequence.length} stop{r.bin_sequence.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
