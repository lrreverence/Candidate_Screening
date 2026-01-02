import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ApplicationForm = () => {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    email: '',
    phone_number: '',
    street_address: '',
    barangay: '',
    city: '',
    province: '',
    zip_code: '',
    licenses: [],
    height_cm: '',
    weight_kg: '',
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

  const handleLicenseChange = (licenseId) => {
    setFormData(prev => ({
      ...prev,
      licenses: prev.licenses.includes(licenseId)
        ? prev.licenses.filter(id => id !== licenseId)
        : [...prev.licenses, licenseId]
    }))
  }

  // Load existing applicant data from database
  useEffect(() => {
    console.log('[APPLICATION] useEffect triggered, user:', user?.id)

    const loadExistingData = async () => {
      console.log('[APPLICATION] loadExistingData called')

      if (!user?.id) {
        console.log('[APPLICATION] No user ID, skipping data load')
        return
      }

      console.log('[APPLICATION] User ID exists, proceeding...')
      setLoading(true)

      try {
        console.log('[APPLICATION] Loading existing applicant data for user:', user.id)

        // Skip session check - we already have authenticated user from AuthContext
        console.log('[APPLICATION] Starting applicants query...')
        const startTime = Date.now()

        // Fetch applicant data
        console.log('[APPLICATION] Executing query NOW...')
        const { data: applicant, error } = await supabase
          .from('applicants')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        const elapsed = Date.now() - startTime
        console.log(`[APPLICATION] Query completed in ${elapsed}ms`, {
          hasData: !!applicant,
          error: error?.message,
          applicantId: applicant?.id
        })

        if (error) {
          console.error('[APPLICATION] Error loading applicant:', error)
          // Continue - user can still fill the form
        } else if (applicant) {
          console.log('[APPLICATION] Found existing applicant data:', applicant.id)
          // Populate form with existing data
          setFormData({
            first_name: applicant.first_name || '',
            last_name: applicant.last_name || '',
            date_of_birth: applicant.date_of_birth || '',
            gender: applicant.gender || '',
            email: applicant.email || user.email || '',
            phone_number: applicant.phone || '',
            street_address: applicant.street_address || '',
            barangay: applicant.barangay || '',
            city: applicant.city || '',
            province: applicant.province || '',
            zip_code: applicant.zip_code || '',
            licenses: applicant.licenses || [],
            height_cm: applicant.height_cm || '',
            weight_kg: applicant.weight_kg || '',
          })
        } else {
          console.log('[APPLICATION] No existing applicant found, using defaults')
          // Set email from user
          if (user?.email) {
            setFormData(prev => ({ ...prev, email: user.email }))
          }
        }
      } catch (error) {
        console.error('[APPLICATION] Exception loading applicant:', error)
        // Set email from user as fallback
        if (user?.email) {
          setFormData(prev => ({ ...prev, email: user.email }))
        }
      } finally {
        setLoading(false)
      }
    }

    loadExistingData()
  }, [user?.id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      // Check if applicant exists
      let applicantId = null
      if (user?.id) {
        const { data: existingApplicant, error: checkError } = await supabase
          .from('applicants')
          .select('id')
          .eq('email', formData.email)
          .maybeSingle()
        
        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError
        }
        
        if (existingApplicant) {
          applicantId = existingApplicant.id
          // Update applicant
          await supabase
            .from('applicants')
            .update({
              first_name: formData.first_name,
              last_name: formData.last_name,
              phone: formData.phone_number,
              date_of_birth: formData.date_of_birth || null,
              gender: formData.gender || null,
              street_address: formData.street_address || null,
              barangay: formData.barangay || null,
              city: formData.city || null,
              province: formData.province || null,
              zip_code: formData.zip_code || null,
              licenses: formData.licenses || [],
              height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
              weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
            })
            .eq('id', applicantId)
        } else {
          // Create new applicant with temporary reference code
          const tempRef = `TEMP-${Date.now()}`
          const { data: newApplicant, error: applicantError } = await supabase
            .from('applicants')
            .insert({
              reference_code: tempRef,
              first_name: formData.first_name,
              last_name: formData.last_name,
              email: formData.email,
              phone: formData.phone_number || null,
              date_of_birth: formData.date_of_birth || null,
              gender: formData.gender || null,
              street_address: formData.street_address || null,
              barangay: formData.barangay || null,
              city: formData.city || null,
              province: formData.province || null,
              zip_code: formData.zip_code || null,
              licenses: formData.licenses || [],
              height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
              weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
              user_id: user.id,
              status: 'Pending'
            })
            .select()
            .single()
          
          if (applicantError) throw applicantError
          applicantId = newApplicant.id
        }
      }

      if (applicantId && jobId) {
        // Check if application exists
        const { data: existingApp, error: appCheckError } = await supabase
          .from('applications')
          .select('id')
          .eq('applicant_id', applicantId)
          .eq('job_id', jobId)
          .maybeSingle()

        if (appCheckError && appCheckError.code !== 'PGRST116') {
          throw appCheckError
        }

        if (existingApp) {
          // Update existing application
          await supabase
            .from('applications')
            .update({
              current_step: 1,
              status: 'Pending'
            })
            .eq('id', existingApp.id)
        } else {
          // Create new application
          await supabase
            .from('applications')
            .insert({
              job_id: jobId,
              applicant_id: applicantId,
              status: 'Pending',
              current_step: 1
            })
        }
      }
      
      alert('Draft saved successfully!')
    } catch (error) {
      console.error('Error saving draft:', error)
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred'
      console.error('Error details:', {
        message: errorMessage,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      alert(`Failed to save draft: ${errorMessage}. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  const handleNextStep = async (e) => {
    e.preventDefault()

    // Basic validation
    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('Please fill in all required fields (First Name, Last Name, Email)')
      return
    }

    console.log('[FORM] Starting handleNextStep')
    console.log('[FORM] User:', user)
    console.log('[FORM] JobId:', jobId)
    console.log('[FORM] Form data:', formData)

    setLoading(true)
    try {
      // Get Supabase URL from environment or use default
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sbmwzgtlqmwtbrgdehuw.supabase.co'
      const apiUrl = `${supabaseUrl}/functions/v1/save-applicant`

      console.log('[FORM] Calling API endpoint:', apiUrl)

      // Call the Edge Function API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibXd6Z3RscW13dGJyZ2RlaHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDUyMDMsImV4cCI6MjA3ODY4MTIwM30.LaXLtSuHVnY0JbN5YTa-2JlbrN2_cLAbAd6NfXtdyJY'}`
        },
        body: JSON.stringify({
          formData: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone_number: formData.phone_number,
            date_of_birth: formData.date_of_birth,
            gender: formData.gender,
            street_address: formData.street_address,
            barangay: formData.barangay,
            city: formData.city,
            province: formData.province,
            zip_code: formData.zip_code,
            licenses: formData.licenses,
            height_cm: formData.height_cm,
            weight_kg: formData.weight_kg
          },
          jobId: jobId || null,
          userId: user?.id || null
        })
      })

      console.log('[FORM] API Response status:', response.status)

      const result = await response.json()
      console.log('[FORM] API Response:', result)

      if (!response.ok) {
        throw new Error(result.error || `API error: ${response.status}`)
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to save applicant')
      }

      console.log('[FORM] Success! Applicant ID:', result.applicantId)

      // Navigate to step 2 (Documents)
      console.log('[FORM] Navigating to documents page...')
      navigate(`/apply/${jobId || ''}/documents`)
    } catch (error) {
      console.error('[FORM] Error saving application:', error)
      const errorMessage = error?.message || 'Unknown error occurred'
      console.error('[FORM] Error details:', {
        message: errorMessage,
        error: error
      })
      alert(`Failed to save application: ${errorMessage}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display transition-colors duration-200">
      {/* Navigation */}
      <header className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f172a]">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-background-dark">
              <span className="material-symbols-outlined text-2xl">shield</span>
            </div>
            <span className="text-xl font-bold tracking-tight">E Power Security</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Careers</Link>
            <Link to="/contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
            {user ? (
              <span className="text-sm font-medium text-text-muted">{user.email}</span>
            ) : (
              <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Login</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-2 mb-8 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <Link to="/" className="hover:text-primary transition-colors">Careers</Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-gray-900 dark:text-white font-medium">Application Form</span>
        </div>

        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Begin Your Career</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Join the elite team at E Power Security. Let's start with your personal details.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-200 dark:border-white/5 mb-10 shadow-sm">
          <div className="flex justify-between mb-4 text-sm font-medium">
            <span className="text-primary">Step 1: Personal Info & Qualifications</span>
            <span className="text-gray-400">Step 1 of 3</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-black/30 rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full w-[33%] shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 md:p-10 border border-gray-200 dark:border-white/5 shadow-xl">
          <h2 className="text-xl font-bold mb-8 flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/10">
            <span className="material-symbols-outlined text-primary">person</span>
            Identity Information
          </h2>

          <form onSubmit={handleNextStep} className="space-y-8">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="firstName">
                  First Name
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                  id="firstName"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="e.g. Jonathan"
                  type="text"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                  id="lastName"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="e.g. Doe"
                  type="text"
                  required
                />
              </div>
            </div>

            {/* DOB & Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="dob">
                  Date of Birth
                </label>
                <div className="relative">
                  <input
                    className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none appearance-none [&::-webkit-calendar-picker-indicator]:dark:invert"
                    id="dob"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    type="date"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="gender">
                  Gender
                </label>
                <div className="relative">
                  <select
                    className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 text-gray-500 dark:text-gray-400 dark:text-white text-base outline-none appearance-none"
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option disabled value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Prefer not to say</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold mt-12 mb-6 flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/10">
              <span className="material-symbols-outlined text-primary">contact_mail</span>
              Contact Details
            </h2>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="email">
                  Email Address
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  type="email"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                  id="phone"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="0912 345 6789"
                  type="tel"
                />
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="address">
                House/Unit No., Street Name
              </label>
              <input
                className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                id="address"
                name="street_address"
                value={formData.street_address}
                onChange={handleChange}
                placeholder="e.g. Unit 4B, 123 Main Street"
                type="text"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="barangay">
                Barangay
              </label>
              <input
                className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                id="barangay"
                name="barangay"
                value={formData.barangay}
                onChange={handleChange}
                placeholder="e.g. Barangay 123"
                type="text"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="city">
                  City / Municipality
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Manila"
                  type="text"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="province">
                  Province
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                  id="province"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  placeholder="e.g. Metro Manila"
                  type="text"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="zip">
                Postal Code
              </label>
              <input
                className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                id="zip"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleChange}
                placeholder="e.g. 1000"
                type="text"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 mt-8 border-t border-gray-100 dark:border-white/10">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-10 py-4 rounded-full bg-primary text-background-dark font-bold hover:bg-primary/90 transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (
                  <>
                    Next Step
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help/Info */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Need assistance with your application?</p>
          <Link to="/contact?subject=application-support" className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-sm">support_agent</span>
            Contact Support
          </Link>
        </div>
      </main>

      <footer className="py-8 border-t border-gray-200 dark:border-white/10 mt-auto bg-white dark:bg-[#0f172a]">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 E Power Security. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ApplicationForm

