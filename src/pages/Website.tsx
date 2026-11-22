import { useState } from 'react'
import { Check, ChevronDown, CircleHelp, ExternalLink, Lightbulb, TriangleAlert, X } from 'lucide-react'
import type { MessageKey, Translator } from '../i18n'
import type { Check as CheckItem, CheckGroup, CheckStatus, Data } from '../types'
import { Pill, SectionHead } from '../ui'

const groupKey: Record<CheckGroup, MessageKey> = { findability: 'groupFindability', languages: 'groupLanguages', guest_path: 'groupGuestPath', mobile_sharing: 'groupMobileSharing' }
const groupOrder: CheckGroup[] = ['guest_path', 'findability', 'languages', 'mobile_sharing']
const statusKey: Record<CheckStatus, MessageKey> = { pass: 'statusPass', warn: 'statusWarn', fail: 'statusFail', unknown: 'statusNa' }
const statusTone = { pass: 'green', warn: 'amber', fail: 'red', unknown: 'grey' } as const
const statusIcon = { pass: Check, warn: TriangleAlert, fail: X, unknown: CircleHelp }

function StatusPill({ status, tr }: { status: CheckStatus; tr: Translator }) {
  const Icon = statusIcon[status]
  return <Pill tone={statusTone[status]}><Icon size={13} /> {tr.t(statusKey[status])}</Pill>
}

function Evidence({ check, tr }: { check: CheckItem; tr: Translator }) {
  if (check.evidence.length === 0) return null
  return (
    <details className="evidence">
      <summary>{tr.t('whatWeSaw')}</summary>
      <ul>{check.evidence.map((line, index) => <li key={index}>{typeof line === 'string' ? line : tr.tx(line)}</li>)}</ul>
    </details>
  )
}

export default function Website({ data, tr }: { data: Data; tr: Translator }) {
  const { siteCheck, research } = data
  const { t, tx } = tr
  const [openGroup, setOpenGroup] = useState<CheckGroup | null>(null)
  const problems = siteCheck.checks
    .filter(check => check.status === 'warn' || check.status === 'fail')
    .sort((a, b) => Number(b.status === 'fail') - Number(a.status === 'fail'))
  const titleOf = (id: string) => {
    const check = siteCheck.checks.find(item => item.id === id)
    return check ? tx(check.title) : id
  }
  const changes = siteCheck.changes

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t('webTitle')}</h1>
        <p>{t('webIntro')} <a href={research.profile.website} target="_blank" rel="noreferrer" className="inline-link">piccolocaratello.com <ExternalLink size={13} /></a></p>
      </header>

      <section className="stat-row">
        <div className="card stat red"><b>{siteCheck.summary.fail}</b><span>{t('statusFail')}</span></div>
        <div className="card stat amber"><b>{siteCheck.summary.warn}</b><span>{t('statusWarn')}</span></div>
        <div className="card stat green"><b>{siteCheck.summary.pass}</b><span>{t('statusPass')}</span></div>
        <div className="card stat"><b>{siteCheck.pages.length}</b><span>{t('pagesChecked')}</span></div>
      </section>

      {changes && (
        <section className="card changes">
          <h3>{t('changesTitle', { date: tr.date(changes.since) })}</h3>
          {changes.new.length + changes.resolved.length === 0
            ? <p className="muted"><Check size={14} /> {t('noChanges')}</p>
            : <ul>
              {changes.resolved.map(id => <li key={`f-${id}`} className="fixed"><Check size={14} /> <b>{t('fixed')}</b> {titleOf(id)}</li>)}
              {changes.new.map(id => <li key={`n-${id}`} className="new"><TriangleAlert size={14} /> <b>{t('newProblem')}</b> {titleOf(id)}</li>)}
            </ul>}
        </section>
      )}

      <section>
        <SectionHead title={`${t('fixFirst')} · ${problems.length}`} />
        {problems.length === 0 && <div className="card empty">{t('allGood')}</div>}
        <div className="two-col">
          {problems.map(check => (
            <article className={`card problem ${check.status}`} key={check.id}>
              <div className="problem-top"><span className="muted small">{t(groupKey[check.group])}</span><StatusPill status={check.status} tr={tr} /></div>
              <h3>{tx(check.title)}</h3>
              <p>{tx(check.detail)}</p>
              {check.fix && <div className="fix"><Lightbulb size={16} /><div><b>{t('howToFix')}</b><p>{tx(check.fix)}</p></div></div>}
              <Evidence check={check} tr={tr} />
            </article>
          ))}
        </div>
      </section>

      <section>
        <SectionHead title={`${t('working')} · ${siteCheck.summary.pass}`} />
        <div className="groups">
          {groupOrder.map(group => {
            const checks = siteCheck.checks.filter(check => check.group === group && (check.status === 'pass' || check.status === 'unknown'))
            if (checks.length === 0) return null
            const isOpen = openGroup === group
            return (
              <div className={`card group ${isOpen ? 'open' : ''}`} key={group}>
                <button className="group-row" aria-expanded={isOpen} onClick={() => setOpenGroup(isOpen ? null : group)}>
                  <span className="group-ok"><Check size={15} /></span>
                  <b>{t(groupKey[group])}</b>
                  <span className="muted">{checks.length}</span>
                  <ChevronDown size={18} className="chev" />
                </button>
                {isOpen && (
                  <ul className="group-list">
                    {checks.map(check => (
                      <li key={check.id}>
                        <b>{tx(check.title)}</b>
                        <p>{tx(check.detail)}</p>
                        <Evidence check={check} tr={tr} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
