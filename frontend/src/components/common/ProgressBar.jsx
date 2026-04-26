import { getFillColor } from '../../utils/constants'

export default function ProgressBar({ value, max = 100, showLabel = true, height = 'h-2', isHardware = false }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const color = getFillColor(pct, isHardware)

  return (
    <div className="w-full">
      <div className={`w-full ${height} bg-slate-800 rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: pct >= 70 ? `0 0 8px ${color}60` : 'none',
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono mt-1 block" style={{ color }}>{pct.toFixed(1)}%</span>
      )}
    </div>
  )
}
