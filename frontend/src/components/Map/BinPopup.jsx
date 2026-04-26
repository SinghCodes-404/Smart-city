import ProgressBar from '../common/ProgressBar'
import StatusPill from '../common/StatusPill'
import { getFillLabel, WASTE_COLORS, WASTE_ICONS } from '../../utils/constants'
import { formatRelativeTime } from '../../utils/formatters'

export default function BinPopup({ bin }) {
  const fillLabel = getFillLabel(bin.current_fill_pct)

  return (
    <div className="p-4 min-w-[230px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs text-slate-500 font-medium">{bin.id}</p>
          <p className="text-sm font-semibold text-white leading-tight">{bin.name}</p>
          <p className="text-xs text-slate-500 capitalize mt-0.5">{bin.zone} zone</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {bin.is_hardware && (
            <StatusPill status="hardware" label="⚡ Live HW" />
          )}
          <StatusPill status={fillLabel} label={fillLabel} />
        </div>
      </div>

      {/* Fill level */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-500">Fill Level</span>
          <span className="text-xs font-mono text-white">{bin.current_fill_pct.toFixed(1)}%</span>
        </div>
        <ProgressBar value={bin.current_fill_pct} height="h-2.5" showLabel={false} isHardware={bin.is_hardware} />
      </div>

      {/* Recent composition */}
      {bin.recent_composition && Object.keys(bin.recent_composition).length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-1.5">Recent composition</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(bin.recent_composition).map(([label, count]) => (
              <span key={label}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                    style={{ color: WASTE_COLORS[label] ?? '#94a3b8', borderColor: (WASTE_COLORS[label] ?? '#94a3b8') + '40', background: (WASTE_COLORS[label] ?? '#94a3b8') + '10' }}>
                {WASTE_ICONS[label] ?? '🗑️'} {label} ×{count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-1">
        <div>
          <p className="text-xs text-slate-600">Last event</p>
          <p className="text-xs text-slate-300">{bin.last_event ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-600">Last collected</p>
          <p className="text-xs text-slate-300">{formatRelativeTime(bin.last_collection)}</p>
        </div>
      </div>
    </div>
  )
}
