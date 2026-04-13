import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import ApplicationHeader from '../components/application/ApplicationHeader'
import ApplicationBreadcrumbs from '../components/application/ApplicationBreadcrumbs'
import ApplicationProgress from '../components/application/ApplicationProgress'
import IdentitySection from '../components/application/IdentitySection'
import ContactSection from '../components/application/ContactSection'
import ApplicationFooter from '../components/application/ApplicationFooter'
import ApplicationHelp from '../components/application/ApplicationHelp'

const ApplicationForm = () => {
  const MAX_AGE = 65
  const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com']

  const navigate = useNavigate()
  const { jobId } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    name_extension: '',
    date_of_birth: '',
    gender: '',
    email: '',
    phone_number: '',
    phone_number_alt: '',
    street_address: '',
    barangay: '',
    city: '',
    province: '',
    zip_code: '',
    licenses: [],
    height_cm: '',
    weight_kg: '',
    civil_status: '',
    religion: '',
    languages_spoken: [],
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

  const handleLanguagesSpokenChange = (language) => {
    setFormData(prev => ({
      ...prev,
      languages_spoken: Array.isArray(prev.languages_spoken) && prev.languages_spoken.includes(language)
        ? prev.languages_spoken.filter(l => l !== language)
        : [...(Array.isArray(prev.languages_spoken) ? prev.languages_spoken : []), language]
    }))
  }

  const shouldRetryWithoutLanguagesSpoken = (error) => {
    const message = String(error?.message || '').toLowerCase()
    const code = String(error?.code || '')
    return code === '42703' || (message.includes('languages_spoken') && message.includes('does not exist'))
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
        console.log('[APPLICATION] Loading existing personal info for user:', user.id)

        const startTime = Date.now()

        // For persistence: profile/resume reads from applicants; start there.
        const [{ data: applicantRow, error: applicantErr }, { data: profileRow, error: profileErr }] = await Promise.all([
          supabase
            .from('applicants')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle(),
        ])

        const elapsed = Date.now() - startTime
        console.log(`[APPLICATION] Query completed in ${elapsed}ms`, {
          hasApplicant: !!applicantRow,
          hasProfile: !!profileRow,
          applicantError: applicantErr?.message,
          profileError: profileErr?.message,
        })

        if (applicantErr) {
          console.error('[APPLICATION] Error loading applicant row:', applicantErr)
        }
        if (profileErr) {
          console.error('[APPLICATION] Error loading user profile:', profileErr)
        }

        const source = applicantRow || profileRow
        if (source) {
          console.log('[APPLICATION] Hydrating form from:', applicantRow ? 'applicants' : 'users')
          setFormData({
            first_name: source.first_name || '',
            middle_name: source.middle_name || '',
            last_name: source.last_name || '',
            name_extension: source.name_extension || '',
            date_of_birth: source.date_of_birth || '',
            gender: source.gender || '',
            email: source.email || user.email || '',
            phone_number: source.phone || source.phone_number || '',
            phone_number_alt: '',
            street_address: source.street_address || '',
            barangay: source.barangay || '',
            city: source.city || '',
            province: source.province || '',
            zip_code: source.zip_code || '',
            licenses: source.licenses || [],
            height_cm: source.height_cm || '',
            weight_kg: source.weight_kg || '',
            civil_status: source.civil_status || '',
            religion: source.religion || '',
            languages_spoken: source.languages_spoken || [],
          })
        } else {
          console.log('[APPLICATION] No existing rows found, using defaults')
          if (user?.email) setFormData(prev => ({ ...prev, email: user.email }))
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

  const formatPhilippineMobile = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 11)
    const p1 = digits.slice(0, 4) // 09XX
    const p2 = digits.slice(4, 7) // XXX
    const p3 = digits.slice(7, 11) // XXXX
    if (digits.length <= 4) return p1
    if (digits.length <= 7) return `${p1}-${p2}`
    return `${p1}-${p2}-${p3}`
  }

  const isValidPhilippineMobile = (value) => /^09\d{2}-\d{3}-\d{4}$/.test(String(value || ''))

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'phone_number' || name === 'phone_number_alt') {
      setFormData(prev => ({ ...prev, [name]: formatPhilippineMobile(value) }))
      return
    }
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const getAgeFromDOB = (dateOfBirth) => {
    if (!dateOfBirth) return null
    const dob = new Date(dateOfBirth)
    if (Number.isNaN(dob.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1
    return age >= 0 ? age : null
  }

  const isAllowedEmail = (email) => {
    if (!email) return false
    const normalized = String(email).trim().toLowerCase()
    const atIndex = normalized.lastIndexOf('@')
    if (atIndex <= 0) return false
    const domain = normalized.slice(atIndex + 1)
    return ALLOWED_EMAIL_DOMAINS.includes(domain)
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      if (!isAllowedEmail(formData.email)) {
        alert(`Email must end with @gmail.com or @yahoo.com`)
        return
      }

      // Check if applicant exists
      let applicantId = null
      if (user?.id) {
        const { data: existingApplicant, error: checkError } = await supabase
          .from('applicants')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError
        }
        
        if (existingApplicant) {
          applicantId = existingApplicant.id
          // Update applicant
          const updatePayload = {
            first_name: formData.first_name,
            middle_name: formData.middle_name || null,
            last_name: formData.last_name,
            name_extension: formData.name_extension || null,
            email: formData.email,
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
            civil_status: formData.civil_status || null,
            religion: formData.religion || null,
            languages_spoken: formData.languages_spoken || [],
          }

          const { error: updateError } = await supabase
            .from('applicants')
            .update(updatePayload)
            .eq('id', applicantId)

          if (updateError && shouldRetryWithoutLanguagesSpoken(updateError)) {
            const { languages_spoken, ...fallbackPayload } = updatePayload
            const { error: fallbackError } = await supabase
              .from('applicants')
              .update(fallbackPayload)
              .eq('id', applicantId)
            if (fallbackError) throw fallbackError
          } else if (updateError) {
            throw updateError
          }
        } else {
          // Create new applicant with temporary reference code
          const tempRef = `TEMP-${Date.now()}`
          const insertPayload = {
            reference_code: tempRef,
            first_name: formData.first_name,
            middle_name: formData.middle_name || null,
            last_name: formData.last_name,
            name_extension: formData.name_extension || null,
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
            civil_status: formData.civil_status || null,
            religion: formData.religion || null,
            languages_spoken: formData.languages_spoken || [],
            user_id: user.id,
            status: 'PENDING'
          }

          let newApplicant = null
          let applicantError = null

          {
            const { data, error } = await supabase
              .from('applicants')
              .insert(insertPayload)
              .select()
              .single()
            newApplicant = data
            applicantError = error
          }

          if (applicantError && shouldRetryWithoutLanguagesSpoken(applicantError)) {
            const { languages_spoken, ...fallbackPayload } = insertPayload
            const { data, error } = await supabase
              .from('applicants')
              .insert(fallbackPayload)
              .select()
              .single()
            newApplicant = data
            applicantError = error
          }
          
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
              status: 'PENDING'
            })
            .eq('id', existingApp.id)
        } else {
          // Create new application
          await supabase
            .from('applications')
            .insert({
              job_id: jobId,
              applicant_id: applicantId,
              status: 'PENDING',
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

    // Basic validation – Personal Information must include required fields
    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('Please fill in all required fields (First Name, Last Name, Email)')
      return
    }
    if (!isAllowedEmail(formData.email)) {
      alert('Email must end with @gmail.com or @yahoo.com')
      return
    }
    if (!isValidPhilippineMobile(formData.phone_number)) {
      alert('Please enter a valid contact number in the format 09XX-XXX-XXXX.')
      return
    }
    if (formData.phone_number_alt && !isValidPhilippineMobile(formData.phone_number_alt)) {
      alert('Your additional contact number must follow the format 09XX-XXX-XXXX.')
      return
    }
    if (!formData.middle_name || !formData.date_of_birth || !formData.height_cm || !formData.weight_kg || !formData.civil_status || !formData.religion) {
      alert('Please complete Personal Information: Middle Name, Date of Birth, Height, Weight, Status (Civil Status), and Religion are required.')
      return
    }
    const age = getAgeFromDOB(formData.date_of_birth)
    if (typeof age === 'number' && age > MAX_AGE) {
      alert(`Applicants must be ${MAX_AGE} years old or younger.`)
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
            middle_name: formData.middle_name,
            last_name: formData.last_name,
            name_extension: formData.name_extension,
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
            weight_kg: formData.weight_kg,
            civil_status: formData.civil_status,
            religion: formData.religion,
            languages_spoken: formData.languages_spoken
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

      // After saving personal info, return to resume/profile view
      navigate('/profile/resume')
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
      <ApplicationHeader />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        {/*
        <ApplicationBreadcrumbs />

        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Begin Your Career</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Join the elite team at E Power Security. Let's start with your personal details.
          </p>
        </div>

        <ApplicationProgress currentStep={1} totalSteps={4} />
        */}

        {/*
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Begin Your Career</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Join the elite team at E Power Security. Let's start with your personal details.
          </p>
        </div>

        <ApplicationProgress currentStep={1} totalSteps={4} />
        */}

        {/* Main Form Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 md:p-10 border border-gray-200 dark:border-white/5 shadow-xl">
          <form onSubmit={handleNextStep} className="space-y-8">
            <IdentitySection
              formData={formData}
              handleChange={handleChange}
              handleLanguagesSpokenChange={handleLanguagesSpokenChange}
            />
            <ContactSection formData={formData} handleChange={handleChange} />

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 mt-8 border-t border-gray-100 dark:border-white/10">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-10 py-4 rounded-full bg-primary text-background-dark font-bold hover:bg-primary/90 transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (
                  <>
                    Save
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/*
        <ApplicationHelp />
        */}
      </main>

      <ApplicationFooter />
    </div>
  )
}

export default ApplicationForm

