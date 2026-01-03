import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const JobsManagement = () => {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showJobForm, setShowJobForm] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    closed: 0,
    totalApplications: 0
  })
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    department: '',
    employment_type: 'Full-time',
    description: '',
    requirements: '',
    salary_range: '',
    status: 'active'
  })

  useEffect(() => {
    fetchJobs()
    fetchStats()
  }, [statusFilter, searchQuery])

  const fetchStats = async () => {
    try {
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select('status')

      if (error) throw error

      const total = jobsData?.length || 0
      const active = jobsData?.filter(job => job.status === 'active').length || 0
      const closed = jobsData?.filter(job => job.status === 'closed' || job.status === 'inactive').length || 0

      // Get total applications count
      const { count: totalApplications, error: appsError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      if (appsError) throw appsError

      setStats({ total, active, closed, totalApplications: totalApplications || 0 })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchJobs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          applications:applications(count)
        `)
        .order('created_at', { ascending: false })

      // Apply status filter
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      // Filter by search query
      let filtered = data || []
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(job =>
          job.title?.toLowerCase().includes(query) ||
          job.location?.toLowerCase().includes(query) ||
          job.department?.toLowerCase().includes(query)
        )
      }

      setJobs(filtered)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'check_circle', label: 'Active' },
      'closed': { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'cancel', label: 'Closed' },
      'inactive': { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'pause_circle', label: 'Inactive' },
      'draft': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'edit', label: 'Draft' }
    }

    const normalizedStatus = status?.toString().toLowerCase().trim() || 'active'
    const config = statusMap[normalizedStatus] || statusMap['active']
    return (
      <span className={`inline-flex items-center gap-1 rounded-md ${config.bg} px-2.5 py-1 text-xs font-semibold ${config.text}`}>
        <span className="material-symbols-outlined text-sm">{config.icon}</span>
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleToggleStatus = async (jobId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'closed' : 'active'
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId)

      if (error) throw error

      // Refresh jobs list
      fetchJobs()
      fetchStats()
    } catch (error) {
      console.error('Error updating job status:', error)
      alert('Failed to update job status')
    }
  }

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)

      if (error) throw error

      // Refresh jobs list
      fetchJobs()
      fetchStats()
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Failed to delete job posting')
    }
  }

  const handleOpenJobForm = (job = null) => {
    if (job) {
      setEditingJob(job)
      setFormData({
        title: job.title || '',
        location: job.location || '',
        department: job.department || '',
        employment_type: job.employment_type || 'Full-time',
        description: job.description || '',
        requirements: job.requirements || '',
        salary_range: job.salary_range || '',
        status: job.status || 'active'
      })
    } else {
      setEditingJob(null)
      setFormData({
        title: '',
        location: '',
        department: '',
        employment_type: 'Full-time',
        description: '',
        requirements: '',
        salary_range: '',
        status: 'active'
      })
    }
    setShowJobForm(true)
  }

  const handleCloseJobForm = () => {
    setShowJobForm(false)
    setEditingJob(null)
    setFormData({
      title: '',
      location: '',
      department: '',
      employment_type: 'Full-time',
      description: '',
      requirements: '',
      salary_range: '',
      status: 'active'
    })
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmitJob = async (e) => {
    e.preventDefault()

    if (!formData.title || !formData.location) {
      alert('Please fill in title and location')
      return
    }

    try {
      if (editingJob) {
        // Update existing job
        const { error } = await supabase
          .from('jobs')
          .update(formData)
          .eq('id', editingJob.id)

        if (error) throw error
        alert('Job updated successfully!')
      } else {
        // Create new job
        const { error } = await supabase
          .from('jobs')
          .insert([formData])

        if (error) throw error
        alert('Job posted successfully!')
      }

      handleCloseJobForm()
      fetchJobs()
      fetchStats()
    } catch (error) {
      console.error('Error saving job:', error)
      alert('Failed to save job posting')
    }
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-[#f3f4f6]">
      {/* Top Navigation Bar */}
      <header className="hidden lg:flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-8 shadow-sm">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-navy">Job Postings</h2>
          <p className="text-xs text-gray-500 hidden sm:block">Manage security personnel job openings</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Search */}
          <div className="relative w-48 lg:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input
              className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy transition-all"
              placeholder="Search jobs..."
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
            placeholder="Search jobs..."
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
                <p className="text-sm font-medium text-gray-500">Total Job Postings</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.total}</p>
              </div>
              <div className="rounded-md bg-blue-50 p-2 text-primary">
                <span className="material-symbols-outlined">work</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Postings</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.active}</p>
              </div>
              <div className="rounded-md bg-blue-50 p-2 text-blue-600">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <span className="font-medium">Currently accepting applications</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Closed Postings</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.closed}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-2 text-gray-600">
                <span className="material-symbols-outlined">cancel</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Applications</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.totalApplications}</p>
              </div>
              <div className="rounded-md bg-purple-50 p-2 text-purple-600">
                <span className="material-symbols-outlined">assignment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* Filter Toolbar */}
          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 lg:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Status:</span>
                <select
                  className="appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
            </div>
            <button
              onClick={() => handleOpenJobForm()}
              className="flex items-center justify-center gap-2 rounded-md bg-navy px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-navy-light focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1 w-full lg:w-auto"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Create New Job
            </button>
          </div>

          {/* Jobs Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="rounded-full bg-gray-100 p-6 mb-4">
                <span className="material-symbols-outlined text-5xl text-gray-400">work_off</span>
              </div>
              <h3 className="text-lg font-semibold text-navy mb-2">No job postings found</h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                {searchQuery || statusFilter
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first job posting'}
              </p>
              {!searchQuery && !statusFilter && (
                <button
                  onClick={() => handleOpenJobForm()}
                  className="flex items-center justify-center gap-2 rounded-md bg-navy px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-navy-light"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Create Job Posting
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 lg:p-6 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-navy mb-1">{job.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {job.location || 'Not specified'}
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    {job.department && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="material-symbols-outlined text-sm">business</span>
                        <span>{job.department}</span>
                      </div>
                    )}
                    {job.employment_type && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>{job.employment_type}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="material-symbols-outlined text-sm">group</span>
                      <span>{job.applications?.[0]?.count || 0} applications</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Posted {formatDate(job.created_at)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(job.id, job.status)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-navy transition-all"
                        title={job.status === 'active' ? 'Close job' : 'Activate job'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {job.status === 'active' ? 'pause' : 'play_arrow'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleOpenJobForm(job)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary transition-all"
                        title="Edit job"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-all"
                        title="Delete job"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Job Form Modal */}
      {showJobForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-navy">
                {editingJob ? 'Edit Job Posting' : 'Create New Job Posting'}
              </h3>
              <button
                onClick={handleCloseJobForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitJob} className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleFormChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      placeholder="e.g. Security Guard"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleFormChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      placeholder="e.g. Manila, Philippines"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      placeholder="e.g. Security Operations"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employment Type
                    </label>
                    <select
                      name="employment_type"
                      value={formData.employment_type}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Temporary">Temporary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salary Range
                    </label>
                    <input
                      type="text"
                      name="salary_range"
                      value={formData.salary_range}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      placeholder="e.g. ₱15,000 - ₱20,000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    >
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows="4"
                    className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    placeholder="Describe the job responsibilities and duties..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requirements
                  </label>
                  <textarea
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleFormChange}
                    rows="4"
                    className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    placeholder="List the qualifications and requirements..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseJobForm}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-navy text-white text-sm font-medium rounded-md hover:bg-navy-light"
                >
                  {editingJob ? 'Update Job' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default JobsManagement
