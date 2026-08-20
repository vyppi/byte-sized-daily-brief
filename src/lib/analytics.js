const VISITOR_KEY = 'byte-sized-anonymous-visitor'
const VISIT_HISTORY_KEY = 'byte-sized-visit-history'
const OPT_OUT_KEY = 'byte-sized-analytics-opt-out'
const connectionString = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING

let client
let clientPromise
let activeSession

function analyticsAllowed() {
  return (
    Boolean(connectionString) &&
    navigator.doNotTrack !== '1' &&
    localStorage.getItem(OPT_OUT_KEY) !== 'true'
  )
}

function getOrCreateVisitorId() {
  const existing = localStorage.getItem(VISITOR_KEY)
  if (existing) return existing
  const visitorId = crypto.randomUUID()
  localStorage.setItem(VISITOR_KEY, visitorId)
  return visitorId
}

async function getClient() {
  if (!analyticsAllowed()) return null
  if (client) return client
  if (clientPromise) return clientPromise

  clientPromise = import('@microsoft/applicationinsights-web').then(({ ApplicationInsights }) => {
    client = new ApplicationInsights({
      config: {
        connectionString,
        disableAjaxTracking: true,
        disableExceptionTracking: true,
        disableFetchTracking: true,
        disableCookiesUsage: true,
        enableAutoRouteTracking: false
      }
    })
    client.loadAppInsights()
    return client
  })
  return clientPromise
}

function readVisitHistory() {
  try {
    return JSON.parse(localStorage.getItem(VISIT_HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function visitContext(edition) {
  const previousVisits = readVisitHistory()
  const previousDate = previousVisits.at(-1)
  const editionTime = Date.parse(`${edition}T00:00:00Z`)
  const previousTime = previousDate ? Date.parse(`${previousDate}T00:00:00Z`) : Number.NaN
  const daysSinceLastVisit = Number.isFinite(previousTime)
    ? Math.max(0, Math.round((editionTime - previousTime) / 86400000))
    : -1
  const cutoff = editionTime - 6 * 86400000
  const updatedVisits = [...new Set([...previousVisits, edition])]
    .filter((date) => Date.parse(`${date}T00:00:00Z`) >= cutoff)
    .sort()

  localStorage.setItem(VISIT_HISTORY_KEY, JSON.stringify(updatedVisits))
  return {
    isReturningVisitor: previousVisits.length > 0,
    daysSinceLastVisit,
    visitsLast7Days: updatedVisits.length
  }
}

export function trackProductEvent(name, properties = {}, measurements = {}) {
  getClient().then((appInsights) => {
    if (!appInsights) return
    appInsights.trackEvent(
      { name, measurements },
      {
        anonymousVisitorId: getOrCreateVisitorId(),
        sessionId: activeSession?.id,
        ...properties
      }
    )
  })
}

export function beginBriefSession(edition) {
  if (activeSession?.edition === edition) return activeSession

  activeSession = {
    id: crypto.randomUUID(),
    edition,
    startedAt: Date.now(),
    secondsBeforeFirstOpen: null
  }
  trackProductEvent('brief_viewed', { edition, ...visitContext(edition) })
  return activeSession
}

export function endBriefSession({
  edition,
  engagedSeconds,
  maxScrollDepth,
  articleOpenCount
}) {
  if (!activeSession || activeSession.ended) return
  activeSession.ended = true

  trackProductEvent(
    'page_session_ended',
    {
      edition,
      firstOpenSeconds: activeSession.secondsBeforeFirstOpen ?? -1
    },
    {
      engagedSeconds,
      maxScrollDepth,
      articleOpenCount
    }
  )
  getClient().then((appInsights) => appInsights?.flush())
}
