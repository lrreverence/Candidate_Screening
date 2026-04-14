/** Preset lists aligned with `ResumeProfile` Others section. */

export const OTHERS_SKILL_OPTIONS = [
  'Basic Life Support (BLS)',
  'CCTV Operation',
  'Radio Operation',
  'Safety Officer',
  'Drive',
]

export const OTHERS_PLACE_OPTIONS = [
  'Quezon City',
  'Makati',
  'Mandaluyong',
  'Pasay',
  'Parañaque',
  'San Juan City',
  'Cavite, Cavite',
  'Marikina City',
  'Pasig City',
]

export const OTHERS_SALARY_OPTIONS = [
  '10,000-15,000',
  '15,000-20,000',
  '20,000-25,000',
  '25,000-30,000',
  '30,000-35,000',
  '35,000-40,000',
]

export const OTHERS_EMPLOYMENT_TYPE_OPTIONS = [
  { id: 'full_time', label: 'Full time' },
  { id: 'part_time', label: 'Part-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'temporary', label: 'Temporary' },
]

export const DEFAULT_OTHERS_SCORING = {
  skills: [],
  preferred_places: [],
  preferred_monthly_salary: [],
  can_start: {
    want_asap: false,
    want_date: '',
  },
  employment_types: [],
}

const uniqStrings = (arr) => {
  const seen = new Set()
  const out = []
  for (const x of arr || []) {
    const s = String(x || '').trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

export function normalizeOthersScoringFromJob(raw) {
  const base = {
    skills: [],
    preferred_places: [],
    preferred_monthly_salary: [],
    can_start: { want_asap: false, want_date: '' },
    employment_types: [],
  }
  if (!raw) return base

  // Some environments / older schemas may return json/jsonb columns as strings.
  // Accept both object and JSON-string shapes.
  let parsed = raw
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return base
    }
  }
  if (!parsed || typeof parsed !== 'object') return base

  const o = parsed.others_scoring ?? parsed
  return {
    skills: uniqStrings(Array.isArray(o.skills) ? o.skills : []),
    preferred_places: uniqStrings(Array.isArray(o.preferred_places) ? o.preferred_places : []),
    preferred_monthly_salary: uniqStrings(
      Array.isArray(o.preferred_monthly_salary) ? o.preferred_monthly_salary : []
    ),
    can_start: {
      want_asap: Boolean(o?.can_start?.want_asap),
      want_date: String(o?.can_start?.want_date || '').trim(),
    },
    employment_types: uniqStrings(Array.isArray(o.employment_types) ? o.employment_types : []),
  }
}

function normalizeApplicantOthers(value) {
  const skills = uniqStrings(value?.skills)
  const preferred_places = uniqStrings(value?.preferred_places)
  const preferred_monthly_salary = uniqStrings(value?.preferred_monthly_salary)
  const asap =
    typeof value?.can_start?.asap === 'boolean'
      ? value.can_start.asap
      : typeof value?.can_start_asap === 'boolean'
        ? value.can_start_asap
        : true
  const date =
    typeof value?.can_start?.date === 'string'
      ? value.can_start.date
      : typeof value?.can_start_date === 'string'
        ? value.can_start_date
        : ''
  const employment_types = uniqStrings(value?.employment_types)
  return {
    skills,
    preferred_places,
    preferred_monthly_salary,
    can_start: { asap, date: String(date || '').trim() },
    employment_types,
  }
}

function listMatchRatio(preferred, applicantVals) {
  const pref = uniqStrings(preferred)
  if (pref.length === 0) return 1
  const appSet = new Set(uniqStrings(applicantVals))
  let hits = 0
  for (const p of pref) {
    if (appSet.has(p)) hits += 1
  }
  return hits / pref.length
}

function canStartMatchRatio(want, applicantCan) {
  const hasAsap = Boolean(want?.want_asap)
  const wantDate = String(want?.want_date || '').trim()
  if (!hasAsap && !wantDate) return 1

  const asap = Boolean(applicantCan?.asap)
  const ad = String(applicantCan?.date || '').trim()

  let ok = false
  if (hasAsap && asap) ok = true
  if (wantDate && !asap && ad === wantDate) ok = true
  return ok ? 1 : 0
}

function getOthersFieldWeightMap(job) {
  const rows = Array.isArray(job?.category_percentages) ? job.category_percentages : []
  const row = rows.find((r) => r.category_key === 'others')
  const map = {
    skills: 0,
    preferred_places: 0,
    preferred_monthly_salary: 0,
    can_start: 0,
    employment_types: 0,
  }
  for (const fw of row?.field_weights || []) {
    const id = fw?.field
    if (id in map) map[id] = Math.max(0, parseFloat(fw.percentage) || 0)
  }
  return map
}

/**
 * Score for the Others resume category only (0–100): each field’s table weight is multiplied by
 * how well the applicant matches the admin’s preferred values (overlap / count of preferences).
 * If admin set no preferences for a field, that field counts as full credit (weight still applies).
 */
export function computeOthersWithinCategoryPercent(job, applicantOthersRaw) {
  const weights = getOthersFieldWeightMap(job)
  const pref = normalizeOthersScoringFromJob(job?.others_scoring ?? job?.othersScoring)
  const app = normalizeApplicantOthers(applicantOthersRaw)

  let sum = 0
  sum += weights.skills * listMatchRatio(pref.skills, app.skills)
  sum += weights.preferred_places * listMatchRatio(pref.preferred_places, app.preferred_places)
  sum +=
    weights.preferred_monthly_salary *
    listMatchRatio(pref.preferred_monthly_salary, app.preferred_monthly_salary)
  sum += weights.can_start * canStartMatchRatio(pref.can_start, app.can_start)
  sum += weights.employment_types * listMatchRatio(pref.employment_types, app.employment_types)

  return Math.round(Math.min(100, Math.max(0, sum)) * 10) / 10
}
