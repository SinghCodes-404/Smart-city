import { useEffect, useState } from 'react'
import { Layers, AlertTriangle, Cpu, Zap, TrendingUp, Clock } from 'lucide-react'
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Area, AreaChart,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { useApp } from '../context/AppContext'
import StatCard from '../components/Layout/StatCard'
import ProgressBar from '../components/common/ProgressBar'
import StatusPill from '../components/common/StatusPill'
import { getFillColor, getFillLabel } from '../utils/constants'

// ── Chart tooltip ─────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 border border-slate-700/60 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-mono font-bold" style={{ color: p.color ?? '#60a5fa' }}>
          {p.value} {p.name === 'count' ? 'events' : ''}
        </p>
      ))}
    </div>
  )
}

// ── Daily volume chart (ComposedChart: bars + area glow) ─────────────────────
function DailyVolumeChart({ data }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-full text-slate-600 text-sm">
      Collecting data…
    </div>
  )
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
               tickFormatter={d => d.split('-').slice(1).join('/')} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
        <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Area type="monotone" dataKey="count" fill="url(#areaGrad)" stroke="none" />
        <Bar dataKey="count" fill="url(#barGrad)" radius={[5, 5, 0, 0]} maxBarSize={44} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── Zone breakdown ────────────────────────────────────────────────────────────
function ZoneBreakdown({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.avg_fill_pct))
  return (
    <div className="space-y-3.5">
      {data.map((z, i) => {
        const color = getFillColor(z.avg_fill_pct)
        const label = getFillLabel(z.avg_fill_pct)
        return (
          <div key={z.zone}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 text-xs font-mono w-4 text-right">#{i + 1}</span>
                <span className="text-sm font-medium text-slate-200 capitalize">{z.zone}</span>
                <span className="text-xs text-slate-600">{z.bins} bins</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={label} label={label} />
                <span className="text-xs font-mono w-9 text-right" style={{ color }}>{z.avg_fill_pct}%</span>
              </div>
            </div>
            <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${(z.avg_fill_pct / max) * 100}%`, background: color,
                            boxShadow: z.avg_fill_pct >= 70 ? `0 0 8px ${color}60` : 'none' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Fill forecast list ────────────────────────────────────────────────────────
function ForecastList({ data }) {
  if (!data?.length) return (
    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">No bins tracked</div>
  )
  return (
    <div className="space-y-2 overflow-y-auto max-h-64">
      {data.map(b => {
        const urgent = b.estimated_hours_to_full < 6
        const soon   = b.estimated_hours_to_full < 24
        const timeColor = urgent ? '#ef4444' : soon ? '#f97316' : '#64748b'
        const timeLabel = b.estimated_hours_to_full < 24
          ? `${b.estimated_hours_to_full}h`
          : `${Math.round(b.estimated_hours_to_full / 24)}d`
        return (
          <div key={b.bin_id} className="flex items-center gap-3 px-1 py-0.5 rounded-lg transition-colors"
               style={{ background: urgent ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
            <div className="w-14 shrink-0">
              <p className="text-xs font-mono text-slate-400">{b.bin_id}</p>
            </div>
            <div className="flex-1">
              <ProgressBar value={b.current_fill_pct} showLabel={false} height="h-2" />
            </div>
            <div className="w-24 shrink-0 text-right">
              <p className="text-xs font-mono text-slate-300">{b.current_fill_pct}%</p>
              <p className="text-xs font-medium" style={{ color: timeColor }}>
                {timeLabel} to full
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { state } = useApp()
  const { get } = useApi()
  const [daily, setDaily]     = useState([])
  const [zones, setZones]     = useState([])
  const [forecast, setForecast] = useState([])
  const [summary, setSummary] = useState(state.summary)

  useEffect(() => {
    Promise.all([
      get('/analytics/daily?days=7'),
      get('/analytics/zones'),
      get('/analytics/forecast'),
      get('/analytics/summary'),
    ]).then(([d, z, f, s]) => {
      setDaily(d.data ?? [])
      setZones(z)
      setForecast(f)
      setSummary(s)
    }).catch(() => {})

    const iv = setInterval(() => {
      get('/analytics/summary').then(setSummary).catch(() => {})
      get('/analytics/forecast').then(setForecast).catch(() => {})
    }, 10000)
    return () => clearInterval(iv)
  }, [get])

  const liveSummary = state.summary ?? summary
  const criticalColor = (liveSummary?.critical_bins ?? 0) > 0 ? 'red' : 'green'

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto px-4 py-3">

      {/* Stats — critical bins gets red treatment when non-zero */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Layers}        label="Active Bins"   value={liveSummary?.active_bins ?? '—'}               color="blue"        />
        <StatCard icon={TrendingUp}    label="Avg Fill"      value={`${liveSummary?.avg_fill_pct ?? 0}%`}           color="violet"      />
        <StatCard icon={AlertTriangle} label="Critical Bins" value={liveSummary?.critical_bins ?? 0}               color={criticalColor} />
        <StatCard icon={Cpu}           label="Items Today"   value={liveSummary?.items_today ?? 0}                 color="cyan"        />
      </div>

      {/* Daily volume chart — full width */}
      <div className="glass-card border border-slate-800/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-300">Daily Waste Volume</h3>
            <p className="text-xs text-slate-600 mt-0.5">Last 7 days · events per day</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'linear-gradient(#6366f1, #3b82f6)' }} />
              Events
            </span>
          </div>
        </div>
        <DailyVolumeChart data={daily} />
      </div>

      {/* Zone breakdown + fill forecast side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3">

        <div className="glass-card border border-slate-800/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Zone Breakdown</h3>
            <span className="text-xs text-slate-600">{zones.length} zones</span>
          </div>
          <ZoneBreakdown data={zones} />
        </div>

        <div className="glass-card border border-slate-800/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Fill Forecast</h3>
            <span className="text-xs text-slate-600 flex items-center gap-1">
              <Clock size={11} /> live estimate
            </span>
          </div>
          <ForecastList data={forecast} />
        </div>
      </div>
    </div>
  )
}
