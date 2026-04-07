import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const WorkExperienceForm = () => {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState([
    { role: '', place: '', year: '' }
  ])

  useEffect(() => {
    const loadSaved = async () => {
      if (!user?.id) return
      const { data: applicant } = await supabase
        .from('applicants')
        .select('work_experience')
        .eq('user_id', user.id)
        .maybeSingle()
      if (applicant?.work_experience && Array.isArray(applicant.work_experience) && applicant.work_experience.length > 0) {
        setEntries(applicant.work_experience.map(e => ({
          role: e.role || '',
          place: e.place || '',
          year: e.year != null ? String(e.year) : ''
        })))
      }
    }
    loadSaved()
  }, [user?.id])

  const addEntry = () => {
    setEntries(prev => [...prev, { role: '', place: '', year: '' }])
  }

  const removeEntry = (index) => {
    if (entries.length <= 1) return
    setEntries(prev => prev.filter((_, i) => i !== index))
  }

  const updateEntry = (index, field, value) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const valid = entries.filter(entry => (entry.role?.trim() && entry.place?.trim() && entry.year?.trim()))
    if (valid.length === 0) {
      alert('Please add at least one work experience entry with Role, Place, and Year.')
      return
    }
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
        alert('Please complete Step 1 (Personal Information) first.')
        navigate(`/profile/personalinformation/${jobId || ''}`)
        return
      }
      const workExperience = valid.map(entry => ({
        role: entry.role.trim(),
        place: entry.place.trim(),
        year: entry.year.trim()
      }))
      const { error: updateError } = await supabase
        .from('applicants')
        .update({ work_experience: workExperience })
        .eq('id', applicant.id)
      if (updateError) throw updateError
      if (jobId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(jobId)) {
          await supabase
            .from('applications')
            .update({ current_step: 2 })
            .eq('applicant_id', applicant.id)
            .eq('job_id', jobId)
        }
      }
      navigate(`/apply/${jobId || ''}/201-file`)
    } catch (err) {
      console.error(err)
      alert('Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate(`/profile/personalinformation/${jobId || ''}`)
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
          <div className="flex flex-col gap-3">
            <div className="flex gap-6 justify-between items-end">
              <div>
                <p className="text-slate-900 dark:text-white text-lg font-bold leading-normal">Application Progress</p>
                <p className="text-green-700 dark:text-green-300 text-sm font-normal">Step 2 of 5: Work Experience</p>
              </div>
              <span className="material-symbols-outlined text-green-500 text-3xl">work</span>
            </div>
            <div className="rounded-full bg-gray-200 dark:bg-slate-700 h-3 overflow-hidden">
              <div className="h-full rounded-full bg-green-500 dark:bg-green-500 relative w-2/5">
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <h1 className="text-slate-900 dark:text-white text-3xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
              Work Experience
            </h1>
            <p className="text-slate-600 dark:text-[#93c5fd] text-base font-normal leading-relaxed">
              List your work history (most recent first). Add at least one entry with Role, Place, and Year.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#2563eb]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-900 dark:text-white text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  Experience entries
                </h3>
                <button
                  type="button"
                  onClick={addEntry}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary font-bold hover:bg-primary/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Add entry
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 dark:text-[#93c5fd] uppercase tracking-wide px-1">
                  <div className="col-span-4">Work experience / Role</div>
                  <div className="col-span-4">Place</div>
                  <div className="col-span-2">Year</div>
                  <div className="col-span-2"></div>
                </div>
                {entries.map((entry, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={entry.role}
                        onChange={(e) => updateEntry(index, 'role', e.target.value)}
                        placeholder="e.g. Security Officer"
                        className="w-full rounded-lg border border-gray-300 dark:border-[#2563eb] bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 text-sm"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={entry.place}
                        onChange={(e) => updateEntry(index, 'place', e.target.value)}
                        placeholder="e.g. Manila"
                        className="w-full rounded-lg border border-gray-300 dark:border-[#2563eb] bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={entry.year}
                        onChange={(e) => updateEntry(index, 'year', e.target.value)}
                        placeholder="e.g. 2025"
                        maxLength={4}
                        className="w-full rounded-lg border border-gray-300 dark:border-[#2563eb] bg-background-light dark:bg-[#1e293b] text-slate-900 dark:text-white px-4 py-2.5 text-sm"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeEntry(index)}
                        disabled={entries.length <= 1}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove entry"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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

export default WorkExperienceForm
