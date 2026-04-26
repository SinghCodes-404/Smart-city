import StatusPill from '../common/StatusPill'
import { TRUCK_STATUS_COLORS, TRUCK_TYPE_COLORS } from '../../utils/constants'
import { capitalize } from '../../utils/formatters'

export default function TruckCard({ truck }) {
  const typeColor = TRUCK_TYPE_COLORS[truck.type] ?? '#64748b'
  const statusColor = TRUCK_STATUS_COLORS[truck.status] ?? '#64748b'
  const loadPct = (truck.current_load_kg / truck.capacity_kg) * 100

  return (
    <div className="glass-card p-4 border border-slate-800/60 flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
               style={{ background: typeColor + '20', border: `1px solid ${typeColor}40` }}>
            {truck.type === 'e_waste' ? '⚡' : truck.type === 'dry_waste' ? '📦' : '🔄'}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{truck.id}</p>
            <p className="text-xs text-slate-500">{capitalize(truck.type)}</p>
          </div>
        </div>
        <StatusPill status={truck.status} />
      </div>

      {/* Load bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Load</span>
          <span className="font-mono text-slate-300">{truck.current_load_kg} / {truck.capacity_kg} kg</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${loadPct}%`, background: statusColor }} />
        </div>
      </div>
    </div>
  )
}
