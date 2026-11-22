import type { Access, Data, Research, SiteCheck, Task } from './types'

export type TaskState = 'done' | 'doing' | 'waiting' | 'todo'

/** A task that needs an access item the owner has not given yet is "waiting". */
export function taskState(task: Task, access: Access[]): TaskState {
  if (task.status === 'done') return 'done'
  if (task.needs && access.find(item => item.id === task.needs)?.status !== 'done') return 'waiting'
  return task.status === 'doing' ? 'doing' : 'todo'
}

const stateOrder: Record<TaskState, number> = { doing: 0, todo: 1, waiting: 2, done: 3 }

export function nextTasks(research: Research, count: number): Task[] {
  return research.tasks
    .filter(task => task.status !== 'done' && !task.milestone)
    .map((task, index) => ({ task, index, order: stateOrder[taskState(task, research.access)] }))
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .slice(0, count)
    .map(item => item.task)
}

export type ReputationPoint = { date: string; rating: number; reviews: number; source: string }

/** Manual readings from research plus one automatic reading per day from the site check. */
export function reputationSeries({ research, history }: Data): ReputationPoint[] {
  const byDate = new Map<string, ReputationPoint>()
  for (const point of research.reputation_points) byDate.set(point.date, point)
  for (const day of history) {
    if (day.rating != null && day.reviews != null) byDate.set(day.date, { date: day.date, rating: day.rating, reviews: day.reviews, source: 'site' })
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function reviewsPerWeek(series: ReputationPoint[]): number | null {
  if (series.length < 2) return null
  const first = series[0]
  const last = series[series.length - 1]
  const days = (Date.parse(last.date) - Date.parse(first.date)) / 86_400_000
  return days >= 7 ? Math.round(((last.reviews - first.reviews) / days) * 7 * 10) / 10 : null
}

export function planDay(research: Research, now = Date.now()): number {
  const elapsed = Math.floor((now - Date.parse(`${research.goal.start}T00:00:00`)) / 86_400_000)
  return Math.min(Math.max(elapsed, 0), research.goal.days)
}

export function reviewDate(research: Research): string {
  const date = new Date(`${research.goal.start}T12:00:00`)
  date.setDate(date.getDate() + research.goal.days)
  return date.toISOString().slice(0, 10)
}

/** Google numbers: the latest automatic reading when there is one, otherwise the research value. */
export function liveGoogle(research: Research, siteCheck: SiteCheck) {
  const google = research.platforms.find(platform => platform.id === 'google')
  if (siteCheck.reputation) return { rating: siteCheck.reputation.rating, reviews: siteCheck.reputation.reviews, checked: siteCheck.checked_at }
  return { rating: google?.rating ?? null, reviews: google?.reviews ?? null, checked: google?.checked_on ?? research.updated_on }
}
