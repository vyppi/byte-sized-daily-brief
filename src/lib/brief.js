export const TRACKS = {
  engineering: {
    label: 'Core engineering',
    description: 'Architecture, code, infrastructure, AI, security and the craft.'
  },
  management: {
    label: 'Management track',
    description: 'Teams, delivery, hiring, product judgment and leadership.'
  }
}

export function filterItems(items, { track, query = '', section } = {}) {
  const normalizedQuery = query.trim().toLowerCase()

  return items.filter((item) => {
    const trackMatches = !track || item.track === track || item.track === 'both'
    const sectionMatches = !section || item.section === section
    const queryMatches =
      !normalizedQuery ||
      [item.title, item.source, item.topic, item.summary, item.whyRead]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))

    return trackMatches && sectionMatches && queryMatches
  })
}

export function readingTime(item) {
  return Math.max(3, Math.min(12, item.readingMinutes || 5))
}

export function formatEditionDate(dateValue) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date(`${dateValue}T00:00:00`))
}

export function formatPublishedDate(dateValue) {
  if (!dateValue) return 'Classic'
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short'
  }).format(date)
}

export function formatRefreshTime(dateValue, now = Date.now()) {
  const timestamp = new Date(dateValue).getTime()
  if (!Number.isFinite(timestamp)) return 'recently'
  const minutes = Math.max(0, Math.round((now - timestamp) / 60000))
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
