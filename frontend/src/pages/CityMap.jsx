import { useEffect, useState } from 'react'
import { Layers, AlertTriangle, Cpu, Recycle, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useApi } from '../hooks/useApi'
import StatCard from '../components/Layout/StatCard'
import CityMapView from '../components/Map/CityMapView'
import AlertBanner from '../components/common/AlertBanner'
import { WASTE_COLORS, WASTE_ICONS, getFillColor } from '../utils/constants'
import { formatRelativeTime } from '../utils/formatters'

function LiveEventFeed({ events }) {
  if (!events.length) return (
    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
      Waiting for events…
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
      {events.map((ev, i) => {
        const color = WASTE_COLORS[ev.label] ?? '#94a3b8'
        const icon  = WASTE_ICONS[ev.label]  ?? '🗑️'
        return (
          <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800/40 transition-colors group">
            <span className="text-base shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate" style={{ color }}>
                {ev.label}
                <span className="text-slate-600 ml-1">·{(ev.confidence * 100).toFixed(0)}%</span>
              </p>
              <p className="text-xs text-slate-600 truncate">{ev.bin_id}</p>
            </div>
            <span className="text-xs text-slate-700 shrink-0">{formatRelativeTime(ev.timestamp)}</span>
            {ev.source === 'hardware' && (
              <span className="text-xs text-blue-400 shrink-0">⚡</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CityMap() {
  const { state } = useApp()
  const { get } = useApi()
  const [summary, setSummary] = useState(state.summary)
  const [panTo, setPanTo] = useState(null)

  useEffect(() => {
    get('/analytics/summary').then(setSummary).catch(() => {})
  }, [get])

  // Keep summary in sync with live event count from context
  const liveSummary = state.summary ?? summary

  const criticalBins = state.bins.filter(b => b.current_fill_pct >= 80)

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Stat row */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pt-3 pb-2">
        <StatCard icon={Layers}   label="Total Bins"   value={liveSummary?.total_bins ?? state.bins.length} color="blue"   />
        <StatCard icon={AlertTriangle} label="Critical Bins" value={liveSummary?.critical_bins ?? criticalBins.length} color={criticalBins.length > 0 ? 'red' : 'green'} sub={criticalBins.length ? 'need collection' : 'all clear'} />
        <StatCard icon={Cpu}      label="Items Today"  value={liveSummary?.items_today ?? 0} color="violet"  />
        <StatCard icon={Zap}      label="E-Waste Today" value={liveSummary?.ewaste_today ?? 0} color="cyan" sub="batteries detected" />
      </div>

      {/* Main content: map + live feed */}
      <div className="flex-1 flex gap-3 px-4 pb-2 min-h-0">

        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-800/60 relative min-h-0">
          <CityMapView panTo={panTo} showTrucks showYard />

          {/* Map overlay legend */}
          <div className="absolute bottom-3 left-3 z-[1000] glass-card px-3 py-2 text-xs space-y-1.5">
            <p className="text-slate-500 font-medium text-xs mb-1">Fill Level</p>
            {[['< 40%','#22c55e','Low'],['40–70%','#f59e0b','Medium'],['70–90%','#f97316','High'],['≥ 90%','#ef4444','Critical']].map(([range,clr,lbl])=>(
              <div key={lbl} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{background:clr}} />
                <span className="text-slate-400">{range} — {lbl}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-800">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-400">Live hardware (BIN-07)</span>
            </div>
          </div>
        </div>

        {/* Live event feed */}
        <div className="w-56 shrink-0 glass-card flex flex-col overflow-hidden border border-slate-800/60">
          <div className="px-3 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Live Events</span>
            <span className="text-xs text-slate-600">{state.events.length}</span>
          </div>
          <LiveEventFeed events={state.events} />
        </div>
      </div>

      {/* Alert banners */}
      {state.alerts.length > 0 && (
        <div className="shrink-0">
          <AlertBanner />
        </div>
      )}
    </div>
  )
}
