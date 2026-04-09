/** Height (cm) brackets for conditional job scoring — full points in preferred range, half outside. */
export const HEIGHT_BRACKETS = [
  { id: '150_160', label: '150-160', min: 150, max: 160 },
  { id: '161_163', label: '161-163', min: 161, max: 163 },
  { id: '164_168', label: '164-168', min: 164, max: 168 },
  { id: '169_178', label: '169-178', min: 169, max: 178 },
  { id: '179_plus', label: '179 above', min: 179, max: null }
]

/** Weight (kg) brackets — "80 above" is strictly above 80 (≥ 81) so it does not overlap 71-80. */
export const WEIGHT_BRACKETS = [
  { id: '55_60', label: '55-60', min: 55, max: 60 },
  { id: '61_65', label: '61-65', min: 61, max: 65 },
  { id: '66_70', label: '66-70', min: 66, max: 70 },
  { id: '71_80', label: '71-80', min: 71, max: 80 },
  { id: '80_plus', label: '80 above', min: 81, max: null }
]

export const DEFAULT_HEIGHT_SCORING = {
  preferred_bracket_id: '164_168',
  max_points: 10
}

export const DEFAULT_WEIGHT_SCORING = {
  preferred_bracket_id: '66_70',
  max_points: 10
}

function normalizeMetricScoring(raw, brackets, defaults) {
  if (raw == null) return { ...defaults }
  let obj = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return { ...defaults }
    }
  }
  if (!obj || typeof obj !== 'object') return { ...defaults }
  const id = brackets.some((b) => b.id === obj.preferred_bracket_id)
    ? obj.preferred_bracket_id
    : defaults.preferred_bracket_id
  const mp = parseFloat(obj.max_points)
  const max_points =
    Number.isFinite(mp) && mp >= 0 ? Math.min(1000, Math.round(mp * 100) / 100) : defaults.max_points
  return { preferred_bracket_id: id, max_points }
}

export function normalizeHeightScoringFromJob(raw) {
  return normalizeMetricScoring(raw, HEIGHT_BRACKETS, DEFAULT_HEIGHT_SCORING)
}

export function normalizeWeightScoringFromJob(raw) {
  return normalizeMetricScoring(raw, WEIGHT_BRACKETS, DEFAULT_WEIGHT_SCORING)
}

export function heightFitsBracket(heightCm, bracketId) {
  const b = HEIGHT_BRACKETS.find((x) => x.id === bracketId)
  if (!b || heightCm == null || !Number.isFinite(Number(heightCm))) return false
  const n = Number(heightCm)
  if (n < b.min) return false
  if (b.max == null) return true
  return n <= b.max
}

export function weightFitsBracket(weightKg, bracketId) {
  const b = WEIGHT_BRACKETS.find((x) => x.id === bracketId)
  if (!b || weightKg == null || !Number.isFinite(Number(weightKg))) return false
  const n = Number(weightKg)
  if (n < b.min) return false
  if (b.max == null) return true
  return n <= b.max
}

/**
 * Unknown / invalid height → half points (outside preferred bracket).
 */
export function scoreHeightConditionalPoints({ heightCm, preferredBracketId, maxPoints }) {
  const max = Number(maxPoints)
  if (!preferredBracketId || !Number.isFinite(max) || max <= 0) {
    return { full: null, half: null, awarded: null, inBracket: null }
  }
  const half = Math.round((max / 2) * 100) / 100
  if (heightCm == null || !Number.isFinite(Number(heightCm))) {
    return { full: max, half, awarded: half, inBracket: false }
  }
  const inB = heightFitsBracket(heightCm, preferredBracketId)
  return { full: max, half, awarded: inB ? max : half, inBracket: inB }
}

export function scoreWeightConditionalPoints({ weightKg, preferredBracketId, maxPoints }) {
  const max = Number(maxPoints)
  if (!preferredBracketId || !Number.isFinite(max) || max <= 0) {
    return { full: null, half: null, awarded: null, inBracket: null }
  }
  const half = Math.round((max / 2) * 100) / 100
  if (weightKg == null || !Number.isFinite(Number(weightKg))) {
    return { full: max, half, awarded: half, inBracket: false }
  }
  const inB = weightFitsBracket(weightKg, preferredBracketId)
  return { full: max, half, awarded: inB ? max : half, inBracket: inB }
}
