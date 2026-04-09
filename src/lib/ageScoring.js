/** Fixed age brackets for job conditional scoring (admin UI + applicant scoring). */
export const AGE_BRACKETS = [
  { id: '20_25', label: '20-25', min: 20, max: 25 },
  { id: '26_30', label: '26-30', min: 26, max: 30 },
  { id: '31_40', label: '31-40', min: 31, max: 40 },
  { id: '41_50', label: '41-50', min: 41, max: 50 },
  { id: '50_plus', label: '50 above', min: 50, max: null }
]

export const DEFAULT_AGE_SCORING = {
  preferred_bracket_id: '26_30',
  max_points: 10
}

export function normalizeAgeScoringFromJob(raw) {
  if (raw == null) return { ...DEFAULT_AGE_SCORING }
  let obj = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return { ...DEFAULT_AGE_SCORING }
    }
  }
  if (!obj || typeof obj !== 'object') return { ...DEFAULT_AGE_SCORING }
  const id = AGE_BRACKETS.some((b) => b.id === obj.preferred_bracket_id)
    ? obj.preferred_bracket_id
    : DEFAULT_AGE_SCORING.preferred_bracket_id
  const mp = parseFloat(obj.max_points)
  const max_points =
    Number.isFinite(mp) && mp >= 0 ? Math.min(1000, Math.round(mp * 100) / 100) : DEFAULT_AGE_SCORING.max_points
  return { preferred_bracket_id: id, max_points }
}

export function getAgeFromDOB(dateOfBirth, asOf = new Date()) {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null
  let age = asOf.getFullYear() - dob.getFullYear()
  const m = asOf.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age -= 1
  return age >= 0 ? age : null
}

export function ageFitsBracket(age, bracketId) {
  const b = AGE_BRACKETS.find((x) => x.id === bracketId)
  if (!b || age == null || !Number.isFinite(age)) return false
  if (age < b.min) return false
  if (b.max == null) return true
  return age <= b.max
}

/**
 * Full points if applicant age is in the preferred bracket; otherwise half of max_points.
 * Unknown DOB is treated as outside the bracket (half points).
 */
export function scoreAgeConditionalPoints({ dateOfBirth, preferredBracketId, maxPoints, asOf = new Date() }) {
  const age = getAgeFromDOB(dateOfBirth, asOf)
  const max = Number(maxPoints)
  if (!preferredBracketId || !Number.isFinite(max) || max <= 0) {
    return { full: null, half: null, awarded: null, inBracket: null }
  }
  const half = Math.round((max / 2) * 100) / 100
  if (age == null) return { full: max, half, awarded: half, inBracket: false }
  const inB = ageFitsBracket(age, preferredBracketId)
  return {
    full: max,
    half,
    awarded: inB ? max : half,
    inBracket: inB
  }
}
