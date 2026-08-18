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
      [item.title, item.source, item.topic, item.summary]
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
