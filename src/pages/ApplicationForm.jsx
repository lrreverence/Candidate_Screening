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
    city: '',
    state: '',
    zip_code: '',
  })

  // Load user email if logged in
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }))
    }
  }, [user])

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
        const { data: existingApplicant } = await supabase
          .from('applicants')
          .select('id')
          .eq('email', formData.email)
          .single()
        
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
              city: formData.city || null,
              state: formData.state || null,
              zip_code: formData.zip_code || null,
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
              city: formData.city || null,
              state: formData.state || null,
              zip_code: formData.zip_code || null,
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
        const { data: existingApp } = await supabase
          .from('applications')
          .select('id')
          .eq('applicant_id', applicantId)
          .eq('job_id', jobId)
          .single()

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
      alert('Failed to save draft. Please try again.')
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

    setLoading(true)
    try {
      // Step 1: Create or update applicant
      let applicantId = null
      
      // Check if applicant exists by email
      const { data: existingApplicant } = await supabase
        .from('applicants')
        .select('id')
        .eq('email', formData.email)
        .single()

      if (existingApplicant) {
        applicantId = existingApplicant.id
        // Update applicant
        const { error: updateError } = await supabase
          .from('applicants')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone_number || null,
            date_of_birth: formData.date_of_birth || null,
            gender: formData.gender || null,
            street_address: formData.street_address || null,
            city: formData.city || null,
            state: formData.state || null,
            zip_code: formData.zip_code || null,
            user_id: user?.id || null
          })
          .eq('id', applicantId)
        
        if (updateError) throw updateError
      } else {
        // Generate reference code
        const { data: refCode, error: refError } = await supabase
          .rpc('generate_reference_code')
        
        let referenceCode = refCode
        if (refError || !refCode) {
          // Fallback reference code
          const year = new Date().getFullYear()
          const timestamp = Date.now().toString().slice(-6)
          referenceCode = `REF-${year}-${timestamp.slice(0, 3)}`
        }

        // Create new applicant
        const { data: newApplicant, error: applicantError } = await supabase
          .from('applicants')
          .insert({
            reference_code: referenceCode,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone_number || null,
            date_of_birth: formData.date_of_birth || null,
            gender: formData.gender || null,
            street_address: formData.street_address || null,
            city: formData.city || null,
            state: formData.state || null,
            zip_code: formData.zip_code || null,
            user_id: user?.id || null,
            status: 'Pending'
          })
          .select()
          .single()
        
        if (applicantError) throw applicantError
        applicantId = newApplicant.id
      }

      // Step 2: Create or update application
      if (applicantId) {
        if (jobId) {
          // Check if application already exists
          const { data: existingApp } = await supabase
            .from('applications')
            .select('id')
            .eq('applicant_id', applicantId)
            .eq('job_id', jobId)
            .single()

          if (existingApp) {
            // Update existing application
            const { error: updateError } = await supabase
              .from('applications')
              .update({
                current_step: 1,
                status: 'Pending'
              })
              .eq('id', existingApp.id)
            
            if (updateError) throw updateError
          } else {
            // Create new application
            const { error: insertError } = await supabase
              .from('applications')
              .insert({
                job_id: jobId,
                applicant_id: applicantId,
                status: 'Pending',
                current_step: 1
              })
            
            if (insertError) throw insertError
          }
        }
      }

      // Navigate to step 2 (Qualifications)
      navigate(`/apply/${jobId || ''}/qualifications`)
    } catch (error) {
      console.error('Error saving application:', error)
      alert('Failed to save application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display transition-colors duration-200">
      {/* Navigation */}
      <header className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#112218]">
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
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
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
        <div className="bg-white dark:bg-[#193324] p-6 rounded-xl border border-gray-200 dark:border-white/5 mb-10 shadow-sm">
          <div className="flex justify-between mb-4 text-sm font-medium">
            <span className="text-primary">Step 1: Personal Info</span>
            <span className="text-gray-400">Step 1 of 4</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-black/30 rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full w-[25%] shadow-[0_0_10px_rgba(43,238,121,0.5)]"></div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white dark:bg-[#193324] rounded-2xl p-6 md:p-10 border border-gray-200 dark:border-white/5 shadow-xl">
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
                  placeholder="(555) 123-4567"
                  type="tel"
                />
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="address">
                Street Address
              </label>
              <input
                className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                id="address"
                name="street_address"
                value={formData.street_address}
                onChange={handleChange}
                placeholder="123 Security Blvd, Apt 4B"
                type="text"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="city">
                  City
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Metropolis"
                  type="text"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="state">
                  State
                </label>
                <div className="relative">
                  <select
                    className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 text-gray-500 dark:text-gray-400 dark:text-white text-base outline-none appearance-none"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                  >
                    <option disabled value="">Select</option>
                    {usStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="zip">
                  Zip Code
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
                  id="zip"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  placeholder="12345"
                  type="text"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 pt-6 mt-8 border-t border-gray-100 dark:border-white/10">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="w-full md:w-auto px-8 py-4 rounded-full border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-10 py-4 rounded-full bg-primary text-background-dark font-bold hover:bg-primary/90 transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(43,238,121,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
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
          <a className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1 mt-1" href="#">
            <span className="material-symbols-outlined text-sm">support_agent</span>
            Contact Support
          </a>
        </div>
      </main>

      <footer className="py-8 border-t border-gray-200 dark:border-white/10 mt-auto bg-white dark:bg-[#112218]">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 E Power Security. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ApplicationForm

