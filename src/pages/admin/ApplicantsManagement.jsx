import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminNotificationBell from '../../components/admin/AdminNotificationBell'
import AdminHelpButton from '../../components/admin/AdminHelpButton'
import JobMatchBreakdownModal from '../../components/admin/JobMatchBreakdownModal'
import {
  buildResumeBreakdownContextFromApplicantEmbed,
  loadAdminApplicationResumeBundle
} from '../../lib/adminApplicationResumeBundle'
import { computeResumeJobMatchBreakdown } from '../../lib/resumeJobMatchBreakdown'
import { computeRequirementMatchPercent, collectApplicantCredentialIds } from '../../lib/jobMatchScore'
import {
  applicationStatusBadge,
  isApplicationStatusNew,
  normalizeApplicationStatus,
  statusFilterValues
} from '../../lib/applicationStatus'

/**
 * Primary match % shown in the list: same headline as the breakdown modal / applicant detail — resume-weighted
 * `breakdown.total` when loaded via `enrichApplicationsWithResumeMatch` (`_resumeMatchTotal`). Falls back to
 * requirement-only or a shallow resume estimate only if bundle load failed.
 */
function getApplicationJobMatchPercent(app) {
  const applicant = app?.applicants
  const jobData = app?.jobs
  if (!applicant) return null
  if (!jobData) return null
  if (typeof app._resumeMatchTotal === 'number' && Number.isFinite(app._resumeMatchTotal)) {
    return Math.round(app._resumeMatchTotal * 100) / 100
  }
  const allDocs = applicant?.documents || []
  const appIdStr = app?.id != null ? String(app.id) : ''
  const documents = allDocs.filter(
    (d) => d.application_id == null || String(d.application_id) === appIdStr
  )
  const applicantLicenseIds = collectApplicantCredentialIds(
    applicant?.licenses,
    applicant?.applicant_licenses
  )
  const requirementPct = computeRequirementMatchPercent(jobData, { documents, applicantLicenseIds })
  if (requirementPct !== null) return requirementPct
  const ctx = buildResumeBreakdownContextFromApplicantEmbed(applicant)
  const { total } = computeResumeJobMatchBreakdown(jobData, ctx)
  if (!Number.isFinite(total)) return null
  return Math.round(total * 100) / 100
}

/** Load full resume bundle per row so list `Job match` equals modal headline (for all applications with a job). */
async function enrichApplicationsWithResumeMatch(supabase, apps, concurrency = 6) {
  const rows = apps || []
  const toLoad = []
  for (let i = 0; i < rows.length; i++) {
    const app = rows[i]
    const applicant = app?.applicants
    const jobData = app?.jobs
    if (!applicant || !jobData) continue
    toLoad.push({ index: i, id: app.id })
  }
  if (toLoad.length === 0) return rows.map((a) => ({ ...a }))
  const next = rows.map((a) => ({ ...a }))
  for (let c = 0; c < toLoad.length; c += concurrency) {
    const chunk = toLoad.slice(c, c + concurrency)
    await Promise.all(
      chunk.map(async ({ index, id }) => {
        try {
          const bundle = await loadAdminApplicationResumeBundle(supabase, id)
          const t = bundle?.breakdown?.total
          next[index]._resumeMatchTotal = typeof t === 'number' && Number.isFinite(t) ? t : null
        } catch (e) {
          console.warn('[ApplicantsManagement] resume match bundle for list row', id, e)
          next[index]._resumeMatchTotal = null
        }
      })
    )
  }
  return next
}

/** PostgREST select for applications list — keep shallow to avoid embed/RLS/schema mismatches across environments. */
const APPLICATIONS_LIST_SELECT_FULL = `
  *,
  applicants:applicant_id (
    id,
    first_name,
    last_name,
    email,
    phone,
    reference_code,
    status,
    tag_mark,
    license_status,
    licenses,
    user_id,
    date_of_birth,
    gender,
    street_address,
    barangay,
    city,
    province,
    civil_status,
    religion,
    height_cm,
    weight_kg,
    documents (file_type, application_id)
  ),
  jobs:job_id (
    title,
    required_documents,
    required_credentials,
    category_percentages,
    age_scoring,
    gender_scoring,
    height_scoring,
    weight_scoring,
    employment_experience_scoring,
    training_count_scoring,
    others_scoring
  )
`

const APPLICATIONS_LIST_SELECT_JOBS_MINIMAL = `
  *,
  applicants:applicant_id (
    id,
    first_name,
    last_name,
    email,
    phone,
    reference_code,
    status,
    tag_mark,
    license_status,
    licenses,
    user_id,
    date_of_birth,
    gender,
    street_address,
    barangay,
    city,
    province,
    civil_status,
    religion,
    height_cm,
    weight_kg,
    documents (file_type, application_id)
  ),
  jobs:job_id (
    title,
    required_documents,
    required_credentials
  )
`

/** Last resort: matches the list query shape before profile/job-scoring fields were added. */
const APPLICATIONS_LIST_SELECT_LEGACY = `
  *,
  applicants:applicant_id (
    id,
    first_name,
    last_name,
    email,
    phone,
    reference_code,
    status,
    tag_mark,
    license_status,
    licenses,
    documents (file_type, application_id)
  ),
  jobs:job_id (
    title,
    required_documents,
    required_credentials
  )
`

const ApplicantsManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [listFetchError, setListFetchError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    applicationStatus: '',
    matchFilter: '',
    appliedDateFrom: '',
    appliedDateTo: ''
  })
  const [sortBy, setSortBy] = useState('applied_date')
  const [sortDirection, setSortDirection] = useState('desc')
  const [breakdownApplicationId, setBreakdownApplicationId] = useState(null)

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    new: 0,
    expiring: 0
  })

  useEffect(() => {
    fetchApplications()
    fetchStats()
  }, [filters, searchQuery])

  // Allow deep-linking into a queue (e.g. from notifications)
  useEffect(() => {
    const raw = (searchParams.get('status') || '').trim()
    if (!raw) return
    setFilters((prev) => ({
      ...prev,
      applicationStatus: normalizeApplicationStatus(raw)
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchStats = async () => {
    try {
      // Total applicants
      const { count: totalApplicants, error: applicantsError } = await supabase
        .from('applicants')
        .select('*', { count: 'exact', head: true })
      if (applicantsError) throw applicantsError

      // Application status counts (Pending Review = Pending + submitted)
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('status')
      if (appsError) throw appsError

      const newCount =
        applications?.filter((app) => normalizeApplicationStatus(app?.status) === 'NEW').length || 0
      const pending =
        applications?.filter((app) => normalizeApplicationStatus(app?.status) === 'PENDING').length || 0

      // Expiring licenses from applicants
      const { data: applicants, error: expError } = await supabase
        .from('applicants')
        .select('license_status')
      if (expError) throw expError
      const expiring = applicants?.filter(
        app => app?.license_status === 'expired' || app?.license_status === 'expiring'
      ).length || 0

      setStats({
        total: totalApplicants ?? 0,
        new: newCount,
        pending,
        expiring
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchApplications = async () => {
    setLoading(true)
    setListFetchError(null)
    try {
      const runListQuery = async (selectStr) => {
        let q = supabase.from('applications').select(selectStr).order('created_at', { ascending: false })
        if (filters.applicationStatus) {
          q = q.in('status', statusFilterValues(filters.applicationStatus))
        }
        return q
      }

      let { data, error } = await runListQuery(APPLICATIONS_LIST_SELECT_FULL)
      if (error) {
        console.warn('[ApplicantsManagement] full list select failed, retrying minimal jobs embed', error)
        const second = await runListQuery(APPLICATIONS_LIST_SELECT_JOBS_MINIMAL)
        data = second.data
        error = second.error
      }
      if (error) {
        console.warn('[ApplicantsManagement] retry failed, using legacy applicant/job select', error)
        const third = await runListQuery(APPLICATIONS_LIST_SELECT_LEGACY)
        data = third.data
        error = third.error
      }
      if (error) throw error

      // Filter by search query and additional filters
      let filtered = data || []
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(app =>
          `${app.applicants?.first_name || ''} ${app.applicants?.last_name || ''}`.toLowerCase().includes(query) ||
          app.applicants?.reference_code?.toLowerCase().includes(query) ||
          app.applicants?.email?.toLowerCase().includes(query)
        )
      }

      // Filter by applied date range
      if (filters.appliedDateFrom) {
        const fromStart = new Date(filters.appliedDateFrom)
        fromStart.setHours(0, 0, 0, 0)
        filtered = filtered.filter(app => {
          const d = new Date(app.submitted_at || app.created_at)
          return d >= fromStart
        })
      }
      if (filters.appliedDateTo) {
        const toEnd = new Date(filters.appliedDateTo)
        toEnd.setHours(23, 59, 59, 999)
        filtered = filtered.filter(app => {
          const d = new Date(app.submitted_at || app.created_at)
          return d <= toEnd
        })
      }

      filtered = await enrichApplicationsWithResumeMatch(supabase, filtered)

      if (filters.matchFilter) {
        filtered = filtered.filter((app) => {
          const p = getApplicationJobMatchPercent(app)
          switch (filters.matchFilter) {
            case 'no_requirements':
              return p === null
            case 'high':
              return typeof p === 'number' && p >= 75
            case 'medium':
              return typeof p === 'number' && p >= 50 && p < 75
            case 'low':
              return typeof p === 'number' && p >= 1 && p < 50
            case 'zero':
              return p === 0
            default:
              return true
          }
        })
      }

      setApplications(filtered)
    } catch (error) {
      console.error('Error fetching applications:', error)
      setListFetchError(error?.message || 'Failed to load applications')
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }))
  }

  const handleResetFilters = () => {
    setFilters({
      applicationStatus: '',
      matchFilter: '',
      appliedDateFrom: '',
      appliedDateTo: ''
    })
    setSearchQuery('')
    setSearchParams({})
  }

  const handleMoveToPendingReview = async (app) => {
    if (!confirm('Move this application from NEW to PENDING (under review)?')) return
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'PENDING',
          updated_at: new Date().toISOString()
        })
        .eq('id', app.id)

      if (error) throw error
      fetchApplications()
      fetchStats()
    } catch (err) {
      console.error('Error updating application status:', err)
      alert(`Failed to update application: ${err?.message || 'Please try again.'}`)
    }
  }

  const handleSetApplicantTagMark = async (app, nextTag) => {
    const applicantId = app?.applicants?.id
    if (!applicantId) return
    try {
      const current = app?.applicants?.tag_mark || null
      const tagToSet = current === nextTag ? null : nextTag
      const { error } = await supabase
        .from('applicants')
        .update({ tag_mark: tagToSet, updated_at: new Date().toISOString() })
        .eq('id', applicantId)
      if (error) throw error
      setApplications((prev) =>
        (prev || []).map((row) =>
          row?.id === app?.id
            ? { ...row, applicants: { ...row.applicants, tag_mark: tagToSet } }
            : row
        )
      )
    } catch (err) {
      console.error('Error updating applicant tag:', err)
      alert(`Failed to update tag: ${err?.message || 'Please try again.'}`)
    }
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      const defaultDesc = column === 'applied_date' || column === 'job_match'
      setSortDirection(defaultDesc ? 'desc' : 'asc')
    }
  }

  const handleApplyFilters = () => {
    fetchApplications()
  }

  const handleDeleteApplication = async (app) => {
    if (!confirm(`Remove this application for ${app.applicants?.first_name} ${app.applicants?.last_name}? This cannot be undone.`)) return
    try {
      // Delete documents linked to this application first (avoids FK constraint)
      const { error: docsError } = await supabase
        .from('documents')
        .delete()
        .eq('application_id', app.id)

      if (docsError) {
        console.error('Error deleting application documents:', docsError)
        // Continue anyway - application might have no documents or RLS may block
      }

      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', app.id)

      if (error) {
        console.error('Delete application error:', error)
        alert(`Failed to delete application: ${error.message}. You may need an RLS policy allowing DELETE on applications.`)
        return
      }
      fetchApplications()
      fetchStats()
    } catch (err) {
      console.error('Error deleting application:', err)
      alert(`Failed to delete application: ${err?.message || 'Please try again.'}`)
    }
  }

  // Group by job first (stable job order), then sort only within each job
  const applicationsByJob = useMemo(() => {
    const sortCompare = (a, b) => {
      if (sortBy === 'applied_date') {
        const dateA = new Date(a.submitted_at || a.created_at).getTime()
        const dateB = new Date(b.submitted_at || b.created_at).getTime()
        const diff = sortDirection === 'asc' ? dateA - dateB : dateB - dateA
        return Number.isFinite(diff) ? diff : 0
      }
      if (sortBy === 'job_match') {
        const rawA = getApplicationJobMatchPercent(a)
        const rawB = getApplicationJobMatchPercent(b)
        const aVal = typeof rawA === 'number' && Number.isFinite(rawA) ? rawA : -1
        const bVal = typeof rawB === 'number' && Number.isFinite(rawB) ? rawB : -1
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      return 0
    }
    const groups = new Map()
    for (const app of applications) {
      const jobId = app.job_id ?? 'general'
      const jobTitle = app.jobs?.title || 'General Application'
      if (!groups.has(jobId)) {
        groups.set(jobId, { jobId, jobTitle, applications: [] })
      }
      groups.get(jobId).applications.push(app)
    }
    const result = Array.from(groups.values())
    result.forEach((group) => {
      group.applications.sort(sortCompare)
    })
    return result
  }, [applications, sortBy, sortDirection])

  const getStatusBadge = (status) => {
    const config = applicationStatusBadge(status)
    return (
      <span className={`inline-flex items-center rounded-md ${config.bg} px-2.5 py-1 text-xs font-semibold ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getLicenseStatusBadge = (licenseStatus) => {
    const statusMap = {
      'valid': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-600', label: 'Valid' },
      'expired': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-600', label: 'Expired' },
      'review': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', label: 'Review' },
      'pending': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500', label: 'Pending' }
    }

    const config = statusMap[licenseStatus?.toLowerCase()] || statusMap['pending']
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full ${config.bg} ${config.border} border px-2.5 py-1 text-xs font-medium ${config.text}`}>
        <span className={`size-1.5 rounded-full ${config.dot}`}></span>
        {config.label}
      </span>
    )
  }

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-[#f3f4f6]">
      {/* Top Navigation Bar */}
      <header className="hidden lg:flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-8 shadow-sm">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-navy">Applicant Management</h2>
          <p className="text-xs text-gray-500 hidden sm:block">View and manage security personnel applications</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Search */}
          <div className="relative w-48 lg:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input
              className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy transition-all"
              placeholder="Search by name or ID..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <AdminNotificationBell />
          <AdminHelpButton />
        </div>
      </header>

      {/* Mobile Search Bar */}
      <div className="lg:hidden p-4 bg-white border-b border-gray-200">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
          <input
            className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy transition-all"
            placeholder="Search by name or ID..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 lg:mb-8">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Applicants</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.total}</p>
              </div>
              <div className="rounded-md bg-blue-50 p-2 text-primary">
                <span className="material-symbols-outlined">groups</span>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span className="ml-1 font-medium">+12% from last month</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">New Applicants</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.new || 0}</p>
              </div>
              <div className="rounded-md bg-blue-50 p-2 text-blue-600">
                <span className="material-symbols-outlined">fiber_new</span>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <span className="font-medium">Needs triage</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.pending}</p>
              </div>
              <div className="rounded-md bg-yellow-50 p-2 text-yellow-600">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-yellow-600">
              <span className="font-medium">Requires immediate attention</span>
            </div>
          </div>
          {(stats.expiring || 0) > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">License Expiry</p>
                  <p className="mt-1 text-2xl font-bold text-navy">{stats.expiring}</p>
                </div>
                <div className="rounded-md bg-red-50 p-2 text-red-600">
                  <span className="material-symbols-outlined">warning</span>
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-red-600">
                <span className="font-medium">Expiring within 30 days</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Section */}
        <div className="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* Advanced Filter Toolbar */}
          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 lg:p-6 lg:flex-row lg:items-end">
            <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Application Status</span>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    value={filters.applicationStatus}
                    onChange={(e) => handleFilterChange('applicationStatus', e.target.value)}
                  >
                    <option value="">Any Status</option>
                    <option value="NEW">NEW</option>
                    <option value="PENDING">PENDING</option>
                    <option value="INTERVIEW">INTERVIEW</option>
                    <option value="HIRED">HIRED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Job match %</span>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    value={filters.matchFilter}
                    onChange={(e) => handleFilterChange('matchFilter', e.target.value)}
                  >
                    <option value="">Any match</option>
                    <option value="high">75–100% (strong)</option>
                    <option value="medium">50–74% (moderate)</option>
                    <option value="low">1–49% (weak)</option>
                    <option value="zero">0% (job match not met)</option>
                    <option value="no_requirements">No job linked (N/A)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Applied From</span>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  value={filters.appliedDateFrom}
                  onChange={(e) => handleFilterChange('appliedDateFrom', e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Applied To</span>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  value={filters.appliedDateTo}
                  onChange={(e) => handleFilterChange('appliedDateTo', e.target.value)}
                />
              </label>
            </div>
            <div className="flex gap-3 pt-4 lg:pt-0">
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1"
              >
                <span className="material-symbols-outlined text-lg">restart_alt</span>
                Reset
              </button>
              <button
                onClick={handleApplyFilters}
                className="flex items-center gap-2 rounded-md bg-navy px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-navy-light focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1"
              >
                <span className="material-symbols-outlined text-lg">filter_list</span>
                Apply Filters
              </button>
            </div>
          </div>

          {/* Data Grid / Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">Loading applications...</p>
            </div>
          ) : listFetchError ? (
            <div className="mx-4 my-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 lg:mx-6">
              <p className="font-semibold">Could not load applications</p>
              <p className="mt-1 text-red-800/90">{listFetchError}</p>
              <p className="mt-2 text-xs text-red-800/80">
                Check the browser console for details. If you recently changed the database, ensure migrations for job
                scoring columns are applied.
              </p>
            </div>
          ) : applicationsByJob.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">No applications found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {applicationsByJob.map(({ jobId, jobTitle, applications: jobApplications }) => (
                <div key={jobId} className="border-t border-gray-200 first:border-t-0 first:pt-0 pt-6 first:pt-0">
                  <h3 className="text-base font-semibold text-navy mb-4 px-4 lg:px-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[22px] text-primary">work</span>
                    {jobTitle}
                    <span className="text-sm font-normal text-gray-500">({jobApplications.length} applicant{jobApplications.length !== 1 ? 's' : ''})</span>
                  </h3>
                  <div className="overflow-x-auto -mx-4 lg:mx-0">
                    <div className="inline-block min-w-full align-middle px-4 lg:px-6">
                      <table className="min-w-full table-auto text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                          <tr className="border-b border-gray-200">
                            <th className="px-6 py-4 font-semibold tracking-wider">Applicant Name</th>
                            <th className="px-6 py-4 font-semibold tracking-wider">
                              <span className="sr-only">Tag</span>
                            </th>
                            <th className="px-6 py-4 font-semibold tracking-wider">
                              <button
                                type="button"
                                onClick={() => handleSort('applied_date')}
                                className="flex items-center gap-1 cursor-pointer hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy/30 rounded"
                              >
                                Applied Date
                                <span className="material-symbols-outlined text-base">
                                  {sortBy === 'applied_date'
                                    ? sortDirection === 'asc'
                                      ? 'arrow_drop_up'
                                      : 'arrow_drop_down'
                                    : 'unfold_more'}
                                </span>
                              </button>
                            </th>
                            <th className="px-6 py-4 font-semibold tracking-wider">License Status</th>
                            <th className="px-6 py-4 font-semibold tracking-wider min-w-[140px]">
                              <button
                                type="button"
                                onClick={() => handleSort('job_match')}
                                className="flex items-center gap-1 cursor-pointer hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy/30 rounded"
                                title="Sort by job match: required documents/credentials when set; otherwise the same resume-weighted score as the breakdown view"
                              >
                                Job match
                                <span className="material-symbols-outlined text-base">
                                  {sortBy === 'job_match'
                                    ? sortDirection === 'asc'
                                      ? 'arrow_drop_up'
                                      : 'arrow_drop_down'
                                    : 'unfold_more'}
                                </span>
                              </button>
                            </th>
                            <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                            <th className="px-6 py-4 font-semibold tracking-wider text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {jobApplications.map((app) => {
                            const applicant = app.applicants
                            const matchPct = getApplicationJobMatchPercent(app)
                            const isNew = isApplicationStatusNew(app.status)
                            const tag = applicant?.tag_mark || null
                            return (
                              <tr key={app.id} className="group hover:bg-blue-50/30 transition-colors">
                                <td className="whitespace-nowrap px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold shadow-sm">
                                      {getInitials(applicant?.first_name, applicant?.last_name)}
                                    </div>
                                    <div>
                                      <div className="font-medium text-navy text-base">
                                        {applicant?.first_name} {applicant?.last_name}
                                      </div>
                                      <div className="text-xs text-gray-500">ID: {applicant?.reference_code || `APP-${app.id}`}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSetApplicantTagMark(app, 'heart')}
                                      className={`rounded-md p-1.5 transition-colors ${
                                        tag === 'heart'
                                          ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                                          : 'text-gray-400 hover:bg-gray-50 hover:text-rose-600'
                                      }`}
                                      title={tag === 'heart' ? 'Clear heart tag' : 'Tag as heart'}
                                      aria-label={tag === 'heart' ? 'Clear heart tag' : 'Tag as heart'}
                                    >
                                      <span className="material-symbols-outlined text-[20px]">favorite</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetApplicantTagMark(app, 'star')}
                                      className={`rounded-md p-1.5 transition-colors ${
                                        tag === 'star'
                                          ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                                          : 'text-gray-400 hover:bg-gray-50 hover:text-amber-600'
                                      }`}
                                      title={tag === 'star' ? 'Clear star tag' : 'Tag as star'}
                                      aria-label={tag === 'star' ? 'Clear star tag' : 'Tag as star'}
                                    >
                                      <span className="material-symbols-outlined text-[20px]">star</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetApplicantTagMark(app, 'flag')}
                                      className={`rounded-md p-1.5 transition-colors ${
                                        tag === 'flag'
                                          ? 'bg-sky-50 text-sky-800 ring-1 ring-sky-200'
                                          : 'text-gray-400 hover:bg-gray-50 hover:text-sky-700'
                                      }`}
                                      title={tag === 'flag' ? 'Clear flag tag' : 'Tag as flag'}
                                      aria-label={tag === 'flag' ? 'Clear flag tag' : 'Tag as flag'}
                                    >
                                      <span className="material-symbols-outlined text-[20px]">flag</span>
                                    </button>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-gray-700">
                                  {formatDate(app.submitted_at || app.created_at)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  {getLicenseStatusBadge(applicant?.license_status)}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex min-w-[120px] max-w-[200px] items-start gap-2">
                                    <div className="min-w-0 flex-1">
                                      {matchPct != null ? (
                                        <div className="flex flex-col gap-1.5">
                                          <div className="flex items-center justify-between gap-2">
                                            <span
                                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
                                                matchPct >= 100
                                                  ? 'bg-green-100 text-green-800'
                                                  : matchPct >= 50
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-red-100 text-red-800'
                                              }`}
                                            >
                                              {matchPct}%
                                            </span>
                                            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                              vs job
                                            </span>
                                          </div>
                                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                            <div
                                              className={`h-full rounded-full transition-[width] ${
                                                matchPct >= 100
                                                  ? 'bg-green-600'
                                                  : matchPct >= 50
                                                    ? 'bg-amber-500'
                                                    : 'bg-red-500'
                                              }`}
                                              style={{ width: `${Math.min(100, matchPct)}%` }}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <span
                                          className="text-xs text-gray-400"
                                          title="No job is linked to this application, so there is nothing to compare"
                                        >
                                          N/A
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setBreakdownApplicationId(app.id)}
                                      className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-navy"
                                      title="View job match breakdown"
                                      aria-label="View job match breakdown"
                                    >
                                      <span className="material-symbols-outlined text-[22px]">visibility</span>
                                    </button>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  {getStatusBadge(app.status)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {isNew && (
                                      <button
                                        type="button"
                                        onClick={() => handleMoveToPendingReview(app)}
                                        className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                                        title="Move to Pending Review"
                                      >
                                        Triage
                                      </button>
                                    )}
                                    <Link
                                      to={`/admin/applicants/${app.id}`}
                                      className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-navy hover:shadow-sm transition-all"
                                      title="View Profile"
                                    >
                                      <span className="material-symbols-outlined text-[20px]">person</span>
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteApplication(app)}
                                      className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
                                      title="Delete Application"
                                    >
                                      <span className="material-symbols-outlined text-[20px]">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <JobMatchBreakdownModal
        open={Boolean(breakdownApplicationId)}
        applicationId={breakdownApplicationId}
        onClose={() => setBreakdownApplicationId(null)}
      />
    </main>
  )
}

export default ApplicantsManagement

