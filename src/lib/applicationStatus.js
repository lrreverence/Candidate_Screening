/**
 * Canonical application pipeline statuses (applications.status).
 * Legacy values are normalized via {@link normalizeApplicationStatus}.
 */
export const APPLICATION_STATUSES = [
  'NEW',
  'PENDING',
  'INTERVIEW',
  'HIRED',
  'REJECTED',
  'RESIGNED',
]

/** Days a rejected applicant must wait before reapplying to the same job. */
export const REAPPLY_COOLDOWN_DAYS = 30

const REAPPLY_COOLDOWN_MS = REAPPLY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000

/** @param {unknown} raw */
export function normalizeApplicationStatus(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (s === 'new') return 'NEW'
  if (s === 'pending' || s === 'submitted') return 'PENDING'
  if (s === 'interview') return 'INTERVIEW'
  if (s === 'hired') return 'HIRED'
  if (s === 'rejected') return 'REJECTED'
  if (s === 'resigned') return 'RESIGNED'
  const u = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (APPLICATION_STATUSES.includes(u)) return u
  return 'PENDING'
}

/** Supabase `.in('status', …)` including legacy rows before migration. */
export function statusFilterValues(canonical) {
  const c = String(canonical || '').toUpperCase()
  switch (c) {
    case 'NEW':
      return ['NEW', 'new']
    case 'PENDING':
      return ['PENDING', 'Pending', 'pending', 'submitted', 'Submitted']
    case 'INTERVIEW':
      return ['INTERVIEW', 'Interview', 'interview']
    case 'HIRED':
      return ['HIRED', 'Hired', 'hired']
    case 'REJECTED':
      return ['REJECTED', 'Rejected', 'rejected']
    case 'RESIGNED':
      return ['RESIGNED', 'Resigned', 'resigned']
    default:
      return [canonical].filter(Boolean)
  }
}

/** @param {unknown} rawStatus from DB */
export function applicationStatusBadge(rawStatus) {
  const key = normalizeApplicationStatus(rawStatus)
  const map = {
    NEW: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'NEW' },
    PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'PENDING' },
    INTERVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'INTERVIEW' },
    HIRED: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'HIRED' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'REJECTED' },
    RESIGNED: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'RESIGNED' },
  }
  return map[key] || map.PENDING
}

/** Applicant detail (dark theme) */
export function applicationStatusBadgeDark(rawStatus) {
  const key = normalizeApplicationStatus(rawStatus)
  const map = {
    NEW: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'NEW' },
    PENDING: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20', label: 'PENDING' },
    INTERVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'INTERVIEW' },
    HIRED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'HIRED' },
    REJECTED: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', label: 'REJECTED' },
    RESIGNED: { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/20', label: 'RESIGNED' },
  }
  return map[key] || map.PENDING
}

export function isApplicationStatusNew(raw) {
  return normalizeApplicationStatus(raw) === 'NEW'
}

export function isApplicationStatusPendingLike(raw) {
  return normalizeApplicationStatus(raw) === 'PENDING'
}

/**
 * @param {string | null | undefined} rejectedAt
 * @returns {number} whole days remaining (0 if eligible now)
 */
export function daysUntilReapply(rejectedAt) {
  if (!rejectedAt) return 0
  const t = new Date(rejectedAt).getTime()
  if (Number.isNaN(t)) return 0
  const remaining = REAPPLY_COOLDOWN_MS - (Date.now() - t)
  if (remaining <= 0) return 0
  return Math.ceil(remaining / (24 * 60 * 60 * 1000))
}

/**
 * Whether an applicant may start/continue applying to `jobId` given their applications.
 * Rules:
 * - Active HIRED on any job blocks applying to other jobs (and keeps the hired job locked).
 * - REJECTED on a job blocks reapply until {@link REAPPLY_COOLDOWN_DAYS} after rejected_at.
 * - RESIGNED clears the hire lock; that job (and others) can be applied to again.
 *
 * @param {Array<{ job_id?: string, status?: string, rejected_at?: string | null, updated_at?: string | null }>} applications
 * @param {string | null | undefined} jobId
 */
export function getApplyEligibility(applications, jobId) {
  const apps = Array.isArray(applications) ? applications : []
  const hiredApp = apps.find((a) => normalizeApplicationStatus(a?.status) === 'HIRED')

  if (hiredApp) {
    if (jobId && hiredApp.job_id === jobId) {
      return { canApply: false, reason: 'hired_this_job', application: hiredApp, daysRemaining: 0 }
    }
    return { canApply: false, reason: 'hired_elsewhere', application: hiredApp, daysRemaining: 0 }
  }

  if (!jobId) {
    return { canApply: true, reason: null, application: null, daysRemaining: 0 }
  }

  const forJob = apps.find((a) => a?.job_id === jobId) || null
  if (!forJob) {
    return { canApply: true, reason: null, application: null, daysRemaining: 0 }
  }

  const st = normalizeApplicationStatus(forJob.status)
  if (st === 'RESIGNED') {
    return { canApply: true, reason: 'resigned_reapply', application: forJob, daysRemaining: 0 }
  }
  if (st === 'REJECTED') {
    const daysRemaining = daysUntilReapply(forJob.rejected_at || forJob.updated_at)
    if (daysRemaining === 0) {
      return { canApply: true, reason: 'rejected_reapply', application: forJob, daysRemaining: 0 }
    }
    return { canApply: false, reason: 'rejected_cooldown', application: forJob, daysRemaining }
  }

  return { canApply: false, reason: 'already_applied', application: forJob, daysRemaining: 0 }
}

/** Human-readable message for a blocked apply attempt. */
export function applyEligibilityMessage(eligibility) {
  if (!eligibility || eligibility.canApply) return null
  switch (eligibility.reason) {
    case 'hired_this_job':
      return 'You are currently hired for this position.'
    case 'hired_elsewhere':
      return 'You are currently hired for another position. You can apply again after your status is marked RESIGNED.'
    case 'rejected_cooldown': {
      const d = eligibility.daysRemaining || REAPPLY_COOLDOWN_DAYS
      return `You were rejected for this job. You may reapply in ${d} day${d === 1 ? '' : 's'}.`
    }
    case 'already_applied':
      return 'You have already applied for this job.'
    default:
      return 'You cannot apply for this job right now.'
  }
}

/**
 * Fields to clear/reset when reusing an existing application row for a reapply
 * (after REJECTED cooldown or RESIGNED).
 */
export function reapplyApplicationUpdate(extra = {}) {
  return {
    status: 'PENDING',
    rejection_reason: null,
    rejected_at: null,
    resigned_at: null,
    resignation_reason: null,
    updated_at: new Date().toISOString(),
    ...extra,
  }
}

/** Same as {@link reapplyApplicationUpdate} but without resigned_* columns (pre-migration safe). */
export function reapplyApplicationUpdateLegacy(extra = {}) {
  return {
    status: 'PENDING',
    rejection_reason: null,
    rejected_at: null,
    updated_at: new Date().toISOString(),
    ...extra,
  }
}

/**
 * Update an application for reapply, falling back if resigned_* columns are not migrated yet.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} applicationId
 * @param {Record<string, unknown>} [extra]
 */
export async function updateApplicationForReapply(client, applicationId, extra = {}) {
  const full = reapplyApplicationUpdate(extra)
  const first = await client.from('applications').update(full).eq('id', applicationId)
  if (!first.error) return first
  const msg = String(first.error?.message || '')
  if (!/resigned_at|resignation_reason/i.test(msg)) return first
  return client
    .from('applications')
    .update(reapplyApplicationUpdateLegacy(extra))
    .eq('id', applicationId)
}
