import { NavLink } from 'react-router-dom'
import { Map, Truck, Factory, BarChart3, Wifi, WifiOff, Play, Square, Zap, Cpu } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useApi } from '../../hooks/useApi'

const TABS = [
  { to: '/',          label: 'City Map',       icon: Map       },
  { to: '/fleet',     label: 'Fleet Dispatch', icon: Truck     },
  { to: '/yard',      label: 'Waste Yard',     icon: Factory   },
  { to: '/analytics', label: 'Analytics',      icon: BarChart3 },
]

const WS_CONFIG = {
  connected:    { color: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Live',        pulse: true  },
  connecting:   { color: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Connecting',  pulse: false },
  reconnecting: { color: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Reconnecting',pulse: false },
  disconnected: { color: 'text-red-400',     dot: 'bg-red-400',     label: 'Offline',     pulse: false },
}

export default function Navbar() {
  const { state, dispatch } = useApp()
  const { post } = useApi()

  const ws = WS_CONFIG[state.wsStatus] ?? WS_CONFIG.disconnected
  const sim = state.simStatus

  const toggleSim = async () => {
    try {
      const endpoint = sim.running ? '/simulation/stop' : '/simulation/start'
      const result = await post(endpoint)
      dispatch({ type: 'SIM_STATUS', payload: result })
    } catch (e) { console.error(e) }
  }

  const cycleSpeed = async () => {
    const steps = [1, 5, 10, 20, 50]
    const cur = sim.speed_multiplier
    const next = steps[(steps.indexOf(cur) + 1) % steps.length] ?? 1
    try {
      const result = await post('/simulation/speed', { multiplier: next })
      dispatch({ type: 'SIM_STATUS', payload: result })
    } catch (e) { console.error(e) }
  }

  return (
    <nav className="shrink-0 flex items-center px-5 h-14 border-b border-slate-800/60"
         style={{ background: 'rgba(3, 7, 18, 0.92)', backdropFilter: 'blur(20px)' }}>

      {/* Brand */}
      <div className="flex items-center gap-2.5 min-w-0 mr-6">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
          <Cpu size={16} className="text-white" />
        </div>
        <span className="hidden sm:block font-bold text-sm text-white whitespace-nowrap">
          SmartCity <span className="gradient-text">Waste Intelligence</span>
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-1 justify-center">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ` +
              (isActive
                ? 'nav-tab-active'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50')
            }
          >
            <Icon size={13} />
            <span className="hidden md:inline">{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Right: WS status + Simulation controls */}
      <div className="flex items-center gap-2 ml-4">

        {/* WebSocket indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${ws.color} bg-slate-900/60 border border-slate-800/60`}>
          <span className="relative flex h-2 w-2">
            <span className={`${ws.dot} absolute inline-flex h-full w-full rounded-full ${ws.pulse ? 'animate-ping opacity-75' : ''}`} />
            <span className={`${ws.dot} relative inline-flex rounded-full h-2 w-2`} />
          </span>
          <span className="hidden sm:inline">{ws.label}</span>
          {state.wsStatus === 'connected' ? <Wifi size={11} /> : <WifiOff size={11} />}
        </div>

        {/* Speed indicator (only when running) */}
        {sim.running && (
          <button onClick={cycleSpeed}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-colors">
            <Zap size={11} />
            <span>{sim.speed_multiplier}×</span>
          </button>
        )}

        {/* Start / Stop simulation */}
        <button
          onClick={toggleSim}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
            sim.running
              ? 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25'
              : 'bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25'
          }`}>
          {sim.running ? <><Square size={11} fill="currentColor" /> Stop</> : <><Play size={11} fill="currentColor" /> Simulate</>}
        </button>
      </div>
    </nav>
  )
}
