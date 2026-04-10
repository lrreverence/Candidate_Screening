/**
 * Trainings / certificates scored by how many non-empty rows the applicant has.
 * Admin sets % of the Training / Certificates category awarded for each count tier (1 … 5, 6+).
 * Zero trainings awards 0 from this rubric.
 */

export const TRAINING_COUNT_TIER_ROWS = [
  { label: '1 Training/Cert' },
  { label: '2 Training/Cert' },
  { label: '3 Training/Cert' },
  { label: '4 Training/Cert' },
  { label: '5 Training/Cert' },
  { label: '6 and more' }
]

/** @type {number[]} length 6, each 0–100 */
export const DEFAULT_TRAINING_COUNT_TIER_PERCENTAGES = [0, 20, 40, 60, 80, 100]

export const DEFAULT_TRAINING_COUNT_SCORING = {
  tier_percentages: [...DEFAULT_TRAINING_COUNT_TIER_PERCENTAGES]
}

function clampPct(n) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100))
}

export function normalizeTrainingCountScoringFromJob(raw) {
  if (raw == null) {
    return { tier_percentages: [...DEFAULT_TRAINING_COUNT_TIER_PERCENTAGES] }
  }
  let obj = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return { tier_percentages: [...DEFAULT_TRAINING_COUNT_TIER_PERCENTAGES] }
    }
  }
  if (!obj || typeof obj !== 'object') {
    return { tier_percentages: [...DEFAULT_TRAINING_COUNT_TIER_PERCENTAGES] }
  }
  let arr = obj.tier_percentages ?? obj.tierPercents ?? obj.weights
  if (!Array.isArray(arr)) {
    return { tier_percentages: [...DEFAULT_TRAINING_COUNT_TIER_PERCENTAGES] }
  }
  const out = TRAINING_COUNT_TIER_ROWS.map((_, i) => clampPct(parseFloat(arr[i])))
  return { tier_percentages: out }
}

/**
 * Count resume training rows that have any meaningful content (matches save/filter logic).
 * @param {Array<{ training_attended?: string, date?: string }>} trainings
 */
export function countFilledTrainingRows(trainings) {
  if (!Array.isArray(trainings)) return 0
  return trainings.filter(
    (r) =>
      String(r?.training_attended || r?.training || '').trim() || String(r?.date || '').trim()
  ).length
}

/**
 * Tier index 0..5 for positive counts; null when count is 0.
 * @param {number} n
 */
export function trainingCountTierIndex(n) {
  const c = Math.floor(Number(n))
  if (!Number.isFinite(c) || c <= 0) return null
  if (c >= 6) return 5
  return c - 1
}

/**
 * @param {number[]} tierPercentages — length 6, from normalizeTrainingCountScoringFromJob
 * @param {number} filledCount — from countFilledTrainingRows
 * @returns {number} 0–100 (% of training category from the count rubric)
 */
export function scoreTrainingCountPercentOfCategory(tierPercentages, filledCount) {
  const tiers = Array.isArray(tierPercentages) ? tierPercentages : DEFAULT_TRAINING_COUNT_TIER_PERCENTAGES
  const idx = trainingCountTierIndex(filledCount)
  if (idx == null) return 0
  const v = parseFloat(tiers[idx])
  return clampPct(Number.isFinite(v) ? v : 0)
}
