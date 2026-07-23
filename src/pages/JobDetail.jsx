import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'
import LoginModal from '../components/LoginModal'
import { getJobImageUrl } from '../lib/storageUpload'
import { supabase } from '../lib/supabase'
import { useApplicantJobMatchInputs } from '../hooks/useApplicantJobMatchInputs'
import { computeRequirementMatchPercent } from '../lib/jobMatchScore'
import JobRequirementMatchPill from '../components/JobRequirementMatchPill'
import {
  applyEligibilityMessage,
  getApplyEligibility,
  normalizeApplicationStatus,
} from '../lib/applicationStatus'
import { normalizeOthersScoringFromJob } from '../lib/othersScoring'

const APPLICATION_STATUS_LABELS = {
  NEW: { label: 'NEW — Awaiting review', icon: 'fiber_new', className: 'text-blue-400' },
  PENDING: { label: 'PENDING — Under review', icon: 'schedule', className: 'text-yellow-500' },
  INTERVIEW: { label: 'INTERVIEW — Next step', icon: 'event_available', className: 'text-amber-400' },
  HIRED: { label: 'HIRED', icon: 'verified_user', className: 'text-emerald-400' },
  REJECTED: { label: 'REJECTED', icon: 'cancel', className: 'text-red-400' },
  RESIGNED: { label: 'RESIGNED — Eligible to reapply', icon: 'logout', className: 'text-slate-300' },
}

function ApplicationStatusLabel({ status }) {
  const key = normalizeApplicationStatus(status)
  const config = APPLICATION_STATUS_LABELS[key] || APPLICATION_STATUS_LABELS.PENDING
  return (
    <p className={`text-sm font-medium ${config.className} flex items-center gap-2`}>
      <span className="material-symbols-outlined text-[18px]">{config.icon}</span>
      {config.label}
    </p>
  )
}

// Normalize job row from DB (requirements may be text or array; responsibilities/benefits may be missing)
function normalizeJobRow(foundJob, imageUrl) {
  const toArray = (v) => {
    if (Array.isArray(v)) return v
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v)
        return Array.isArray(parsed) ? parsed : v.trim() ? [v] : []
      } catch {
        return v.trim() ? v.split(/\n/).map(s => s.trim()).filter(Boolean) : []
      }
    }
    return []
  }
  const othersScoring = normalizeOthersScoringFromJob(foundJob?.others_scoring ?? foundJob?.othersScoring)
  return {
    id: foundJob.id,
    title: foundJob.title,
    location: foundJob.location,
    salary: foundJob.salary,
    type: foundJob.type,
    shift: foundJob.shift,
    image: imageUrl,
    badge: foundJob.badge_text ? {
      text: foundJob.badge_text,
      icon: foundJob.badge_icon,
      color: foundJob.badge_color
    } : null,
    category: foundJob.category,
    description: foundJob.description || "Join our team and help us provide exceptional security services.",
    requirements: toArray(foundJob.requirements),
    responsibilities: toArray(foundJob.responsibilities),
    benefits: toArray(foundJob.benefits),
    required_documents: foundJob.required_documents,
    required_credentials: foundJob.required_credentials,
    others_scoring: othersScoring,
  }
}

const JobDetail = () => {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs: supabaseJobs, loading: supabaseLoading } = useSupabase()
  const { user } = useAuth()
  const { loading: jobMatchLoading, data: jobMatchInputs } = useApplicantJobMatchInputs(user?.id)
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applicantApplications, setApplicantApplications] = useState([])
  const [applicationStatus, setApplicationStatus] = useState(null) // { status, rejection_reason, rejected_at }
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [jobImageUrl, setJobImageUrl] = useState(null)
  const applyEligibility = getApplyEligibility(applicantApplications, jobId)

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true)
      let foundJob = null

      // 1) Try context list first
      if (supabaseJobs && supabaseJobs.length > 0) {
        foundJob = supabaseJobs.find(j => j.id === jobId) || null
      }

      // 2) If not in list, fetch by ID from Supabase (so new postings and applied jobs remain viewable)
      if (!foundJob && jobId) {
        const { data: row, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .maybeSingle()
        if (!error && row) foundJob = row
      }

      if (foundJob) {
        let imageUrl = foundJob.image
        if (foundJob.image) {
          try {
            const signedUrl = await getJobImageUrl(foundJob.image)
            if (signedUrl) imageUrl = signedUrl
          } catch (error) {
            console.error('[JOB_DETAIL] Error loading job image:', error)
          }
        }
        setJobImageUrl(imageUrl)
        setJob(normalizeJobRow(foundJob, imageUrl))
      } else {
        setJob(null)
        setJobImageUrl(null)
      }
      setLoading(false)
    }

    if (!supabaseLoading) {
      fetchJob()
    }
  }, [jobId, supabaseJobs, supabaseLoading])

  // Load applications for eligibility + status panel (rejection reason, reapply, hired lock)
  useEffect(() => {
    const checkApplication = async () => {
      if (!user?.id || !jobId) {
        setApplicantApplications([])
        setApplicationStatus(null)
        return
      }

      try {
        const { data: applicants } = await supabase
          .from('applicants')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        if (!applicants?.length) {
          setApplicantApplications([])
          setApplicationStatus(null)
          return
        }

        const { data: applications, error } = await supabase
          .from('applications')
          .select('id, job_id, status, rejection_reason, rejected_at, updated_at')
          .eq('applicant_id', applicants[0].id)

        if (error) throw error

        const apps = Array.isArray(applications) ? applications : []
        setApplicantApplications(apps)

        const forJob = apps.find((a) => a.job_id === jobId)
        if (forJob) {
          setApplicationStatus({
            status: forJob.status,
            rejection_reason: forJob.rejection_reason || null,
            rejected_at: forJob.rejected_at || null,
          })
        } else {
          setApplicationStatus(null)
        }
      } catch (error) {
        setApplicantApplications([])
        setApplicationStatus(null)
      }
    }

    checkApplication()
  }, [user?.id, jobId])

  const requirementMatchPercent =
    user &&
    job &&
    jobMatchInputs &&
    typeof jobMatchInputs === 'object' &&
    !jobMatchLoading
      ? computeRequirementMatchPercent(job, {
          documents: jobMatchInputs.documents,
          applicantLicenseIds: jobMatchInputs.licenseIds
        })
      : null

  const handleApply = () => {
    if (!user) {
      // Show login modal if not logged in
      setShowLoginModal(true)
      return
    }
    if (!applyEligibility.canApply) {
      alert(applyEligibilityMessage(applyEligibility))
      return
    }
    // Navigate to application form if logged in
    navigate(`/profile/apply/${jobId}`)
  }

  if (loading || supabaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-white">
        <div className="text-center">
          <div className="text-text-muted">Loading job details...</div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-white">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-text-muted mb-4">error_outline</span>
          <h2 className="text-2xl font-bold text-white mb-2">Job Not Found</h2>
          <p className="text-text-muted mb-6">The job you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Jobs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-white font-display">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-[#1e40af] bg-[#0f172a]/95 backdrop-blur-md">
        <div className="px-4 md:px-10 py-3 max-w-[1200px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 text-white">
            <div className="size-8 text-primary">
              <span className="material-symbols-outlined text-[32px]">shield_person</span>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">E Power Security</h2>
          </Link>
          <Link
            to="/"
            className="flex h-10 px-6 cursor-pointer items-center justify-center rounded-full bg-secondary text-white text-sm font-bold hover:bg-[#1e3a8a] transition-colors"
          >
            Back to Jobs
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full">
        {/* Hero Section with Job Image */}
        <div 
          className="w-full h-64 md:h-80 bg-cover bg-center relative bg-gray-800"
          style={{ backgroundImage: job.image ? `url("${job.image}")` : 'none' }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent"></div>
          <div className="relative z-10 max-w-[1200px] mx-auto px-4 md:px-10 pt-8 h-full flex flex-col justify-end pb-8">
            {job.badge && (
              <div className="mb-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                  job.badge.color === 'primary' 
                    ? 'bg-primary text-[#0f172a]' 
                    : 'bg-white/20 backdrop-blur-sm text-white border border-white/30'
                }`}>
                  <span className="material-symbols-outlined text-[18px]">{job.badge.icon}</span>
                  {job.badge.text}
                </div>
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-black text-white mb-2">{job.title}</h1>
            <div className="flex items-center gap-4 text-text-muted">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">location_on</span>
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">work</span>
                <span>{job.category}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8 md:py-12">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-8">
              {/* Job Description */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Job Description</h2>
                <p className="text-text-muted leading-relaxed">{job.description}</p>
              </section>

              {/* Responsibilities */}
              {job.responsibilities && job.responsibilities.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4">Key Responsibilities</h2>
                  <ul className="space-y-3">
                    {job.responsibilities.map((responsibility, index) => (
                      <li key={index} className="flex items-start gap-3 text-text-muted">
                        <span className="material-symbols-outlined text-primary text-xl mt-0.5">check_circle</span>
                        <span>{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4">Requirements</h2>
                  <ul className="space-y-3">
                    {job.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start gap-3 text-text-muted">
                        <span className="material-symbols-outlined text-primary text-xl mt-0.5">verified</span>
                        <span>{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Preferred (Others scoring) */}
              {job.others_scoring &&
                (job.others_scoring.skills?.length > 0 ||
                  job.others_scoring.preferred_places?.length > 0 ||
                  job.others_scoring.preferred_monthly_salary?.length > 0) && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4">Preferences</h2>

                  {job.others_scoring.skills?.length > 0 && (
                    <div className="mb-5">
                      <h3 className="text-base font-semibold text-white mb-2">Skills needed</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.others_scoring.skills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center rounded-full border border-secondary/60 bg-secondary/10 px-3 py-1 text-sm text-white"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {job.others_scoring.preferred_places?.length > 0 && (
                    <div className="mb-5">
                      <h3 className="text-base font-semibold text-white mb-2">Preferred places</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.others_scoring.preferred_places.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center rounded-full border border-secondary/60 bg-secondary/10 px-3 py-1 text-sm text-white"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {job.others_scoring.preferred_monthly_salary?.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold text-white mb-2">Preferred monthly salary</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.others_scoring.preferred_monthly_salary.map((r) => (
                          <span
                            key={r}
                            className="inline-flex items-center rounded-full border border-secondary/60 bg-secondary/10 px-3 py-1 text-sm text-white"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Apply Card */}
              <div className="bg-card-dark border border-secondary rounded-2xl p-6 sticky top-24">
                <h3 className="text-xl font-bold text-white mb-4">Job Details</h3>
                {requirementMatchPercent !== null && (
                  <div className="mb-5 pb-5 border-b border-secondary/40">
                    <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">Your profile vs. job match</p>
                    <JobRequirementMatchPill percent={requirementMatchPercent} />
                    <p className="text-xs text-text-muted mt-2 leading-relaxed">
                      Based on required documents and credentials configured for this role. This is not a hiring probability or guarantee.
                    </p>
                  </div>
                )}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">payments</span>
                    <div>
                      <div className="text-sm text-text-muted">Salary</div>
                      <div className="text-white font-semibold">{job.salary}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                    <div>
                      <div className="text-sm text-text-muted">Shift</div>
                      <div className="text-white font-semibold">{job.shift}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">work</span>
                    <div>
                      <div className="text-sm text-text-muted">Employment Type</div>
                      <div className="text-white font-semibold">{job.type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                    <div>
                      <div className="text-sm text-text-muted">Location</div>
                      <div className="text-white font-semibold">{job.location}</div>
                    </div>
                  </div>
                </div>
                {applicationStatus && !applyEligibility.canApply ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border p-4 bg-secondary/10 border-secondary/50">
                      <div className="flex items-center gap-2 text-white font-semibold mb-1">
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                        Application status
                      </div>
                      <ApplicationStatusLabel status={applicationStatus.status} />
                      {normalizeApplicationStatus(applicationStatus.status) === 'REJECTED' &&
                        applicationStatus.rejection_reason && (
                        <p className="mt-3 text-sm text-text-muted border-t border-secondary/30 pt-3">
                          {applicationStatus.rejection_reason}
                        </p>
                      )}
                      {applyEligibility.reason === 'rejected_cooldown' && (
                        <p className="mt-3 text-sm text-amber-300/90 border-t border-secondary/30 pt-3">
                          You may reapply in {applyEligibility.daysRemaining} day
                          {applyEligibility.daysRemaining === 1 ? '' : 's'}.
                        </p>
                      )}
                      {(applyEligibility.reason === 'hired_elsewhere' ||
                        applyEligibility.reason === 'hired_this_job') && (
                        <p className="mt-3 text-sm text-text-muted border-t border-secondary/30 pt-3">
                          {applyEligibilityMessage(applyEligibility)}
                        </p>
                      )}
                    </div>
                  </div>
                ) : applyEligibility.canApply ? (
                  <div className="space-y-3">
                    {applicationStatus &&
                      (normalizeApplicationStatus(applicationStatus.status) === 'REJECTED' ||
                        normalizeApplicationStatus(applicationStatus.status) === 'RESIGNED') && (
                      <div className="rounded-xl border p-4 bg-secondary/10 border-secondary/50">
                        <div className="flex items-center gap-2 text-white font-semibold mb-1">
                          <span className="material-symbols-outlined text-primary">info</span>
                          Previous application
                        </div>
                        <ApplicationStatusLabel status={applicationStatus.status} />
                        {normalizeApplicationStatus(applicationStatus.status) === 'REJECTED' &&
                          applicationStatus.rejection_reason && (
                          <p className="mt-3 text-sm text-text-muted border-t border-secondary/30 pt-3">
                            {applicationStatus.rejection_reason}
                          </p>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleApply}
                      className="w-full h-12 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors flex items-center justify-center gap-2"
                    >
                      {applicationStatus ? 'Reapply' : 'Apply Now'}
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border p-4 bg-secondary/10 border-secondary/50">
                    <p className="text-sm text-text-muted">
                      {applyEligibilityMessage(applyEligibility) || 'You cannot apply for this job right now.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Benefits */}
              {job.benefits && job.benefits.length > 0 && (
                <div className="bg-card-dark border border-secondary rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Benefits</h3>
                  <ul className="space-y-2">
                    {job.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2 text-text-muted">
                        <span className="material-symbols-outlined text-primary text-[18px]">star</span>
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#0f172a] pt-12 pb-8 px-4 md:px-10 border-t border-[#1e40af]">
        <div className="max-w-[1200px] mx-auto">
          <div className="border-t border-[#1e40af] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#60a5fa]">
            <p>© 2025 E Power Security. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={() => {
          setShowLoginModal(false)
          // Could add signup modal here if needed
        }}
        redirectTo={jobId ? `/profile/apply/${jobId}` : null}
      />
    </div>
  )
}

export default JobDetail

