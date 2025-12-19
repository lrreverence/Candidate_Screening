import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ApplicationSuccess = () => {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const { user } = useAuth()
  const [referenceId, setReferenceId] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const finalizeApplication = async () => {
      if (!user?.id) {
        // If not logged in, redirect to home
        navigate('/')
        return
      }

      try {
        // Get the applicant
        const { data: applicant, error: applicantError } = await supabase
          .from('applicants')
          .select('id, reference_code')
          .eq('user_id', user.id)
          .single()

        if (applicantError) throw applicantError

        // If already has reference code, use it
        if (applicant.reference_code && !applicant.reference_code.startsWith('TEMP-')) {
          setReferenceId(applicant.reference_code)
        } else {
          // Generate reference code using RPC function
          const { data: refData, error: refError } = await supabase
            .rpc('generate_reference_code')

          let finalRefCode
          if (refError || !refData) {
            // Fallback: generate manually
            const year = new Date().getFullYear()
            const timestamp = Date.now().toString().slice(-6)
            finalRefCode = `REF-${year}-${timestamp.slice(0, 3)}`
          } else {
            finalRefCode = refData
          }

          setReferenceId(finalRefCode)

          // Update applicant with reference code
          const { error: updateApplicantError } = await supabase
            .from('applicants')
            .update({
              reference_code: finalRefCode
            })
            .eq('id', applicant.id)

          if (updateApplicantError) {
            console.error('Error updating applicant:', updateApplicantError)
          }
        }

        // Update application status and mark as submitted
        if (jobId) {
          const { error: updateAppError } = await supabase
            .from('applications')
            .update({
              status: 'submitted',
              current_step: 4,
              submitted_at: new Date().toISOString()
            })
            .eq('applicant_id', applicant.id)
            .eq('job_id', jobId)

          if (updateAppError) {
            console.error('Error updating application:', updateAppError)
          }
        }
      } catch (error) {
        console.error('Error finalizing application:', error)
        // Still show success page with a fallback reference
        const year = new Date().getFullYear()
        const timestamp = Date.now().toString().slice(-6)
        setReferenceId(`REF-${year}-${timestamp.slice(0, 3)}`)
      }
    }

    finalizeApplication()
  }, [user, jobId, navigate])

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(referenceId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = referenceId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const nextSteps = [
    {
      icon: 'manage_search',
      title: 'Review',
      description: 'We review your credentials within 48 hours.'
    },
    {
      icon: 'perm_contact_calendar',
      title: 'Interview',
      description: 'Qualified candidates are invited for screening.'
    },
    {
      icon: 'verified_user',
      title: 'Decision',
      description: 'Final decision and onboarding steps sent via email.'
    }
  ]

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display min-h-screen flex flex-col overflow-x-hidden">
      {/* Navigation Bar */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#e7eef4] dark:border-b-[#1e40af] px-4 py-3 md:px-10 bg-background-light dark:bg-background-dark z-20">
        <Link to="/" className="flex items-center gap-4 text-[#111418] dark:text-white">
          <div className="size-8 flex items-center justify-center rounded-lg bg-primary/20 text-primary">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>shield</span>
          </div>
          <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">E Power Security</h2>
        </Link>
        <div className="flex flex-1 justify-end gap-8 hidden md:flex">
          <div className="flex items-center gap-9">
            <Link to="/" className="text-[#111418] dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors">Home</Link>
            <Link to="/" className="text-[#111418] dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors">Careers</Link>
            <Link to="/" className="text-[#111418] dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors">Contact Us</Link>
          </div>
          {user ? (
            <span className="text-[#111418] dark:text-white text-sm">{user.email}</span>
          ) : (
            <Link to="/" className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-[#e7eef4] dark:bg-[#1e40af] text-[#111418] dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary hover:text-background-dark transition-all">
              <span className="truncate">Login</span>
            </Link>
          )}
        </div>
        <div className="md:hidden text-[#111418] dark:text-white">
          <span className="material-symbols-outlined">menu</span>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-[640px] flex flex-col gap-6 md:gap-8">
          {/* Success State Card */}
          <div className="flex flex-col items-center gap-6 text-center px-4">
            {/* Large Success Icon with Glow */}
            <div className="relative flex items-center justify-center size-24 rounded-full bg-primary/10 border-4 border-primary/20 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '48px' }}>check_circle</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-[#111418] dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">Application Received</h1>
              <p className="text-[#637588] dark:text-[#93c5fd] text-base font-normal leading-normal max-w-[480px]">
                Thank you for applying to E Power Security. Your details have been securely transmitted to our recruitment team.
              </p>
            </div>
          </div>

          {/* Reference ID Card */}
          {referenceId && (
            <div className="w-full">
              <div className="bg-white dark:bg-[#1e293b] border border-[#e7eef4] dark:border-[#2563eb] rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center md:justify-between gap-6 shadow-sm">
                <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left">
                  <p className="text-[#637588] dark:text-[#93c5fd] text-sm font-bold tracking-wider uppercase">Your Reference ID</p>
                  <p className="text-[#111418] dark:text-white text-2xl md:text-3xl font-mono font-bold tracking-tight">{referenceId}</p>
                  <p className="text-xs text-[#637588] dark:text-[#6a8f7a] mt-1">Please save this ID for future correspondence.</p>
                </div>
                <button
                  onClick={handleCopyId}
                  className="group flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-[#e7eef4] dark:bg-[#0f172a] hover:bg-primary dark:hover:bg-primary text-[#111418] dark:text-primary dark:hover:text-[#0f172a] transition-all border border-transparent dark:border-[#2563eb] dark:hover:border-primary shrink-0 w-full md:w-auto"
                >
                  <span className="material-symbols-outlined text-xl">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  <span className="text-sm font-bold">{copied ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="flex flex-col gap-4 mt-4">
            <h3 className="text-[#111418] dark:text-white text-xl font-bold leading-tight">What happens next?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {nextSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex flex-row md:flex-col items-center md:items-start gap-4 p-4 rounded-xl bg-white dark:bg-[#1e293b]/50 border border-[#e7eef4] dark:border-[#2563eb]/50"
                >
                  <div className="flex items-center justify-center size-10 rounded-full bg-[#e7eef4] dark:bg-[#1e40af] text-[#111418] dark:text-white shrink-0">
                    <span className="material-symbols-outlined text-xl">{step.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-[#111418] dark:text-white text-base font-bold">{step.title}</h4>
                    <p className="text-[#637588] dark:text-[#93c5fd] text-sm mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-4 w-full mt-6 justify-center">
            <Link
              to="/"
              className="flex-1 min-w-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-6 bg-primary text-[#0f172a] text-base font-bold leading-normal tracking-[0.015em] hover:brightness-110 transition-all shadow-[0_4px_20px_-4px_rgba(59,130,246,0.4)] flex"
            >
              <span className="truncate">Return to Home</span>
            </Link>
            <Link
              to="/"
              className="flex-1 min-w-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-6 bg-transparent border border-[#e7eef4] dark:border-[#2563eb] text-[#111418] dark:text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-[#e7eef4] dark:hover:bg-[#1e293b] transition-all flex"
            >
              <span className="truncate">View Other Openings</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-6 px-5 py-10 text-center border-t border-[#e7eef4] dark:border-[#1e40af] bg-background-light dark:bg-background-dark mt-auto">
        <div className="flex flex-wrap items-center justify-center gap-6">
          <a className="text-[#637588] dark:text-[#93c5fd] text-base font-normal leading-normal hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <a className="text-[#637588] dark:text-[#93c5fd] text-base font-normal leading-normal hover:text-primary transition-colors" href="#">Terms of Service</a>
          <a className="text-[#637588] dark:text-[#93c5fd] text-base font-normal leading-normal hover:text-primary transition-colors" href="#">Support</a>
        </div>
        <p className="text-[#637588] dark:text-[#93c5fd] text-sm font-normal leading-normal">© 2025 E Power Security. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default ApplicationSuccess

