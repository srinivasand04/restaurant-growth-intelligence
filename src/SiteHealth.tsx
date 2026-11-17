import { ArrowUpRight, Check, CircleHelp, Compass, ExternalLink, FileSearch, KeyRound, Lightbulb, TriangleAlert, X } from 'lucide-react'
import type { MessageKey } from './i18n'
import type { Check as SiteCheckItem, CheckGroup, CheckStatus, Localized, Research, SiteCheck } from './types'

type Props = {
  siteCheck: SiteCheck
  research: Research
  t: (key: MessageKey) => string
  tx: (text: Localized) => string
  fmtDate: (iso: string) => string
  onSeeActions: () => void
}

const groupOrder: CheckGroup[] = ['guest_path', 'findability', 'languages', 'mobile_sharing']
const groupLabel: Record<CheckGroup, MessageKey> = {
  findability: 'groupFindability',
  languages: 'groupLanguages',
  guest_path: 'groupGuestPath',
  mobile_sharing: 'groupMobileSharing',
}
const statusLabel: Record<CheckStatus, MessageKey> = { pass: 'statusPass', warn: 'statusWarn', fail: 'statusFail', unknown: 'statusNa' }
const statusIcon = { pass: Check, warn: TriangleAlert, fail: X, unknown: CircleHelp }

function CheckBadge({ status, t }: { status: CheckStatus; t: Props['t'] }) {
  const Icon = statusIcon[status]
  return <span className={`status-badge check-${status}`}><Icon size={12} /> {t(statusLabel[status])}</span>
}

function Evidence({ check, t, tx }: { check: SiteCheckItem; t: Props['t']; tx: Props['tx'] }) {
  if (check.evidence.length === 0) return null
  return (
    <details className="evidence-details">
      <summary>{t('whatWeSaw')}</summary>
      <ul>{check.evidence.map((line, index) => <li key={index}>{typeof line === 'string' ? line : tx(line)}</li>)}</ul>
    </details>
  )
}

function Changes({ siteCheck, t, tx, fmtDate }: Pick<Props, 'siteCheck' | 't' | 'tx' | 'fmtDate'>) {
  const changes = siteCheck.changes!
  const titleOf = (id: string) => {
    const check = siteCheck.checks.find(item => item.id === id)
    return check ? tx(check.title) : id
  }
  const rows = [
    ...changes.resolved.map(id => ({ id, kind: 'fixed' as const })),
    ...changes.new.map(id => ({ id, kind: 'new' as const })),
  ]
  return (
    <section className="card changes-card">
      <div className="section-eyebrow">{t('changesEyebrow')} · {fmtDate(changes.since)}</div>
      {rows.length === 0
        ? <p className="no-changes"><Check size={13} /> {t('noChanges')} {fmtDate(changes.since)}.</p>
        : <>
          <h3>{t('changesTitle')}</h3>
          <ul>
            {rows.map(row => (
              <li key={`${row.kind}-${row.id}`} className={row.kind}>
                {row.kind === 'fixed' ? <Check size={13} /> : <TriangleAlert size={13} />}
                <b>{t(row.kind === 'fixed' ? 'fixedLabel' : 'newLabel')}</b> {titleOf(row.id)}
              </li>
            ))}
          </ul>
        </>}
    </section>
  )
}

export default function SiteHealth({ siteCheck, research, t, tx, fmtDate, onSeeActions }: Props) {
  const problems = siteCheck.checks
    .filter(check => check.status === 'fail' || check.status === 'warn')
    .sort((a, b) => Number(b.status === 'fail') - Number(a.status === 'fail'))
  const settled = siteCheck.checks.filter(check => check.status === 'pass' || check.status === 'unknown')
  const sourceById = (id: string) => research.sources.find(source => source.id === id)

  return (
    <>
      <div className="data-banner audit-banner">
        <div className="banner-icon"><FileSearch size={18} /></div>
        <div><b>{t('liveBanner')}</b><span>{t('liveScope')}</span></div>
        <span className="snapshot-date">{t('lastChecked')} {fmtDate(siteCheck.checked_at).toUpperCase()}</span>
      </div>

      <div className="health-summary">
        <div className="health-stat fail"><strong>{siteCheck.summary.fail}</strong><span>{t('statusFail')}</span></div>
        <div className="health-stat warn"><strong>{siteCheck.summary.warn}</strong><span>{t('statusWarn')}</span></div>
        <div className="health-stat pass"><strong>{siteCheck.summary.pass}</strong><span>{t('statusPass')}</span></div>
        <div className="health-stat"><strong>{siteCheck.pages.length}</strong><span>{t('pagesChecked')}</span></div>
      </div>

      {siteCheck.changes && <Changes siteCheck={siteCheck} t={t} tx={tx} fmtDate={fmtDate} />}

      <section className="health-section">
        <div className="section-eyebrow">{t('needsAttention')} · {problems.length}</div>
        <h2>{t('needsAttentionTitle')}</h2>
        {problems.length === 0 && <div className="card empty-state">{t('allGood')}</div>}
        <div className="problem-list">
          {problems.map(check => (
            <article className={`card problem-card ${check.status}`} key={check.id}>
              <div className="audit-card-top">
                <span className="audit-category">{t(groupLabel[check.group])}</span>
                <CheckBadge status={check.status} t={t} />
              </div>
              <h3>{tx(check.title)}</h3>
              <p>{tx(check.detail)}</p>
              {check.fix && (
                <div className="action-recommendation">
                  <div className="recommendation-icon"><Lightbulb size={15} /></div>
                  <div><b>{t('howToFix')}</b><p>{tx(check.fix)}</p></div>
                </div>
              )}
              <Evidence check={check} t={t} tx={tx} />
            </article>
          ))}
        </div>
      </section>

      <section className="health-section">
        <div className="section-eyebrow">{t('passedEyebrow')} · {siteCheck.summary.pass}</div>
        <h2>{t('passedTitle')}</h2>
        <div className="passed-groups">
          {groupOrder.map(group => {
            const checks = settled.filter(check => check.group === group)
            if (checks.length === 0) return null
            return (
              <div className="card passed-group" key={group}>
                <div className="audit-category">{t(groupLabel[group])}</div>
                {checks.map(check => (
                  <div className="passed-row" key={check.id}>
                    <span className={`status-icon ${check.status === 'pass' ? 'observed' : 'unknown'}`}>
                      {check.status === 'pass' ? <Check size={13} /> : <CircleHelp size={13} />}
                    </span>
                    <div>
                      <b>{tx(check.title)}</b>
                      <p>{tx(check.detail)}</p>
                      <Evidence check={check} t={t} tx={tx} />
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </section>

      <section className="health-section">
        <div className="section-eyebrow">{t('ownerOnlyEyebrow')} · {research.owner_checks.length}</div>
        <h2>{t('ownerOnly')}</h2>
        <div className="audit-grid owner-grid">
          {research.owner_checks.map(item => (
            <article className="card audit-card" key={item.id}>
              <div className="audit-card-top">
                <span className="audit-category"><KeyRound size={11} /> {t('needed')}</span>
                <span className={`status-badge ${item.status}`}><CircleHelp size={12} /> {t(item.status === 'partial' ? 'partialStatus' : 'unknownStatus')}</span>
              </div>
              <h3>{tx(item.title)}</h3>
              <p>{tx(item.detail)}</p>
              <div className="evidence-line"><span>{t('needed')}</span><b>{tx(item.needs)}</b></div>
              <div className="source-links">
                {item.source_ids.map(id => {
                  const source = sourceById(id)
                  return source ? <a href={source.url} target="_blank" rel="noreferrer" key={id}>{tx(source.label)} <ExternalLink size={11} /></a> : null
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card audit-bottom">
        <div className="audit-bottom-icon"><Compass size={17} /></div>
        <div><b>{t('finishTitle')}</b><p>{t('finishBody')}</p></div>
        <button onClick={onSeeActions}>{t('actionSequence')} <ArrowUpRight size={14} /></button>
      </section>
    </>
  )
}
