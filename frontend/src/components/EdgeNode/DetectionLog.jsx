import { List } from 'lucide-react'
import { formatRelativeTime } from '../../utils/formatters'

export default function DetectionLog({ events }) {
  return (
    <div className="glass-card flex-1 flex flex-col min-h-0 border border-slate-800/60">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 shrink-0">
        <List size={13} className="text-blue-400" />
        <span className="text-xs font-semibold text-slate-300">Recent Detections</span>
        {events.length > 0 && (
          <span className="ml-auto text-[10px] text-slate-600 font-mono">{events.length} events</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600">
            <List size={20} />
            <p className="text-xs">No detections this session</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {events.map((ev, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ animation: i === 0 ? 'slide-in-right 0.25s ease-out' : 'none' }}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${ev.label === 'paper' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className={`text-xs font-medium capitalize shrink-0 ${ev.label === 'paper' ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {ev.label}
                </span>
                <span className="text-xs font-mono text-slate-500 shrink-0">
                  {(ev.confidence * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-600 ml-auto shrink-0">
                  {formatRelativeTime(ev.timestamp.toISOString())}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
