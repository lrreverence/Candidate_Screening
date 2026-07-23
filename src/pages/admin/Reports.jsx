import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { APPLICATION_STATUSES, normalizeApplicationStatus } from '../../lib/applicationStatus'
import AdminNotificationBell from '../../components/admin/AdminNotificationBell'
import AdminHelpButton from '../../components/admin/AdminHelpButton'

const STATUS_COLORS = {
  NEW: '#2563eb', // blue-600
  PENDING: '#6b7280', // gray-500
  INTERVIEW: '#f59e0b', // amber-500
  HIRED: '#10b981', // emerald-500
  REJECTED: '#ef4444', // red-500
  RESIGNED: '#64748b', // slate-500
}

function isoDayKey(d) {
  const dt = typeof d === 'string' ? new Date(d) : d
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDayLocal(d) {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function startOfMonthLocal(d) {
  const dt = new Date(d)
  dt.setDate(1)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function addMonths(d, months) {
  const dt = new Date(d)
  dt.setMonth(dt.getMonth() + months)
  return dt
}

function isoMonthKey(d) {
  const dt = typeof d === 'string' ? new Date(d) : d
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function formatMonthLabel(monthKey) {
  const dt = new Date(`${monthKey}-01T00:00:00`)
  if (Number.isNaN(dt.getTime())) return monthKey
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function addDays(d, days) {
  const dt = new Date(d)
  dt.setDate(dt.getDate() + days)
  return dt
}

function formatCompactDateLabel(dayKey) {
  const dt = new Date(`${dayKey}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return dayKey
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const RANGE_PRESETS = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
]

const MONTH_PRESETS = [
  { id: '6', label: 'Last 6 months', months: 6 },
  { id: '12', label: 'Last 12 months', months: 12 },
  { id: '18', label: 'Last 18 months', months: 18 },
]

const Reports = () => {
  const [rangeId, setRangeId] = useState('30')
  const [monthRangeId, setMonthRangeId] = useState('12')
  const [jobFilter, setJobFilter] = useState('ALL')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])

  const rangeDays = useMemo(() => {
    const found = RANGE_PRESETS.find((r) => r.id === rangeId)
    return found?.days || 30
  }, [rangeId])

  const rangeMonths = useMemo(() => {
    const found = MONTH_PRESETS.find((r) => r.id === monthRangeId)
    return found?.months || 12
  }, [monthRangeId])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const now = new Date()
        const sinceDaily = startOfDayLocal(addDays(now, -rangeDays + 1))
        const sinceMonthly = startOfMonthLocal(addMonths(now, -(rangeMonths - 1)))
        const since = sinceDaily < sinceMonthly ? sinceMonthly : sinceDaily

        const { data, error: qErr } = await supabase
          .from('applications')
          .select(
            `
            id,
            created_at,
            status,
            job_id,
            interview_result,
            jobs:job_id ( id, title )
          `.trim(),
          )
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: true })

        if (qErr) throw qErr
        if (!mounted) return
        setRows(data || [])
      } catch (e) {
        console.error('[Reports] fetch error', e)
        if (!mounted) return
        setError(e?.message || 'Failed to load reports data.')
        setRows([])
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [rangeDays, rangeMonths])

  const computed = useMemo(() => {
    const jobOptionsMap = new Map()
    const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0]))
    const jobCounts = new Map()
    let interviewWithResult = 0
    let interviewMissingResult = 0

    for (const r of rows) {
      const st = normalizeApplicationStatus(r?.status)
      byStatus[st] = (byStatus[st] || 0) + 1

      const jobId = r?.jobs?.id || r?.job_id || null
      const jobTitle = r?.jobs?.title || 'General application'
      const jobKey = jobId ? String(jobId) : 'GENERAL'
      if (!jobOptionsMap.has(jobKey)) jobOptionsMap.set(jobKey, jobTitle)
      jobCounts.set(jobTitle, (jobCounts.get(jobTitle) || 0) + 1)

      if (st === 'INTERVIEW') {
        const has = String(r?.interview_result || '').trim().length > 0
        if (has) interviewWithResult += 1
        else interviewMissingResult += 1
      }
    }

    const statusChart = APPLICATION_STATUSES.map((s) => ({
      status: s,
      count: byStatus[s] || 0,
      color: STATUS_COLORS[s] || '#64748b',
    }))

    const topJobs = Array.from(jobCounts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    // Build day series (fill missing days with 0)
    const today = startOfDayLocal(new Date())
    const start = startOfDayLocal(addDays(today, -rangeDays + 1))
    const dayMap = new Map()
    for (let i = 0; i < rangeDays; i++) {
      const k = isoDayKey(addDays(start, i))
      dayMap.set(k, { day: k, label: formatCompactDateLabel(k), applications: 0 })
    }
    for (const r of rows) {
      const k = isoDayKey(r?.created_at)
      const bucket = dayMap.get(k)
      if (bucket) bucket.applications += 1
    }
    const daily = Array.from(dayMap.values())

    const total = rows.length
    const totalInterview = (byStatus.INTERVIEW || 0) + (byStatus.HIRED || 0) // interview stage and beyond (approx.)
    const hired = byStatus.HIRED || 0
    const rejected = byStatus.REJECTED || 0

    const interviewResultPie = [
      { name: 'With result', value: interviewWithResult, color: '#10b981' },
      { name: 'Missing result', value: interviewMissingResult, color: '#f59e0b' },
    ].filter((x) => x.value > 0)

    // Monthly aggregates (overall + filtered by job)
    const now = new Date()
    const monthStart = startOfMonthLocal(addMonths(now, -(rangeMonths - 1)))
    const monthBuckets = new Map()
    for (let i = 0; i < rangeMonths; i++) {
      const k = isoMonthKey(addMonths(monthStart, i))
      monthBuckets.set(k, {
        month: k,
        label: formatMonthLabel(k),
        applicants: 0,
        rejected: 0,
        interviewed: 0,
        hired: 0,
      })
    }

    const isRowIncluded = (r) => {
      if (jobFilter === 'ALL') return true
      const jobKey = r?.jobs?.id || r?.job_id ? String(r?.jobs?.id || r?.job_id) : 'GENERAL'
      return jobKey === jobFilter
    }

    for (const r of rows) {
      const mk = isoMonthKey(r?.created_at)
      const b = monthBuckets.get(mk)
      if (!b) continue
      if (!isRowIncluded(r)) continue

      const st = normalizeApplicationStatus(r?.status)
      b.applicants += 1
      if (st === 'REJECTED') b.rejected += 1
      if (st === 'INTERVIEW' || st === 'HIRED') b.interviewed += 1
      if (st === 'HIRED') b.hired += 1
    }

    const monthly = Array.from(monthBuckets.values())
    const monthOptions = monthly
      .slice()
      .reverse()
      .map((m) => ({ id: m.month, label: m.label }))

    const defaultSelectedMonth = monthly[monthly.length - 1]?.month || ''

    const selectedRow = monthly.find((m) => m.month === (selectedMonth || defaultSelectedMonth)) || null
    const selectedIdx = selectedRow ? monthly.findIndex((m) => m.month === selectedRow.month) : -1
    const prev1 = selectedIdx > 0 ? monthly[selectedIdx - 1] : null
    const prev2 = selectedIdx > 1 ? monthly[selectedIdx - 2] : null

    const compareRows = [selectedRow, prev1, prev2].filter(Boolean)

    const jobOptions = [
      { id: 'ALL', label: 'Overall (all job postings)' },
      ...Array.from(jobOptionsMap.entries())
        .map(([id, title]) => ({ id, label: title }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ]

    return {
      total,
      totalInterview,
      hired,
      rejected,
      statusChart,
      topJobs,
      daily,
      interviewResultPie,
      monthly,
      monthOptions,
      defaultSelectedMonth,
      compareRows,
      jobOptions,
    }
  }, [rows, rangeDays, rangeMonths, jobFilter, selectedMonth])

  useEffect(() => {
    if (!selectedMonth && computed.defaultSelectedMonth) {
      setSelectedMonth(computed.defaultSelectedMonth)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed.defaultSelectedMonth])

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-[#f3f4f6]">
      {/* Top Navigation Bar */}
      <header className="hidden lg:flex sticky top-0 z-30 min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:px-8 shadow-sm">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-navy">Reports</h2>
          <p className="text-xs text-gray-500 hidden sm:block">Data analysis and charts for your hiring pipeline</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Daily</span>
            <select
              value={rangeId}
              onChange={(e) => setRangeId(e.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {RANGE_PRESETS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="ml-2 text-xs font-semibold text-gray-500">Monthly</span>
            <select
              value={monthRangeId}
              onChange={(e) => setMonthRangeId(e.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {MONTH_PRESETS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="ml-2 text-xs font-semibold text-gray-500">Scope</span>
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="h-9 min-w-[220px] rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {computed.jobOptions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
            <span className="ml-2 text-xs font-semibold text-gray-500">Compare</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {computed.monthOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <AdminNotificationBell />
          <AdminHelpButton />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">Loading reports…</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Applications (range)</p>
                <p className="mt-2 text-3xl font-bold text-navy">{computed.total}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Interview stage+</p>
                <p className="mt-2 text-3xl font-bold text-navy">{computed.totalInterview}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Hired</p>
                <p className="mt-2 text-3xl font-bold text-navy">{computed.hired}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Rejected</p>
                <p className="mt-2 text-3xl font-bold text-navy">{computed.rejected}</p>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-navy">Applications over time</h3>
                  <p className="text-xs text-gray-500">Daily count within selected range</p>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={computed.daily} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="applications" stroke="#2563eb" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-navy">Monthly analysis</h3>
                  <p className="text-xs text-gray-500">
                    Applicants, Rejected, Interviewed, Hired — {jobFilter === 'ALL' ? 'Overall' : 'Selected job'}
                  </p>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computed.monthly} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="applicants" name="Applicants" fill="#111827" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rejected" name="Rejected" fill={STATUS_COLORS.REJECTED} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="interviewed" name="Interviewed" fill={STATUS_COLORS.INTERVIEW} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="hired" name="Hired" fill={STATUS_COLORS.HIRED} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Comparison table */}
            <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-navy">Compare selected month vs previous months</h3>
                <p className="text-xs text-gray-500">
                  Showing selected month and up to 2 previous months — {jobFilter === 'ALL' ? 'Overall' : 'Selected job'}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                      <th className="py-2 pr-4">Month</th>
                      <th className="py-2 pr-4">Applicants</th>
                      <th className="py-2 pr-4">Rejected</th>
                      <th className="py-2 pr-4">Interviewed</th>
                      <th className="py-2 pr-4">Hired</th>
                      <th className="py-2 pr-4">Hire rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.compareRows.map((r, idx) => {
                      const applicants = r.applicants || 0
                      const hired = r.hired || 0
                      const hireRate = applicants > 0 ? Math.round((hired / applicants) * 1000) / 10 : 0
                      const isSelected = r.month === selectedMonth
                      return (
                        <tr key={r.month} className={`border-b border-gray-100 ${isSelected ? 'bg-blue-50/40' : ''}`}>
                          <td className="py-3 pr-4 font-semibold text-navy">{r.label}</td>
                          <td className="py-3 pr-4 tabular-nums">{r.applicants}</td>
                          <td className="py-3 pr-4 tabular-nums">{r.rejected}</td>
                          <td className="py-3 pr-4 tabular-nums">{r.interviewed}</td>
                          <td className="py-3 pr-4 tabular-nums">{r.hired}</td>
                          <td className="py-3 pr-4 tabular-nums">{hireRate}%</td>
                        </tr>
                      )
                    })}
                    {computed.compareRows.length === 0 && (
                      <tr>
                        <td className="py-4 text-gray-500" colSpan={6}>
                          No monthly data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Note: “Applicants” here counts application records (from `applications`). “Interviewed” counts INTERVIEW + HIRED.
              </p>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-navy">Top job postings</h3>
                  <p className="text-xs text-gray-500">Most applied-to jobs (within range)</p>
                </div>
                {computed.topJobs.length === 0 ? (
                  <p className="text-sm text-gray-500">No job applications in this range.</p>
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={computed.topJobs} layout="vertical" margin={{ top: 10, right: 18, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="title" width={180} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Applications" fill="#111827" radius={[4, 4, 4, 4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-navy">Interview result coverage</h3>
                  <p className="text-xs text-gray-500">For INTERVIEW rows only</p>
                </div>
                {computed.interviewResultPie.length === 0 ? (
                  <p className="text-sm text-gray-500">No interview-stage applications in this range.</p>
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip />
                        <Pie data={computed.interviewResultPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                          {computed.interviewResultPie.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default Reports

