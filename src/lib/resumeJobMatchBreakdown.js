/**
 * Resume-style job match breakdown: admin category weights (sum 100%) × applicant category scores (0–100).
 * Mirrors the admin job scoring model in JobsManagement.jsx (simplified where data is missing).
 */

import { normalizeAgeScoringFromJob, scoreAgeConditionalPoints } from './ageScoring'
import { normalizeGenderScoringFromJob, scoreGenderConditionalPoints } from './genderScoring'
import {
  normalizeHeightScoringFromJob,
  normalizeWeightScoringFromJob,
  scoreHeightConditionalPoints,
  scoreWeightConditionalPoints
} from './bodyMetricsScoring'
import {
  normalizeEmploymentExperienceScoringFromJob,
  scoreEmploymentExperienceConditionalPoints,
  sumTotalExperienceMonths
} from './workExperienceScoring'
import {
  normalizeTrainingCountScoringFromJob,
  countFilledTrainingRows,
  scoreTrainingCountPercentOfCategory
} from './trainingCountScoring'
import { computeOthersWithinCategoryPercent } from './othersScoring'

const DEFAULT_CATEGORY_WEIGHTS = {
  personal: 25,
  education: 10,
  employment: 10,
  licenses: 15,
  training: 15,
  clearances: 15,
  others: 10
}

const JOB_SCORING_SECTIONS = [
  {
    key: 'personal',
    label: 'Personal Information',
    fields: [
      { id: 'full_name' },
      { id: 'address' },
      { id: 'contact' },
      { id: 'date_of_birth' },
      { id: 'gender' },
      { id: 'civil_status' },
      { id: 'religion' },
      { id: 'height_cm' },
      { id: 'weight_kg' },
      { id: 'languages_spoken' }
    ]
  },
  {
    key: 'education',
    label: 'Educational Attainment',
    fields: [{ id: 'elementary' }, { id: 'high_school' }, { id: 'vocational' }, { id: 'college' }]
  },
  {
    key: 'employment',
    label: 'Employment Record',
    fields: [{ id: 'total_experience' }, { id: 'position' }, { id: 'agency' }]
  },
  {
    key: 'licenses',
    label: 'Licenses',
    fields: [
      { id: 'drivers_license' },
      { id: 'security_guard_license' },
      { id: 'security_officers_license' },
      { id: 'security_managers_license' },
      { id: 'bank_and_armor_license' },
      { id: 'protection_agent' }
    ]
  },
  {
    key: 'training',
    label: 'Training / Certificates',
    fields: [{ id: 'training_attended' }, { id: 'date' }]
  },
  {
    key: 'clearances',
    label: 'Clearances',
    fields: [{ id: 'nbi' }, { id: 'police' }, { id: 'brgy' }, { id: 'court' }]
  },
  {
    key: 'others',
    label: 'Others',
    fields: [
      { id: 'skills' },
      { id: 'preferred_places' },
      { id: 'preferred_monthly_salary' },
      { id: 'can_start' },
      { id: 'employment_types' }
    ]
  }
]

const LEGACY_CATEGORY_TO_KEY = {
  'Personal Info': 'personal',
  'Personal Information': 'personal',
  'Educational Attainment': 'education',
  'Employment Record': 'employment',
  Clearances: 'clearances',
  Others: 'others'
}

function defaultFieldWeightsForSection(section) {
  const n = section.fields.length
  if (n === 0) return []
  const base = Math.floor(1000 / n) / 10
  let acc = 0
  return section.fields.map((f, i) => {
    if (i < n - 1) {
      acc += base
      return { field: f.id, percentage: base }
    }
    return { field: f.id, percentage: Math.round((100 - acc) * 10) / 10 }
  })
}

function preprocessLegacyCategoryRows(raw) {
  if (!Array.isArray(raw)) return []
  const list = [...raw]
  const combinedIdx = list.findIndex(
    (r) =>
      typeof r?.category === 'string' &&
      r.category.includes('Licenses') &&
      r.category.includes('Training')
  )
  if (combinedIdx === -1) return list
  const combined = list[combinedIdx]
  const pct = parseFloat(combined.percentage)
  const safe = Number.isFinite(pct) ? pct : 30
  const a = Math.round((safe / 2) * 10) / 10
  const b = Math.round((safe - a) * 10) / 10
  const next = list.filter((_, i) => i !== combinedIdx)
  next.push({ category_key: 'licenses', category: 'Licenses', percentage: a, field_weights: null })
  next.push({
    category_key: 'training',
    category: 'Training / Certificates',
    percentage: b,
    field_weights: null
  })
  return next
}

function normalizeFieldWeightsForSection(sec, rawWeights) {
  const list = Array.isArray(rawWeights) ? rawWeights : []
  const map = new Map()
  for (const fw of list) {
    if (!fw || typeof fw !== 'object') continue
    const id = fw.field
    if (id == null) continue
    const p = parseFloat(fw.percentage)
    map.set(String(id), Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0)
  }
  const definedIds = new Set(sec.fields.map((f) => f.id))
  const hasStale = [...map.keys()].some((k) => !definedIds.has(k))

  let weights = sec.fields.map((f) => ({
    field: f.id,
    percentage: map.has(f.id) ? map.get(f.id) : 0
  }))
  const sum = weights.reduce((s, w) => s + w.percentage, 0)

  if (sum <= 0) return defaultFieldWeightsForSection(sec)

  if (hasStale || Math.abs(sum - 100) > 0.02) {
    const scale = 100 / sum
    let acc = 0
    weights = weights.map((w, i) => {
      if (i < weights.length - 1) {
        const v = Math.round(w.percentage * scale * 10) / 10
        acc += v
        return { field: w.field, percentage: v }
      }
      return { field: w.field, percentage: Math.round((100 - acc) * 10) / 10 }
    })
  }

  return weights
}

export function normalizeCategoryPercentagesForJob(job) {
  const raw = job?.category_percentages
  const rows = preprocessLegacyCategoryRows(Array.isArray(raw) ? raw : [])
  const byKey = {}
  for (const row of rows) {
    const key = row.category_key || LEGACY_CATEGORY_TO_KEY[row.category]
    if (!key) continue
    if (!byKey[key]) byKey[key] = { ...row, category_key: key }
  }

  return JOB_SCORING_SECTIONS.map((sec) => {
    const existing = byKey[sec.key]
    let percentage = existing?.percentage
    if (percentage == null || !Number.isFinite(Number(percentage))) {
      percentage = DEFAULT_CATEGORY_WEIGHTS[sec.key]
    }
    percentage = Math.max(0, Math.min(100, Math.round(Number(percentage) * 10) / 10))

    const field_weights = normalizeFieldWeightsForSection(sec, existing?.field_weights)
    return {
      category_key: sec.key,
      category: sec.label,
      percentage,
      field_weights
    }
  })
}

function fieldWeightMap(categoryRow) {
  const m = new Map()
  for (const w of categoryRow?.field_weights || []) {
    m.set(w.field, parseFloat(w.percentage) || 0)
  }
  return m
}

function ratioAwarded(awarded, full) {
  const f = Number(full)
  const a = Number(awarded)
  if (!Number.isFinite(f) || f <= 0) return 0
  if (!Number.isFinite(a) || a < 0) return 0
  return Math.min(100, Math.round((a / f) * 10000) / 100)
}

function scorePersonalCategory(job, applicant, row) {
  const wm = fieldWeightMap(row)
  let sum = 0
  for (const [field, w] of wm) {
    if (w <= 0) continue
    let fs = 0
    switch (field) {
      case 'date_of_birth': {
        const cfg = normalizeAgeScoringFromJob(job?.age_scoring)
        const r = scoreAgeConditionalPoints({
          dateOfBirth: applicant?.date_of_birth,
          preferredBracketId: cfg.preferred_bracket_id,
          maxPoints: cfg.max_points
        })
        fs = ratioAwarded(r.awarded, r.full)
        break
      }
      case 'gender': {
        const cfg = normalizeGenderScoringFromJob(job?.gender_scoring)
        const r = scoreGenderConditionalPoints({
          applicantGender: applicant?.gender,
          preferredGender: cfg.preferred_gender,
          maxPoints: cfg.max_points
        })
        fs = ratioAwarded(r.awarded, r.full)
        break
      }
      case 'height_cm': {
        const cfg = normalizeHeightScoringFromJob(job?.height_scoring)
        const r = scoreHeightConditionalPoints({
          heightCm: applicant?.height_cm,
          preferredBracketId: cfg.preferred_bracket_id,
          maxPoints: cfg.max_points
        })
        fs = ratioAwarded(r.awarded, r.full)
        break
      }
      case 'weight_kg': {
        const cfg = normalizeWeightScoringFromJob(job?.weight_scoring)
        const r = scoreWeightConditionalPoints({
          weightKg: applicant?.weight_kg,
          preferredBracketId: cfg.preferred_bracket_id,
          maxPoints: cfg.max_points
        })
        fs = ratioAwarded(r.awarded, r.full)
        break
      }
      case 'full_name':
        fs = applicant?.first_name?.trim() && applicant?.last_name?.trim() ? 100 : 0
        break
      case 'address':
        fs = [applicant?.street_address, applicant?.barangay, applicant?.city, applicant?.province].some((s) =>
          String(s || '').trim()
        )
          ? 100
          : 0
        break
      case 'contact':
        fs = applicant?.email?.trim() && applicant?.phone?.trim() ? 100 : 0
        break
      case 'civil_status':
      case 'religion':
        fs = String(applicant?.[field] || '').trim() ? 100 : 0
        break
      case 'languages_spoken': {
        const langs = applicant?.languages_spoken
        fs = Array.isArray(langs) && langs.filter(Boolean).length > 0 ? 100 : 0
        break
      }
      default:
        fs = 0
    }
    sum += (w / 100) * fs
  }
  return Math.min(100, Math.round(sum * 100) / 100)
}

function educationLevelFilled(rows) {
  if (!Array.isArray(rows)) return false
  return rows.some(
    (r) =>
      String(r?.school || '').trim() ||
      String(r?.course || '').trim() ||
      String(r?.year_graduated || '').trim() ||
      r?.attachment_path ||
      (r?.attachment && typeof r.attachment === 'object')
  )
}

function scoreEducationCategory(row, educationByLevel) {
  const wm = fieldWeightMap(row)
  let sum = 0
  for (const level of ['elementary', 'high_school', 'vocational', 'college']) {
    const w = wm.get(level) || 0
    if (w <= 0) continue
    const filled = educationLevelFilled(educationByLevel?.[level])
    sum += (w / 100) * (filled ? 100 : 0)
  }
  return Math.min(100, Math.round(sum * 100) / 100)
}

function employmentShapeFromRecords(records) {
  const job_related = []
  const non_related = []
  for (const r of records || []) {
    const row = {
      from: r.from_date ?? r.from,
      to: r.to_date ?? r.to,
      position: r.position,
      agency: r.agency
    }
    if (r.category === 'non_related') non_related.push(row)
    else job_related.push(row)
  }
  return { job_related, non_related }
}

function scoreEmploymentCategory(job, row, employmentRecords) {
  const wm = fieldWeightMap(row)
  const shape = employmentShapeFromRecords(employmentRecords)
  const months = sumTotalExperienceMonths(shape)
  const expCfg = normalizeEmploymentExperienceScoringFromJob(job?.employment_experience_scoring)
  const expR = scoreEmploymentExperienceConditionalPoints({
    totalMonths: months,
    preferredBracketId: expCfg.preferred_bracket_id,
    maxPoints: expCfg.max_points
  })
  const anyPosition = [...(shape.job_related || []), ...(shape.non_related || [])].some((r) =>
    String(r?.position || '').trim()
  )
  const anyAgency = [...(shape.job_related || []), ...(shape.non_related || [])].some((r) =>
    String(r?.agency || '').trim()
  )

  let sum = 0
  for (const [field, w] of wm) {
    if (w <= 0) continue
    let fs = 0
    if (field === 'total_experience') fs = ratioAwarded(expR.awarded, expR.full)
    else if (field === 'position') fs = anyPosition ? 100 : 0
    else if (field === 'agency') fs = anyAgency ? 100 : 0
    sum += (w / 100) * fs
  }
  return Math.min(100, Math.round(sum * 100) / 100)
}

function categoryStringToLicenseKey(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
  if (!s) return null
  if (s === 'drivers_license' || (s.includes('driver') && s.includes('license'))) return 'drivers_license'
  if (s.includes('security guard') && s.includes('license')) return 'security_guard_license'
  if (s.includes('security officer') && s.includes('license')) return 'security_officers_license'
  if (s.includes('security manager') && s.includes('license')) return 'security_managers_license'
  if (s.includes('bank') && s.includes('armor')) return 'bank_and_armor_license'
  if (s.includes('protection') && s.includes('agent')) return 'protection_agent'
  return null
}

function slotFilled(slot) {
  if (!slot || typeof slot !== 'object') return false
  return Boolean(
    String(slot.date_issued || '').trim() ||
      String(slot.date_expiry || '').trim() ||
      slot.attachment ||
      slot.attachment_path
  )
}

function buildLicenseSlotMap(licensesJson, licenseRows) {
  const keys = JOB_SCORING_SECTIONS.find((s) => s.key === 'licenses').fields.map((f) => f.id)
  const map = {}
  for (const k of keys) map[k] = {}

  if (licensesJson && typeof licensesJson === 'object' && !Array.isArray(licensesJson)) {
    for (const k of keys) {
      const v = licensesJson[k]
      if (v && typeof v === 'object') map[k] = { ...v }
    }
  }
  for (const r of licenseRows || []) {
    const key = categoryStringToLicenseKey(r?.category)
    if (!key || !map[key]) continue
    const slot = {
      date_issued: r.date_issued,
      date_expiry: r.date_expiry,
      attachment: r.attachment
    }
    if (slotFilled(slot)) map[key] = slot
  }
  return map
}

function scoreLicensesCategory(row, licensesJson, licenseRows) {
  const wm = fieldWeightMap(row)
  const slots = buildLicenseSlotMap(licensesJson, licenseRows)
  let sum = 0
  for (const [field, w] of wm) {
    if (w <= 0) continue
    const fs = slotFilled(slots[field]) ? 100 : 0
    sum += (w / 100) * fs
  }
  return Math.min(100, Math.round(sum * 100) / 100)
}

function scoreTrainingCategory(job, _categoryRow, trainingsList) {
  const tcp = normalizeTrainingCountScoringFromJob(job?.training_count_scoring)
  const n = countFilledTrainingRows(trainingsList)
  return scoreTrainingCountPercentOfCategory(tcp.tier_percentages, n)
}

function scoreClearancesCategory(row, clearancesList) {
  const byKey = {}
  for (const r of clearancesList || []) {
    const k = String(r?.clearance_type || '').toLowerCase()
    if (k) byKey[k] = r
  }
  const wm = fieldWeightMap(row)
  let sum = 0
  for (const [field, w] of wm) {
    if (w <= 0) continue
    const c = byKey[field]
    const fs = c && (c.date_issued || c.date_expiry || c.attachment_path) ? 100 : 0
    sum += (w / 100) * fs
  }
  return Math.min(100, Math.round(sum * 100) / 100)
}

function weightedCellColor(applicantScore) {
  if (applicantScore >= 75) return 'bg-emerald-100 text-emerald-900'
  if (applicantScore >= 50) return 'bg-amber-100 text-amber-900'
  return 'bg-orange-100 text-orange-950'
}

/**
 * @param {object} job — job row including category_percentages + scoring JSON columns
 * @param {object} ctx — { applicant, educationByLevel, licenseRows, trainingsList, employmentRecords, clearancesList, othersRow }
 * @returns {{ rows: Array<{ categoryKey, label, adminPercent, applicantScore, weightedPoints, weightedClass }>, total: number }}
 */
export function computeResumeJobMatchBreakdown(job, ctx) {
  const normalizedRows = normalizeCategoryPercentagesForJob(job || {})
  const applicant = ctx?.applicant || {}
  const educationByLevel = ctx?.educationByLevel || {}
  const licenseRows = ctx?.licenseRows || []
  const licensesJson = applicant?.licenses
  const trainingsList = ctx?.trainingsList || []
  const employmentRecords = ctx?.employmentRecords || []
  const clearancesList = ctx?.clearancesList || []
  const othersRow = ctx?.othersRow || null

  const out = []
  let total = 0

  for (const catRow of normalizedRows) {
    const key = catRow.category_key
    let applicantScore = 0
    switch (key) {
      case 'personal':
        applicantScore = scorePersonalCategory(job, applicant, catRow)
        break
      case 'education':
        applicantScore = scoreEducationCategory(catRow, educationByLevel)
        break
      case 'employment':
        applicantScore = scoreEmploymentCategory(job, catRow, employmentRecords)
        break
      case 'licenses':
        applicantScore = scoreLicensesCategory(catRow, licensesJson, licenseRows)
        break
      case 'training':
        applicantScore = scoreTrainingCategory(job, catRow, trainingsList)
        break
      case 'clearances':
        applicantScore = scoreClearancesCategory(catRow, clearancesList)
        break
      case 'others':
        applicantScore = computeOthersWithinCategoryPercent(job, othersRow || {})
        break
      default:
        applicantScore = 0
    }

    const adminPct = catRow.percentage
    const weightedPoints = Math.round((adminPct / 100) * applicantScore * 100) / 100
    total += weightedPoints

    out.push({
      categoryKey: key,
      label: catRow.category || JOB_SCORING_SECTIONS.find((s) => s.key === key)?.label || key,
      adminPercent: adminPct,
      applicantScore,
      weightedPoints,
      weightedClass: weightedCellColor(applicantScore)
    })
  }

  return { rows: out, total: Math.round(total * 100) / 100 }
}
