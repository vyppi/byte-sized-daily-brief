import { XMLParser } from 'fast-xml-parser'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text'
})

const engineeringFeeds = [
  ['GitHub Engineering', 'https://github.blog/engineering/feed/', 'Engineering'],
  ['Microsoft Dev Blogs', 'https://devblogs.microsoft.com/feed/', 'Developer tools'],
  ['Martin Fowler', 'https://martinfowler.com/feed.atom', 'Architecture'],
  ['Lobsters', 'https://lobste.rs/rss', 'Programming'],
  ['Stack Overflow Blog', 'https://stackoverflow.blog/feed/', 'Software']
]

const managementFeeds = [
  ['The Pragmatic Engineer', 'https://newsletter.pragmaticengineer.com/feed', 'Leadership'],
  ['LeadDev', 'https://leaddev.com/rss.xml', 'Management'],
  ['Irrational Exuberance', 'https://lethain.com/feeds/', 'Leadership'],
  ['Charity Majors', 'https://charity.wtf/feed/', 'Engineering culture'],
  ['Atlassian Leadership', 'https://www.atlassian.com/blog/leadership/feed', 'Team systems'],
  ['Scott Berkun', 'https://scottberkun.com/feed/', 'Leadership']
]

const newsFeeds = [
  ['BBC News India', 'https://feeds.bbci.co.uk/news/world/asia/india/rss.xml', 'India', 'india'],
  ['BBC News World', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'World', 'world'],
  ['UN News', 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', 'World', 'world']
]

const today = new Date()
const editionDate = today.toISOString().slice(0, 10)
const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000)

function text(value) {
  if (typeof value === 'string') return value
  if (value && typeof value.text === 'string') return value.text
  return ''
}

function stripMarkup(value) {
  return text(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function itemLink(item) {
  if (typeof item.link === 'string') return item.link
  if (item.link?.href) return item.link.href
  if (Array.isArray(item.link)) return item.link.find((link) => link.rel !== 'self')?.href || ''
  return item.guid?.text || item.guid || ''
}

function makeId(url, title) {
  return createHash('sha1').update(`${url}|${title}`).digest('hex').slice(0, 14)
}

function normalizeUrl(value) {
  try {
    const url = new URL(value)
    ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) =>
      url.searchParams.delete(key)
    )
    url.hash = ''
    return url.toString()
  } catch {
    return value
  }
}

function normalizeFeed(xml, [source, , topic], track) {
  const parsed = parser.parse(xml)
  const rawItems = parsed.rss?.channel?.item || parsed.feed?.entry || []

  return (Array.isArray(rawItems) ? rawItems : [rawItems])
    .map((item) => {
      const title = stripMarkup(item.title)
      const url = normalizeUrl(itemLink(item))
      const summary = stripMarkup(item.description || item.summary || item.content).slice(0, 260)
      const publishedAt = item.pubDate || item.published || item.updated || new Date().toISOString()
      return {
        id: makeId(url, title),
        title,
        url,
        source,
        topic,
        track,
        section: 'brief',
        summary,
        publishedAt,
        readingMinutes: 5
      }
    })
    .filter((item) => item.title && item.url)
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'ByteSizedDailyBrief/0.1 (+https://github.com/)' },
    signal: AbortSignal.timeout(15000)
  })
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.text()
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options)
      if (response.status === 429 && attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000))
        continue
      }
      return response
    } catch (error) {
      lastError = error
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 3000))
      }
    }
  }
  throw lastError || new Error(`Request failed after ${attempts} attempts: ${url}`)
}

async function fetchHackerNews() {
  const idsResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
    signal: AbortSignal.timeout(15000)
  })
  if (!idsResponse.ok) throw new Error(`Hacker News returned ${idsResponse.status}`)
  const ids = (await idsResponse.json()).slice(0, 18)
  const stories = await Promise.all(
    ids.map(async (id) => {
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
        signal: AbortSignal.timeout(10000)
      })
      if (!response.ok) throw new Error(`Hacker News item ${id} returned ${response.status}`)
      return response.json()
    })
  )

  return stories
    .filter((story) => story?.title && story?.url)
    .map((story) => ({
      id: `hn-${story.id}`,
      title: story.title,
      url: normalizeUrl(story.url),
      source: 'Hacker News',
      topic: 'Community signal',
      track: 'engineering',
      section: 'brief',
      summary: `${story.score || 0} points and ${story.descendants || 0} comments on Hacker News.`,
      publishedAt: new Date(story.time * 1000).toISOString(),
      readingMinutes: 5,
      signal: story.score || 0
    }))
}

async function fetchGdelt(query, section) {
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: '14',
    format: 'json',
    sort: 'hybridrel'
  })
  const response = await fetchWithRetry(
    `https://api.gdeltproject.org/api/v2/doc/doc?${params}`,
    {
      headers: { 'User-Agent': 'ByteSizedDailyBrief/0.1 (+https://github.com/)' },
      signal: AbortSignal.timeout(30000)
    }
  )
  if (!response.ok) throw new Error(`GDELT ${section} returned ${response.status}`)
  const payload = await response.json()

  return (payload.articles || []).map((article) => ({
    id: makeId(article.url, article.title),
    title: article.title,
    url: normalizeUrl(article.url),
    source: article.domain || article.sourcecountry || 'News source',
    topic: section === 'india' ? 'India' : 'World',
    track: 'both',
    section,
    summary: `Published by ${article.domain || 'the original news source'}. Open the article for full context.`,
    publishedAt: article.seendate || new Date().toISOString(),
    readingMinutes: 4
  }))
}

function score(item) {
  const ageHours = Math.max(0, (Date.now() - new Date(item.publishedAt).getTime()) / 3600000)
  const freshness = Math.max(0, 100 - ageHours * 1.3)
  const community = Math.min(100, item.signal || 20)
  return freshness * 0.65 + community * 0.35
}

function deduplicate(items) {
  const seenUrls = new Set()
  const seenTitles = new Set()
  return items.filter((item) => {
    const titleKey = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80)
    if (seenUrls.has(item.url) || seenTitles.has(titleKey)) return false
    seenUrls.add(item.url)
    seenTitles.add(titleKey)
    return true
  })
}

function capSources(items, limit = 3) {
  const counts = new Map()
  return items.filter((item) => {
    const count = counts.get(item.source) || 0
    if (count >= limit) return false
    counts.set(item.source, count + 1)
    return true
  })
}

async function loadFallback() {
  return JSON.parse(await readFile(new URL('../src/data/fallback.json', import.meta.url), 'utf8'))
}

const jobs = [
  ['Hacker News', fetchHackerNews],
  ...engineeringFeeds.map((feed) => [feed[0], async () => normalizeFeed(await fetchText(feed[1]), feed, 'engineering')]),
  ...managementFeeds.map((feed) => [feed[0], async () => normalizeFeed(await fetchText(feed[1]), feed, 'management')]),
  ['GDELT India', () => fetchGdelt('sourcecountry:IN', 'india')],
  ['GDELT World', () => fetchGdelt('sourcelang:english -sourcecountry:IN', 'world')],
  ...newsFeeds.map((feed) => [
    feed[0],
    async () =>
      normalizeFeed(await fetchText(feed[1]), feed, 'both').map((item) => ({
        ...item,
        section: feed[3]
      }))
  ])
]

const results = await Promise.allSettled(jobs.map(([, run]) => run()))
const fetchedItems = []

results.forEach((result, index) => {
  const source = jobs[index][0]
  if (result.status === 'fulfilled') {
    console.log(`[feed] ${source}: ${result.value.length} items`)
    fetchedItems.push(...result.value)
  } else {
    console.error(`[feed] ${source} failed: ${result.reason.message}`)
  }
})

const fallback = await loadFallback()
const merged = deduplicate([...fetchedItems, ...fallback.items])
const ranked = capSources(
  merged
    .filter((item) => {
      if (!['india', 'world'].includes(item.section)) return true
      const publishedAt = new Date(item.publishedAt).getTime()
      return Number.isFinite(publishedAt) && Date.now() - publishedAt <= 48 * 60 * 60 * 1000
    })
    .sort((a, b) => score(b) - score(a))
)

const selected = [
  ...ranked.filter((item) => item.section === 'brief' && item.track === 'engineering').slice(0, 12),
  ...ranked.filter((item) => item.section === 'brief' && item.track === 'management').slice(0, 12),
  ...ranked.filter((item) => item.section === 'india').slice(0, 10),
  ...ranked.filter((item) => item.section === 'world').slice(0, 10)
]

if (!selected.length) {
  throw new Error('No daily brief items were generated from live feeds or fallback data.')
}

const output = {
  editionDate,
  edition: `${today.getFullYear()}.${String(dayOfYear).padStart(3, '0')}`,
  generatedAt: new Date().toISOString(),
  items: selected
}

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/data/latest.json', import.meta.url), JSON.stringify(output, null, 2))
console.log(`[brief] wrote ${selected.length} items for ${editionDate}`)
