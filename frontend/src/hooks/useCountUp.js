import { useEffect, useRef, useState } from 'react'

/**
 * Animates a numeric value from its previous state to a new target
 * whenever the target changes. Uses ease-out cubic so it decelerates nicely.
 *
 * Usage:
 *   const animated = useCountUp(rawValue)
 *   // pass `animated` to formatKg / Math.round / toFixed before rendering
 */
export function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(0)
  const displayRef = useRef(0)
  const raf = useRef(null)

  useEffect(() => {
    const from = displayRef.current
    if (Math.abs(from - target) < 0.01) return
    if (raf.current) cancelAnimationFrame(raf.current)

    let startTime = null
    const animate = (ts) => {
      if (!startTime) startTime = ts
      const p = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3) // ease-out cubic
      const val = from + (target - from) * eased
      displayRef.current = val
      setDisplay(val)
      if (p < 1) raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])

  return display
}
