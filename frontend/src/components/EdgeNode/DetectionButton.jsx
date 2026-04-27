import { FileText, Pipette } from 'lucide-react'

const CONFIGS = {
  paper: {
    label: 'Detect Paper',
    Icon: FileText,
    color: 'emerald',
    cls: 'bg-emerald-500/12 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/22 active:scale-95',
    iconCls: 'text-emerald-400',
    ringCls: 'ring-emerald-500/30',
    sub: 'biodegradable',
  },
  pencap: {
    label: 'Detect Pen Cap',
    Icon: Pipette,
    color: 'amber',
    cls: 'bg-amber-500/12 border-amber-500/30 text-amber-300 hover:bg-amber-500/22 active:scale-95',
    iconCls: 'text-amber-400',
    ringCls: 'ring-amber-500/30',
    sub: 'non-biodegradable',
  },
}

export default function DetectionButton({ label, onDetect, disabled }) {
  const cfg = CONFIGS[label]
  if (!cfg) return null
  const { Icon } = cfg

  return (
    <button
      onClick={() => onDetect(label)}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-2 px-4 py-4 rounded-xl border font-medium
        transition-all duration-150 select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 ${cfg.ringCls}
        ${cfg.cls}
      `}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800/60 ${cfg.iconCls}`}>
        <Icon size={20} />
      </div>
      <span className="text-sm font-semibold">{cfg.label}</span>
      <span className="text-[10px] text-slate-500 font-normal">{cfg.sub}</span>
    </button>
  )
}
