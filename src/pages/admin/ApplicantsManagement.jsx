import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ApplicantsManagement = () => {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    licenseType: '',
    trainingLevel: '',
    applicationStatus: ''
  })

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    hired: 0,
    expiring: 0
  })

  useEffect(() => {
    fetchApplications()
    fetchStats()
  }, [filters, searchQuery])

  const fetchStats = async () => {
    try {
      const { data: applicants, error } = await supabase
        .from('applicants')
        .select('status, license_status')

      if (error) throw error

      const total = applicants?.length || 0
      const pending = applicants?.filter(app => app.status === 'Pending' || app.status === 'pending').length || 0
      const hired = applicants?.filter(app => app.status === 'Hired' || app.status === 'hired').length || 0
      const expiring = applicants?.filter(app => app.license_status === 'expired' || app.license_status === 'expiring').length || 0

      setStats({ total, pending, hired, expiring })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchApplications = async () => {
    setLoading(true)
    try {
      // Join applicants with applications and jobs
      let query = supabase
        .from('applications')
        .select(`
          *,
          applicants:applicant_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            reference_code,
            status,
            license_type,
            license_status,
            training_level,
            licenses,
            documents (file_type, application_id)
          ),
          jobs:job_id (
            title,
            required_documents,
            required_credentials
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.applicationStatus) {
        query = query.eq('status', filters.applicationStatus.toLowerCase())
      }

      const { data, error } = await query

      if (error) throw error

      // Filter by search query and additional filters
      let filtered = data || []
      
      // Filter by license type and training level (from applicant)
      if (filters.licenseType) {
        filtered = filtered.filter(app => 
          app.applicants?.license_type === filters.licenseType
        )
      }
      if (filters.trainingLevel) {
        filtered = filtered.filter(app => 
          app.applicants?.training_level === filters.trainingLevel
        )
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(app =>
          `${app.applicants?.first_name || ''} ${app.applicants?.last_name || ''}`.toLowerCase().includes(query) ||
          app.applicants?.reference_code?.toLowerCase().includes(query) ||
          app.applicants?.email?.toLowerCase().includes(query)
        )
      }

      setApplications(filtered)
    } catch (error) {
      console.error('Error fetching applications:', error)
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
      licenseType: '',
      trainingLevel: '',
      applicationStatus: ''
    })
    setSearchQuery('')
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

  // Group applications by job
  const applicationsByJob = useMemo(() => {
    const groups = new Map()
    for (const app of applications) {
      const jobId = app.job_id ?? 'general'
      const jobTitle = app.jobs?.title || 'General Application'
      if (!groups.has(jobId)) {
        groups.set(jobId, { jobId, jobTitle, applications: [] })
      }
      groups.get(jobId).applications.push(app)
    }
    return Array.from(groups.values())
  }, [applications])

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Pending' },
      'submitted': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Pending' },
      'screening': { bg: 'bg-blue-100', text: 'text-navy', label: 'Screening' },
      'interview': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Interview' },
      'hired': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Hired' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
    }

    const config = statusMap[status?.toLowerCase()] || statusMap['pending']
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

  // Compliance %: job required_documents + required_credentials vs applicant documents + licenses
  const getCompliancePercentage = (app) => {
    const applicant = app.applicants
    const jobData = app.jobs
    if (!applicant) return null
    const allDocs = applicant?.documents || []
    const documents = allDocs.filter(
      (d) => d.application_id === app.id || d.application_id == null
    )
    const applicantLicenses = Array.isArray(applicant?.licenses) ? applicant.licenses : []
    const requiredDocuments = Array.isArray(jobData?.required_documents) ? jobData.required_documents : []
    const requiredCredentials = Array.isArray(jobData?.required_credentials) ? jobData.required_credentials : []

    if (requiredDocuments.length === 0 && requiredCredentials.length === 0) return null

    let documentScore = 0
    let documentTotal = 0
    let credentialScore = 0
    let credentialTotal = 0

    if (requiredDocuments.length > 0) {
      requiredDocuments.forEach((reqDoc) => {
        const percentage = parseFloat(reqDoc.percentage) || 0
        documentTotal += percentage
        if (documents.some((doc) => doc.file_type === reqDoc.document_type)) {
          documentScore += percentage
        }
      })
    }
    if (requiredCredentials.length > 0) {
      credentialTotal = requiredCredentials.length
      credentialScore = requiredCredentials.filter((cred) => applicantLicenses.includes(cred)).length
    }

    let matchPercentage = 0
    if (documentTotal > 0 && credentialTotal > 0) {
      const documentMatch = (documentScore / documentTotal) * 100
      const credentialMatch = (credentialScore / credentialTotal) * 100
      const documentWeight = Math.min(documentTotal / 100, 1)
      const credentialWeight = Math.max(0, 1 - documentWeight)
      matchPercentage = documentMatch * documentWeight + credentialMatch * credentialWeight
    } else if (documentTotal > 0) {
      matchPercentage = (documentScore / documentTotal) * 100
    } else if (credentialTotal > 0) {
      matchPercentage = (credentialScore / credentialTotal) * 100
    }

    return Math.round(Math.min(100, Math.max(0, matchPercentage)))
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
          <button className="flex size-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 size-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>
          <button className="flex size-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
            <span className="material-symbols-outlined">help</span>
          </button>
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
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Hired This Month</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.hired}</p>
              </div>
              <div className="rounded-md bg-blue-50 p-2 text-blue-600">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span className="ml-1 font-medium">+2% vs target</span>
            </div>
          </div>
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
        </div>

        {/* Main Section */}
        <div className="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* Advanced Filter Toolbar */}
          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 lg:p-6 lg:flex-row lg:items-end">
            <div className="flex-1 grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">License Type</span>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    value={filters.licenseType}
                    onChange={(e) => handleFilterChange('licenseType', e.target.value)}
                  >
                    <option value="">All Licenses</option>
                    <option value="PLTC">PLTC (Private Lady)</option>
                    <option value="SO">SO (Security Officer)</option>
                    <option value="SG">SG (Security Guard)</option>
                    <option value="Class 1A">Class 1A</option>
                    <option value="Class 1C">Class 1C</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Training Level</span>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    value={filters.trainingLevel}
                    onChange={(e) => handleFilterChange('trainingLevel', e.target.value)}
                  >
                    <option value="">All Training</option>
                    <option value="BOSH">BOSH Certified</option>
                    <option value="CCTV">CCTV Operator</option>
                    <option value="VIP">VIP Protection</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Application Status</span>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    value={filters.applicationStatus}
                    onChange={(e) => handleFilterChange('applicationStatus', e.target.value)}
                  >
                    <option value="">Any Status</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Screening">Screening</option>
                    <option value="Interview">Interview Scheduled</option>
                    <option value="Hired">Hired</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
                </div>
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
                              <div className="flex items-center gap-1 cursor-pointer hover:text-navy">
                                Applied Date
                                <span className="material-symbols-outlined text-base">arrow_drop_down</span>
                              </div>
                            </th>
                            <th className="px-6 py-4 font-semibold tracking-wider">License Status</th>
                            <th className="px-6 py-4 font-semibold tracking-wider">Requirements</th>
                            <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                            <th className="px-6 py-4 font-semibold tracking-wider text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {jobApplications.map((app) => {
                            const applicant = app.applicants
                            const compliance = getCompliancePercentage(app)
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
                                <td className="whitespace-nowrap px-6 py-4 text-gray-700">
                                  {formatDate(app.submitted_at || app.created_at)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  {getLicenseStatusBadge(applicant?.license_status)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  {compliance != null ? (
                                    <span
                                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        compliance >= 100
                                          ? 'bg-green-100 text-green-800'
                                          : compliance >= 50
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-red-100 text-red-800'
                                      }`}
                                    >
                                      {compliance}%
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">—</span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  {getStatusBadge(app.status)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Link
                                      to={`/admin/applicants/${app.id}`}
                                      className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-navy hover:shadow-sm transition-all"
                                      title="View Profile"
                                    >
                                      <span className="material-symbols-outlined text-[20px]">visibility</span>
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
    </main>
  )
}

export default ApplicantsManagement

