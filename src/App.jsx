import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import {
  Archive,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronRight,
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
import {
  TRACKS,
  filterItems,
  formatEditionDate,
  formatPublishedDate,
  formatRefreshTime,
  readingTime
} from './lib/brief.js'

const STORAGE_KEYS = {
  track: 'byte-sized-track',
  saved: 'byte-sized-saved',
  read: 'byte-sized-read',
  lastOpened: 'byte-sized-last-opened'
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

function TrackSwitch({ track, onChange, compact = false }) {
  return (
    <div className={`track-switch ${compact ? 'compact' : ''}`} aria-label="Choose your daily brief">
      {Object.entries(TRACKS).map(([key, value]) => (
        <button
          aria-pressed={track === key}
          className={track === key ? 'active' : ''}
          key={key}
          onClick={() => onChange(key)}
          type="button"
        >
          {key === 'engineering' ? <TerminalSquare size={compact ? 14 : 17} /> : <Users size={compact ? 14 : 17} />}
          <span>{compact ? (key === 'engineering' ? 'Engineering' : 'Management') : value.label}</span>
        </button>
      ))}
    </div>
  )
}

function ArticleCard({
  item,
  isRead,
  isSaved,
  onOpen,
  onSave,
  rank,
  compact = false,
  showSummary = false
}) {
  return (
    <article className={`article-card ${compact ? 'compact' : ''} ${isRead ? 'read' : ''}`}>
      {rank && <span className="article-rank">{String(rank).padStart(2, '0')}</span>}
      <div className="article-content">
        <div className="article-meta">
          <span className="source">{item.source}</span>
          <span>{item.kind === 'evergreen' ? 'Evergreen' : item.topic}</span>
          <span className="dot" />
          <span>{formatPublishedDate(item.publishedAt)}</span>
          <span className="dot" />
          <span>{readingTime(item)} min</span>
        </div>
        <h3>{item.title}</h3>
        <p className="why-read">
          <strong>Why read:</strong> {item.whyRead || item.summary}
        </p>
        <div className="article-actions">
          <a href={item.url} target="_blank" rel="noreferrer" onClick={() => onOpen(item)}>
            {isRead ? <Check size={16} /> : <ArrowUpRight size={16} />}
            {isRead ? 'Read again' : 'Open article'}
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

function InstallDialog({ onClose, isIos }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="install-title"
        aria-modal="true"
        className="install-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button aria-label="Close install instructions" className="dialog-close" onClick={onClose}>
          <X size={20} />
        </button>
        <Download size={30} />
        <h2 id="install-title">Install Byte Sized</h2>
        {isIos ? (
          <p>In Safari, tap the Share button and choose <strong>Add to Home Screen</strong>.</p>
        ) : (
          <p>Use your browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</p>
        )}
      </section>
    </div>
  )
}

export default function App() {
  const rootRef = useRef(null)
  const [brief, setBrief] = useState(null)
  const [archiveData, setArchiveData] = useState({ editions: [] })
  const [loadError, setLoadError] = useState('')
  const [track, setTrack] = useState(() => localStorage.getItem(STORAGE_KEYS.track) || 'engineering')
  const [tab, setTab] = useState('today')
  const [newsRegion, setNewsRegion] = useState('india')
  const [query, setQuery] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [saved, setSaved] = useState(() => readStoredSet(STORAGE_KEYS.saved))
  const [read, setRead] = useState(() => readStoredSet(STORAGE_KEYS.read))
  const [lastOpened, setLastOpened] = useState(() => localStorage.getItem(STORAGE_KEYS.lastOpened))
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallHelp, setShowInstallHelp] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/latest.json`).then((response) => {
        if (!response.ok) throw new Error(`Daily brief returned ${response.status}`)
        return response.json()
      }),
      fetch(`${import.meta.env.BASE_URL}data/archive-index.json`)
        .then((response) => (response.ok ? response.json() : { editions: [] }))
        .catch(() => ({ editions: [] }))
    ])
      .then(([latest, archive]) => {
        setBrief(latest)
        setArchiveData(archive)
      })
      .catch((error) => {
        console.error(error)
        setLoadError('The latest edition could not be loaded. Check your connection and try again.')
      })
  }, [])

  useEffect(() => localStorage.setItem(STORAGE_KEYS.track, track), [track])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify([...saved])), [saved])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.read, JSON.stringify([...read])), [read])
  useEffect(() => {
    setShowMore(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [track, tab])

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
      gsap.from('.hero-copy > *, .hero-console > *', {
        y: 24,
        opacity: 0,
        duration: 0.65,
        stagger: 0.07,
        ease: 'power3.out'
      })
      gsap.from('.article-card', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: 'power3.out',
        clearProps: 'opacity,transform'
      })
    }, rootRef)
    return () => context.revert()
  }, [brief, tab, track, newsRegion, query, showMore])

  const allItems = brief?.items || []
  const trackItems = useMemo(
    () => filterItems(allItems, { track, query, section: 'brief' }),
    [allItems, track, query]
  )
  const evergreenItems = useMemo(
    () => filterItems(allItems, { track, query, section: 'evergreen' }),
    [allItems, track, query]
  )
  const newsItems = useMemo(
    () => filterItems(allItems, { query, section: newsRegion }),
    [allItems, query, newsRegion]
  )
  const archiveEditions = useMemo(
    () =>
      archiveData.editions
        .map((edition) => ({
          ...edition,
          items: filterItems(edition.items || [], { query, track: query ? undefined : track })
        }))
        .filter((edition) => edition.items.length),
    [archiveData, query, track]
  )
  const savedItems = useMemo(() => {
    const archived = archiveData.editions.flatMap((edition) => edition.items || [])
    const unique = new Map([...allItems, ...archived].map((item) => [item.id, item]))
    return [...unique.values()].filter((item) => saved.has(item.id) && filterItems([item], { query }).length)
  }, [allItems, archiveData, saved, query])

  const topItems = trackItems.slice(0, 5)
  const moreItems = trackItems.slice(5)
  const readCount = trackItems.filter((item) => read.has(item.id)).length
  const completion = trackItems.length ? Math.round((readCount / trackItems.length) * 100) : 0
  const essentialReadingMinutes = topItems.reduce((total, item) => total + readingTime(item), 0)
  const nextItem = trackItems.find((item) => !read.has(item.id) && item.id !== lastOpened)
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone

  const toggleSave = (id) => {
    setSaved((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const markRead = (item) => {
    setRead((current) => new Set(current).add(item.id))
    setLastOpened(item.id)
    localStorage.setItem(STORAGE_KEYS.lastOpened, item.id)
  }

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      setInstallPrompt(null)
    } else {
      setShowInstallHelp(true)
    }
  }

  const openNext = () => {
    if (!nextItem) return
    markRead(nextItem)
    window.open(nextItem.url, '_blank', 'noopener,noreferrer')
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
            ['archive', 'Archive'],
            ['saved', 'Saved']
          ].map(([value, label]) => (
            <button
              aria-current={tab === value ? 'page' : undefined}
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
          <TrackSwitch compact track={track} onChange={setTrack} />
          {!isStandalone && (
            <button className="install-button" onClick={install} type="button">
              <Download size={16} />
              Install
            </button>
          )}
          <label className="search-control">
            <Search size={17} />
            <input
              aria-label="Search current and archived articles"
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
                  {topItems.length} useful signals first. Read deeper only when something earns your attention.
                </p>
              </div>
              <div className="hero-console">
                <p>YOUR DAILY SIGNAL</p>
                <TrackSwitch track={track} onChange={setTrack} />
                <p className="track-description">{TRACKS[track].description}</p>
                <div className="session-stats">
                  <span><Clock3 size={16} />5-minute scan</span>
                  <span>~{essentialReadingMinutes} min for all five</span>
                </div>
              </div>
            </section>

            <section className="progress-strip" aria-label="Reading progress">
              <div><span>YOUR PROGRESS</span><strong>{completion}%</strong></div>
              <div className="progress-track"><span style={{ width: `${completion}%` }} /></div>
              <p>{readCount === 0 ? 'Start with one useful idea.' : `${readCount} of ${trackItems.length} read.`}</p>
            </section>

            <section className="content-section essential-section">
              <div className="section-heading">
                <div><span className="section-number">01</span><p>THE 5-MINUTE SCAN</p></div>
                <h2>{topItems.length} signals worth knowing.</h2>
              </div>
              <div className="essential-list">
                {topItems.map((item, index) => (
                  <ArticleCard
                    item={item}
                    isRead={read.has(item.id)}
                    isSaved={saved.has(item.id)}
                    key={item.id}
                    onOpen={markRead}
                    onSave={toggleSave}
                    rank={index + 1}
                    showSummary={index === 0}
                  />
                ))}
              </div>
            </section>

            {moreItems.length > 0 && (
              <section className="content-section alternate">
                <div className="section-heading compact-heading">
                  <div><span className="section-number">02</span><p>OPTIONAL DEPTH</p></div>
                  <h2>Continue if you have time.</h2>
                </div>
                {!showMore ? (
                  <button className="continue-button" onClick={() => setShowMore(true)}>
                    Show {moreItems.length} more selected articles
                    <ChevronDown size={20} />
                  </button>
                ) : (
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
                )}
              </section>
            )}

            <section className="content-section classics-section">
              <div className="section-heading compact-heading">
                <div><span className="section-number">03</span><p>EVERGREEN</p></div>
                <h2>Ideas that outlive the news cycle.</h2>
              </div>
              <div className="classics-grid">
                {evergreenItems.map((item) => (
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
            </section>
          </>
        )}

        {brief && tab === 'news' && (
          <section className="page-section">
            <div className="page-intro">
              <p className="eyebrow">{formatEditionDate(brief.editionDate)} / NEWS DESK</p>
              <h1>Context beyond<em>the code.</em></h1>
              <p>Only stories published in the last 48 hours. Headlines link directly to their publishers.</p>
            </div>
            <div className="region-switch">
              <button className={newsRegion === 'india' ? 'active' : ''} onClick={() => setNewsRegion('india')}>
                <Newspaper size={18} />India
              </button>
              <button className={newsRegion === 'world' ? 'active' : ''} onClick={() => setNewsRegion('world')}>
                <Globe2 size={18} />World
              </button>
            </div>
            <p className="result-count">{newsItems.length} verified fresh {newsItems.length === 1 ? 'story' : 'stories'} today</p>
            <div className="news-grid">
              {newsItems.length ? newsItems.map((item) => (
                <ArticleCard
                  item={item}
                  isRead={read.has(item.id)}
                  isSaved={saved.has(item.id)}
                  key={item.id}
                  onOpen={markRead}
                  onSave={toggleSave}
                  showSummary
                />
              )) : (
                <EmptyState title="No fresh headlines" detail="Older news is deliberately excluded rather than presented as current." />
              )}
            </div>
          </section>
        )}

        {brief && tab === 'archive' && (
          <section className="page-section">
            <div className="page-intro archive-intro">
              <p className="eyebrow">PERMANENT EDITIONS</p>
              <h1>Return to<em>what mattered.</em></h1>
              <p>Search prior briefs or browse editions by date. Every edition also has a permanent, indexable web page.</p>
            </div>
            <div className="archive-list">
              {archiveEditions.map((edition) => (
                <section className="archive-edition" key={edition.editionDate}>
                  <header>
                    <div>
                      <span>{formatEditionDate(edition.editionDate)}</span>
                      <strong>{edition.items.length} matching articles</strong>
                    </div>
                    <a href={`${import.meta.env.BASE_URL}editions/${edition.editionDate}/`}>
                      Permanent page <ArrowUpRight size={15} />
                    </a>
                  </header>
                  <div className="archive-items">
                    {edition.items.slice(0, query ? 12 : 5).map((item) => (
                      <ArticleCard
                        compact
                        item={item}
                        isRead={read.has(item.id)}
                        isSaved={saved.has(item.id)}
                        key={`${edition.editionDate}-${item.id}`}
                        onOpen={markRead}
                        onSave={toggleSave}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        )}

        {brief && tab === 'saved' && (
          <section className="page-section">
            <div className="page-intro">
              <p className="eyebrow">YOUR READING QUEUE</p>
              <h1>Saved for<em>later.</em></h1>
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

      {lastOpened && nextItem && tab === 'today' && (
        <aside className="resume-bar">
          <div><span>READY FOR THE NEXT ONE?</span><strong>{nextItem.title}</strong></div>
          <button onClick={openNext}>Continue <ChevronRight size={18} /></button>
        </aside>
      )}

      <footer>
        <div><BrandMark /><p>A finite daily brief for builders and leaders.</p></div>
        <div className="refresh-status">
          <span />
          Updated {formatRefreshTime(brief?.generatedAt)} · {brief?.sourceCount || 0} sources checked
        </div>
        <p>Headlines link to their original publishers. No article scraping or reproduction.</p>
      </footer>

      {showInstallHelp && <InstallDialog isIos={isIos} onClose={() => setShowInstallHelp(false)} />}
    </div>
  )
}
