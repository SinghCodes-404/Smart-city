import { Activity, FileText, Pipette, TrendingUp } from 'lucide-react'

function Stat({ icon: Icon, label, value, color }) {
  const colors = {
    blue:    'text-blue-400   bg-blue-500/10   border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber:   'text-amber-400  bg-amber-500/10  border-amber-500/20',
    violet:  'text-violet-400 bg-violet-500/10 border-violet-500/20',
  }
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${colors[color]}`}>
      <Icon size={13} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-slate-600 leading-none mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-white leading-none">{value}</p>
      </div>
    </div>
  )
}

export default function SessionStats({ paperCount, pencapCount, fillPct }) {
  return (
    <div className="glass-card shrink-0 border border-slate-800/60">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60">
        <Activity size={13} className="text-blue-400" />
        <span className="text-xs font-semibold text-slate-300">Session Stats</span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        <Stat icon={TrendingUp} label="Total detected"  value={paperCount + pencapCount} color="blue"    />
        <Stat icon={FileText}   label="Paper"           value={paperCount}               color="emerald"  />
        <Stat icon={Pipette}    label="Pen cap"         value={pencapCount}              color="amber"    />
        <Stat icon={Activity}   label="Bin fill"        value={`${fillPct.toFixed(1)}%`} color="violet"   />
      </div>
    </div>
  )
}
