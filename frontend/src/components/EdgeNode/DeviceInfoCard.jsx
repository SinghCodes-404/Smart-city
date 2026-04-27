import { Cpu, Wifi, Zap } from 'lucide-react'

const ROWS = [
  { label: 'Device',         value: 'ESP32-CAM (AI Thinker)' },
  { label: 'Model',          value: 'Edge Impulse TinyML' },
  { label: 'Classes',        value: 'paper, pencap' },
  { label: 'Inference',      value: '~713 ms' },
  { label: 'Firmware',       value: 'v2.3.1' },
  { label: 'Protocol',       value: 'Wi-Fi → REST/HTTP' },
]

export default function DeviceInfoCard({ fillPct }) {
  return (
    <div className="glass-card shrink-0 border border-slate-800/60">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Cpu size={13} className="text-blue-400" />
          <span className="text-xs font-semibold text-slate-300">Device Info</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <Wifi size={11} />
          <span>Online</span>
        </div>
      </div>

      {/* Info rows */}
      <div className="px-4 py-3 space-y-2">
        {ROWS.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-600 shrink-0">{label}</span>
            <span className="text-xs text-slate-300 font-mono text-right">{value}</span>
          </div>
        ))}
      </div>

      {/* Fill indicator */}
      <div className="px-4 pb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-600 flex items-center gap-1"><Zap size={10} /> Fill level</span>
          <span className="text-xs font-mono text-white">{fillPct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-[1200ms] ease-out"
            style={{
              width: `${fillPct}%`,
              background: fillPct >= 80 ? '#ef4444' : fillPct >= 60 ? '#f97316' : '#3b82f6',
            }}
          />
        </div>
      </div>
    </div>
  )
}
