import { useState } from 'react'
import { ArrowRight, CalendarDays, Check, Globe, KeyRound, ListChecks, MessageSquareText, Star, Trophy } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Translator } from '../i18n'
import { liveGoogle, nextTasks, planDay, reputationSeries, reviewDate, reviewsPerWeek, taskState } from '../model'
import type { Data } from '../types'
import { InfoTip, Pill, SectionHead } from '../ui'
import { StatePill } from './Plan'

type Props = { data: Data; tr: Translator; openTask: (id: string) => void; goTo: (tab: 'plan' | 'reputation' | 'website') => void }

function RankLadder({ rank, of, target, tr }: { rank: number; of: number; target: number; tr: Translator }) {
  const { t } = tr
  const position = (place: number) => `${((place - 0.5) / of) * 100}%`
  return (
    <div className="ladder" role="img" aria-label={`${t('rankOf', { rank, of })} · ${t('topZone', { n: target })}`}>
      <div className="ladder-track">
        <div className="ladder-zone" style={{ width: `${(target / of) * 100}%` }}><span>{t('topZone', { n: target })}</span></div>
        {Array.from({ length: of }, (_, index) => (
          <span key={index} className={`ladder-step ${index + 1 <= target ? 'in-zone' : ''} ${index + 1 === rank ? 'current' : ''}`} />
        ))}
      </div>
      <div className="ladder-marker" style={{ left: position(rank) }}>
        <span className="ladder-dot" />
        <span className="ladder-label">{t('nowRank')} · N° {rank}</span>
      </div>
      <div className="ladder-ends"><span>1</span><span>{of}</span></div>
    </div>
  )
}

export default function Today({ data, tr, openTask, goTo }: Props) {
  const { research, siteCheck } = data
  const { t, tx } = tr
  const [metric, setMetric] = useState<'reviews' | 'rating'>('reviews')

  const series = reputationSeries(data)
  const google = liveGoogle(research, siteCheck)
  const day0 = series.find(point => point.date === research.goal.start) ?? series[series.length - 1]
  // On Day 0 the gain is always zero, so compare with the oldest reading instead.
  const reference = day0 && google.reviews != null && google.reviews !== day0.reviews ? day0 : series[0]
  const reviewGain = google.reviews != null && reference ? google.reviews - reference.reviews : null
  const gainLabel = reference === day0 ? t('sinceDay0') : t('sinceDate', { date: tr.date(reference?.date ?? research.goal.start) })
  const weekly = reviewsPerWeek(series)
  const day = planDay(research)
  const doneTasks = research.tasks.filter(task => task.status === 'done').length
  const checksTotal = siteCheck.checks.length
  const upcoming = nextTasks(research, 4)
  const chartData = series.map(point => ({ ...point, label: tr.date(point.date) }))

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t('todayTitle')}</h1>
        <p>{t('todayIntro')}</p>
      </header>

      <section className="card goal-card">
        <div className="goal-top">
          <div>
            <div className="eyebrow"><Trophy size={14} /> {t('goalEyebrow')}</div>
            <h2>{tx(research.goal.title)}</h2>
            <p className="muted">{tx(research.goal.metric)} <InfoTip label={t('whereFrom')}>{tx(research.goal.rank_note)}</InfoTip></p>
          </div>
          <div className="goal-days">
            <span className="goal-day">{t('dayOf', { n: day, total: research.goal.days })}</span>
            <div className="bar"><span style={{ width: `${(day / research.goal.days) * 100}%` }} /></div>
            <span className="muted small"><CalendarDays size={13} /> {t('reviewMeeting')} · {tr.date(reviewDate(research))}</span>
          </div>
        </div>
        <RankLadder rank={research.goal.rank} of={research.goal.of} target={research.goal.target} tr={tr} />
      </section>

      <section className="kpis">
        <article className="card kpi">
          <div className="kpi-head"><span className="kpi-icon amber"><Star size={17} /></span>{t('kpiRating')}<InfoTip label={t('whereFrom')}>{t('ratingSource')}</InfoTip></div>
          <div className="kpi-value">{google.rating != null ? tr.rating(google.rating) : '–'}<small>/5</small></div>
          <div className="kpi-sub">{tr.dateTime(google.checked)}</div>
        </article>
        <article className="card kpi">
          <div className="kpi-head"><span className="kpi-icon blue"><MessageSquareText size={17} /></span>{t('kpiReviews')}<InfoTip label={t('whereFrom')}>{t('reviewsSource')}</InfoTip></div>
          <div className="kpi-value">{google.reviews != null ? tr.number(google.reviews) : '–'}</div>
          <div className="kpi-sub">
            {reviewGain != null && <span className={reviewGain > 0 ? 'up' : ''}>{reviewGain >= 0 ? '+' : ''}{reviewGain} {gainLabel}</span>}
            {weekly != null && <span>{t('perWeek', { n: tr.number(weekly) })}</span>}
          </div>
        </article>
        <button className="card kpi kpi-link" onClick={() => goTo('plan')}>
          <div className="kpi-head"><span className="kpi-icon green"><ListChecks size={17} /></span>{t('kpiPlan')}<InfoTip label={t('whereFrom')}>{t('planSource')}</InfoTip></div>
          <div className="kpi-value">{Math.round((doneTasks / research.tasks.length) * 100)}<small>%</small></div>
          <div className="kpi-sub">{t('tasksDone', { done: doneTasks, total: research.tasks.length })}</div>
          <div className="bar thin"><span style={{ width: `${(doneTasks / research.tasks.length) * 100}%` }} /></div>
        </button>
        <button className="card kpi kpi-link" onClick={() => goTo('website')}>
          <div className="kpi-head"><span className="kpi-icon violet"><Globe size={17} /></span>{t('kpiWebsite')}<InfoTip label={t('whereFrom')}>{t('websiteSource')}</InfoTip></div>
          <div className="kpi-value">{siteCheck.summary.pass}<small>/{checksTotal}</small></div>
          <div className="kpi-sub">{t('checksOk', { ok: siteCheck.summary.pass, total: checksTotal })}</div>
          <div className="bar thin"><span style={{ width: `${(siteCheck.summary.pass / checksTotal) * 100}%` }} /></div>
        </button>
      </section>

      <section className="card chart-card">
        <SectionHead
          title={t('chartTitle')}
          sub={t('chartSub')}
          action={
            <div className="segmented" role="group">
              <button className={metric === 'reviews' ? 'on' : ''} aria-pressed={metric === 'reviews'} onClick={() => setMetric('reviews')}>{t('chartReviews')}</button>
              <button className={metric === 'rating' ? 'on' : ''} aria-pressed={metric === 'rating'} onClick={() => setMetric('rating')}>{t('chartRating')}</button>
            </div>
          }
        />
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 18, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#ebe8e1" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6b6f68', fontSize: 12 }} />
              <YAxis
                width={44} tickLine={false} axisLine={false} tick={{ fill: '#6b6f68', fontSize: 12 }}
                domain={metric === 'reviews' ? ['dataMin - 5', 'dataMax + 5'] : [4, 5]} allowDecimals={metric === 'rating'}
              />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e4e1d8', fontSize: 13 }}
                formatter={value => (metric === 'reviews' ? [`${value} ${t('reviewsUnit')}`, t('chartReviews')] : [`${value} / 5`, t('chartRating')])}
              />
              <Line type="monotone" dataKey={metric} stroke="#2f5d43" strokeWidth={2.5} dot={{ r: 5, fill: '#2f5d43' }} activeDot={{ r: 7 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <SectionHead title={t('nextTitle')} action={<button className="link-btn" onClick={() => goTo('plan')}>{t('seePlan')} <ArrowRight size={15} /></button>} />
          <ul className="task-mini">
            {upcoming.map(task => (
              <li key={task.id}>
                <button onClick={() => openTask(task.id)}>
                  <span className="task-mini-title">{tx(task.title)}</span>
                  <StatePill state={taskState(task, research.access)} tr={tr} />
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <SectionHead title={t('ownerTitle')} sub={t('ownerSub')} />
          <ul className="access-list">
            {research.access.map(item => (
              <li key={item.id}>
                <span className={`access-icon ${item.status}`}>{item.status === 'done' ? <Check size={15} /> : <KeyRound size={15} />}</span>
                <div>
                  <b>{tx(item.title)}</b>
                  <p>{tx(item.how)}</p>
                </div>
                <Pill tone={item.status === 'done' ? 'green' : 'amber'}>{item.status === 'done' ? t('received') : t('toDo')}</Pill>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
