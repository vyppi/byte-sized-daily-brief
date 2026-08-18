import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Check,
  Clock3,
  Download,
  Globe2,
  Newspaper,
  Search,
  Sparkles,
  TerminalSquare,
  Users,
  X
} from 'lucide-react'
import { TRACKS, filterItems, formatEditionDate, readingTime } from './lib/brief.js'

const STORAGE_KEYS = {
  track: 'byte-sized-track',
  saved: 'byte-sized-saved',
  read: 'byte-sized-read'
}

const readStoredSet = (key) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'))
  } catch {
    return new Set()
  }
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span>B</span>
      <span>SD</span>
    </div>
  )
}

function TrackSwitch({ track, onChange }) {
  return (
    <div className="track-switch" aria-label="Choose your daily brief">
      {Object.entries(TRACKS).map(([key, value]) => (
        <button
          className={track === key ? 'active' : ''}
          key={key}
          onClick={() => onChange(key)}
          type="button"
        >
          {key === 'engineering' ? <TerminalSquare size={17} /> : <Users size={17} />}
          <span>{value.label}</span>
        </button>
      ))}
    </div>
  )
}

function ArticleCard({ item, isRead, isSaved, onOpen, onSave, compact = false }) {
  return (
    <article className={`article-card ${compact ? 'compact' : ''} ${isRead ? 'read' : ''}`}>
      <div className="article-meta">
        <span className="source">{item.source}</span>
        <span>{item.topic}</span>
        <span className="dot" />
        <span>{readingTime(item)} min</span>
      </div>
      <h3>{item.title}</h3>
      {!compact && item.summary && <p>{item.summary}</p>}
      <div className="article-actions">
        <a href={item.url} target="_blank" rel="noreferrer" onClick={() => onOpen(item.id)}>
          {isRead ? <Check size={16} /> : <ArrowUpRight size={16} />}
          {isRead ? 'Read' : 'Open article'}
        </a>
        <button
          aria-label={isSaved ? 'Remove bookmark' : 'Save article'}
          className={isSaved ? 'saved' : ''}
          onClick={() => onSave(item.id)}
          type="button"
        >
          {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
      </div>
    </article>
  )
}

function EmptyState({ title, detail }) {
  return (
    <div className="empty-state">
      <Sparkles size={30} />
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  )
}

export default function App() {
  const rootRef = useRef(null)
  const [brief, setBrief] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [track, setTrack] = useState(() => localStorage.getItem(STORAGE_KEYS.track) || 'engineering')
  const [tab, setTab] = useState('today')
  const [newsRegion, setNewsRegion] = useState('india')
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState(() => readStoredSet(STORAGE_KEYS.saved))
  const [read, setRead] = useState(() => readStoredSet(STORAGE_KEYS.read))
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/latest.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Daily brief returned ${response.status}`)
        return response.json()
      })
      .then(setBrief)
      .catch((error) => {
        console.error(error)
        setLoadError('The latest edition could not be loaded. Check your connection and try again.')
      })
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.track, track)
  }, [track])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify([...saved]))
  }, [saved])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.read, JSON.stringify([...read]))
  }, [read])

  useEffect(() => {
    const capturePrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', capturePrompt)
    return () => window.removeEventListener('beforeinstallprompt', capturePrompt)
  }, [])

  useEffect(() => {
    if (!brief) return undefined
    const context = gsap.context(() => {
      gsap.from('.masthead > *, .hero-copy > *', {
        y: 28,
        opacity: 0,
        duration: 0.75,
        stagger: 0.08,
        ease: 'power3.out'
      })
      gsap.from('.article-card', {
        y: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.06,
        ease: 'power3.out',
        clearProps: 'opacity,transform'
      })
    }, rootRef)
    return () => context.revert()
  }, [brief, tab, track, newsRegion, query])

  const allItems = brief?.items || []
  const trackItems = useMemo(
    () => filterItems(allItems, { track, query, section: 'brief' }),
    [allItems, track, query]
  )
  const newsItems = useMemo(
    () => filterItems(allItems, { query, section: newsRegion }),
    [allItems, query, newsRegion]
  )
  const savedItems = useMemo(
    () => allItems.filter((item) => saved.has(item.id) && filterItems([item], { query }).length),
    [allItems, saved, query]
  )
  const topItems = trackItems.slice(0, 5)
  const moreItems = trackItems.slice(5)
  const readCount = trackItems.filter((item) => read.has(item.id)).length
  const completion = trackItems.length ? Math.round((readCount / trackItems.length) * 100) : 0
  const estimatedMinutes = topItems.reduce((total, item) => total + readingTime(item), 0)

  const toggleSave = (id) => {
    setSaved((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const markRead = (id) => {
    setRead((current) => new Set(current).add(id))
  }

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  return (
    <div className="app-shell" ref={rootRef}>
      <header className="masthead">
        <a className="brand" href="#top" aria-label="Byte Sized Daily Brief home">
          <BrandMark />
          <div>
            <strong>BYTE SIZED</strong>
            <span>DAILY BRIEF</span>
          </div>
        </a>
        <nav aria-label="Primary navigation">
          {[
            ['today', 'Today'],
            ['news', 'News'],
            ['saved', 'Saved']
          ].map(([value, label]) => (
            <button
              className={tab === value ? 'active' : ''}
              key={value}
              onClick={() => setTab(value)}
              type="button"
            >
              {label}
              {value === 'saved' && saved.size > 0 && <sup>{saved.size}</sup>}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          {installPrompt && (
            <button className="install-button" onClick={install} type="button">
              <Download size={16} />
              Install
            </button>
          )}
          <label className="search-control">
            <Search size={17} />
            <input
              aria-label="Search articles"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              type="search"
              value={query}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery('')} type="button">
                <X size={15} />
              </button>
            )}
          </label>
        </div>
      </header>

      <main id="top">
        {loadError && <EmptyState title="Edition unavailable" detail={loadError} />}
        {!brief && !loadError && <div className="loading">ASSEMBLING TODAY'S EDITION...</div>}

        {brief && tab === 'today' && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">{formatEditionDate(brief.editionDate)} / EDITION {brief.edition}</p>
                <h1>
                  Read less.
                  <em>Know more.</em>
                </h1>
                <p className="hero-description">
                  A finite daily reading list for people who build software and lead the teams behind it.
                </p>
              </div>
              <div className="hero-console">
                <p>CHOOSE YOUR SIGNAL</p>
                <TrackSwitch track={track} onChange={setTrack} />
                <p className="track-description">{TRACKS[track].description}</p>
                <div className="session-stats">
                  <span>
                    <Clock3 size={16} />
                    {estimatedMinutes} min edition
                  </span>
                  <span>{topItems.length} essential reads</span>
                </div>
              </div>
            </section>

            <section className="progress-strip" aria-label="Reading progress">
              <div>
                <span>YOUR PROGRESS</span>
                <strong>{completion}%</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${completion}%` }} />
              </div>
              <p>{readCount === 0 ? 'Start with one good article.' : `${readCount} of ${trackItems.length} read.`}</p>
            </section>

            <section className="content-section">
              <div className="section-heading">
                <div>
                  <span className="section-number">01</span>
                  <p>THE 5-MINUTE SCAN</p>
                </div>
                <h2>Today's essential signal.</h2>
              </div>
              <div className="lead-grid">
                {topItems.map((item, index) => (
                  <div className={index === 0 ? 'lead-item' : ''} key={item.id}>
                    {index === 0 && <span className="lead-label">LEAD STORY</span>}
                    <ArticleCard
                      item={item}
                      isRead={read.has(item.id)}
                      isSaved={saved.has(item.id)}
                      onOpen={markRead}
                      onSave={toggleSave}
                      compact={index > 0}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="content-section alternate">
              <div className="section-heading">
                <div>
                  <span className="section-number">02</span>
                  <p>GO DEEPER</p>
                </div>
                <h2>Worth your next coffee.</h2>
              </div>
              {moreItems.length ? (
                <div className="article-list">
                  {moreItems.map((item) => (
                    <ArticleCard
                      compact
                      item={item}
                      isRead={read.has(item.id)}
                      isSaved={saved.has(item.id)}
                      key={item.id}
                      onOpen={markRead}
                      onSave={toggleSave}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="You've reached the end"
                  detail="The brief is deliberately finite. Come back tomorrow for a fresh edition."
                />
              )}
            </section>
          </>
        )}

        {brief && tab === 'news' && (
          <section className="page-section">
            <div className="page-intro">
              <p className="eyebrow">{formatEditionDate(brief.editionDate)} / NEWS DESK</p>
              <h1>
                Context beyond
                <em>the code.</em>
              </h1>
              <p>A compact scan of India and the world. Headlines and links only; publishers keep the story.</p>
            </div>
            <div className="region-switch">
              <button className={newsRegion === 'india' ? 'active' : ''} onClick={() => setNewsRegion('india')}>
                <Newspaper size={18} />
                India
              </button>
              <button className={newsRegion === 'world' ? 'active' : ''} onClick={() => setNewsRegion('world')}>
                <Globe2 size={18} />
                World
              </button>
            </div>
            <div className="news-grid">
              {newsItems.map((item) => (
                <ArticleCard
                  item={item}
                  isRead={read.has(item.id)}
                  isSaved={saved.has(item.id)}
                  key={item.id}
                  onOpen={markRead}
                  onSave={toggleSave}
                />
              ))}
            </div>
          </section>
        )}

        {brief && tab === 'saved' && (
          <section className="page-section">
            <div className="page-intro">
              <p className="eyebrow">YOUR READING QUEUE</p>
              <h1>
                Saved for
                <em>later.</em>
              </h1>
              <p>Bookmarks stay on this device, keeping the MVP private and account-free.</p>
            </div>
            {savedItems.length ? (
              <div className="news-grid">
                {savedItems.map((item) => (
                  <ArticleCard
                    item={item}
                    isRead={read.has(item.id)}
                    isSaved
                    key={item.id}
                    onOpen={markRead}
                    onSave={toggleSave}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing saved yet" detail="Use the bookmark button on any story to build a reading queue." />
            )}
          </section>
        )}
      </main>

      <footer>
        <div>
          <BrandMark />
          <p>A finite daily brief for builders and leaders.</p>
        </div>
        <div className="system-status">
          <span />
          DAILY PIPELINE OPERATIONAL
        </div>
        <p>Headlines link to their original publishers. No article scraping or reproduction.</p>
      </footer>
    </div>
  )
}
