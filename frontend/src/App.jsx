import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { useWebSocket } from './hooks/useWebSocket'
import { useApi } from './hooks/useApi'
import Navbar from './components/Layout/Navbar'
import CityMap from './pages/CityMap'
import FleetDispatch from './pages/FleetDispatch'
import WasteYard from './pages/WasteYard'
import Analytics from './pages/Analytics'

function AppShell() {
  const { dispatch } = useApp()
  const { get } = useApi()

  // Wire up WebSocket at app root so it runs across all pages
  useWebSocket()

  // Fetch initial REST data on mount
  useEffect(() => {
    Promise.all([
      get('/bins'),
      get('/trucks'),
      get('/analytics/summary'),
      get('/simulation/status'),
    ]).then(([bins, trucks, summary, simStatus]) => {
      dispatch({ type: 'INIT_BINS',    payload: bins })
      dispatch({ type: 'INIT_TRUCKS',  payload: trucks })
      dispatch({ type: 'INIT_SUMMARY', payload: summary })
      dispatch({ type: 'SIM_STATUS',   payload: simStatus })
    }).catch(err => console.warn('Initial fetch failed:', err))
  }, [dispatch, get])

  return (
    <div className="flex flex-col h-full bg-[#030712]">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/"          element={<CityMap />} />
          <Route path="/fleet"     element={<FleetDispatch />} />
          <Route path="/yard"      element={<WasteYard />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </BrowserRouter>
  )
}
