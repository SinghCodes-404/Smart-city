import { useEffect, useState } from 'react'
import { Recycle, Leaf, AlertTriangle, Package } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApi } from '../hooks/useApi'
import { useCountUp } from '../hooks/useCountUp'
import StatCard from '../components/Layout/StatCard'
import { WASTE_COLORS } from '../utils/constants'
import { formatKg } from '../utils/formatters'

// ── SVG gear icon (spins when active) ────────────────────────────────────────
function GearIcon({ cx, cy, active }) {
  const teeth = 8, ro = 20, ri = 13
  const pts = Array.from({ length: teeth * 2 }, (_, i) => {
    const a = (i * Math.PI) / teeth - Math.PI / 2
    const r = i % 2 === 0 ? ro : ri
    return `${i === 0 ? 'M' : 'L'} ${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`
  }).join(' ') + ' Z'
  return (
    <g transform={`translate(${cx},${cy})`}>
      <g style={{ animation: active ? 'spin-slow 3s linear infinite' : 'none', transformOrigin: '0px 0px' }}>
        <path d={pts} fill="#7c3aed" stroke="#a78bfa" strokeWidth="1.5" />
        <circle r={ro * 0.32} fill="#1e1b4b" stroke="#a78bfa" strokeWidth="1.5" />
      </g>
    </g>
  )
}

// ── Animated SVG pipe ─────────────────────────────────────────────────────────
function Pipe({ d, color, w = 3, dur = '0.9s', active }) {
  return (
    <>
      <path d={d} stroke={color} strokeWidth={w + 5} fill="none" opacity={active ? 0.1 : 0} />
      <path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round"
            strokeDasharray="12 6"
            style={{ animation: active ? `flow-anim ${dur} linear infinite` : 'none', opacity: active ? 0.85 : 0.18 }} />
    </>
  )
}

// ── Large animated processing flow diagram ────────────────────────────────────
function ProcessingFlow({ today }) {
  const total    = today?.total_weight_kg ?? 0
  const ewaste   = today?.ewaste_kg ?? 0
  const dry      = today?.dry_waste_kg ?? 0
  const landfill = today?.landfill_kg ?? 0
  const active   = total > 0
  const pct      = (v) => total > 0 ? Math.round((v / total) * 100) : 0

  const animTotal    = useCountUp(total)
  const animEwaste   = useCountUp(ewaste)
  const animDry      = useCountUp(dry)
  const animLandfill = useCountUp(landfill)

  return (
    <div className="glass-card border border-slate-800/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300">Live Processing Flow</h3>
        <div className="flex items-center gap-2">
          {active
            ? <><span className="w-2 h-2 rounded-full bg-emerald-400"
                       style={{ animation: 'node-glow 2s ease-in-out infinite' }} />
               <span className="text-xs text-emerald-400 font-medium">Processing</span></>
            : <span className="text-xs text-slate-600">Awaiting intake</span>}
        </div>
      </div>

      {/* SVG flow diagram — viewBox 860×215 */}
      <svg viewBox="0 0 860 215" width="100%" style={{ display: 'block' }}>

        {/* ── PIPES ── */}
        {/* Incoming → Sorting */}
        <Pipe d="M 165,107 L 345,107" color="#6366f1" w={4} dur="0.85s" active={active} />
        {/* Sorting → E-waste (curve up) */}
        <Pipe d="M 495,107 C 555,107 550,46 620,46" color="#06b6d4" w={3} dur="0.7s" active={active && ewaste > 0} />
        {/* Sorting → Dry (straight) */}
        <Pipe d="M 495,107 L 620,107" color="#3b82f6" w={3.5} dur="0.8s" active={active && dry > 0} />
        {/* Sorting → Landfill (curve down) */}
        <Pipe d="M 495,107 C 555,107 550,168 620,168" color="#475569" w={2} dur="1.2s" active={active && landfill > 0} />

        {/* ── INCOMING NODE ── */}
        <rect x="10" y="72" width="155" height="70" rx="13"
              fill="#080f1e" stroke="#3b82f6" strokeWidth="1.5"
              strokeOpacity={active ? 0.6 : 0.2} />
        {active && (
          <rect x="10" y="72" width="155" height="70" rx="13" fill="none"
                stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.25"
                style={{ animation: 'node-glow 3s ease-in-out infinite' }} />
        )}
        <text x="88" y="92" textAnchor="middle" fill="#93c5fd" fontSize="10.5"
              fontWeight="600" fontFamily="system-ui,sans-serif">🚛 INCOMING</text>
        <text x="88" y="114" textAnchor="middle" fill="white" fontSize="18"
              fontFamily="monospace" fontWeight="700">{formatKg(animTotal)}</text>
        <text x="88" y="130" textAnchor="middle" fill="#60a5fa" fontSize="9"
              fontFamily="system-ui,sans-serif">total collected today</text>

        {/* ── SORTING NODE ── */}
        <rect x="345" y="58" width="150" height="98" rx="14"
              fill="#100b28" stroke="#7c3aed" strokeWidth="1.5"
              strokeOpacity={active ? 0.65 : 0.2} />
        <GearIcon cx={420} cy={96} active={active} />
        <text x="420" y="133" textAnchor="middle" fill="#c4b5fd" fontSize="10.5"
              fontWeight="600" fontFamily="system-ui,sans-serif">SORTING</text>
        <text x="420" y="148" textAnchor="middle" fill="#a78bfa" fontSize="9"
              fontFamily="system-ui,sans-serif">CLASSIFICATION</text>

        {/* ── E-WASTE OUTPUT NODE ── */}
        <rect x="620" y="20" width="230" height="52" rx="11"
              fill="#031620" stroke="#06b6d4" strokeWidth="1.5"
              strokeOpacity={ewaste > 0 ? 0.65 : 0.15} />
        <text x="735" y="37" textAnchor="middle" fill="#22d3ee" fontSize="11"
              fontWeight="700" fontFamily="system-ui,sans-serif">⚡ E-WASTE</text>
        <text x="735" y="54" textAnchor="middle" fill="white" fontSize="14"
              fontFamily="monospace" fontWeight="700">{formatKg(animEwaste)}</text>
        <text x="735" y="66" textAnchor="middle" fill="#67e8f9" fontSize="8.5"
              fontFamily="system-ui,sans-serif">{pct(ewaste)}%  ·  Certified Recycler</text>

        {/* ── DRY WASTE OUTPUT NODE ── */}
        <rect x="620" y="86" width="230" height="42" rx="11"
              fill="#050f20" stroke="#3b82f6" strokeWidth="1.5"
              strokeOpacity={dry > 0 ? 0.6 : 0.15} />
        <text x="735" y="103" textAnchor="middle" fill="#93c5fd" fontSize="11"
              fontWeight="700" fontFamily="system-ui,sans-serif">📦 DRY WASTE</text>
        <text x="735" y="121" textAnchor="middle" fill="white" fontSize="13"
              fontFamily="monospace" fontWeight="700">
          {formatKg(animDry)}
          <tspan fill="#60a5fa" fontSize="9" dx="4">{pct(dry)}%</tspan>
        </text>

        {/* ── RESIDUAL OUTPUT NODE ── */}
        <rect x="620" y="136" width="230" height="64" rx="11"
              fill="#0c0f14" stroke="#475569" strokeWidth="1.5"
              strokeOpacity={landfill > 0 ? 0.5 : 0.15} />
        <text x="735" y="155" textAnchor="middle" fill="#94a3b8" fontSize="11"
              fontWeight="700" fontFamily="system-ui,sans-serif">🗑️ RESIDUAL</text>
        <text x="735" y="174" textAnchor="middle" fill="#cbd5e1" fontSize="13"
              fontFamily="monospace" fontWeight="700">
          {formatKg(animLandfill)}
          <tspan fill="#64748b" fontSize="9" dx="4">{pct(landfill)}%</tspan>
        </text>
        <text x="735" y="189" textAnchor="middle" fill="#475569" fontSize="8.5"
              fontFamily="system-ui,sans-serif">→ Sanitary Landfill</text>
      </svg>

      {/* Proportion bar */}
      {active && (
        <div className="mt-3 space-y-1.5">
          <div className="h-2 w-full rounded-full overflow-hidden flex gap-0.5">
            {ewaste   > 0 && <div className="h-full rounded-sm transition-all duration-700" style={{ width: `${pct(ewaste)}%`,   background: '#06b6d4' }} />}
            {dry      > 0 && <div className="h-full rounded-sm transition-all duration-700" style={{ width: `${pct(dry)}%`,      background: '#3b82f6' }} />}
            {landfill > 0 && <div className="h-full rounded-sm transition-all duration-700" style={{ width: `${pct(landfill)}%`, background: '#475569' }} />}
          </div>
          <div className="flex justify-between text-xs text-slate-600 px-0.5">
            <span>⚡ E-Waste {pct(ewaste)}%</span>
            <span>📦 Dry {pct(dry)}%</span>
            <span>🗑️ Residual {pct(landfill)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Composition chart ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="glass-card px-3 py-2 border border-slate-700/60 text-xs">
      <p className="font-semibold text-white capitalize">{d.label}</p>
      <p className="text-slate-400">{d.count} events · {d.pct}%</p>
    </div>
  )
}

function CompositionChart({ data }) {
  if (!data?.length) return (
    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">No data</div>
  )
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 50 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }}
               axisLine={false} tickLine={false} width={50} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[0, 5, 5, 0]}>
          {data.map(d => <Cell key={d.label} fill={WASTE_COLORS[d.label] ?? '#64748b'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Environmental impact card ─────────────────────────────────────────────────
function EnvCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
         style={{ background: color + '08', borderColor: color + '25' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
           style={{ background: color + '18', border: `1px solid ${color}35` }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-base font-bold font-mono text-white">{value}</p>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function WasteYard() {
  const { get } = useApi()
  const [today, setToday] = useState(null)
  const [composition, setComposition] = useState([])
  const [env, setEnv] = useState(null)

  const animTotalKg  = useCountUp(today?.total_weight_kg ?? 0)
  const animEwasteKg = useCountUp(today?.ewaste_kg ?? 0)
  const animDryKg    = useCountUp(today?.dry_waste_kg ?? 0)
  const animRoutes   = useCountUp(today?.routes_completed ?? 0)

  useEffect(() => {
    get('/yard/today').then(setToday).catch(() => {})
    get('/yard/composition').then(d => setComposition(d.breakdown ?? [])).catch(() => {})
    get('/yard/environmental').then(setEnv).catch(() => {})
    const iv = setInterval(() => {
      get('/yard/today').then(setToday).catch(() => {})
      get('/yard/environmental').then(setEnv).catch(() => {})
    }, 8000)
    return () => clearInterval(iv)
  }, [get])

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto px-4 py-3">

      {/* Stat row */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Package}       label="Total Collected"     value={formatKg(animTotalKg)}   color="blue"   loading={!today} />
        <StatCard icon={AlertTriangle} label="E-Waste Diverted"   value={formatKg(animEwasteKg)}  color="cyan"   loading={!today} />
        <StatCard icon={Recycle}       label="Materials Recovered" value={formatKg(animDryKg)}    color="green"  loading={!today} />
        <StatCard icon={Leaf}          label="Routes Completed"   value={Math.round(animRoutes)}  color="violet" loading={!today} />
      </div>

      {/* Large animated processing flow */}
      <ProcessingFlow today={today} />

      {/* Bottom row: composition + environmental */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3">

        {/* Composition chart */}
        <div className="glass-card border border-slate-800/60 p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Waste Composition <span className="text-slate-600 font-normal">(7 days)</span></h3>
          <CompositionChart data={composition} />
          <div className="mt-3 flex flex-wrap gap-2">
            {composition.map(d => (
              <span key={d.label} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border"
                    style={{ color: WASTE_COLORS[d.label] ?? '#94a3b8',
                             borderColor: (WASTE_COLORS[d.label] ?? '#94a3b8') + '30',
                             background: (WASTE_COLORS[d.label] ?? '#94a3b8') + '0f' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: WASTE_COLORS[d.label] ?? '#94a3b8' }} />
                {d.label} {d.pct}%
              </span>
            ))}
          </div>
        </div>

        {/* Environmental impact */}
        <div className="glass-card border border-slate-800/60 p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Environmental Impact</h3>
          <div className="space-y-2.5">
            <EnvCard icon={Leaf}          label="CO₂ Offset"           value={`${(env?.co2_offset_kg ?? 0).toFixed(1)} kg`}           color="#22c55e" />
            <EnvCard icon={Recycle}       label="Materials Recovered"   value={formatKg(env?.total_materials_recovered_kg)}             color="#3b82f6" />
            <EnvCard icon={AlertTriangle} label="Hazardous Diverted"    value={`${env?.hazardous_diverted_pct ?? 0}%`}                  color="#f59e0b" />
          </div>
          {env && (
            <div className="mt-4 px-4 py-3 rounded-xl"
                 style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)' }}>
              <p className="text-xs text-emerald-400 font-medium">
                🌱 Equivalent to planting{' '}
                <span className="font-bold text-emerald-300">
                  {Math.round((env.co2_offset_kg ?? 0) / 21)}
                </span>{' '}
                trees this session
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
