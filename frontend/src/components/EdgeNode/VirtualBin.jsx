export default function VirtualBin({ flap, flashing, fillPct, phase, lastDetection }) {
  const fill = Math.min(Math.max(fillPct, 0), 100) / 100

  const flapRotate = flap === 'right' ? 'rotate(28deg)' : flap === 'left' ? 'rotate(-28deg)' : 'rotate(0deg)'
  const cameraFill = flashing ? '#ffffff' : '#1e293b'
  const lensFill   = flashing ? '#e2e8f0' : '#0f172a'
  const irisFill   = flashing ? '#f8fafc' : '#1e40af'

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Bin SVG */}
      <div className="relative w-full max-w-[360px]">
        {/* Flash overlay */}
        <div
          className="absolute inset-0 rounded-xl pointer-events-none z-20"
          style={{
            background: 'white',
            opacity: phase === 'flashing' ? 0.72 : 0,
            transition: phase === 'flashing' ? 'none' : 'opacity 0.3s ease-out',
          }}
        />

        <svg viewBox="0 0 360 305" className="w-full" style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.5))' }}>
          <defs>
            {/* Clip each compartment to its rounded-rect bounds */}
            <clipPath id="clip-left">
              <rect x="16" y="43" width="160" height="213" rx="8" />
            </clipPath>
            <clipPath id="clip-right">
              <rect x="184" y="43" width="160" height="213" rx="8" />
            </clipPath>
          </defs>

          {/* ── Camera housing ── */}
          <text x="180" y="9" textAnchor="middle" fontSize="7.5" fill="#475569" fontFamily="monospace" letterSpacing="1">
            ESP32-CAM
          </text>
          <rect x="160" y="12" width="40" height="26" rx="5"
            fill={cameraFill} stroke="#334155" strokeWidth="1"
            style={{ transition: 'fill 0.1s' }} />
          <circle cx="180" cy="25" r="9"
            fill={lensFill} stroke="#475569" strokeWidth="1"
            style={{ transition: 'fill 0.1s' }} />
          <circle cx="180" cy="25" r="4.5"
            fill={irisFill} style={{ transition: 'fill 0.1s' }} />
          {/* lens glint */}
          <circle cx="177" cy="22" r="1.5" fill="rgba(255,255,255,0.4)" />

          {/* ── Bin body ── */}
          <rect x="15" y="42" width="330" height="216" rx="10"
            fill="#080e1c" stroke="#1e293b" strokeWidth="1.5" />

          {/* Left fill — non-biodegradable (amber), grows from bottom */}
          <g clipPath="url(#clip-left)">
            <rect x="16" y="43" width="160" height="213" rx="8"
              fill="#f97316" opacity="0.22"
              style={{
                transformBox: 'fill-box',
                transformOrigin: '50% 100%',
                transform: `scaleY(${fill})`,
                transition: 'transform 1.2s ease-out',
              }} />
          </g>

          {/* Right fill — biodegradable (green), grows from bottom */}
          <g clipPath="url(#clip-right)">
            <rect x="184" y="43" width="160" height="213" rx="8"
              fill="#22c55e" opacity="0.22"
              style={{
                transformBox: 'fill-box',
                transformOrigin: '50% 100%',
                transform: `scaleY(${fill})`,
                transition: 'transform 1.2s ease-out',
              }} />
          </g>

          {/* Center static separator */}
          <rect x="177" y="42" width="6" height="216" fill="#0d1525" />

          {/* Animated flap (middle of bin) */}
          <rect x="172" y="100" width="16" height="66" rx="3"
            fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1"
            style={{
              transformBox: 'fill-box',
              transformOrigin: '50% 50%',
              transform: flapRotate,
              transition: 'transform 0.4s ease-in-out',
            }} />
          {/* Flap grip lines */}
          <line x1="176" y1="126" x2="184" y2="126" stroke="#60a5fa" strokeWidth="1" opacity="0.6"
            style={{
              transformBox: 'fill-box',
              transformOrigin: '180px 133px',
              transform: flapRotate,
              transition: 'transform 0.4s ease-in-out',
            }} />
          <line x1="176" y1="133" x2="184" y2="133" stroke="#60a5fa" strokeWidth="1" opacity="0.6"
            style={{
              transformBox: 'fill-box',
              transformOrigin: '180px 133px',
              transform: flapRotate,
              transition: 'transform 0.4s ease-in-out',
            }} />
          <line x1="176" y1="140" x2="184" y2="140" stroke="#60a5fa" strokeWidth="1" opacity="0.6"
            style={{
              transformBox: 'fill-box',
              transformOrigin: '180px 133px',
              transform: flapRotate,
              transition: 'transform 0.4s ease-in-out',
            }} />

          {/* Compartment icons (fade as bin fills) */}
          <text x="96" y="185" textAnchor="middle" fontSize="30" opacity={Math.max(0.15, 0.55 - fill * 0.4)}>🔩</text>
          <text x="264" y="185" textAnchor="middle" fontSize="30" opacity={Math.max(0.15, 0.55 - fill * 0.4)}>📄</text>

          {/* Fill % labels */}
          <text x="96" y="57" textAnchor="middle" fontSize="8" fill="#f97316" opacity="0.6" fontFamily="monospace">
            {fillPct.toFixed(1)}%
          </text>
          <text x="264" y="57" textAnchor="middle" fontSize="8" fill="#22c55e" opacity="0.6" fontFamily="monospace">
            {fillPct.toFixed(1)}%
          </text>

          {/* Compartment labels */}
          <text x="96"  y="292" textAnchor="middle" fontSize="9.5" fill="#64748b" fontFamily="Inter, sans-serif">
            Non-biodegradable
          </text>
          <text x="264" y="292" textAnchor="middle" fontSize="9.5" fill="#64748b" fontFamily="Inter, sans-serif">
            Biodegradable
          </text>
        </svg>
      </div>

      {/* Classification result / status */}
      <div className="h-10 flex items-center justify-center w-full">
        {phase === 'flashing' && (
          <p className="text-xs text-slate-400 font-mono tracking-wide animate-pulse">Capturing image…</p>
        )}
        {phase === 'classifying' && (
          <p className="text-xs text-amber-400 font-mono tracking-wide animate-pulse">Classifying…</p>
        )}
        {(phase === 'result' || phase === 'done') && lastDetection && (
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-slate-800/70 border border-slate-700/50">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${lastDetection.label === 'paper' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-sm font-semibold text-white capitalize">{lastDetection.label}</span>
            <span className="text-xs font-mono text-slate-400">
              {(lastDetection.confidence * 100).toFixed(1)}% confidence
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
