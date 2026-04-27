import { useState } from 'react'
import { Radio } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useApi } from '../hooks/useApi'
import VirtualBin from '../components/EdgeNode/VirtualBin'
import DetectionButton from '../components/EdgeNode/DetectionButton'
import DeviceInfoCard from '../components/EdgeNode/DeviceInfoCard'
import DetectionLog from '../components/EdgeNode/DetectionLog'
import SessionStats from '../components/EdgeNode/SessionStats'

const sleep = ms => new Promise(r => setTimeout(r, ms))

const generateConfidence = (label) => {
  if (label === 'paper') return 0.89 + Math.random() * 0.10
  return 0.85 + Math.random() * 0.12
}

export default function EdgeNode() {
  const { state } = useApp()
  const { post } = useApi()

  // Animation phase: idle | flashing | classifying | result
  const [phase, setPhase] = useState('idle')
  const [flap, setFlap] = useState('center')
  const [lastDetection, setLastDetection] = useState(null)
  const [sessionEvents, setSessionEvents] = useState([])
  const [paperCount, setPaperCount] = useState(0)
  const [pencapCount, setPencapCount] = useState(0)
  const [toast, setToast] = useState(false)

  const bin07 = state.bins.find(b => b.id === 'BIN-07')
  const fillPct = bin07?.current_fill_pct ?? 0

  const handleDetect = async (label) => {
    if (phase !== 'idle') return

    const confidence = generateConfidence(label)
    const timestamp = new Date()

    // 0ms → flash on
    setPhase('flashing')

    // 300ms → classifying + fire POST
    await sleep(300)
    setPhase('classifying')

    const postPromise = post('/bins/BIN-07/event', {
      label,
      confidence: parseFloat(confidence.toFixed(4)),
      source: 'simulator',
    }).catch(e => console.error('Simulator event failed:', e))

    // 800ms → show result + animate flap
    await sleep(500)
    setPhase('result')
    setLastDetection({ label, confidence, timestamp })
    setFlap(label === 'paper' ? 'right' : 'left')

    // 1200ms → toast
    await sleep(400)
    setToast(true)
    await postPromise

    // 1600ms → add to log, reset flap
    await sleep(400)
    setSessionEvents(prev => [{ label, confidence, timestamp }, ...prev].slice(0, 15))
    if (label === 'paper') setPaperCount(c => c + 1)
    else setPencapCount(c => c + 1)
    setFlap('center')

    // 2000ms → re-enable
    await sleep(400)
    setToast(false)
    setPhase('idle')
  }

  const isAnimating = phase !== 'idle'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 pt-4 pb-3">
        <div>
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            <Radio size={15} className="text-blue-400" />
            Edge Node Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical hardware interface — BIN-07, Sector 17 Plaza
          </p>
        </div>
        {/* Connection badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span>Edge Node: BIN-07 — Connected</span>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="flex-1 flex gap-4 px-6 pb-4 min-h-0">

        {/* Left column — virtual bin + buttons (60%) */}
        <div className="flex-[3] flex flex-col gap-3 min-h-0">

          {/* Bin visualization card */}
          <div className="flex-1 glass-card flex flex-col items-center justify-center p-5 relative overflow-hidden min-h-0 border border-slate-800/60">
            <VirtualBin
              flap={flap}
              flashing={phase === 'flashing'}
              fillPct={fillPct}
              phase={phase}
              lastDetection={lastDetection}
            />

            {/* Toast */}
            {toast && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-xs font-medium
                bg-blue-500/20 border border-blue-500/30 text-blue-300 whitespace-nowrap animate-pulse-once pointer-events-none">
                ✓ Event sent to platform
              </div>
            )}
          </div>

          {/* Detection buttons */}
          <div className="shrink-0 grid grid-cols-2 gap-3">
            <DetectionButton label="paper"  onDetect={handleDetect} disabled={isAnimating} />
            <DetectionButton label="pencap" onDetect={handleDetect} disabled={isAnimating} />
          </div>
        </div>

        {/* Right column — device info, stats, log (40%) */}
        <div className="flex-[2] flex flex-col gap-3 min-h-0">
          <DeviceInfoCard fillPct={fillPct} />
          <SessionStats
            paperCount={paperCount}
            pencapCount={pencapCount}
            fillPct={fillPct}
          />
          <DetectionLog events={sessionEvents} />
        </div>
      </div>
    </div>
  )
}
