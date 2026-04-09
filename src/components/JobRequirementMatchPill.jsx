import React from 'react'

const TIER_STYLES = {
  high: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  mid: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  low: 'bg-rose-500/15 text-rose-200 border-rose-500/35',
}

/**
 * @param {number | null} percent — null = job has no scored requirements (renders nothing)
 */
export default function JobRequirementMatchPill({ percent, compact = false, className = '' }) {
  if (percent === null || percent === undefined || Number.isNaN(percent)) {
    return null
  }

  const tier = percent >= 75 ? 'high' : percent >= 50 ? 'mid' : 'low'
  const title =
    'Estimated match between your uploaded documents and listed credentials vs. this job’s requirements. This is not a hiring guarantee or probability.'

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${TIER_STYLES[tier]} ${className}`}
      title={title}
    >
      <span className="material-symbols-outlined text-[15px] leading-none">bar_chart</span>
      {!compact && <span className="leading-none">Profile match</span>}
      <span className="tabular-nums leading-none">{percent}%</span>
    </div>
  )
}
