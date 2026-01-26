import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'
import LoginModal from '../components/LoginModal'
import { getJobImageUrl } from '../lib/storageUpload'

const JobDetail = () => {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs: supabaseJobs, loading: supabaseLoading } = useSupabase()
  const { user } = useAuth()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasApplied, setHasApplied] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [jobImageUrl, setJobImageUrl] = useState(null)

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true)
      
      // Find job from Supabase using UUID (not parseInt)
      if (supabaseJobs && supabaseJobs.length > 0) {
        const foundJob = supabaseJobs.find(j => j.id === jobId) // Direct UUID comparison
        if (foundJob) {
          console.log('[JOB_DETAIL] Found job from Supabase:', foundJob.id)
          
          // Load image URL if job has an image
          let imageUrl = foundJob.image
          if (foundJob.image) {
            try {
              const signedUrl = await getJobImageUrl(foundJob.image)
              if (signedUrl) {
                imageUrl = signedUrl
              }
            } catch (error) {
              console.error('[JOB_DETAIL] Error loading job image:', error)
            }
          }
          
          setJobImageUrl(imageUrl)
          
          setJob({
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
            requirements: foundJob.requirements || [],
            responsibilities: foundJob.responsibilities || [],
            benefits: foundJob.benefits || []
          })
          setLoading(false)
          return
        } else {
          console.warn('[JOB_DETAIL] Job not found in Supabase:', jobId)
        }
      } else {
        console.warn('[JOB_DETAIL] No Supabase jobs available')
      }
      
      // Job not found - set to null
      setJob(null)
      setJobImageUrl(null)
      setLoading(false)
    }

    if (!supabaseLoading) {
      fetchJob()
    }
  }, [jobId, supabaseJobs, supabaseLoading])

  // Check if user has already applied to this job
  useEffect(() => {
    const checkApplication = async () => {
      if (!user?.id || !jobId) {
        setHasApplied(false)
        return
      }

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sbmwzgtlqmwtbrgdehuw.supabase.co'
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibXd6Z3RscW13dGJyZ2RlaHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDUyMDMsImV4cCI6MjA3ODY4MTIwM30.LaXLtSuHVnY0JbN5YTa-2JlbrN2_cLAbAd6NfXtdyJY'

        const applicantResponse = await fetch(
          `${supabaseUrl}/rest/v1/applicants?user_id=eq.${user.id}&select=id`,
          {
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!applicantResponse.ok) return

        const applicants = await applicantResponse.json()
        if (!applicants?.length) return

        const appResponse = await fetch(
          `${supabaseUrl}/rest/v1/applications?applicant_id=eq.${applicants[0].id}&job_id=eq.${jobId}&select=id`,
          {
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!appResponse.ok) return

        const applications = await appResponse.json()
        setHasApplied(applications?.length > 0)
      } catch (error) {
        setHasApplied(false)
      }
    }

    checkApplication()
  }, [user?.id, jobId])

  const handleApply = () => {
    if (!user) {
      // Show login modal if not logged in
      setShowLoginModal(true)
      return
    }
    // Navigate to application form if logged in
    navigate(`/apply/${jobId}`)
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
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Apply Card */}
              <div className="bg-card-dark border border-secondary rounded-2xl p-6 sticky top-24">
                <h3 className="text-xl font-bold text-white mb-4">Job Details</h3>
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
                {hasApplied ? (
                  <button
                    type="button"
                    disabled
                    className="w-full h-12 rounded-full bg-secondary/50 text-white text-sm font-bold cursor-not-allowed flex items-center justify-center gap-2 opacity-75"
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                    Applied
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApply}
                    className="w-full h-12 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors flex items-center justify-center gap-2"
                  >
                    Apply Now
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
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
        redirectTo={jobId ? `/apply/${jobId}` : null}
      />
    </div>
  )
}

export default JobDetail

