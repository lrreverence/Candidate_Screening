import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { loadAdminApplicationResumeBundle } from '../../lib/adminApplicationResumeBundle'

/**
 * @param {{ open: boolean, applicationId: string | null, onClose: () => void }} props
 */
export default function JobMatchBreakdownModal({ open, applicationId, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [jobTitle, setJobTitle] = useState('')
  const [applicantName, setApplicantName] = useState('')
  const [breakdown, setBreakdown] = useState(null)
  const [requirementPercent, setRequirementPercent] = useState(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !applicationId) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setBreakdown(null)
    setRequirementPercent(null)

    ;(async () => {
      try {
        const data = await loadAdminApplicationResumeBundle(supabase, applicationId)
        if (cancelled) return
        setJobTitle(data.job?.title || 'General application')
        setApplicantName(`${data.applicant.first_name || ''} ${data.applicant.last_name || ''}`.trim())
        setBreakdown(data.breakdown)
        setRequirementPercent(data.requirementPercent)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load breakdown')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, applicationId])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-match-breakdown-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <h2 id="job-match-breakdown-title" className="text-lg font-bold text-navy">
              Job match breakdown
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              {applicantName ? <span className="font-medium text-gray-800">{applicantName}</span> : 'Applicant'} ·{' '}
              <span>{jobTitle}</span>
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              Resume score uses admin category weights. The applicants list &quot;Job match&quot; column uses this same
              headline total. When the job sets required documents or credentials, the blue line above shows that fit
              separately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-navy"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && breakdown && (
            <>
              {requirementPercent != null && (
                <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
                  <span className="font-semibold">Required documents &amp; credentials match: </span>
                  <span className="tabular-nums font-bold">{requirementPercent}%</span>
                </div>
              )}

              <div className="overflow-hidden rounded-lg border border-emerald-700/30 shadow-sm">
                <div className="flex items-center justify-between gap-3 bg-emerald-600 px-4 py-3 text-white">
                  <span className="text-sm font-bold uppercase tracking-wide">Job match</span>
                  <span className="text-2xl font-black tabular-nums">{breakdown.total}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600">
                        <th className="px-3 py-2.5">Category</th>
                        <th className="px-3 py-2.5">% set by admin</th>
                        <th className="px-3 py-2.5">Applicant score</th>
                        <th className="px-3 py-2.5">Score per category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {breakdown.rows.map((r) => (
                        <tr key={r.categoryKey} className="bg-white">
                          <td className="px-3 py-2.5 font-medium text-gray-900">{r.label}</td>
                          <td className="px-3 py-2.5 tabular-nums text-gray-700">{r.adminPercent}%</td>
                          <td className="px-3 py-2.5 tabular-nums text-gray-800">{r.applicantScore}</td>
                          <td className={`px-3 py-2.5 tabular-nums font-semibold ${r.weightedClass}`}>
                            {r.weightedPoints}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
