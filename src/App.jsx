import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ArrowUpRight, Clock3, ShieldCheck } from 'lucide-react'
import {
  formatEditionDate,
  formatPublishedDate,
  formatRefreshTime,
  readingTime
} from './lib/brief.js'
import { beginBriefSession, endBriefSession, trackProductEvent } from './lib/analytics.js'

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span>B</span>
      <span>SD</span>
    </div>
  )
}

function ArticleCard({ item, rank, editionDate, optional = false, onOpen }) {
  const openArticle = () => {
    const secondsBeforeOpen = onOpen()
    trackProductEvent(optional ? 'optional_read_opened' : 'article_opened', {
      articleId: item.id,
      source: item.source,
      topic: item.topic,
      rank,
      edition: editionDate,
      articleType: optional ? 'evergreen' : 'current',
      secondsBeforeOpen
    })
  }

  return (
    <article className={`article-card ${optional ? 'optional-card' : ''}`}>
      <span className="article-rank">{optional ? '∞' : String(rank).padStart(2, '0')}</span>
      <div className="article-content">
        <div className="article-meta">
          <span className="source">{item.source}</span>
          <span>{optional ? 'Evergreen' : item.topic}</span>
          <span className="dot" />
          <span>{formatPublishedDate(item.publishedAt)}</span>
          <span className="dot" />
          <span>{readingTime(item)} min</span>
        </div>
        <h2>{item.title}</h2>
        <p className="why-read">
          <strong>Why it matters:</strong> {item.whyRead || item.summary}
        </p>
        <a href={item.url} target="_blank" rel="noreferrer" onClick={openArticle}>
          Read at {item.source}
          <ArrowUpRight size={17} />
        </a>
      </div>
    </article>
  )
}

export default function App() {
  const rootRef = useRef(null)
  const sessionRef = useRef(null)
  const openedCountRef = useRef(0)
  const [brief, setBrief] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/latest.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Daily brief returned ${response.status}`)
        return response.json()
      })
      .then(setBrief)
      .catch((error) => {
        console.error(error)
        trackProductEvent('feed_load_failed', { category: 'latest_edition' })
        setLoadError('Today’s edition could not be loaded. Check your connection and try again.')
      })
  }, [])

  const currentItems = useMemo(
    () =>
      (brief?.items || [])
        .filter((item) => item.track === 'engineering' && item.section === 'brief')
        .slice(0, 5),
    [brief]
  )
  const evergreenItem = useMemo(
    () =>
      (brief?.items || []).find(
        (item) => item.track === 'engineering' && item.section === 'evergreen'
      ),
    [brief]
  )

  useEffect(() => {
    if (!brief) return undefined

    sessionRef.current = beginBriefSession(brief.editionDate)
    const context = gsap.context(() => {
      gsap.from('.hero-copy > *', {
        y: 20,
        opacity: 0,
        duration: 0.55,
        stagger: 0.06,
        ease: 'power3.out'
      })
      gsap.from('.article-card', {
        y: 18,
        opacity: 0,
        duration: 0.45,
        stagger: 0.06,
        ease: 'power3.out',
        clearProps: 'opacity,transform'
      })
    }, rootRef)

    let engagedSeconds = 0
    let maxScrollDepth = 0
    let ended = false
    const reachedDepths = new Set()
    const engagementTimer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      engagedSeconds += 1
      if (engagedSeconds === 30) {
        trackProductEvent('engaged_30_seconds', { edition: brief.editionDate })
      }
    }, 1000)

    const updateScrollDepth = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const depth = scrollable > 0 ? Math.round((window.scrollY / scrollable) * 100) : 100
      maxScrollDepth = Math.max(maxScrollDepth, Math.min(100, depth))
      ;[50, 90].forEach((threshold) => {
        if (maxScrollDepth >= threshold && !reachedDepths.has(threshold)) {
          reachedDepths.add(threshold)
          trackProductEvent('scroll_depth_reached', {
            depth: threshold,
            edition: brief.editionDate
          })
        }
      })
    }

    const finishSession = () => {
      if (ended) return
      ended = true
      endBriefSession({
        edition: brief.editionDate,
        engagedSeconds,
        maxScrollDepth,
        articleOpenCount: openedCountRef.current
      })
    }

    window.addEventListener('scroll', updateScrollDepth, { passive: true })
    window.addEventListener('pagehide', finishSession)

    return () => {
      context.revert()
      window.clearInterval(engagementTimer)
      window.removeEventListener('scroll', updateScrollDepth)
      window.removeEventListener('pagehide', finishSession)
      finishSession()
    }
  }, [brief])

  const noteArticleOpen = () => {
    openedCountRef.current += 1
    const secondsBeforeOpen = sessionRef.current
      ? Math.round((Date.now() - sessionRef.current.startedAt) / 1000)
      : -1
    if (sessionRef.current) {
      sessionRef.current.secondsBeforeFirstOpen ??= secondsBeforeOpen
    }
    return secondsBeforeOpen
  }

  return (
    <div className="app-shell" ref={rootRef}>
      <header className="masthead">
        <a className="brand" href="#top" aria-label="Byte Sized home">
          <BrandMark />
          <div>
            <strong>BYTE SIZED</strong>
            <span>DAILY ENGINEERING BRIEF</span>
          </div>
        </a>
        <div className="edition-label">
          {brief ? formatEditionDate(brief.editionDate) : 'Today’s edition'}
        </div>
        <a className="about-link" href="#about">About</a>
      </header>

      <main id="top">
        {loadError && <div className="status-message">{loadError}</div>}
        {!brief && !loadError && <div className="status-message">ASSEMBLING TODAY’S EDITION…</div>}

        {brief && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">EDITION {brief.edition} / FIVE STORIES / NO ENDLESS FEED</p>
                <h1>
                  The engineering internet,
                  <em>distilled.</em>
                </h1>
                <p>
                  Five software-engineering articles worth your attention today, selected from
                  trusted technical sources and explained in a one-minute scan.
                </p>
                <div className="brief-facts">
                  <span><Clock3 size={16} />5-minute scan</span>
                  <span>Fresh every weekday</span>
                  <span>{brief.sourceCount} sources checked</span>
                </div>
              </div>
            </section>

            <section className="content-section" aria-labelledby="today-heading">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">TODAY’S FIVE</p>
                  <h2 id="today-heading">Know what matters. Then get back to building.</h2>
                </div>
                <p>Chosen for technical depth, useful disagreement and practical relevance.</p>
              </div>

              <div className="essential-list">
                {currentItems.map((item, index) => (
                  <ArticleCard
                    editionDate={brief.editionDate}
                    item={item}
                    key={item.id}
                    onOpen={noteArticleOpen}
                    rank={index + 1}
                  />
                ))}
              </div>
            </section>

            {evergreenItem && (
              <section className="evergreen-section" aria-labelledby="evergreen-heading">
                <div className="evergreen-copy">
                  <p className="eyebrow">ONE TIMELESS IDEA</p>
                  <h2 id="evergreen-heading">Worth knowing beyond today.</h2>
                  <p>A durable engineering reference for when you have a few more minutes.</p>
                </div>
                <ArticleCard
                  editionDate={brief.editionDate}
                  item={evergreenItem}
                  onOpen={noteArticleOpen}
                  optional
                  rank={6}
                />
              </section>
            )}

            <section className="about-section" id="about">
              <ShieldCheck size={28} />
              <div>
                <p className="eyebrow">WHY BYTE SIZED EXISTS</p>
                <h2>Less feed. Better signal.</h2>
                <p>
                  Byte Sized checks public feeds from respected engineering publications and
                  communities. It links to original publishers, never scrapes article bodies,
                  and deliberately ends after five current selections.
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      <footer>
        <div><BrandMark /><p>A finite daily brief for software engineers.</p></div>
        <div className="refresh-status">
          <span />
          Updated {formatRefreshTime(brief?.generatedAt)}
        </div>
        <p>
          Privacy-conscious analytics can help improve the selection when enabled.
          {' '}<a href={`${import.meta.env.BASE_URL}privacy/`}>Privacy</a>
        </p>
      </footer>
    </div>
  )
}
