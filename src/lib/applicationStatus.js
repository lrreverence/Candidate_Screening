/**
 * Canonical application pipeline statuses (applications.status).
 * Legacy values are normalized via {@link normalizeApplicationStatus}.
 */
export const APPLICATION_STATUSES = ['NEW', 'PENDING', 'INTERVIEW', 'HIRED', 'REJECTED']

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
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'REJECTED' }
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
    REJECTED: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', label: 'REJECTED' }
  }
  return map[key] || map.PENDING
}

export function isApplicationStatusNew(raw) {
  return normalizeApplicationStatus(raw) === 'NEW'
}

export function isApplicationStatusPendingLike(raw) {
  return normalizeApplicationStatus(raw) === 'PENDING'
}
