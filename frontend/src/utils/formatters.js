export function formatRelativeTime(isoString) {
  if (!isoString) return '—'
  const diff = (Date.now() - new Date(isoString + (isoString.endsWith('Z') ? '' : 'Z')).getTime()) / 1000
  if (diff < 60)   return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString + (isoString.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function formatKg(kg) {
  if (kg === null || kg === undefined) return '—'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${kg.toFixed(1)} kg`
}

export function formatPct(v) {
  return `${Math.round(v)}%`
}

export function formatDistance(km) {
  return `${km.toFixed(1)} km`
}

export function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ') : ''
}
