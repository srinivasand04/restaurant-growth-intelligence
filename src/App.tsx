import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, BadgeCheck, BookOpen, Check, ChevronDown, CircleHelp, Clock3, Compass, ExternalLink, FileSearch, Globe2, KeyRound, Lightbulb, MapPin, Menu, MousePointer2, Search, Settings2, Sparkles, Target, TriangleAlert, Wrench, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import researchSnapshot from '../backend/snapshot/research.json'
import siteCheckSnapshot from '../backend/snapshot/site_check.json'
import { getMessages, type MessageKey, type UiLanguage } from './i18n'
import SiteHealth from './SiteHealth'
import type { ActionItem, Level, Localized, Priority, Research, SiteCheck } from './types'

// The snapshots are bundled at build time, so the dashboard always has data.
// When the API is reachable it replaces them with the freshest copy.
const AUTHOR = 'Srinivasan'
// The daily check runs every morning; older data than this gets a visible warning.
const STALE_AFTER_HOURS = 36

const bundledResearch = researchSnapshot as Research
const bundledSiteCheck = siteCheckSnapshot as SiteCheck

const menuItems = [
  { id: 'overview', key: 'overview', icon: Compass },
  { id: 'actions', key: 'actions', icon: Target },
  { id: 'audit', key: 'audit', icon: FileSearch },
  { id: 'keywords', key: 'keywords', icon: Search },
] as const
type SectionId = (typeof menuItems)[number]['id']

const pageTitle: Record<SectionId, MessageKey> = { overview: 'titleOverview', keywords: 'titleKeywords', audit: 'titleAudit', actions: 'titleActions' }
const pageIntro: Record<SectionId, MessageKey> = { overview: 'descOverview', keywords: 'descKeywords', audit: 'descAudit', actions: 'descActions' }
const priorityKey: Record<Priority, MessageKey> = { High: 'priorityHigh', Medium: 'priorityMedium', Low: 'priorityLow' }
const badgeKey: Record<Priority, MessageKey> = { High: 'badgeHigh', Medium: 'badgeMedium', Low: 'badgeLow' }
const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }
const sourceKindKey = { site: 'kindSite', google: 'kindGoogle', future: 'kindFuture' } as const
const levelFr: Record<Level, string> = { Low: 'Faible', Medium: 'Moyen', High: 'Élevé' }

/** Site problems and curated recommendations in one list, most urgent first. */
function buildActions(research: Research, siteCheck: SiteCheck): ActionItem[] {
  const fromSite: ActionItem[] = siteCheck.checks
    .filter(check => check.status === 'fail' || check.status === 'warn')
    .sort((a, b) => Number(b.status === 'fail') - Number(a.status === 'fail'))
    .map(check => ({
      kind: 'site',
      id: `site-${check.id}`,
      priority: check.status === 'fail' ? 'High' : 'Medium',
      title: check.title,
      observation: check.detail,
      recommendation: check.fix ?? check.detail,
    }))
  const fromPlan: ActionItem[] = research.opportunities.map(opportunity => ({ kind: 'plan', ...opportunity }))
  return [...fromSite, ...fromPlan].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
}

export default function App() {
  const [research, setResearch] = useState(bundledResearch)
  const [siteCheck, setSiteCheck] = useState(bundledSiteCheck)
  const [section, setSection] = useState<SectionId>('overview')
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>(() => (localStorage.getItem('caratello-language') === 'FR' ? 'FR' : 'EN'))
  const [keywordLanguage, setKeywordLanguage] = useState<'All' | 'FR' | 'EN'>('All')
  const [query, setQuery] = useState('')
  const [sourceOpen, setSourceOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [apiStatus, setApiStatus] = useState<'loading' | 'live' | 'offline'>('loading')

  const t = (key: MessageKey) => getMessages(uiLanguage)[key]
  const tx = (text: Localized) => (uiLanguage === 'FR' ? text.fr : text.en)
  const fmtDate = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(uiLanguage === 'FR' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const levelText = (level: Level) => (uiLanguage === 'FR' ? levelFr[level] : level)

  const profile = research.profile

  useEffect(() => {
    document.documentElement.lang = uiLanguage.toLowerCase()
    document.title = `${profile.name} — ${getMessages(uiLanguage).appTitle}`
    localStorage.setItem('caratello-language', uiLanguage)
  }, [uiLanguage, profile.name])

  useEffect(() => {
    Promise.all([fetch('/api/research'), fetch('/api/site-check')])
      .then(async ([researchReply, siteCheckReply]) => {
        if (!researchReply.ok || !siteCheckReply.ok) throw new Error('API unavailable')
        setResearch(await researchReply.json())
        setSiteCheck(await siteCheckReply.json())
        setApiStatus('live')
      })
      .catch(() => setApiStatus('offline'))
  }, [])

  const actions = useMemo(() => buildActions(research, siteCheck), [research, siteCheck])
  const toFix = siteCheck.summary.fail + siteCheck.summary.warn
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(uiLanguage === 'FR' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
  const hoursOld = (Date.now() - Date.parse(siteCheck.checked_at)) / 3_600_000
  const stale = hoursOld > STALE_AFTER_HOURS

  const filteredKeywords = useMemo(() => {
    const needle = query.toLowerCase()
    return research.keywords.filter(keyword =>
      (keywordLanguage === 'All' || keyword.language === keywordLanguage) &&
      `${keyword.phrase} ${tx(keyword.intent)} ${tx(keyword.rationale)}`.toLowerCase().includes(needle))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [research, keywordLanguage, query, uiLanguage])

  const chartData = (['High', 'Medium', 'Low'] as const).map(priority => ({
    priority: t(priorityKey[priority]),
    count: actions.filter(action => action.priority === priority).length,
  }))

  const sourceById = (id: string) => research.sources.find(source => source.id === id)
  const navigate = (id: SectionId) => {
    setSection(id)
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const initials = profile.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">{initials[0]}<span>·</span></div>
          <div className="brand-name">{profile.name}<span>{t('brandSub')}</span></div>
          <button className="icon-btn close-mobile" onClick={() => setMobileOpen(false)} aria-label={t('closeNavigation')}><X size={18} /></button>
        </div>
        <div className="workspace-label">{t('workspace').toUpperCase()}</div>
        <button className="restaurant-switch">
          <span className="restaurant-avatar">{initials}</span>
          <span className="switch-copy"><b>{profile.name}</b><small>Paris 18e, France</small></span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">{t('intelligence')}</div>
        <nav>
          {menuItems.map(item => (
            <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}>
              <item.icon size={17} />{t(item.key)}
              {item.id === 'actions' && <span className="nav-count">{actions.length}</span>}
              {item.id === 'audit' && toFix > 0 && <span className="nav-count alert">{toFix}</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label tools-label">{t('tools')}</div>
        <button className="nav-item" onClick={() => setSourceOpen(true)}><BookOpen size={17} />{t('sources')}<ExternalLink size={13} className="nav-trailing" /></button>
        <div className="sidebar-bottom">
          <div className="profile-card">
            <div className="profile-avatar">S</div>
            <div><b>{t('strategyWorkspace')}</b><small>{t('stepLocal')}</small></div>
            <Settings2 size={15} />
          </div>
          <div className="sidebar-foot">
            <span className={`api-dot ${apiStatus}`}></span>
            {apiStatus === 'live' ? t('apiConnected') : apiStatus === 'offline' ? t('apiOffline') : t('apiLoading')}
          </div>
        </div>
      </aside>
      {mobileOpen && <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileOpen(true)} aria-label={t('openNavigation')}><Menu size={20} /></button>
          <div className="crumb">{t('workspace')} <span>/</span> <b>{t(menuItems.find(item => item.id === section)?.key ?? 'overview')}</b></div>
          <div className="top-actions">
            <div className={`snapshot ${stale ? 'stale' : ''}`} title={`${fmtDate(siteCheck.checked_at)} ${t('checkedAtTime')} ${fmtTime(siteCheck.checked_at)}`}>
              <span className="snapshot-dot" /> {t('snapshot')} <b>{fmtDate(siteCheck.checked_at)}</b> <span className="snapshot-time">{fmtTime(siteCheck.checked_at)}</span>
            </div>
            <div className="language-toggle" role="group" aria-label={t('language')}>
              <button type="button" aria-pressed={uiLanguage === 'EN'} className={uiLanguage === 'EN' ? 'selected' : ''} onClick={() => setUiLanguage('EN')}>EN</button>
              <button type="button" aria-pressed={uiLanguage === 'FR'} className={uiLanguage === 'FR' ? 'selected' : ''} onClick={() => setUiLanguage('FR')}>FR</button>
            </div>
            <button className="avatar-button" aria-label={t('account')}>S</button>
          </div>
        </header>

        <div className="content-wrap">
          {stale && (
            <div className="stale-banner" role="status">
              <TriangleAlert size={16} />
              <div><b>{t('staleTitle')}</b><span>{t('staleBody')} {fmtDate(siteCheck.checked_at)} {t('checkedAtTime')} {fmtTime(siteCheck.checked_at)}. {t('staleBody2')}</span></div>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span>{t('step01')}</span><i /> {t('eyebrow')}</div>
              <h1>{t(pageTitle[section])}</h1>
              <p>{t(pageIntro[section])}</p>
            </div>
            <a className="site-link" href={profile.website} target="_blank" rel="noreferrer"><Globe2 size={16} /> {t('viewSite')} <ExternalLink size={13} /></a>
          </div>

          {section === 'overview' && <>
            <div className="hero-panel">
              <div className="hero-copy">
                <div className="hero-kicker"><MapPin size={14} /> {profile.area}</div>
                <h2>{t('heroTitle1')}<br /><em>{t('heroTitle2')}</em></h2>
                <p>{t('heroBody')}</p>
                <button className="hero-cta" onClick={() => navigate('actions')}>{t('seeActions')} <ArrowUpRight size={15} /></button>
              </div>
              <div className="hero-art">
                <div className="sun-disc" /><div className="orbit orbit-one" /><div className="orbit orbit-two" />
                <div className="landmark"><div className="dome" /><div className="tower" /><div className="chapel"><span /><span /><span /></div><div className="hill" /></div>
                <div className="pin-card">
                  <div className="pin-icon"><MapPin size={15} /></div>
                  <div><b>Abbesses</b><small>Paris 18e · Montmartre</small></div>
                  <span className="pin-status">{t('live')}</span>
                </div>
                <div className="tiny-note">{t('localSearch')} <b>→</b> {t('yourDoor')}</div>
              </div>
              <div className="hero-foot">
                <span><Check size={13} /> {t('sourceLinked')}</span>
                <span><Check size={13} /> {t('noMadeUp')}</span>
                <span><Clock3 size={13} /> {t('snapshotDated')} {fmtDate(siteCheck.checked_at)}</span>
              </div>
            </div>

            <div className="metric-grid">
              <Metric icon={<Wrench size={18} />} label={t('toFix')} value={`${toFix}`} sub={t('toFixSub')} tone="amber" trend={t('seeFixes')} onClick={() => navigate('audit')} />
              <Metric icon={<BadgeCheck size={18} />} label={t('checksPassed')} value={`${siteCheck.summary.pass}`} sub={t('checksPassedSub')} tone="green" trend={t('checkedLive')} onClick={() => navigate('audit')} />
              <Metric icon={<Search size={18} />} label={t('searchIdeas')} value={`${research.keywords.length}`} sub={t('searchIdeasSub')} tone="purple" trend={t('researchIdeas')} onClick={() => navigate('keywords')} />
              <Metric icon={<MousePointer2 size={18} />} label={t('guestActions')} value={t('bookingOrder')} sub={t('guestActionsSub')} tone="blue" trend={t('conversionPath')} />
            </div>

            <div className="section-grid">
              <section className="card opportunity-card">
                <div className="card-top">
                  <div><div className="section-eyebrow">{t('firstMoves')}</div><h3>{t('focusFirst')}</h3></div>
                  <button className="text-button" onClick={() => navigate('actions')}>{t('fullPlan')} <ArrowUpRight size={14} /></button>
                </div>
                <div className="priority-list">
                  {actions.slice(0, 3).map((action, index) => (
                    <button className="priority-row" key={action.id} onClick={() => navigate('actions')}>
                      <span className={`priority-index p-${index + 1}`}>0{index + 1}</span>
                      <span className="priority-main"><b>{tx(action.title)}</b><small>{tx(action.kind === 'plan' ? action.benefit : action.recommendation)}</small></span>
                      <span className={`priority-pill ${action.priority.toLowerCase()}`}>{t(priorityKey[action.priority])}</span>
                      <ArrowUpRight size={15} className="row-arrow" />
                    </button>
                  ))}
                </div>
              </section>
              <section className="card profile-overview">
                <div className="card-top">
                  <div><div className="section-eyebrow">{t('businessSnapshot')}</div><h3>{t('strongStart')}</h3></div>
                  <span className="verified-badge"><Check size={12} /> {t('publicSite')}</span>
                </div>
                <div className="snapshot-title"><div className="pizza-icon">✳</div><div><b>{profile.name}</b><span>{tx(profile.cuisine)}</span></div></div>
                <div className="profile-detail"><MapPin size={15} /><span>{profile.address}</span></div>
                <div className="service-chips">{profile.services.map(service => <span key={service.en}>{tx(service)}</span>)}</div>
                <div className="profile-note"><Lightbulb size={15} /><span>{t('profileNote')}</span></div>
              </section>
            </div>

            <div className="section-grid second-grid">
              <section className="card chart-card">
                <div className="card-top">
                  <div><div className="section-eyebrow">{t('recommendationMix')}</div><h3>{t('practicalOpportunities')}</h3></div>
                  <span className="chart-note">{t('effortEvidence')}</span>
                </div>
                <div className="chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 26, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="#e9e8e2" />
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis dataKey="priority" type="category" axisLine={false} tickLine={false} tick={{ fill: '#70736e', fontSize: 12, fontWeight: 600 }} width={64} />
                      <Tooltip cursor={{ fill: 'rgba(27,37,29,.035)' }} contentStyle={{ border: '1px solid #e7e7df', borderRadius: 12, fontFamily: 'DM Sans', fontSize: 12 }} formatter={value => [`${value} ${t('recommendationCount')}`, t('count')]} />
                      <Bar dataKey="count" radius={[0, 7, 7, 0]} barSize={15} fill="#385b47" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-caption">
                  <span><i className="legend-dot" /> {t('plannedCount')}</span>
                  <button onClick={() => navigate('actions')}>{t('reviewList')} <ArrowUpRight size={13} /></button>
                </div>
              </section>
              <section className="card audit-mini">
                <div className="card-top">
                  <div><div className="section-eyebrow">{t('researchStatus')}</div><h3>{t('honestDesign')}</h3></div>
                  <Activity size={18} className="muted-icon" />
                </div>
                <div className="audit-status-list">
                  <div><span className="status-icon unknown"><TriangleAlert size={13} /></span><span><b>{t('toFixRow')}</b><small>{t('toFixRowSub')}</small></span><strong>{toFix}</strong></div>
                  <div><span className="status-icon observed"><Check size={13} /></span><span><b>{t('passedLive')}</b><small>{t('passedLiveSub')}</small></span><strong>{siteCheck.summary.pass}</strong></div>
                  <div><span className="status-icon owner"><KeyRound size={13} /></span><span><b>{t('ownerAccessRow')}</b><small>{t('ownerAccessSub')}</small></span><strong>{research.owner_checks.length}</strong></div>
                </div>
                <button className="audit-link" onClick={() => navigate('audit')}>{t('fullAudit')} <ArrowUpRight size={14} /></button>
              </section>
            </div>

            <div className="bottom-callout">
              <div className="callout-icon"><Sparkles size={18} /></div>
              <div><b>{t('nextStep')}</b><p>{t('connectSearchConsole')}</p></div>
              <button onClick={() => navigate('keywords')}>{t('exploreIdeas')} <ArrowUpRight size={14} /></button>
            </div>
          </>}

          {section === 'keywords' && <>
            <div className="data-banner">
              <div className="banner-icon"><Search size={18} /></div>
              <div><b>{t('hypotheses')}</b><span>{t('unavailableInsights')}</span></div>
              <a href="https://search.google.com/search-console/" target="_blank" rel="noreferrer">{t('aboutSearchConsole')} <ExternalLink size={13} /></a>
            </div>
            <section className="card keyword-card">
              <div className="table-heading">
                <div><div className="section-eyebrow">{t('queryIdeas')} · {filteredKeywords.length} {t('shown')}</div><h3>{t('matchMoment')}</h3></div>
                <div className="table-controls">
                  <div className="search-box"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} /></div>
                  <div className="segmented">
                    {(['All', 'FR', 'EN'] as const).map(language => (
                      <button key={language} className={keywordLanguage === language ? 'selected' : ''} onClick={() => setKeywordLanguage(language)}>{language === 'All' ? t('all') : language}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>{t('searchTheme')}</th><th>{t('language')}</th><th>{t('guestIntent')}</th><th>{t('fit')}</th><th>{t('searchVolume')}</th><th>{t('position')}</th></tr></thead>
                  <tbody>
                    {filteredKeywords.map(keyword => (
                      <tr key={keyword.phrase}>
                        <td><b>{keyword.phrase}</b><small>{tx(keyword.rationale)}</small></td>
                        <td data-label={t('language')}><span className={`language-tag ${keyword.language.toLowerCase()}`}>{keyword.language === 'FR' ? '🇫🇷' : '🇬🇧'} {keyword.language}</span></td>
                        <td data-label={t('guestIntent')}>{tx(keyword.intent)}</td>
                        <td data-label={t('fit')}><span className={`fit-tag ${keyword.fit.toLowerCase()}`}>{t(priorityKey[keyword.fit])}</span></td>
                        <td data-label={t('searchVolume')}><span className="unavailable">{t('notAvailable')}</span></td>
                        <td data-label={t('position')}><span className="unavailable">{t('notMeasured')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredKeywords.length === 0 && <div className="empty-state">{t('noKeywordMatches')}</div>}
              </div>
              <div className="table-footer">
                <span><CircleHelp size={14} /> {t('ideasEvidence')}</span>
                <span>{t('researchDate')} · {fmtDate(research.researched_on)}</span>
              </div>
            </section>
            <section className="note-grid">
              <div className="card note-card"><div className="note-icon fr">FR</div><div><b>{t('frenchNearby')}</b><p>{t('frenchTip')}</p></div></div>
              <div className="card note-card"><div className="note-icon en">EN</div><div><b>{t('englishDecide')}</b><p>{t('englishTip')}</p></div></div>
            </section>
          </>}

          {section === 'audit' && <SiteHealth siteCheck={siteCheck} research={research} t={t} tx={tx} fmtDate={fmtDate} onSeeActions={() => navigate('actions')} />}

          {section === 'actions' && <>
            <div className="action-intro">
              <div className="action-intro-copy"><span className="section-eyebrow">{t('firstSprint')}</span><h2>{t('guestChoice')}</h2><p>{t('actionIntro')}</p></div>
              <div className="action-intro-metric"><span>{actions.length}</span><small>{t('evidenceOpportunities')}</small></div>
            </div>
            <div className="action-list">
              {actions.map((action, index) => (
                <article className="card action-card" key={action.id}>
                  <div className="action-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="action-body">
                    <div className="action-title-line"><h3>{tx(action.title)}</h3><PriorityBadge value={action.priority} t={t} /></div>
                    <p className="action-observation"><b>{t('observed')}</b> {tx(action.observation)}</p>
                    <div className="action-recommendation">
                      <div className="recommendation-icon"><Lightbulb size={15} /></div>
                      <div><b>{t('recommendedAction')}</b><p>{tx(action.recommendation)}</p></div>
                    </div>
                    {action.kind === 'plan' ? <>
                      <div className="action-meta">
                        <span><b>{t('effort')}</b>{levelText(action.effort)}</span>
                        <span><b>{t('confidence')}</b>{levelText(action.confidence)}</span>
                        <span><b>{t('value')}</b>{tx(action.benefit)}</span>
                      </div>
                      <div className="source-links">
                        {action.source_ids.map(id => {
                          const source = sourceById(id)
                          return source ? <a href={source.url} target="_blank" rel="noreferrer" key={id}>{tx(source.label)} <ExternalLink size={11} /></a> : null
                        })}
                      </div>
                    </> : (
                      <div className="source-links">
                        <span className="origin-tag"><FileSearch size={11} /> {t('siteCheckOrigin')} · {fmtDate(siteCheck.checked_at)}</span>
                        <button onClick={() => navigate('audit')}>{t('seeEvidence')} <ArrowUpRight size={11} /></button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <div className="measurement-note">
              <div className="measure-icon"><Target size={17} /></div>
              <div><b>{t('measureOwner')}</b><p>{t('measureCopy')}</p></div>
            </div>
          </>}

          <footer className="page-footer">
            <span>{profile.name.toUpperCase()} <i>·</i> {t('footerSub')}</span>
            <span>{t('footerStep')} <i>·</i> {fmtDate(siteCheck.checked_at)} <i>·</i> {t('madeBy')} <b className="footer-author">{AUTHOR}</b></span>
          </footer>
        </div>
      </main>

      {sourceOpen && (
        <div className="modal-scrim" onMouseDown={event => { if (event.target === event.currentTarget) setSourceOpen(false) }}>
          <section className="source-modal">
            <div className="modal-head">
              <div><div className="section-eyebrow">{t('researchTrail')}</div><h2>{t('sourceTitle')}</h2><p>{t('sourceIntro')}</p></div>
              <button className="icon-btn" onClick={() => setSourceOpen(false)} aria-label={t('closeSources')}><X size={19} /></button>
            </div>
            <div className="source-list">
              {research.sources.map(source => (
                <a href={source.url} target="_blank" rel="noreferrer" className="source-item" key={source.id}>
                  <span className="source-type">{t(sourceKindKey[source.kind])}</span>
                  <b>{tx(source.label)}</b>
                  <small>{source.url}</small>
                  <span className="source-date">{t('checkedDate')} {fmtDate(source.checked_at)} <ExternalLink size={12} /></span>
                </a>
              ))}
            </div>
            <div className="modal-foot"><CircleHelp size={14} /> {t('sourceLimit')}</div>
          </section>
        </div>
      )}
    </div>
  )
}

const trendIcon = { green: ArrowUpRight, amber: Wrench, purple: Sparkles, blue: ArrowDownRight }

function Metric({ icon, label, value, sub, tone, trend, onClick }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: keyof typeof trendIcon; trend: string; onClick?: () => void }) {
  const TrendIcon = trendIcon[tone]
  const body = <>
    <div className={`metric-icon ${tone}`}>{icon}</div>
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}</div>
    <div className="metric-sub">{sub}</div>
    <div className={`metric-trend ${tone}`}><TrendIcon size={13} /><span>{trend}</span></div>
  </>
  return onClick ? <button className="metric-card metric-button" onClick={onClick}>{body}</button> : <div className="metric-card">{body}</div>
}

function PriorityBadge({ value, t }: { value: Priority; t: (key: MessageKey) => string }) {
  return (
    <span className={`priority-pill ${value.toLowerCase()}`}>
      {value === 'High' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {t(badgeKey[value])}
    </span>
  )
}
