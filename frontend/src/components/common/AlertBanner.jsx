import { X, AlertTriangle, Truck, CheckCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { formatRelativeTime } from '../../utils/formatters'

const ICONS = {
  fill_threshold: { icon: AlertTriangle, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  auto_dispatch:  { icon: Truck,         cls: 'text-blue-400  bg-blue-500/10  border-blue-500/25'  },
  collection:     { icon: CheckCircle,   cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
}

function Banner({ alert }) {
  const { dispatch } = useApp()
  const cfg = ICONS[alert.reason] ?? ICONS.fill_threshold
  const Icon = cfg.icon

  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'DISMISS_ALERT', id: alert.id }), 7000)
    return () => clearTimeout(t)
  }, [alert.id, dispatch])

  const msg = alert.reason === 'fill_threshold'
    ? `${alert.bin_id} reached ${alert.threshold_pct}% fill — dispatch queued`
    : alert.reason === 'auto_dispatch'
    ? `${alert.truck_id} dispatched → ${alert.bins?.join(', ')} (${alert.distance_km?.toFixed(1)} km)`
    : alert.bin_id
    ? `${alert.bin_id} collected by ${alert.truck_id}`
    : 'System alert'

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${cfg.cls} animate-pulse-once`}>
      <Icon size={15} className="shrink-0" />
      <span className="flex-1 text-slate-200">{msg}</span>
      <span className="text-xs text-slate-500 shrink-0">{formatRelativeTime(new Date(alert.ts).toISOString())}</span>
      <button onClick={() => dispatch({ type: 'DISMISS_ALERT', id: alert.id })}
              className="shrink-0 text-slate-600 hover:text-slate-300 transition-colors">
        <X size={14} />
      </button>
    </div>
  )
}

export default function AlertBanner() {
  const { state } = useApp()
  if (!state.alerts.length) return null

  return (
    <div className="flex flex-col gap-1.5 px-4 py-2">
      {state.alerts.slice(0, 4).map(a => <Banner key={a.id} alert={a} />)}
    </div>
  )
}
