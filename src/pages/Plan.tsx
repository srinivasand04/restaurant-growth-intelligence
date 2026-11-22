import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, Circle, Clock3, KeyRound, Loader } from 'lucide-react'
import type { MessageKey, Translator } from '../i18n'
import { taskState, type TaskState } from '../model'
import type { Area, Data, Who } from '../types'
import { Pill } from '../ui'

const areaKey: Record<Area, MessageKey> = { google: 'areaGoogle', reviews: 'areaReviews', website: 'areaWebsite', listings: 'areaListings', measure: 'areaMeasure' }
const areaOrder: Area[] = ['google', 'reviews', 'website', 'listings', 'measure']
const whoKey: Record<Who, MessageKey> = { us: 'whoUs', owner: 'whoOwner', together: 'whoTogether' }
const stateKey: Record<TaskState, MessageKey> = { done: 'statusDone', doing: 'statusDoing', waiting: 'statusWaiting', todo: 'statusTodo' }
const stateTone = { done: 'green', doing: 'blue', waiting: 'amber', todo: 'grey' } as const
const stateIcon = { done: CheckCircle2, doing: Loader, waiting: Clock3, todo: Circle }

export function StatePill({ state, tr }: { state: TaskState; tr: Translator }) {
  const Icon = stateIcon[state]
  return <Pill tone={stateTone[state]}><Icon size={13} /> {tr.t(stateKey[state])}</Pill>
}

export default function Plan({ data, tr, focusId }: { data: Data; tr: Translator; focusId: string | null }) {
  const { research } = data
  const { t, tx } = tr
  const [area, setArea] = useState<Area | 'all'>('all')
  const [showDone, setShowDone] = useState(true)
  const [open, setOpen] = useState<string | null>(focusId)

  useEffect(() => {
    if (!focusId) return
    setOpen(focusId)
    setArea('all')
    requestAnimationFrame(() => document.getElementById(`task-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [focusId])

  const areas = useMemo(() => areaOrder.filter(item => research.tasks.some(task => task.area === item)), [research])
  const done = research.tasks.filter(task => task.status === 'done').length
  const visible = research.tasks.filter(task => (area === 'all' || task.area === area) && (showDone || task.status !== 'done'))
  const accessTitle = (id: string) => research.access.find(item => item.id === id)

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t('planTitle')}</h1>
        <p>{t('planIntro')}</p>
      </header>

      <div className="card plan-progress">
        <div className="plan-progress-text"><b>{t('progress', { done, total: research.tasks.length })}</b><span className="muted">{Math.round((done / research.tasks.length) * 100)}%</span></div>
        <div className="bar"><span style={{ width: `${(done / research.tasks.length) * 100}%` }} /></div>
      </div>

      <div className="filters">
        <div className="chips" role="group">
          <button className={area === 'all' ? 'on' : ''} onClick={() => setArea('all')}>{t('all')} <span>{research.tasks.length}</span></button>
          {areas.map(item => (
            <button key={item} className={area === item ? 'on' : ''} onClick={() => setArea(item)}>
              {t(areaKey[item])} <span>{research.tasks.filter(task => task.area === item).length}</span>
            </button>
          ))}
        </div>
        <label className="toggle"><input type="checkbox" checked={showDone} onChange={event => setShowDone(event.target.checked)} /> {t('showDone')}</label>
      </div>

      <ol className="task-list">
        {visible.length === 0 && <li className="card empty">{t('noTasks')}</li>}
        {visible.map(task => {
          const state = taskState(task, research.access)
          const isOpen = open === task.id
          const needed = task.needs ? accessTitle(task.needs) : null
          return (
            <li key={task.id} id={`task-${task.id}`} className={`card task ${isOpen ? 'open' : ''} state-${state}`}>
              <button className="task-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : task.id)}>
                <span className="task-title">{tx(task.title)}</span>
                <span className="task-tags">
                  <span className="tag">{t(areaKey[task.area])}</span>
                  <span className="tag">{t(whoKey[task.who])}</span>
                  <StatePill state={state} tr={tr} />
                </span>
                <ChevronDown size={18} className="chev" />
              </button>
              {isOpen && (
                <div className="task-body">
                  <div className="task-block"><h4>{t('why')}</h4><p>{tx(task.why)}</p></div>
                  <div className="task-block">
                    <h4>{t('how')}</h4>
                    <ol>{task.steps.map((step, index) => <li key={index}>{tx(step)}</li>)}</ol>
                  </div>
                  <div className="task-block"><h4>{t('doneWhen')}</h4><p>{tx(task.done_when)}</p></div>
                  {needed && (
                    <div className={`task-needs ${needed.status}`}>
                      <KeyRound size={15} /> <b>{t('needs')}:</b> {tx(needed.title)}
                      <Pill tone={needed.status === 'done' ? 'green' : 'amber'}>{needed.status === 'done' ? t('received') : t('toDo')}</Pill>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
