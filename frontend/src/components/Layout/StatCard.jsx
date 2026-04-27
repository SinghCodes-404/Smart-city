// color: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'cyan'
const PALETTE = {
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   icon: 'bg-blue-500/20'   },
  green:  { bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',text: 'text-emerald-400',icon: 'bg-emerald-500/20'},
  amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  icon: 'bg-amber-500/20'  },
  red:    { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    icon: 'bg-red-500/20'    },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', icon: 'bg-violet-500/20' },
  cyan:   { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   text: 'text-cyan-400',   icon: 'bg-cyan-500/20'   },
}

export default function StatCard({ icon: Icon, label, value, sub, color = 'blue', loading = false }) {
  const p = PALETTE[color] ?? PALETTE.blue
  if (loading) return (
    <div className={`glass-card flex items-center gap-4 px-5 py-4 ${p.bg} ${p.border} animate-pulse`}>
      <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-800/70" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 bg-slate-800/70 rounded w-2/3" />
        <div className="h-5 bg-slate-800/70 rounded w-1/2" />
      </div>
    </div>
  )
  return (
    <div className={`glass-card flex items-center gap-4 px-5 py-4 ${p.bg} ${p.border}`}>
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${p.icon}`}>
        <Icon size={18} className={p.text} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 text-xs font-medium truncate">{label}</p>
        <p className={`text-xl font-bold font-mono ${p.text} leading-none mt-0.5`}>{value ?? '—'}</p>
        {sub && <p className="text-slate-600 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
