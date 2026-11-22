import { AlertTriangle, ExternalLink, Heart, Radio, Search, ThumbsUp } from 'lucide-react'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MessageKey, Translator } from '../i18n'
import { liveGoogle } from '../model'
import type { Data, Platform } from '../types'
import { InfoTip, Pill, SectionHead } from '../ui'

const managedKey: Record<Platform['managed'], MessageKey> = { yes: 'managedYes', no: 'managedNo', likely: 'managedLikely', unknown: 'managedUnknown' }
const managedTone = { yes: 'green', no: 'red', likely: 'blue', unknown: 'grey' } as const

export default function Reputation({ data, tr }: { data: Data; tr: Translator }) {
  const { research, siteCheck } = data
  const { t, tx } = tr
  const google = liveGoogle(research, siteCheck)

  // Google is refreshed every morning; the other platforms are dated manual readings.
  const platforms = research.platforms.map(platform =>
    platform.live ? { ...platform, rating: google.rating, reviews: google.reviews, checked_on: google.checked } : platform)
  const rated = platforms.filter(platform => platform.rating != null)
  const lowest = Math.min(...rated.map(platform => (platform.rating! / platform.scale) * 5))
  const chartData = rated
    .map(platform => ({ name: platform.name, score: Math.round((platform.rating! / platform.scale) * 5 * 100) / 100, original: `${tr.rating(platform.rating!)} / ${platform.scale}` }))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t('repTitle')}</h1>
        <p>{t('repIntro')}</p>
      </header>

      <section className="platforms">
        {platforms.map(platform => (
          <article className="card platform" key={platform.id}>
            <div className="platform-top">
              <h3>{platform.name}</h3>
              {platform.live ? <Pill tone="green"><Radio size={12} /> {t('live')}</Pill> : <Pill tone={managedTone[platform.managed]}>{t(managedKey[platform.managed])}</Pill>}
            </div>
            <div className="platform-score">
              <b>{platform.rating != null ? tr.rating(platform.rating) : '–'}</b>
              <span>/ {platform.scale}</span>
              {platform.reviews != null && <em>{tr.number(platform.reviews)} {t('reviews')}</em>}
            </div>
            {platform.rating != null && <div className="bar thin"><span style={{ width: `${(platform.rating / platform.scale) * 100}%` }} /></div>}
            <p>{tx(platform.why)}</p>
            <div className="platform-foot">
              <span className="muted small">
                {platform.live ? tr.dateTime(platform.checked_on) : tr.date(platform.checked_on)}
                <InfoTip label={t('whereFrom')}>{tx(platform.source)}</InfoTip>
              </span>
              <a href={platform.url} target="_blank" rel="noreferrer">{t('open')} <ExternalLink size={13} /></a>
            </div>
          </article>
        ))}
      </section>

      <section className="card chart-card">
        <SectionHead title={t('compareTitle')} sub={t('compareSub')} />
        <div className="chart bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 5]} hide />
              <YAxis type="category" dataKey="name" width={118} tickLine={false} axisLine={false} tick={{ fill: '#3b4038', fontSize: 13 }} />
              <Tooltip
                cursor={{ fill: 'rgba(47,93,67,.06)' }}
                contentStyle={{ borderRadius: 10, border: '1px solid #e4e1d8', fontSize: 13 }}
                formatter={(value, _name, item) => [`${tr.rating(Number(value))} / 5 (${item.payload.original})`, '']}
              />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={18} isAnimationActive={false}>
                {chartData.map(entry => <Cell key={entry.name} fill={entry.score === lowest ? '#c8814a' : '#2f5d43'} />)}
                <LabelList dataKey="score" position="right" formatter={(value: unknown) => tr.rating(Number(value))} style={{ fill: '#3b4038', fontSize: 13, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <SectionHead title={t('mismatchTitle')} />
        <div className="two-col">
          {research.mismatches.map(item => (
            <article className="card warn-card" key={item.id}>
              <h3><AlertTriangle size={17} /> {tx(item.title)}</h3>
              <p>{tx(item.detail)}</p>
              <div className="links">
                {item.sources.map(url => <a key={url} href={url} target="_blank" rel="noreferrer">{new URL(url).hostname.replace('www.', '')} <ExternalLink size={12} /></a>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <SectionHead title={t('voiceTitle')} sub={tx(research.guest_voice.note)} />
        <div className="two-col voice">
          <div>
            <h4 className="voice-head good"><Heart size={15} /> {t('praise')}</h4>
            <ul>{research.guest_voice.praise.map((quote, index) => <li key={index}>{tx(quote)} <span className="muted small">· {quote.source}</span></li>)}</ul>
          </div>
          <div>
            <h4 className="voice-head watch"><ThumbsUp size={15} className="flip" /> {t('concerns')}</h4>
            <ul>{research.guest_voice.concerns.map((quote, index) => <li key={index}>{tx(quote)} <span className="muted small">· {quote.source}</span></li>)}</ul>
          </div>
        </div>
      </section>

      <section className="card">
        <SectionHead title={t('wordsTitle')} sub={t('wordsSub')} />
        <div className="words">
          {research.keywords.map(word => (
            <span key={word.phrase} className={`word ${word.language.toLowerCase()}`}><Search size={13} /> {word.phrase} <small>{word.language}</small></span>
          ))}
        </div>
      </section>
    </div>
  )
}
