import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, ExternalLink, Globe, LayoutDashboard, ListChecks, MapPin, Phone, Star, TriangleAlert, X } from 'lucide-react'
import historySnapshot from '../backend/snapshot/site_check_history.json'
import researchSnapshot from '../backend/snapshot/research.json'
import siteCheckSnapshot from '../backend/snapshot/site_check.json'
import { makeTranslator, type MessageKey } from './i18n'
import Plan from './pages/Plan'
import Reputation from './pages/Reputation'
import Today from './pages/Today'
import Website from './pages/Website'
import type { Data, HistoryEntry, Lang, Research, SiteCheck } from './types'

const AUTHOR = 'Srinivasan'
// The daily check runs every morning; anything older than this gets a visible warning.
const STALE_AFTER_HOURS = 36

// Bundled at build time so the dashboard always opens with data; the API then
// replaces it with the freshest copy.
const bundled: Data = {
  research: researchSnapshot as Research,
  siteCheck: siteCheckSnapshot as SiteCheck,
  history: historySnapshot as HistoryEntry[],
}

const tabs = [
  { id: 'today', key: 'tabToday', icon: LayoutDashboard },
  { id: 'plan', key: 'tabPlan', icon: ListChecks },
  { id: 'reputation', key: 'tabReputation', icon: Star },
  { id: 'website', key: 'tabWebsite', icon: Globe },
] as const satisfies readonly { id: string; key: MessageKey; icon: unknown }[]
type TabId = (typeof tabs)[number]['id']

const readTab = (): TabId => {
  const hash = window.location.hash.replace('#', '').split('/')[0]
  return (tabs.some(tab => tab.id === hash) ? hash : 'today') as TabId
}

const readLang = (): Lang => {
  try {
    return localStorage.getItem('piccolo-lang') === 'en' ? 'en' : 'fr'
  } catch {
    return 'fr'
  }
}

export default function App() {
  const [data, setData] = useState<Data>(bundled)
  const [apiStatus, setApiStatus] = useState<'loading' | 'live' | 'offline'>('loading')
  const [lang, setLang] = useState<Lang>(readLang)
  const [tab, setTab] = useState<TabId>(readTab)
  const [focusTask, setFocusTask] = useState<string | null>(null)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const tr = useMemo(() => makeTranslator(lang), [lang])
  const { t, tx } = tr
  const { research, siteCheck } = data

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = `${research.profile.name} · ${t('appTitle')}`
    try {
      localStorage.setItem('piccolo-lang', lang)
    } catch {
      /* private mode: the choice simply is not remembered */
    }
  }, [lang, research.profile.name, t])

  useEffect(() => {
    // A new tab always opens at the top; the plan then scrolls to a focused task itself.
    const onHash = () => {
      setTab(readTab())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    Promise.all(['/api/research', '/api/site-check', '/api/history'].map(url => fetch(url).then(reply => {
      if (!reply.ok) throw new Error(url)
      return reply.json()
    })))
      .then(([researchData, siteCheckData, historyData]) => {
        setData({ research: researchData, siteCheck: siteCheckData, history: historyData })
        setApiStatus('live')
      })
      .catch(() => setApiStatus('offline'))
  }, [])

  const goTo = useCallback((id: TabId) => {
    setFocusTask(null)
    window.location.hash = id
    window.scrollTo({ top: 0 })
  }, [])

  const openTask = useCallback((id: string) => {
    setFocusTask(id)
    window.location.hash = 'plan'
  }, [])

  const stale = (Date.now() - Date.parse(siteCheck.checked_at)) / 3_600_000 > STALE_AFTER_HOURS

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#today" onClick={() => goTo('today')}>
            <span className="brand-mark">PC</span>
            <span className="brand-text"><b>{research.profile.name}</b><small>{research.profile.area}</small></span>
          </a>
          <div className="topbar-right">
            <span className={`check-time ${stale ? 'stale' : ''} ${apiStatus}`} title={apiStatus === 'offline' ? t('savedCopy') : t('liveData')}>
              <span className="dot" /> <span className="check-label">{t('lastCheck')}</span> {tr.dateTime(siteCheck.checked_at)}
            </span>
            <div className="lang" role="group" aria-label="Language">
              <button aria-pressed={lang === 'fr'} className={lang === 'fr' ? 'on' : ''} onClick={() => setLang('fr')}>FR</button>
              <button aria-pressed={lang === 'en'} className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
            </div>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          <div className="tabs-inner">
            {tabs.map(item => (
              <a key={item.id} href={`#${item.id}`} className={tab === item.id ? 'on' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setFocusTask(null)}>
                <item.icon size={18} /><span>{t(item.key)}</span>
              </a>
            ))}
          </div>
        </nav>
      </header>

      <main className="main">
        {stale && (
          <div className="stale" role="status">
            <TriangleAlert size={18} />
            <div><b>{t('staleTitle')}</b><span>{t('staleBody', { date: tr.dateTime(siteCheck.checked_at) })}</span></div>
          </div>
        )}

        {tab === 'today' && <Today data={data} tr={tr} openTask={openTask} goTo={goTo} />}
        {tab === 'plan' && <Plan data={data} tr={tr} focusId={focusTask} />}
        {tab === 'reputation' && <Reputation data={data} tr={tr} />}
        {tab === 'website' && <Website data={data} tr={tr} />}

        <footer className="footer">
          <div className="footer-links">
            <a href={research.profile.website} target="_blank" rel="noreferrer"><Globe size={14} /> {t('openSite')}</a>
            <a href={research.profile.maps} target="_blank" rel="noreferrer"><MapPin size={14} /> {t('openMaps')}</a>
            <a href={`tel:${research.profile.phone.replace(/\s/g, '')}`}><Phone size={14} /> {research.profile.phone}</a>
            <button onClick={() => setSourcesOpen(true)}><BookOpen size={14} /> {t('sources')}</button>
          </div>
          <div className="footer-meta">
            <span>{t('updatedDaily')}</span>
            <span>{t('builtBy')} <b>{AUTHOR}</b></span>
          </div>
        </footer>
      </main>

      {sourcesOpen && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={t('sources')} onMouseDown={event => { if (event.target === event.currentTarget) setSourcesOpen(false) }}>
          <div className="modal-card">
            <div className="modal-head">
              <h2>{t('sources')}</h2>
              <button className="icon-btn" onClick={() => setSourcesOpen(false)} aria-label={t('close')}><X size={18} /></button>
            </div>
            <ul className="source-list">
              {research.sources.map(source => (
                <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer"><b>{tx(source.label)}</b><small>{source.url}</small><ExternalLink size={14} /></a></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
