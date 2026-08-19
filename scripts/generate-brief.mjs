import { XMLParser } from 'fast-xml-parser'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text'
})

const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://vyppi.github.io/byte-sized-daily-brief'
const MAX_BRIEF_AGE_HOURS = 24 * 10
const MAX_NEWS_AGE_HOURS = 48

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

const relevancePatterns = {
  engineering: [
    /\bsoftware\b/i,
    /\bprogram(?:ming|mer)?\b/i,
    /\bdeveloper\b/i,
    /\bcode|coding\b/i,
    /\barchitecture\b/i,
    /\bdatabase\b/i,
    /\bdistributed\b/i,
    /\bcloud\b/i,
    /\bkubernetes\b/i,
    /\bsecurity|vulnerabilit/i,
    /\bpython|javascript|typescript|rust|java|dotnet|linux|macos\b/i,
    /\bcompiler|runtime|api|server|network|performance|testing\b/i,
    /\bopen source|github|framework|library|editor|terminal\b/i,
    /\bllm|ai agent|machine learning|model\b/i
  ],
  management: [
    /\bengineering (?:leader|manager|management)\b/i,
    /\bcto|vp of engineering|staff engineer\b/i,
    /\bleadership|leader\b/i,
    /\bteam|culture|hiring|career\b/i,
    /\bdelivery|roadmap|strategy|product\b/i,
    /\bone-on-one|burnout|organization|manager\b/i
  ]
}

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
    .replace(/&#8217;|&rsquo;/g, '’')
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

function ageHours(dateValue) {
  const timestamp = new Date(dateValue).getTime()
  return Number.isFinite(timestamp) ? Math.max(0, (Date.now() - timestamp) / 3600000) : Infinity
}

function summarizeReason(item) {
  if (item.source === 'Hacker News') {
    return `${item.signal || 0} points and ${item.comments || 0} comments make this an active technical discussion.`
  }

  const summary = stripMarkup(item.summary)
  if (summary.length >= 45 && summary.toLowerCase() !== 'comments') {
    const sentence = summary.match(/^.*?[.!?](?:\s|$)/)?.[0] || summary
    return sentence.slice(0, 165)
  }

  return `A fresh ${item.topic.toLowerCase()} perspective from ${item.source}.`
}

function normalizeFeed(xml, [source, , topic], track) {
  const parsed = parser.parse(xml)
  const rawItems = parsed.rss?.channel?.item || parsed.feed?.entry || []

  return (Array.isArray(rawItems) ? rawItems : [rawItems])
    .map((item) => {
      const title = stripMarkup(item.title)
      const url = normalizeUrl(itemLink(item))
      const summary = stripMarkup(item.description || item.summary || item.content).slice(0, 280)
      const publishedAt = item.pubDate || item.published || item.updated || new Date().toISOString()
      return {
        id: makeId(url, title),
        title,
        url,
        source,
        topic,
        track,
        section: 'brief',
        kind: 'current',
        summary,
        publishedAt,
        readingMinutes: 5
      }
    })
    .filter((item) => item.title && item.url)
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'ByteSizedDailyBrief/0.2 (+https://github.com/vyppi/byte-sized-daily-brief)' },
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
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 3000))
    }
  }
  throw lastError || new Error(`Request failed after ${attempts} attempts: ${url}`)
}

async function fetchHackerNews() {
  const idsResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
    signal: AbortSignal.timeout(15000)
  })
  if (!idsResponse.ok) throw new Error(`Hacker News returned ${idsResponse.status}`)
  const ids = (await idsResponse.json()).slice(0, 30)
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
      kind: 'current',
      summary: `${story.score || 0} points and ${story.descendants || 0} comments on Hacker News.`,
      publishedAt: new Date(story.time * 1000).toISOString(),
      readingMinutes: 5,
      signal: story.score || 0,
      comments: story.descendants || 0
    }))
}

async function fetchGdelt(query, section) {
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: '20',
    format: 'json',
    sort: 'hybridrel'
  })
  const response = await fetchWithRetry(
    `https://api.gdeltproject.org/api/v2/doc/doc?${params}`,
    {
      headers: { 'User-Agent': 'ByteSizedDailyBrief/0.2 (+https://github.com/vyppi/byte-sized-daily-brief)' },
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
    kind: 'news',
    summary: `Published by ${article.domain || 'the original news source'}.`,
    publishedAt: article.seendate || new Date().toISOString(),
    readingMinutes: 4
  }))
}

function relevanceScore(item, track) {
  const content = `${item.title} ${item.summary} ${item.topic}`
  const matches = relevancePatterns[track].filter((pattern) => pattern.test(content)).length
  const sourceAligned = item.track === track && !['Hacker News', 'Lobsters'].includes(item.source)
  return matches * 14 + (sourceAligned ? 35 : 0)
}

function editorialScore(item, track) {
  const freshness = Math.max(0, 100 - ageHours(item.publishedAt) * 1.2)
  const community = Math.min(100, item.signal || 15)
  return freshness * 0.45 + community * 0.2 + relevanceScore(item, track) * 0.35
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

function diverseSelect(items, count, sourceLimit = 2) {
  const selected = []
  const counts = new Map()

  for (const item of items) {
    if (!counts.has(item.source)) {
      selected.push(item)
      counts.set(item.source, 1)
      if (selected.length === count) return selected
    }
  }

  for (const item of items) {
    if (selected.some((selectedItem) => selectedItem.id === item.id)) continue
    const sourceCount = counts.get(item.source) || 0
    if (sourceCount >= sourceLimit) continue
    selected.push(item)
    counts.set(item.source, sourceCount + 1)
    if (selected.length === count) break
  }

  return selected
}

function selectTrack(items, track) {
  const relevant = items
    .filter((item) => item.section === 'brief' && item.track === track)
    .filter((item) => ageHours(item.publishedAt) <= MAX_BRIEF_AGE_HOURS)
    .filter((item) => relevanceScore(item, track) >= (['Hacker News', 'Lobsters'].includes(item.source) ? 14 : 28))
    .sort((a, b) => editorialScore(b, track) - editorialScore(a, track))

  return diverseSelect(relevant, 10).map((item) => ({
    ...item,
    whyRead: summarizeReason(item)
  }))
}

function selectNews(items, section) {
  const fresh = items
    .filter((item) => item.section === section && ageHours(item.publishedAt) <= MAX_NEWS_AGE_HOURS)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

  return diverseSelect(fresh, 8, 3).map((item) => ({
    ...item,
    kind: 'news',
    whyRead: summarizeReason(item)
  }))
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function editionHtml(edition) {
  const sections = [
    ['Engineering', edition.items.filter((item) => item.track === 'engineering' && item.section === 'brief')],
    ['Management', edition.items.filter((item) => item.track === 'management' && item.section === 'brief')],
    ['India news', edition.items.filter((item) => item.section === 'india')],
    ['World news', edition.items.filter((item) => item.section === 'world')]
  ]

  const content = sections
    .filter(([, items]) => items.length)
    .map(
      ([heading, items]) => `<section><h2>${heading}</h2>${items
        .map(
          (item) =>
            `<article><p>${escapeHtml(item.source)} · ${escapeHtml(item.topic)}</p><h3><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></h3><p>${escapeHtml(item.whyRead || item.summary)}</p></article>`
        )
        .join('')}</section>`
    )
    .join('')

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Byte Sized Daily Brief — ${edition.editionDate}</title><meta name="description" content="Engineering, management, India and world reading brief for ${edition.editionDate}."><link rel="canonical" href="${SITE_URL}/editions/${edition.editionDate}/"><style>body{max-width:920px;margin:auto;padding:40px 22px;background:#f5f3ee;color:#111;font:18px/1.55 system-ui}h1{font-size:clamp(42px,8vw,82px);line-height:.9}h2{margin-top:60px;border-bottom:2px solid}article{padding:24px 0;border-bottom:1px solid #bbb}article p:first-child{font:12px monospace;text-transform:uppercase;color:#666}a{color:#b62419}nav a{color:#111}</style></head><body><nav><a href="${SITE_URL}/">Open the interactive PWA</a> · <a href="${SITE_URL}/archive/">All editions</a></nav><h1>Byte Sized<br>Daily Brief</h1><p>${edition.editionDate} · ${edition.items.length} selected links · updated ${edition.generatedAt}</p>${content}</body></html>`
}

async function loadEvergreen() {
  const fallback = JSON.parse(await readFile(new URL('../src/data/fallback.json', import.meta.url), 'utf8'))
  return fallback.items.map((item) => ({
    ...item,
    section: 'evergreen',
    kind: 'evergreen',
    publishedAt: null,
    whyRead: item.summary
  }))
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
        section: feed[3],
        kind: 'news'
      }))
  ])
]

const results = await Promise.allSettled(jobs.map(([, run]) => run()))
const fetchedItems = []
const successfulSources = []

results.forEach((result, index) => {
  const source = jobs[index][0]
  if (result.status === 'fulfilled') {
    console.log(`[feed] ${source}: ${result.value.length} items`)
    fetchedItems.push(...result.value)
    successfulSources.push(source)
  } else {
    console.error(`[feed] ${source} failed: ${result.reason.message}`)
  }
})

const currentItems = deduplicate(fetchedItems)
const evergreenItems = await loadEvergreen()
const selected = [
  ...selectTrack(currentItems, 'engineering'),
  ...selectTrack(currentItems, 'management'),
  ...evergreenItems,
  ...selectNews(currentItems, 'india'),
  ...selectNews(currentItems, 'world')
]

if (!selected.length) throw new Error('No daily brief items were generated.')

const output = {
  editionDate,
  edition: `${today.getFullYear()}.${String(dayOfYear).padStart(3, '0')}`,
  generatedAt: new Date().toISOString(),
  sourceCount: successfulSources.length,
  items: selected
}

const dataDirectory = new URL('../public/data/', import.meta.url)
const archiveDirectory = new URL('../public/data/editions/', import.meta.url)
const editionPageDirectory = new URL(`../public/editions/${editionDate}/`, import.meta.url)
await mkdir(dataDirectory, { recursive: true })
await mkdir(archiveDirectory, { recursive: true })
await mkdir(editionPageDirectory, { recursive: true })

await writeFile(new URL('../public/data/latest.json', import.meta.url), JSON.stringify(output, null, 2))
await writeFile(new URL(`../public/data/editions/${editionDate}.json`, import.meta.url), JSON.stringify(output, null, 2))
await writeFile(new URL(`../public/editions/${editionDate}/index.html`, import.meta.url), editionHtml(output))

const archiveFiles = (await readdir(archiveDirectory))
  .filter((file) => file.endsWith('.json'))
  .sort()
  .reverse()

const editions = await Promise.all(
  archiveFiles.map(async (file) => JSON.parse(await readFile(new URL(file, archiveDirectory), 'utf8')))
)
const archiveIndex = {
  generatedAt: output.generatedAt,
  editions: editions.map((edition) => ({
    editionDate: edition.editionDate,
    edition: edition.edition,
    generatedAt: edition.generatedAt,
    itemCount: edition.items.length,
    items: edition.items
  }))
}
await writeFile(new URL('../public/data/archive-index.json', import.meta.url), JSON.stringify(archiveIndex, null, 2))

const archiveHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Byte Sized Daily Brief Archive</title><meta name="description" content="Archive of daily engineering and management reading briefs."><style>body{max-width:800px;margin:auto;padding:40px 22px;background:#f5f3ee;color:#111;font:18px/1.6 system-ui}h1{font-size:clamp(48px,9vw,92px);line-height:.9}li{padding:14px 0}a{color:#b62419}</style></head><body><a href="${SITE_URL}/">Open the PWA</a><h1>Daily brief<br>archive.</h1><ul>${editions.map((edition) => `<li><a href="${SITE_URL}/editions/${edition.editionDate}/">${edition.editionDate}</a> — ${edition.items.length} selected links</li>`).join('')}</ul></body></html>`
await mkdir(new URL('../public/archive/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/archive/index.html', import.meta.url), archiveHtml)

const sitemapUrls = [
  SITE_URL,
  `${SITE_URL}/archive/`,
  ...editions.map((edition) => `${SITE_URL}/editions/${edition.editionDate}/`)
]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`
await writeFile(new URL('../public/sitemap.xml', import.meta.url), sitemap)
await writeFile(
  new URL('../public/robots.txt', import.meta.url),
  `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`
)

console.log(`[brief] wrote ${selected.length} items from ${successfulSources.length} sources for ${editionDate}`)
