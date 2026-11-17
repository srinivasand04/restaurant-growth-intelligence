/** Shapes of the files in backend/snapshot, shared by the API and the dashboard. */

export type Localized = { en: string; fr: string }
export type Priority = 'High' | 'Medium' | 'Low'
export type Level = 'High' | 'Medium' | 'Low'

export type Source = { id: string; kind: 'site' | 'google' | 'future'; label: Localized; url: string; checked_at: string }

export type OwnerCheck = {
  id: string
  status: 'partial' | 'unknown'
  title: Localized
  detail: Localized
  needs: Localized
  source_ids: string[]
}

export type Keyword = { phrase: string; language: 'FR' | 'EN'; fit: Level; intent: Localized; rationale: Localized }

export type Opportunity = {
  id: string
  priority: Priority
  effort: Level
  confidence: Level
  title: Localized
  observation: Localized
  recommendation: Localized
  benefit: Localized
  source_ids: string[]
}

export type Profile = {
  name: string
  address: string
  website: string
  area: string
  cuisine: Localized
  services: Localized[]
}

export type Research = {
  researched_on: string
  profile: Profile
  sources: Source[]
  owner_checks: OwnerCheck[]
  keywords: Keyword[]
  opportunities: Opportunity[]
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
  checks: Check[]
  /** Check ids that became problems or were fixed since the previous run (absent on the very first run). */
  changes?: { since: string; new: string[]; resolved: string[] } | null
}

/** One row of the action plan: either a problem found by the site check or a curated recommendation. */
export type ActionItem =
  | { kind: 'site'; id: string; priority: Priority; title: Localized; observation: Localized; recommendation: Localized }
  | ({ kind: 'plan' } & Opportunity)
