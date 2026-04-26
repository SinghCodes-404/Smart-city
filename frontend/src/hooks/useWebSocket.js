import { useEffect, useRef, useCallback } from 'react'
import { WS_URL } from '../utils/constants'
import { useApp } from '../context/AppContext'

const BACKOFF = [1000, 2000, 4000, 8000, 16000, 30000]

export function useWebSocket() {
  const { dispatch } = useApp()
  const wsRef   = useRef(null)
  const attempt = useRef(0)
  const timer   = useRef(null)
  const alive   = useRef(true)

  const connect = useCallback(() => {
    if (!alive.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    dispatch({ type: 'WS_STATUS', payload: 'connecting' })

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      attempt.current = 0
      dispatch({ type: 'WS_STATUS', payload: 'connected' })
    }

    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data)
        if (msg.type && msg.data) dispatch({ type: msg.type, data: msg.data })
      } catch { /* ignore malformed */ }
    }

    ws.onclose = () => {
      if (!alive.current) return
      dispatch({ type: 'WS_STATUS', payload: 'reconnecting' })
      const delay = BACKOFF[Math.min(attempt.current, BACKOFF.length - 1)]
      attempt.current++
      timer.current = setTimeout(connect, delay)
    }

    ws.onerror = () => ws.close()
  }, [dispatch])

  useEffect(() => {
    alive.current = true
    connect()
    return () => {
      alive.current = false
      clearTimeout(timer.current)
      wsRef.current?.close()
    }
  }, [connect])
}
