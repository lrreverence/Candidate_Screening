import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminNotificationBell from '../../components/admin/AdminNotificationBell'
import AdminHelpButton from '../../components/admin/AdminHelpButton'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalApplicants: 0,
    pendingReview: 0,
    hiredThisMonth: 0,
    licenseExpiring: 0,
    activeJobs: 0,
    totalApplications: 0
  })
  const [recentApplications, setRecentApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch applicant stats
      const { data: applicants, error: applicantsError } = await supabase
        .from('applicants')
        .select('status, license_status, created_at')

      if (applicantsError) throw applicantsError

      const totalApplicants = applicants?.length || 0
      const pendingReview = applicants?.filter(app => app.status === 'Pending' || app.status === 'pending').length || 0

      // Count hired this month
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const hiredThisMonth = applicants?.filter(app =>
        (app.status === 'Hired' || app.status === 'hired') &&
        new Date(app.created_at) >= firstDayOfMonth
      ).length || 0

      const licenseExpiring = applicants?.filter(app =>
        app.license_status === 'expired' || app.license_status === 'expiring'
      ).length || 0

      // Fetch active jobs count (all jobs are considered active since there's no status column)
      const { count: activeJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })

      if (jobsError) throw jobsError

      // Fetch total applications
      const { count: totalApplications, error: appsError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      if (appsError) throw appsError

      // Fetch recent applications (last 5)
      const { data: recent, error: recentError } = await supabase
        .from('applications')
        .select(`
          *,
          applicants:applicant_id (
            first_name,
            last_name,
            reference_code
          ),
          jobs:job_id (
            title
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentError) throw recentError

      setStats({
        totalApplicants,
        pendingReview,
        hiredThisMonth,
        licenseExpiring,
        activeJobs: activeJobs || 0,
        totalApplications: totalApplications || 0
      })
      setRecentApplications(recent || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

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
          <h2 className="text-lg lg:text-xl font-bold text-navy">Dashboard</h2>
          <p className="text-xs text-gray-500 hidden sm:block">Welcome to E Power Security Admin Console</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <AdminNotificationBell />
          <AdminHelpButton />
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* KPI Stats Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Applicants</p>
                    <p className="mt-2 text-3xl font-bold text-navy">{stats.totalApplicants}</p>
                  </div>
                  <div className="rounded-md bg-blue-50 p-3 text-primary">
                    <span className="material-symbols-outlined text-2xl">groups</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    to="/admin/applicants"
                    className="text-xs text-primary hover:text-navy font-medium flex items-center gap-1"
                  >
                    View all applicants
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pending Review</p>
                    <p className="mt-2 text-3xl font-bold text-navy">{stats.pendingReview}</p>
                  </div>
                  <div className="rounded-md bg-yellow-50 p-3 text-yellow-600">
                    <span className="material-symbols-outlined text-2xl">pending_actions</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-yellow-600">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span className="ml-1 font-medium">Requires attention</span>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Hired This Month</p>
                    <p className="mt-2 text-3xl font-bold text-navy">{stats.hiredThisMonth}</p>
                  </div>
                  <div className="rounded-md bg-blue-50 p-3 text-blue-600">
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-blue-600">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  <span className="ml-1 font-medium">Great progress</span>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">License Expiring</p>
                    <p className="mt-2 text-3xl font-bold text-navy">{stats.licenseExpiring}</p>
                  </div>
                  <div className="rounded-md bg-red-50 p-3 text-red-600">
                    <span className="material-symbols-outlined text-2xl">warning</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-red-600">
                  <span className="font-medium">Expiring within 30 days</span>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Job Postings</p>
                    <p className="mt-2 text-3xl font-bold text-navy">{stats.activeJobs}</p>
                  </div>
                  <div className="rounded-md bg-green-50 p-3 text-green-600">
                    <span className="material-symbols-outlined text-2xl">work</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    to="/admin/jobs"
                    className="text-xs text-primary hover:text-navy font-medium flex items-center gap-1"
                  >
                    Manage job postings
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Applications</p>
                    <p className="mt-2 text-3xl font-bold text-navy">{stats.totalApplications}</p>
                  </div>
                  <div className="rounded-md bg-purple-50 p-3 text-purple-600">
                    <span className="material-symbols-outlined text-2xl">assignment</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-gray-500">
                  <span className="font-medium">All time applications</span>
                </div>
              </div>
            </div>

            {/* Recent Applications */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-navy">Recent Applications</h3>
                  <Link
                    to="/admin/applicants"
                    className="text-sm text-primary hover:text-navy font-medium flex items-center gap-1"
                  >
                    View all
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {recentApplications.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No recent applications
                  </div>
                ) : (
                  recentApplications.map((app) => {
                    const applicant = app.applicants
                    return (
                      <div key={app.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex size-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold">
                              {applicant?.first_name?.[0]}{applicant?.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-navy">
                                {applicant?.first_name} {applicant?.last_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {app.jobs?.title || 'General Application'} • {formatDate(app.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(app.status)}
                            <Link
                              to={`/admin/applicants/${app.id}`}
                              className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-navy hover:shadow-sm transition-all"
                            >
                              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default Dashboard
