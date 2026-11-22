/** Shapes of the files in backend/snapshot, shared by the API and the dashboard. */

export type Lang = 'en' | 'fr'
export type Localized = { en: string; fr: string }

export type Area = 'google' | 'reviews' | 'website' | 'listings' | 'measure'
export type Who = 'us' | 'owner' | 'together'
export type TaskStatus = 'todo' | 'doing' | 'done'

export type Access = { id: string; status: 'pending' | 'done'; title: Localized; how: Localized }

export type Task = {
  id: string
  area: Area
  who: Who
  status: TaskStatus
  /** Id of an access item this task cannot start without. */
  needs: string | null
  /** A dated meeting at the end of the plan, never shown as a "next step". */
  milestone?: boolean
  title: Localized
  why: Localized
  steps: Localized[]
  done_when: Localized
}

export type Platform = {
  id: string
  name: string
  url: string
  rating: number | null
  scale: number
  reviews: number | null
  managed: 'yes' | 'no' | 'likely' | 'unknown'
  checked_on: string
  /** Updated every morning by the site check (Google only for now). */
  live?: boolean
  why: Localized
  source: Localized
}

export type Quote = Localized & { source: string }

export type Research = {
  updated_on: string
  profile: { name: string; address: string; phone: string; website: string; maps: string; area: string; positioning: Localized }
  goal: { start: string; days: number; title: Localized; metric: Localized; rank: number; of: number; target: number; rank_note: Localized }
  reputation_points: { date: string; rating: number; reviews: number; source: string }[]
  platforms: Platform[]
  mismatches: { id: string; title: Localized; detail: Localized; sources: string[] }[]
  guest_voice: { note: Localized; praise: Quote[]; concerns: Quote[] }
  keywords: { phrase: string; language: 'FR' | 'EN' }[]
  access: Access[]
  tasks: Task[]
  sources: { label: Localized; url: string }[]
}

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'unknown'
export type CheckGroup = 'findability' | 'languages' | 'guest_path' | 'mobile_sharing'

export type Check = {
  id: string
  group: CheckGroup
  status: CheckStatus
  title: Localized
  detail: Localized
  fix: Localized | null
  /** Technical lines (URLs, tag values) stay as plain text; owner-facing lines are bilingual. */
  evidence: (string | Localized)[]
}

export type SiteCheck = {
  checked_at: string
  site: string
  pages: { url: string; status: number | null; ms: number; title: string }[]
  summary: Record<CheckStatus, number>
  reputation?: { rating: number; reviews: number; source: string | null } | null
  checks: Check[]
  /** Check ids that became problems or were fixed since the previous run (absent on the very first run). */
  changes?: { since: string; new: string[]; resolved: string[] } | null
}

export type HistoryEntry = {
  date: string
  pass: number
  warn: number
  fail: number
  unknown: number
  problems: string[]
  rating?: number
  reviews?: number
}

export type Data = { research: Research; siteCheck: SiteCheck; history: HistoryEntry[] }
