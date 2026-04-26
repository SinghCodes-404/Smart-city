const STYLES = {
  idle:        'bg-slate-800 text-slate-400 border-slate-700',
  en_route:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  collecting:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  returning:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  active:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  planned:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
  completed:   'bg-slate-700/50 text-slate-500 border-slate-700',
  maintenance: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  offline:     'bg-red-500/15 text-red-400 border-red-500/30',
  low:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium:      'bg-amber-500/15 text-amber-400 border-amber-500/30',
  high:        'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical:    'bg-red-500/15 text-red-400 border-red-500/30',
  hardware:    'bg-blue-500/15 text-blue-300 border-blue-500/30',
}

export default function StatusPill({ status, label }) {
  const cls = STYLES[status] ?? STYLES.idle
  const text = label ?? status?.replace(/_/g, ' ') ?? '—'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {text}
    </span>
  )
}
