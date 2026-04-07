import React, { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const SECURITY_LICENSE_CATEGORIES = [
  'Security Guard',
  'Security Officer',
  'Protection Agent',
  'Bank and Armor',
  "Security Manager's License",
  'Others'
]

const File201Form = () => {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    // A. Security License
    hasSecurityLicense: '',
    securityLicenseCategory: '',
    securityLicenseNumber: '',
    securityLicenseExpiration: '',
    securityLicenseFile: null,
    // B. NBI Clearance
    hasNBIClearance: '',
    nbiClearanceExpiration: '',
    nbiClearanceFile: null,
    // C. Police Clearance
    hasPoliceClearance: '',
    policeClearanceExpiration: '',
    policeClearanceFile: null,
    // D. Drug Test (always required)
    drugTestDate: '',
    drugTestFile: null,
    // E. Neuro Test (always required)
    neuroTestDate: '',
    neuroTestFile: null,
    // F. COVID-19 Vaccination
    isVaccinatedCovid: '',
    vaccinationCardFile: null, // optional when Yes
    covidNotVaccinatedReason: '',
    // G. Driver's License
    hasDriversLicense: '',
    driversLicenseNumber: '',
    driversLicenseExpiration: '',
    driversLicenseFile: null
  })

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  const handleFileChange = (field, e) => {
    const file = e.target.files?.[0] || null
    update(field, file)
  }

  /** Returns true only when all required questions are answered and conditional fields are filled. */
  const isFormComplete = () => {
    // A. Security License — must answer; if Yes, all sub-fields required
    if (formData.hasSecurityLicense !== 'Yes' && formData.hasSecurityLicense !== 'No') return false
    if (formData.hasSecurityLicense === 'Yes') {
      if (!formData.securityLicenseCategory?.trim()) return false
      if (!formData.securityLicenseNumber?.trim()) return false
      if (!formData.securityLicenseExpiration?.trim()) return false
      if (!formData.securityLicenseFile) return false
    }

    // B. NBI Clearance
    if (formData.hasNBIClearance !== 'Yes' && formData.hasNBIClearance !== 'No') return false
    if (formData.hasNBIClearance === 'Yes') {
      if (!formData.nbiClearanceExpiration?.trim()) return false
      if (!formData.nbiClearanceFile) return false
    }

    // C. Police Clearance
    if (formData.hasPoliceClearance !== 'Yes' && formData.hasPoliceClearance !== 'No') return false
    if (formData.hasPoliceClearance === 'Yes') {
      if (!formData.policeClearanceExpiration?.trim()) return false
      if (!formData.policeClearanceFile) return false
    }

    // D. Drug Test (always required)
    if (!formData.drugTestDate?.trim()) return false
    if (!formData.drugTestFile) return false

    // E. Neuro Test (always required)
    if (!formData.neuroTestDate?.trim()) return false
    if (!formData.neuroTestFile) return false

    // F. COVID-19
    if (formData.isVaccinatedCovid !== 'Yes' && formData.isVaccinatedCovid !== 'No') return false
    if (formData.isVaccinatedCovid === 'No') {
      if (!formData.covidNotVaccinatedReason?.trim()) return false
    }

    // G. Driver's License
    if (formData.hasDriversLicense !== 'Yes' && formData.hasDriversLicense !== 'No') return false
    if (formData.hasDriversLicense === 'Yes') {
      if (!formData.driversLicenseNumber?.trim()) return false
      if (!formData.driversLicenseExpiration?.trim()) return false
      if (!formData.driversLicenseFile) return false
    }

    return true
  }

  const validate = () => {
    const newErrors = {}

    // A. Security License
    if (formData.hasSecurityLicense === 'Yes') {
      if (!formData.securityLicenseCategory?.trim()) newErrors.securityLicenseCategory = 'Required'
      if (!formData.securityLicenseNumber?.trim()) newErrors.securityLicenseNumber = 'Required'
      if (!formData.securityLicenseExpiration?.trim()) newErrors.securityLicenseExpiration = 'Required'
      if (!formData.securityLicenseFile) newErrors.securityLicenseFile = 'Please upload a copy'
    }

    // B. NBI Clearance
    if (formData.hasNBIClearance === 'Yes') {
      if (!formData.nbiClearanceExpiration?.trim()) newErrors.nbiClearanceExpiration = 'Required'
      if (!formData.nbiClearanceFile) newErrors.nbiClearanceFile = 'Please upload a copy'
    }

    // C. Police Clearance
    if (formData.hasPoliceClearance === 'Yes') {
      if (!formData.policeClearanceExpiration?.trim()) newErrors.policeClearanceExpiration = 'Required'
      if (!formData.policeClearanceFile) newErrors.policeClearanceFile = 'Please upload a copy'
    }

    // D. Drug Test (always required)
    if (!formData.drugTestDate?.trim()) newErrors.drugTestDate = 'Required'
    if (!formData.drugTestFile) newErrors.drugTestFile = 'Please upload Drug Test result'

    // E. Neuro Test (always required)
    if (!formData.neuroTestDate?.trim()) newErrors.neuroTestDate = 'Required'
    if (!formData.neuroTestFile) newErrors.neuroTestFile = 'Please upload Neuro Test result'

    // F. COVID-19
    if (formData.isVaccinatedCovid === 'No') {
      if (!formData.covidNotVaccinatedReason?.trim()) newErrors.covidNotVaccinatedReason = 'Please specify the reason'
    }

    // G. Driver's License
    if (formData.hasDriversLicense === 'Yes') {
      if (!formData.driversLicenseNumber?.trim()) newErrors.driversLicenseNumber = 'Required'
      if (!formData.driversLicenseExpiration?.trim()) newErrors.driversLicenseExpiration = 'Required'
      if (!formData.driversLicenseFile) newErrors.driversLicenseFile = 'Please upload a copy'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (!user?.id) {
        alert('Please log in to continue.')
        return
      }
      const { data: applicant, error: applicantError } = await supabase
        .from('applicants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (applicantError || !applicant) {
        alert('Please complete previous steps first.')
        navigate(`/profile/personalinformation/${jobId || ''}`)
        return
      }
      // TODO: Persist 201 file data to Supabase (e.g. applicant_201_file table or applicants JSONB)
      console.log('[201_FILE] Form data:', formData, 'applicantId:', applicant.id)
      // Build serializable 201 file data (no File objects)
      const file201Payload = {
        hasSecurityLicense: formData.hasSecurityLicense,
        securityLicenseCategory: formData.securityLicenseCategory,
        securityLicenseNumber: formData.securityLicenseNumber,
        securityLicenseExpiration: formData.securityLicenseExpiration,
        hasNBIClearance: formData.hasNBIClearance,
        nbiClearanceExpiration: formData.nbiClearanceExpiration,
        hasPoliceClearance: formData.hasPoliceClearance,
        policeClearanceExpiration: formData.policeClearanceExpiration,
        drugTestDate: formData.drugTestDate,
        neuroTestDate: formData.neuroTestDate,
        isVaccinatedCovid: formData.isVaccinatedCovid,
        covidNotVaccinatedReason: formData.covidNotVaccinatedReason,
        hasDriversLicense: formData.hasDriversLicense,
        driversLicenseNumber: formData.driversLicenseNumber,
        driversLicenseExpiration: formData.driversLicenseExpiration
      }
      await supabase
        .from('applicants')
        .update({ file_201_data: file201Payload })
        .eq('id', applicant.id)

      if (jobId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(jobId)) {
          await supabase
            .from('applications')
            .update({ current_step: 3 })
            .eq('applicant_id', applicant.id)
            .eq('job_id', jobId)
        }
      }
      navigate(`/apply/${jobId || ''}/documents`)
    } catch (err) {
      console.error(err)
      alert('Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate(`/apply/${jobId || ''}/work-experience`)
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen flex flex-col overflow-x-hidden">
      <div className="w-full bg-background-light dark:bg-background-dark border-b border-gray-200 dark:border-[#1e40af]">
        <header className="flex items-center justify-between whitespace-nowrap px-6 lg:px-10 py-4 max-w-7xl mx-auto w-full">
          <Link to="/" className="flex items-center gap-4 text-slate-900 dark:text-white">
            <div className="size-8 text-primary">
              <span className="material-symbols-outlined text-4xl">shield_person</span>
            </div>
            <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight">E Power Security</h2>
          </Link>
          <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
            {user && <span className="text-slate-600 dark:text-gray-300 text-sm">{user.email}</span>}
          </div>
        </header>
      </div>

      <main className="flex-grow flex flex-col items-center justify-start py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[960px] flex flex-col gap-8">
          {/* Progress Bar Section */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-6 justify-between items-end">
              <div>
                <p className="text-slate-900 dark:text-white text-lg font-bold leading-normal">Application Progress</p>
                <p className="text-green-700 dark:text-green-300 text-sm font-normal">Step 3 of 5: 201 File</p>
              </div>
              <span className="material-symbols-outlined text-green-500 text-3xl">folder</span>
            </div>
            <div className="rounded-full bg-gray-200 dark:bg-slate-700 h-3 overflow-hidden">
              <div className="h-full rounded-full bg-green-500 dark:bg-green-500 relative w-3/5">
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <h1 className="text-slate-900 dark:text-white text-3xl md:text-5xl font-black leading-tight tracking-[-0.033em] tracking-tight">
              201 File Capturing Form
            </h1>
            <p className="text-slate-600 dark:text-[#93c5fd] text-base font-normal leading-relaxed">
              Answer each question first. Additional fields will appear based on your answers.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {/* A. Security License */}
            <section className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#2563eb]">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">badge</span>
                A. Security License
              </h3>
              <p className="text-slate-700 dark:text-gray-300 font-medium mb-3">Do you have a Security License Number?</p>
              <div className="flex gap-6 mb-4">
                {['Yes', 'No'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasSecurityLicense"
                      value={opt}
                      checked={formData.hasSecurityLicense === opt}
                      onChange={() => update('hasSecurityLicense', opt)}
                      className="w-5 h-5 text-primary border-gray-400 focus:ring-primary"
                    />
                    <span className="text-slate-900 dark:text-white">{opt}</span>
                  </label>
                ))}
              </div>
              {formData.hasSecurityLicense === 'Yes' && (
                <div className="mt-6 space-y-4 pl-2 border-l-2 border-primary/30">
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Security License Category *</label>
                    <select
                      value={formData.securityLicenseCategory}
                      onChange={(e) => update('securityLicenseCategory', e.target.value)}
                      className={`w-full max-w-md rounded-lg border bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 ${errors.securityLicenseCategory ? 'border-red-500' : 'border-gray-300 dark:border-[#2563eb]'}`}
                    >
                      <option value="">Select category</option>
                      {SECURITY_LICENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {errors.securityLicenseCategory && <p className="text-red-500 text-sm mt-1">{errors.securityLicenseCategory}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Security License Number *</label>
                    <input
                      type="text"
                      value={formData.securityLicenseNumber}
                      onChange={(e) => update('securityLicenseNumber', e.target.value)}
                      className={`w-full max-w-md rounded-lg border bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 ${errors.securityLicenseNumber ? 'border-red-500' : 'border-gray-300 dark:border-[#2563eb]'}`}
                      placeholder="e.g. SL-XXXX"
                    />
                    {errors.securityLicenseNumber && <p className="text-red-500 text-sm mt-1">{errors.securityLicenseNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Security License Expiration Date *</label>
                    <input
                      type="date"
                      value={formData.securityLicenseExpiration}
                      onChange={(e) => update('securityLicenseExpiration', e.target.value)}
                      className={`w-full max-w-md rounded-lg border bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 ${errors.securityLicenseExpiration ? 'border-red-500' : 'border-gray-300 dark:border-[#2563eb]'}`}
                    />
                    {errors.securityLicenseExpiration && <p className="text-red-500 text-sm mt-1">{errors.securityLicenseExpiration}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Upload copy of Security License *</label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange('securityLicenseFile', e)}
                      className={`w-full max-w-md text-sm text-slate-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-[#0f172a] file:font-bold ${errors.securityLicenseFile ? 'border border-red-500 rounded-lg' : ''}`}
                    />
                    {formData.securityLicenseFile && <p className="text-green-600 dark:text-green-400 text-sm mt-1">{formData.securityLicenseFile.name}</p>}
                    {errors.securityLicenseFile && <p className="text-red-500 text-sm mt-1">{errors.securityLicenseFile}</p>}
                  </div>
                </div>
              )}
            </section>

            {/* B. NBI Clearance */}
            <section className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#2563eb]">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                B. NBI Clearance
              </h3>
              <p className="text-slate-700 dark:text-gray-300 font-medium mb-3">Do you have an NBI Clearance?</p>
              <div className="flex gap-6 mb-4">
                {['Yes', 'No'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasNBIClearance"
                      value={opt}
                      checked={formData.hasNBIClearance === opt}
                      onChange={() => update('hasNBIClearance', opt)}
                      className="w-5 h-5 text-primary border-gray-400 focus:ring-primary"
                    />
                    <span className="text-slate-900 dark:text-white">{opt}</span>
                  </label>
                ))}
              </div>
              {formData.hasNBIClearance === 'Yes' && (
                <div className="mt-6 space-y-4 pl-2 border-l-2 border-primary/30">
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Expiration Date of NBI Clearance *</label>
                    <input
                      type="date"
                      value={formData.nbiClearanceExpiration}
                      onChange={(e) => update('nbiClearanceExpiration', e.target.value)}
                      className={`w-full max-w-md rounded-lg border bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 ${errors.nbiClearanceExpiration ? 'border-red-500' : 'border-gray-300 dark:border-[#2563eb]'}`}
                    />
                    {errors.nbiClearanceExpiration && <p className="text-red-500 text-sm mt-1">{errors.nbiClearanceExpiration}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Upload copy of NBI Clearance *</label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange('nbiClearanceFile', e)}
                      className={`w-full max-w-md text-sm text-slate-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-[#0f172a] file:font-bold ${errors.nbiClearanceFile ? 'border border-red-500 rounded-lg' : ''}`}
                    />
                    {formData.nbiClearanceFile && <p className="text-green-600 dark:text-green-400 text-sm mt-1">{formData.nbiClearanceFile.name}</p>}
                    {errors.nbiClearanceFile && <p className="text-red-500 text-sm mt-1">{errors.nbiClearanceFile}</p>}
                  </div>
                </div>
              )}
            </section>

            {/* C. Police Clearance */}
            <section className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#2563eb]">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">gavel</span>
                C. Police Clearance
              </h3>
              <p className="text-slate-700 dark:text-gray-300 font-medium mb-3">Do you have a Police Clearance?</p>
              <div className="flex gap-6 mb-4">
                {['Yes', 'No'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasPoliceClearance"
                      value={opt}
                      checked={formData.hasPoliceClearance === opt}
                      onChange={() => update('hasPoliceClearance', opt)}
                      className="w-5 h-5 text-primary border-gray-400 focus:ring-primary"
                    />
                    <span className="text-slate-900 dark:text-white">{opt}</span>
                  </label>
                ))}
              </div>
              {formData.hasPoliceClearance === 'Yes' && (
                <div className="mt-6 space-y-4 pl-2 border-l-2 border-primary/30">
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Expiration Date of Police Clearance *</label>
                    <input
                      type="date"
                      value={formData.policeClearanceExpiration}
                      onChange={(e) => update('policeClearanceExpiration', e.target.value)}
                      className={`w-full max-w-md rounded-lg border bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 ${errors.policeClearanceExpiration ? 'border-red-500' : 'border-gray-300 dark:border-[#2563eb]'}`}
                    />
                    {errors.policeClearanceExpiration && <p className="text-red-500 text-sm mt-1">{errors.policeClearanceExpiration}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Upload copy of Police Clearance *</label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange('policeClearanceFile', e)}
                      className={`w-full max-w-md text-sm text-slate-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-[#0f172a] file:font-bold ${errors.policeClearanceFile ? 'border border-red-500 rounded-lg' : ''}`}
                    />
                    {formData.policeClearanceFile && <p className="text-green-600 dark:text-green-400 text-sm mt-1">{formData.policeClearanceFile.name}</p>}
                    {errors.policeClearanceFile && <p className="text-red-500 text-sm mt-1">{errors.policeClearanceFile}</p>}
                  </div>
                </div>
              )}
            </section>

            {/* D. Drug Test - always required */}
            <section className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#2563eb]">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">science</span>
                D. Drug Test
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Drug Test Date *</label>
                  <input
                    type="date"
                    value={formData.drugTestDate}
                    onChange={(e) => update('drugTestDate', e.target.value)}
                    className={`w-full max-w-md rounded-lg border bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 ${errors.drugTestDate ? 'border-red-500' : 'border-gray-300 dark:border-[#2563eb]'}`}
                  />
                  {errors.drugTestDate && <p className="text-red-500 text-sm mt-1">{errors.drugTestDate}</p>}
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Upload Drug Test Result *</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleFileChange('drugTestFile', e)}
                    className={`w-full max-w-md text-sm text-slate-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-[#0f172a] file:font-bold ${errors.drugTestFile ? 'border border-red-500 rounded-lg' : ''}`}
                  />
                  {formData.drugTestFile && <p className="text-green-600 dark:text-green-400 text-sm mt-1">{formData.drugTestFile.name}</p>}
                  {errors.drugTestFile && <p className="text-red-500 text-sm mt-1">{errors.drugTestFile}</p>}
                </div>
              </div>
            </section>

            {/* E. Neuro Test - always required */}
            <section className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#2563eb]">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">psychology</span>
                E. Neuro Test
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Neuro Test Date *</label>
                  <input
                    type="date"
                    value={formData.neuroTestDate}
                    onChange={(e) => update('neuroTestDate', e.target.value)}
                    className={`w-full max-w-md rounded-lg border bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 ${errors.neuroTestDate ? 'border-red-500' : 'border-gray-300 dark:border-[#2563eb]'}`}
                  />
                  {errors.neuroTestDate && <p className="text-red-500 text-sm mt-1">{errors.neuroTestDate}</p>}
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Upload Neuro Test Result *</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleFileChange('neuroTestFile', e)}
                    className={`w-full max-w-md text-sm text-slate-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-[#0f172a] file:font-bold ${errors.neuroTestFile ? 'border border-red-500 rounded-lg' : ''}`}
                  />
                  {formData.neuroTestFile && <p className="text-green-600 dark:text-green-400 text-sm mt-1">{formData.neuroTestFile.name}</p>}
                  {errors.neuroTestFile && <p className="text-red-500 text-sm mt-1">{errors.neuroTestFile}</p>}
                </div>
              </div>
            </section>

            {/* F. COVID-19 Vaccination */}
            <section className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#2563eb]">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">vaccines</span>
                F. COVID-19 Vaccination
              </h3>
              <p className="text-slate-700 dark:text-gray-300 font-medium mb-3">Are you vaccinated for COVID-19?</p>
              <div className="flex gap-6 mb-4">
                {['Yes', 'No'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isVaccinatedCovid"
                      value={opt}
                      checked={formData.isVaccinatedCovid === opt}
                      onChange={() => update('isVaccinatedCovid', opt)}
                      className="w-5 h-5 text-primary border-gray-400 focus:ring-primary"
                    />
                    <span className="text-slate-900 dark:text-white">{opt}</span>
                  </label>
                ))}
              </div>
              {formData.isVaccinatedCovid === 'Yes' && (
                <div className="mt-6 pl-2 border-l-2 border-primary/30">
                  <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Upload Vaccination Card (optional)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleFileChange('vaccinationCardFile', e)}
                    className="w-full max-w-md text-sm text-slate-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-[#0f172a] file:font-bold"
                  />
                  {formData.vaccinationCardFile && <p className="text-green-600 dark:text-green-400 text-sm mt-1">{formData.vaccinationCardFile.name}</p>}
                </div>
              )}
              {formData.isVaccinatedCovid === 'No' && (
                <div className="mt-6 pl-2 border-l-2 border-primary/30">
                  <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Please specify the reason *</label>
                  <textarea
                    value={formData.covidNotVaccinatedReason}
                    onChange={(e) => update('covidNotVaccinatedReason', e.target.value)}
                    rows={3}
                    placeholder="e.g. Medical exemption, personal choice..."
                    className={`w-full rounded-lg border bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 ${errors.covidNotVaccinatedReason ? 'border-red-500' : 'border-gray-300 dark:border-[#2563eb]'}`}
                  />
                  {errors.covidNotVaccinatedReason && <p className="text-red-500 text-sm mt-1">{errors.covidNotVaccinatedReason}</p>}
                </div>
              )}
            </section>

            {/* G. Driver's License */}
            <section className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#2563eb]">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">directions_car</span>
                G. Driver&apos;s License
              </h3>
              <p className="text-slate-700 dark:text-gray-300 font-medium mb-3">Do you have a Driver&apos;s License?</p>
              <div className="flex gap-6 mb-4">
                {['Yes', 'No'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasDriversLicense"
                      value={opt}
                      checked={formData.hasDriversLicense === opt}
                      onChange={() => update('hasDriversLicense', opt)}
                      className="w-5 h-5 text-primary border-gray-400 focus:ring-primary"
                    />
                    <span className="text-slate-900 dark:text-white">{opt}</span>
                  </label>
                ))}
              </div>
              {formData.hasDriversLicense === 'Yes' && (
                <div className="mt-6 space-y-4 pl-2 border-l-2 border-primary/30">
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Driver&apos;s License Number *</label>
                    <input
                      type="text"
                      value={formData.driversLicenseNumber}
                      onChange={(e) => update('driversLicenseNumber', e.target.value)}
                      className={`w-full max-w-md rounded-lg border bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 ${errors.driversLicenseNumber ? 'border-red-500' : 'border-gray-300 dark:border-[#2563eb]'}`}
                      placeholder="e.g. DL-XXXX"
                    />
                    {errors.driversLicenseNumber && <p className="text-red-500 text-sm mt-1">{errors.driversLicenseNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Driver&apos;s License Expiration Date *</label>
                    <input
                      type="date"
                      value={formData.driversLicenseExpiration}
                      onChange={(e) => update('driversLicenseExpiration', e.target.value)}
                      className={`w-full max-w-md rounded-lg border bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 ${errors.driversLicenseExpiration ? 'border-red-500' : 'border-gray-300 dark:border-[#2563eb]'}`}
                    />
                    {errors.driversLicenseExpiration && <p className="text-red-500 text-sm mt-1">{errors.driversLicenseExpiration}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 font-medium mb-1">Upload copy of Driver&apos;s License *</label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange('driversLicenseFile', e)}
                      className={`w-full max-w-md text-sm text-slate-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-[#0f172a] file:font-bold ${errors.driversLicenseFile ? 'border border-red-500 rounded-lg' : ''}`}
                    />
                    {formData.driversLicenseFile && <p className="text-green-600 dark:text-green-400 text-sm mt-1">{formData.driversLicenseFile.name}</p>}
                    {errors.driversLicenseFile && <p className="text-red-500 text-sm mt-1">{errors.driversLicenseFile}</p>}
                  </div>
                </div>
              )}
            </section>

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
                disabled={loading || !isFormComplete()}
                className="group flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-[#0f172a] font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:bg-[#2563eb] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Next Step'}
                <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default File201Form
