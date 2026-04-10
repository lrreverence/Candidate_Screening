/**
 * Total cumulative work experience (months) brackets for job conditional scoring.
 * Admin UI + applicant scoring: full % of the "Total work experience" row in bracket, half outside.
 */

export const WORK_EXPERIENCE_BRACKETS = [
  { id: 'm_1_5', label: '1 month – 5 months', minMonths: 1, maxMonths: 5 },
  { id: 'm_6_12', label: '6 months – 1 year', minMonths: 6, maxMonths: 12 },
  { id: 'm_13_24', label: '1 yr 1 mo – 2 years', minMonths: 13, maxMonths: 24 },
  { id: 'm_25_36', label: '2 yr 1 mo – 3 years', minMonths: 25, maxMonths: 36 },
  { id: 'm_37_plus', label: '3 yr 1 mo & more', minMonths: 37, maxMonths: null }
]

export const DEFAULT_EMPLOYMENT_EXPERIENCE_SCORING = {
  preferred_bracket_id: 'm_13_24',
  max_points: 10
}

function parseYmd(s) {
  if (s == null || typeof s !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s).trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Inclusive month span between two dates (first-of-month normalization), matching resume employment dates.
 */
export function monthsInclusiveBetween(fromStr, toStr, asOf = new Date()) {
  const from = parseYmd(fromStr)
  if (!from) return 0
  let to = parseYmd(toStr)
  if (!to) {
    to = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  }
  const start = new Date(from.getFullYear(), from.getMonth(), 1)
  const end = new Date(to.getFullYear(), to.getMonth(), 1)
  const raw =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
  return Math.max(0, raw)
}

/**
 * @param {Record<string, Array<{ from?: string, to?: string }>>} employment — e.g. job_related / non_related rows
 * @param {Date} [asOf]
 */
export function sumTotalExperienceMonths(employment, asOf = new Date()) {
  if (!employment || typeof employment !== 'object') return null
  let sum = 0
  let anyRow = false
  for (const key of Object.keys(employment)) {
    const rows = employment[key]
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const from = row.from ?? row.from_date
      const to = row.to ?? row.to_date
      const hasContent =
        String(from || '').trim() ||
        String(to || '').trim() ||
        String(row.position || '').trim() ||
        String(row.agency || '').trim()
      if (!hasContent) continue
      anyRow = true
      sum += monthsInclusiveBetween(from, to, asOf)
    }
  }
  if (!anyRow) return null
  return sum
}

export function normalizeEmploymentExperienceScoringFromJob(raw) {
  if (raw == null) return { ...DEFAULT_EMPLOYMENT_EXPERIENCE_SCORING }
  let obj = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return { ...DEFAULT_EMPLOYMENT_EXPERIENCE_SCORING }
    }
  }
  if (!obj || typeof obj !== 'object') return { ...DEFAULT_EMPLOYMENT_EXPERIENCE_SCORING }
  const id = WORK_EXPERIENCE_BRACKETS.some((b) => b.id === obj.preferred_bracket_id)
    ? obj.preferred_bracket_id
    : DEFAULT_EMPLOYMENT_EXPERIENCE_SCORING.preferred_bracket_id
  const mp = parseFloat(obj.max_points)
  const max_points =
    Number.isFinite(mp) && mp >= 0
      ? Math.min(1000, Math.round(mp * 100) / 100)
      : DEFAULT_EMPLOYMENT_EXPERIENCE_SCORING.max_points
  return { preferred_bracket_id: id, max_points }
}

export function totalMonthsFitsBracket(totalMonths, bracketId) {
  const b = WORK_EXPERIENCE_BRACKETS.find((x) => x.id === bracketId)
  if (!b || totalMonths == null || !Number.isFinite(totalMonths)) return false
  const m = Math.round(Number(totalMonths))
  if (m < b.minMonths) return false
  if (b.maxMonths == null) return true
  return m <= b.maxMonths
}

/**
 * Unknown / no employment dates → half of max_points (outside preferred bracket).
 */
export function scoreEmploymentExperienceConditionalPoints({
  totalMonths,
  preferredBracketId,
  maxPoints
}) {
  const max = Number(maxPoints)
  if (!preferredBracketId || !Number.isFinite(max) || max <= 0) {
    return { full: null, half: null, awarded: null, inBracket: null }
  }
  const half = Math.round((max / 2) * 100) / 100
  if (totalMonths == null || !Number.isFinite(Number(totalMonths))) {
    return { full: max, half, awarded: half, inBracket: false }
  }
  const inB = totalMonthsFitsBracket(totalMonths, preferredBracketId)
  return {
    full: max,
    half,
    awarded: inB ? max : half,
    inBracket: inB
  }
}
