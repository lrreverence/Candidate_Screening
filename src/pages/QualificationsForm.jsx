import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const QualificationsForm = () => {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    licenses: [],
    height_cm: '',
    weight_kg: ''
  })

  const licenseOptions = [
    { id: 'psa_birth_certificate', label: 'PSA Birth Certificate', subtitle: 'Philippine Statistics Authority' },
    { id: 'nbi_clearance', label: 'NBI Clearance', subtitle: 'National Bureau of Investigation' },
    { id: 'sss_id', label: 'SSS ID / E-1 Form', subtitle: 'Social Security System' },
    { id: 'philhealth_id', label: 'PhilHealth ID', subtitle: 'Philippine Health Insurance Corporation' },
    { id: 'pagibig_id', label: 'Pag-IBIG ID', subtitle: 'Home Development Mutual Fund' },
    { id: 'tin_id', label: 'TIN ID', subtitle: 'Tax Identification Number' },
    { id: 'drivers_license', label: "Driver's License", subtitle: 'Land Transportation Office (LTO)' },
    { id: 'first_aid', label: 'First Aid Certificate', subtitle: 'BLS/CPR Training' },
    { id: 'security_guard_license', label: 'Security Guard License', subtitle: 'PASCO / PNP Security Agency' }
  ]

  // Load existing data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(`application_qualifications_${jobId || 'general'}`)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setFormData(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error('Error loading saved qualifications:', e)
      }
    }
  }, [jobId])

  // Note: We don't save to localStorage anymore - data is saved directly to Supabase on submit

  const handleLicenseChange = (licenseId) => {
    setFormData(prev => ({
      ...prev,
      licenses: prev.licenses.includes(licenseId)
        ? prev.licenses.filter(id => id !== licenseId)
        : [...prev.licenses, licenseId]
    }))
  }

  const handleBack = () => {
    navigate(`/apply/${jobId || ''}`)
  }

  const handleNext = async (e) => {
    e.preventDefault()

    /**
     * This form saves data directly to Supabase (NOT localStorage):
     * 1. applicants table - licenses (jsonb), height_cm (integer), weight_kg (integer)
     * 2. applications table - current_step (integer) = 2
     * 
     * Note: Document uploads are handled separately in Step 3 (DocumentUploadForm.jsx)
     * This form only handles qualifications: licenses, height, and weight.
     */

    console.log('[QUALIFICATIONS] ===== FORM SUBMIT START =====')
    console.log('[QUALIFICATIONS] Form data:', {
      licenses: formData.licenses,
      height_cm: formData.height_cm,
      weight_kg: formData.weight_kg
    })

    setLoading(true)

    try {
      // Step 1: Find applicant with timeout
      console.log('[QUALIFICATIONS] Step 1: Finding applicant...')
      console.log('[QUALIFICATIONS] User ID:', user?.id)
      
      if (!user?.id) {
        throw new Error('User not authenticated. Please log in and try again.')
      }

      let applicantId = null
      
      console.log('[QUALIFICATIONS] Querying applicants table...')
      console.log('[QUALIFICATIONS] User ID for query:', user.id)
      
      // Simple direct query with timeout
      let applicant = null
      let findError = null
      
      try {
        console.log('[QUALIFICATIONS] Executing query...')
        
        // Create query
        const query = supabase
          .from('applicants')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        // Create timeout
        const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout after 8 seconds')), 8000)
        })

        // Race them
        const { data, error } = await Promise.race([query, timeout])
        
        applicant = data
        findError = error
        
        console.log('[QUALIFICATIONS] Query completed:', { 
          hasData: !!applicant, 
          hasError: !!findError,
          applicantId: applicant?.id 
        })
      } catch (error) {
        console.error('[QUALIFICATIONS] Query error:', error)
        if (error.message.includes('timeout')) {
          // Try email fallback on timeout
          if (user?.email) {
            console.log('[QUALIFICATIONS] Query timed out, trying email fallback...')
            try {
              const emailQuery = supabase
                .from('applicants')
                .select('id')
                .eq('email', user.email)
                .maybeSingle()
              
              const emailTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Email query timeout')), 8000)
              })
              
              const { data: emailData, error: emailError } = await Promise.race([emailQuery, emailTimeout])
              
              if (!emailError && emailData) {
                console.log('[QUALIFICATIONS] Found by email:', emailData.id)
                applicant = emailData
                findError = null
              } else {
                findError = emailError || error
              }
            } catch (e) {
              findError = error // Use original timeout error
            }
          } else {
            findError = error
          }
        } else {
          findError = error
        }
      }

      if (findError) {
        console.error('[QUALIFICATIONS] Error finding applicant:', findError)
        const errorMsg = findError.message || 'Unknown error'
        throw new Error(`Failed to find applicant: ${errorMsg}. Please ensure you completed Step 1 first.`)
      }

      if (!applicant || !applicant.id) {
        console.warn('[QUALIFICATIONS] No applicant found for user:', user.id)
        alert('Please complete Step 1 (Personal Information) first')
        navigate(`/apply/${jobId || ''}`)
        return
      }

      applicantId = applicant.id
      console.log('[QUALIFICATIONS] Found applicant ID:', applicantId)

      // Step 2: Update applicant with qualifications
      console.log('[QUALIFICATIONS] Step 2: Updating applicant qualifications...')
      const updateData = {
        licenses: formData.licenses,
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null
      }

      console.log('[QUALIFICATIONS] Update data:', updateData)

      const { error: applicantError } = await supabase
        .from('applicants')
        .update(updateData)
        .eq('id', applicantId)

      console.log('[QUALIFICATIONS] Applicant update result:', { applicantError })

      if (applicantError) {
        throw new Error(`Failed to update qualifications: ${applicantError.message}`)
      }

      // Step 3: Update application progress
      if (jobId) {
        console.log('[QUALIFICATIONS] Step 3: Updating application progress...')
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(jobId)) {
          const { error: appError } = await supabase
            .from('applications')
            .update({ current_step: 2 })
            .eq('applicant_id', applicantId)
            .eq('job_id', jobId)

          console.log('[QUALIFICATIONS] Application update result:', { appError })

          if (appError) {
            console.warn('[QUALIFICATIONS] Could not update application step:', appError)
          }
        } else {
          console.log('[QUALIFICATIONS] JobId is not a UUID, skipping application update')
        }
      }

      console.log('[QUALIFICATIONS] ===== FORM SUBMIT SUCCESS =====')
      console.log('[QUALIFICATIONS] Navigating to documents page...')

      // Navigate to next step (documents upload)
      navigate(`/apply/${jobId || ''}/documents`)
    } catch (error) {
      console.error('[QUALIFICATIONS] ===== FORM SUBMIT ERROR =====')
      console.error('[QUALIFICATIONS] Error details:', error)
      alert(`Failed to save: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen flex flex-col overflow-x-hidden">
      {/* Top Navigation */}
      <div className="w-full bg-background-light dark:bg-background-dark border-b border-gray-200 dark:border-[#1e40af]">
        <header className="flex items-center justify-between whitespace-nowrap px-6 lg:px-10 py-4 max-w-7xl mx-auto w-full">
          <Link to="/" className="flex items-center gap-4 text-slate-900 dark:text-white">
            <div className="size-8 text-primary">
              <span className="material-symbols-outlined text-4xl">shield_person</span>
            </div>
            <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight">E Power Security</h2>
          </Link>
          <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
            <div className="flex items-center gap-9">
              <Link to="/" className="text-slate-600 dark:text-gray-300 text-sm font-medium hover:text-primary transition-colors">Home</Link>
              <Link to="/" className="text-slate-600 dark:text-gray-300 text-sm font-medium hover:text-primary transition-colors">Jobs</Link>
              <Link to="/contact" className="text-slate-600 dark:text-gray-300 text-sm font-medium hover:text-primary transition-colors">Contact</Link>
            </div>
            {user ? (
              <span className="text-slate-600 dark:text-gray-300 text-sm">{user.email}</span>
            ) : (
              <Link to="/" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-primary text-[#0f172a] text-sm font-bold leading-normal hover:bg-blue-400 transition-colors">
                <span className="truncate">Login</span>
              </Link>
            )}
          </div>
        </header>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-start py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[960px] flex flex-col gap-8">
          {/* Progress Bar Section */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-6 justify-between items-end">
              <div>
                <p className="text-slate-900 dark:text-white text-lg font-bold leading-normal">Application Progress</p>
                <p className="text-slate-500 dark:text-[#93c5fd] text-sm font-normal">Step 2 of 4: Qualifications</p>
              </div>
              <span className="material-symbols-outlined text-primary text-3xl">verified</span>
            </div>
            <div className="rounded-full bg-gray-200 dark:bg-[#2563eb] h-3 overflow-hidden">
              <div className="h-full rounded-full bg-primary relative w-1/2">
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Page Heading */}
          <div className="flex flex-col gap-2 pt-4">
            <h1 className="text-slate-900 dark:text-white text-3xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
              Qualifications & Licenses
            </h1>
            <p className="text-slate-600 dark:text-[#93c5fd] text-base md:text-lg font-normal leading-relaxed max-w-2xl">
              Please provide details about your certifications and physical attributes to ensure you match the requirements for our security positions.
            </p>
          </div>

          <form onSubmit={handleNext} className="flex flex-col gap-8">
            {/* Licenses Checklist */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#2563eb]">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">badge</span>
                Select Valid Licenses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {licenseOptions.map((license) => (
                  <label
                    key={license.id}
                    className={`group relative flex items-center gap-4 p-4 rounded-xl border ${
                      formData.licenses.includes(license.id)
                        ? 'border-primary dark:border-primary bg-primary/10'
                        : 'border-gray-200 dark:border-[#2563eb] bg-background-light dark:bg-[#0f172a]'
                    } hover:border-primary dark:hover:border-primary cursor-pointer transition-all`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.licenses.includes(license.id)}
                      onChange={() => handleLicenseChange(license.id)}
                      className="h-6 w-6 rounded border-gray-400 dark:border-[#2563eb] text-primary focus:ring-primary/50 focus:ring-offset-0 bg-transparent transition-colors"
                    />
                    <div className="flex flex-col">
                      <span className="text-slate-900 dark:text-white font-medium">{license.label}</span>
                      <span className="text-slate-500 dark:text-[#93c5fd] text-xs">{license.subtitle}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Physical Attributes Section */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#2563eb]">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">accessibility_new</span>
                Physical Attributes
              </h3>
              <div className="flex flex-col md:flex-row gap-6">
                <label className="flex flex-col w-full md:w-1/2 group">
                  <p className="text-slate-900 dark:text-white text-base font-medium leading-normal pb-2 flex justify-between">
                    Height
                    <span className="text-slate-500 dark:text-[#93c5fd] text-sm font-normal">in cm</span>
                  </p>
                  <div className="relative">
                    <input
                      className="form-input flex w-full rounded-full text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-[#2563eb] bg-background-light dark:bg-[#1e293b] h-14 placeholder:text-slate-400 dark:placeholder:text-[#93c5fd]/50 px-6 text-base font-normal leading-normal transition-shadow"
                      placeholder="180"
                      type="number"
                      value={formData.height_cm}
                      onChange={(e) => setFormData(prev => ({ ...prev, height_cm: e.target.value }))}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                      <span className="material-symbols-outlined">height</span>
                    </div>
                  </div>
                </label>
                <label className="flex flex-col w-full md:w-1/2 group">
                  <p className="text-slate-900 dark:text-white text-base font-medium leading-normal pb-2 flex justify-between">
                    Weight
                    <span className="text-slate-500 dark:text-[#93c5fd] text-sm font-normal">in kg</span>
                  </p>
                  <div className="relative">
                    <input
                      className="form-input flex w-full rounded-full text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-[#2563eb] bg-background-light dark:bg-[#1e293b] h-14 placeholder:text-slate-400 dark:placeholder:text-[#93c5fd]/50 px-6 text-base font-normal leading-normal transition-shadow"
                      placeholder="85"
                      type="number"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                      <span className="material-symbols-outlined">monitor_weight</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="flex justify-between items-center pt-6 pb-20">
              <button
                type="button"
                onClick={handleBack}
                className="group flex items-center gap-2 px-6 py-3 rounded-full border border-gray-300 dark:border-[#2563eb] text-slate-700 dark:text-white font-bold hover:bg-gray-100 dark:hover:bg-[#1e293b] transition-all"
              >
                <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">arrow_back</span>
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="group flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-[#0f172a] font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:bg-[#2563eb] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Next Step'}
                <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default QualificationsForm

