import { useCallback } from 'react'
import { API_BASE } from '../utils/constants'

export function useApi() {
  const get = useCallback(async (path) => {
    const res = await fetch(`${API_BASE}${path}`)
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
    return res.json()
  }, [])

  const post = useCallback(async (path, body = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
    return res.json()
  }, [])

  return { get, post }
}
