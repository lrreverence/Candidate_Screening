/** Gender options aligned with `IdentitySection` / application form (`male`, `female`, `other`). */
export const GENDER_SCORING_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Prefer not to say' }
]

export const DEFAULT_GENDER_SCORING = {
  preferred_gender: 'male',
  max_points: 10
}

export function normalizeGenderScoringFromJob(raw) {
  if (raw == null) return { ...DEFAULT_GENDER_SCORING }
  let obj = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return { ...DEFAULT_GENDER_SCORING }
    }
  }
  if (!obj || typeof obj !== 'object') return { ...DEFAULT_GENDER_SCORING }
  const id = GENDER_SCORING_OPTIONS.some((g) => g.id === obj.preferred_gender)
    ? obj.preferred_gender
    : DEFAULT_GENDER_SCORING.preferred_gender
  const mp = parseFloat(obj.max_points)
  const max_points =
    Number.isFinite(mp) && mp >= 0 ? Math.min(1000, Math.round(mp * 100) / 100) : DEFAULT_GENDER_SCORING.max_points
  return { preferred_gender: id, max_points }
}

function normalizeGenderValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

/**
 * Full points if applicant gender matches preferred; otherwise half of max_points.
 * Missing / empty applicant gender counts as not matching (half points).
 */
export function scoreGenderConditionalPoints({ applicantGender, preferredGender, maxPoints }) {
  const max = Number(maxPoints)
  if (!preferredGender || !Number.isFinite(max) || max <= 0) {
    return { full: null, half: null, awarded: null, matches: null }
  }
  const half = Math.round((max / 2) * 100) / 100
  const app = normalizeGenderValue(applicantGender)
  if (!app) return { full: max, half, awarded: half, matches: false }
  const matches = app === normalizeGenderValue(preferredGender)
  return {
    full: max,
    half,
    awarded: matches ? max : half,
    matches
  }
}
