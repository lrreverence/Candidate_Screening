import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  applicationStatusBadgeDark,
  isApplicationStatusPendingLike,
  normalizeApplicationStatus
} from '../../lib/applicationStatus'
import { loadAdminApplicationResumeBundle } from '../../lib/adminApplicationResumeBundle'

const ApplicantDetailView = () => {
  const { id } = useParams()
  const [application, setApplication] = useState(null)
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeFile, setActiveFile] = useState('resume')
  const [zoom, setZoom] = useState(100)
  const [copied, setCopied] = useState(false)
  const [fileUrl, setFileUrl] = useState(null)
  const [resumeBundle, setResumeBundle] = useState(null)
  const [resumeBundleLoading, setResumeBundleLoading] = useState(false)
  const [expandedAccordion, setExpandedAccordion] = useState(null)
  const [idPhotoUrl, setIdPhotoUrl] = useState(null)

  useEffect(() => {
    fetchApplication()
  }, [id])

  // Load file URL when active file changes
  useEffect(() => {
    if (!application?.applicants?.documents) {
      setFileUrl(null)
      return
    }

    const documents = application.applicants.documents || []
    const files = documents.map(doc => {
      let fileType = 'pdf'
      if (doc.file_type === 'IDPhoto' || doc.file_type === '2x2_ID_PICTURE') fileType = 'image'
      
      return {
        id: doc.file_type === 'Resume' ? 'resume' : doc.file_type === '201File' ? 'file201' : (doc.file_type === 'IDPhoto' || doc.file_type === '2x2_ID_PICTURE') ? 'idPhoto' : 'other',
        name: doc.file_name,
        path: doc.file_path,
        type: fileType,
        file_type: doc.file_type // Keep original file_type for bucket selection
      }
    })

    const activeFileData = files.find(f => f.id === activeFile)
    if (activeFileData?.path) {
      // Use id-pictures bucket for 2x2 ID pictures, resumes bucket for others
      const bucket = activeFileData.file_type === '2x2_ID_PICTURE' ? 'id-pictures' : 'resumes'
      supabase.storage
        .from(bucket)
        .createSignedUrl(activeFileData.path, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) {
            setFileUrl(data.signedUrl)
          } else {
            setFileUrl(null)
          }
        })
        .catch(() => setFileUrl(null))
    } else {
      setFileUrl(null)
    }
  }, [activeFile, application])

  const fetchApplication = async () => {
    setLoading(true)
    try {
      // Fetch application with applicant and job details
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select(`
          *,
          applicants:applicant_id (
            *
          ),
          jobs:job_id (
            title,
            location,
            salary,
            required_credentials,
            required_documents,
            category_percentages,
            age_scoring,
            gender_scoring,
            height_scoring,
            weight_scoring,
            employment_experience_scoring,
            training_count_scoring,
            others_scoring
          )
        `)
        .eq('id', id)
        .single()

      if (appError) throw appError

      // Fetch documents for this specific application
      // Include documents with application_id matching this application
      // OR documents without application_id (backwards compatibility) that belong to this applicant
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('applicant_id', appData.applicant_id)
        .or(`application_id.eq.${id},application_id.is.null`)
        .order('created_at', { ascending: false })

      if (docsError) {
        console.error('Error fetching documents:', docsError)
      }

      // Filter: If documents have application_id, only show ones matching this application
      // If application_id is null, show them (backwards compatibility)
      // For null application_id, only show documents created after this application was created
      const applicationCreatedAt = new Date(appData.created_at)
      const filteredDocuments = (documents || []).filter(doc => {
        if (doc.application_id === id) {
          return true // Exact match
        }
        if (doc.application_id === null) {
          // Backwards compatibility: show if created after application
          const docCreatedAt = new Date(doc.created_at)
          return docCreatedAt >= applicationCreatedAt
        }
        return false
      })

      // Attach documents to applicant data
      if (appData.applicants) {
        appData.applicants.documents = filteredDocuments
      }

      setApplication(appData)
      setJob(appData.jobs)

      // Set active file based on available documents
      const docList = documents || []
      if (docList.find(d => d.file_type === 'Resume')) {
        setActiveFile('resume')
      } else if (docList.find(d => d.file_type === '201File')) {
        setActiveFile('file201')
      } else if (docList.find(d => d.file_type === 'IDPhoto' || d.file_type === '2x2_ID_PICTURE')) {
        setActiveFile('idPhoto')
      }
    } catch (error) {
      console.error('Error fetching application:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadResumeBundle = async () => {
    if (!id) return
    setResumeBundleLoading(true)
    try {
      const data = await loadAdminApplicationResumeBundle(supabase, id)
      setResumeBundle(data)
    } catch (e) {
      console.error('[ApplicantDetailView] resume bundle', e)
      setResumeBundle(null)
    } finally {
      setResumeBundleLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && application?.id) {
      loadResumeBundle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, application?.id, id])

  useEffect(() => {
    const docs = application?.applicants?.documents || []
    const idDoc = docs.find((d) => d.file_type === 'IDPhoto' || d.file_type === '2x2_ID_PICTURE')
    if (!idDoc?.file_path) {
      setIdPhotoUrl(null)
      return
    }
    const bucket = idDoc.file_type === '2x2_ID_PICTURE' ? 'id-pictures' : 'resumes'
    supabase.storage
      .from(bucket)
      .createSignedUrl(idDoc.file_path, 3600)
      .then(({ data }) => setIdPhotoUrl(data?.signedUrl || null))
      .catch(() => setIdPhotoUrl(null))
  }, [application?.applicants?.documents])

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleApprove = async () => {
    if (!confirm('Approve this applicant for interview?')) return

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'INTERVIEW',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      await fetchApplication()
      await loadResumeBundle()
      alert('Status updated to INTERVIEW.')
    } catch (error) {
      console.error('Error approving applicant:', error)
      alert('Failed to approve applicant. Please try again.')
    }
  }

  const handleReject = async () => {
    if (!confirm('Reject this applicant? This action cannot be undone.')) return

    const rejectionReason = window.prompt(
      'Optional: Add a reason for the applicant (they will see this on the job detail page):'
    )
    // User can click Cancel (null) or leave empty; both are valid
    const reason = rejectionReason != null ? rejectionReason.trim() || null : null

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'REJECTED',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      await fetchApplication()
      await loadResumeBundle()
      alert('Status updated to REJECTED.')
    } catch (error) {
      console.error('Error rejecting applicant:', error)
      alert('Failed to reject applicant. Please try again.')
    }
  }

  const handleMarkHired = async () => {
    const cur = normalizeApplicationStatus(application?.status)
    if (cur === 'HIRED') return
    if (cur !== 'INTERVIEW') {
      if (!confirm('Mark as HIRED without an INTERVIEW status first?')) return
    } else if (!confirm('Mark this applicant as HIRED?')) return
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'HIRED',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      await fetchApplication()
      await loadResumeBundle()
      alert('Status updated to HIRED.')
    } catch (error) {
      console.error('Error marking hired:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
  }

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const getStatusBadge = (status) => {
    const config = applicationStatusBadgeDark(status)
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide ${config.bg} ${config.text} ${config.border} border`}
      >
        {isApplicationStatusPendingLike(status) ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>
            {config.label}
          </>
        ) : (
          config.label
        )}
      </span>
    )
  }

  const getMatchPercentage = () => {
    // Match percentage based on credentials only (documents step removed from apply flow).
    const applicant = application?.applicants
    if (!applicant) return 0
    
    const jobData = application?.jobs || job
    const applicantLicenses = Array.isArray(applicant?.licenses) ? applicant.licenses : []
    
    // Get required credentials from the job
    const requiredCredentials = Array.isArray(jobData?.required_credentials) ? jobData.required_credentials : []
    
    // If no credential requirements are set, return 0 (cannot calculate match)
    if (requiredCredentials.length === 0) {
      return 0
    }
    
    let credentialScore = 0
    let credentialTotal = 0
    
    // Calculate credential compliance (each credential has equal weight)
    if (requiredCredentials.length > 0) {
      const matchedCredentials = requiredCredentials.filter(cred => 
        applicantLicenses.includes(cred)
      ).length
      
      credentialTotal = requiredCredentials.length
      credentialScore = matchedCredentials
    }
    
    const matchPercentage = credentialTotal > 0 ? (credentialScore / credentialTotal) * 100 : 0
    return Math.round(Math.min(100, Math.max(0, matchPercentage)))
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark text-white">
        <p>Loading applicant details...</p>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Application not found</p>
          <Link to="/admin/applicants" className="text-primary hover:underline">
            Return to Applicants
          </Link>
        </div>
      </div>
    )
  }

  const applicant = application?.applicants
  const documents = applicant?.documents || []
  
  const files = documents.map(doc => {
    let fileType = 'pdf'
    if (doc.file_type === 'IDPhoto' || doc.file_type === '2x2_ID_PICTURE') fileType = 'image'
    
    return {
      id: doc.file_type === 'Resume' ? 'resume' : doc.file_type === '201File' ? 'file201' : (doc.file_type === 'IDPhoto' || doc.file_type === '2x2_ID_PICTURE') ? 'idPhoto' : 'other',
      name: doc.file_name,
      path: doc.file_path,
      type: fileType,
      file_type: doc.file_type // Keep original file_type for bucket selection
    }
  })

  const availableLicenses = Array.isArray(applicant?.licenses) ? applicant.licenses : []

  const formatLongDate = (ds) => {
    if (!ds) return 'N/A'
    const d = new Date(ds)
    return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const jobMatchScore =
    resumeBundle?.breakdown?.total != null && Number.isFinite(resumeBundle.breakdown.total)
      ? Math.round(resumeBundle.breakdown.total * 100) / 100
      : getMatchPercentage()

  const st = normalizeApplicationStatus(application?.status)
  const rejectedFooterDisabled = st === 'REJECTED'
  const interviewFooterDisabled = st === 'INTERVIEW' || st === 'HIRED'
  const hiredFooterDisabled = st === 'HIRED'

  const renderAccordionBody = (categoryKey) => {
    const edu = resumeBundle?.educationByLevel || {}
    const levelMeta = [
      { key: 'elementary', label: 'Elementary' },
      { key: 'high_school', label: 'High School' },
      { key: 'vocational', label: 'Vocational' },
      { key: 'college', label: 'College' }
    ]

    switch (categoryKey) {
      case 'personal':
        return (
          <div className="space-y-3">
            <p>
              <span className="text-[#92a4c9]">Email</span> {applicant?.email || '—'}
            </p>
            <p>
              <span className="text-[#92a4c9]">Phone</span> {applicant?.phone || '—'}
            </p>
            <p>
              <span className="text-[#92a4c9]">Address</span>{' '}
              {[applicant?.street_address, applicant?.barangay, applicant?.city, applicant?.province].filter(Boolean).join(', ') || '—'}
            </p>
            {applicant?.date_of_birth && (
              <p>
                <span className="text-[#92a4c9]">Date of birth</span> {formatLongDate(applicant.date_of_birth)}
              </p>
            )}
            {applicant?.gender && (
              <p>
                <span className="text-[#92a4c9]">Gender</span> {applicant.gender}
              </p>
            )}
            {(applicant?.height_cm || applicant?.weight_kg) && (
              <p>
                <span className="text-[#92a4c9]">Height / weight</span> {applicant?.height_cm || '—'} cm /{' '}
                {applicant?.weight_kg || '—'} kg
              </p>
            )}
          </div>
        )
      case 'education':
        return (
          <div className="space-y-3">
            {levelMeta.map(({ key, label }) => {
              const rows = edu[key] || []
              const filled = rows.filter(
                (r) =>
                  String(r?.school || '').trim() ||
                  String(r?.course || '').trim() ||
                  String(r?.year_graduated || '').trim()
              )
              return (
                <div key={key}>
                  <p className="text-xs font-bold uppercase text-[#92a4c9]">{label}</p>
                  {filled.length === 0 ? (
                    <p className="text-xs text-[#64748b]">No entries</p>
                  ) : (
                    <ul className="mt-1 list-inside list-disc text-xs">
                      {filled.map((r, i) => (
                        <li key={i}>
                          {[r.school, r.course, r.year_graduated].filter(Boolean).join(' · ') || '—'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )
      case 'employment':
        return (
          <div className="space-y-2 text-xs">
            {(resumeBundle?.employmentRecords || []).length === 0 ? (
              <p className="text-[#64748b]">No employment records</p>
            ) : (
              <ul className="space-y-2">
                {resumeBundle.employmentRecords.map((r, idx) => (
                  <li key={`${r.category}-${r.position}-${r.from_date}-${idx}`} className="rounded border border-[#232f48] p-2">
                    <span className="text-[#92a4c9]">{r.category}</span> — {r.position || '—'} @ {r.agency || '—'} (
                    {r.from_date || '?'} → {r.to_date || 'present'})
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      case 'licenses': {
        const rows = resumeBundle?.licenseRows || []
        if (rows.length) {
          return (
            <ul className="space-y-2 text-xs">
              {rows.map((r, i) => (
                <li key={i} className="rounded border border-[#232f48] p-2">
                  <span className="font-medium text-white">{r.category || '—'}</span>
                  <span className="text-[#92a4c9]">
                    {' '}
                    — issued {r.date_issued || '—'}, exp {r.date_expiry || '—'}
                  </span>
                </li>
              ))}
            </ul>
          )
        }
        if (availableLicenses.length) {
          return <p>{availableLicenses.join(', ')}</p>
        }
        return <p className="text-[#64748b]">No licenses on file.</p>
      }
      case 'training':
        return (
          <ul className="list-inside list-disc text-xs">
            {(resumeBundle?.trainingsList || []).length === 0 ? (
              <li className="list-none text-[#64748b]">No trainings</li>
            ) : (
              resumeBundle.trainingsList.map((t, i) => (
                <li key={i}>
                  {t.training_attended || '—'} — {t.date || '—'}
                </li>
              ))
            )}
          </ul>
        )
      case 'clearances':
        return (
          <ul className="space-y-1 text-xs">
            {(resumeBundle?.clearancesList || []).length === 0 ? (
              <li className="text-[#64748b]">No clearance rows</li>
            ) : (
              resumeBundle.clearancesList.map((c, i) => (
                <li key={i}>
                  {c.clearance_type}: issued {c.date_issued || '—'}, exp {c.date_expiry || '—'}
                </li>
              ))
            )}
          </ul>
        )
      case 'others':
        return (
          <pre className="max-h-48 overflow-auto rounded bg-[#0d121c] p-2 text-[11px] text-[#cbd5e1]">
            {JSON.stringify(resumeBundle?.othersRow || {}, null, 2)}
          </pre>
        )
      default:
        return <p className="text-xs text-[#64748b]">No details</p>
    }
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#111722]">
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#232f48] bg-[#111722] px-6 py-3 shrink-0 z-20 h-16">
        <div className="flex items-center gap-4 text-white">
          <Link to="/admin/applicants" className="flex items-center gap-4">
            <div className="size-8 flex items-center justify-center rounded text-primary">
              <span className="material-symbols-outlined text-3xl">shield_person</span>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] uppercase">
              E Power Security <span className="text-[#92a4c9] font-normal mx-2">|</span> ATS
            </h2>
          </Link>
        </div>
        <div className="flex flex-1 justify-end gap-6">
          {/* Search */}
          <label className="hidden md:flex flex-col min-w-40 !h-10 max-w-64">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-[#324467] bg-[#1a2332]">
              <div className="text-[#92a4c9] flex border-none items-center justify-center pl-3 pr-1">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border-none bg-transparent focus:border-none h-full placeholder:text-[#92a4c9] px-2 pl-0 text-sm font-normal leading-normal"
                placeholder="Search applicant ID..."
                type="text"
              />
            </div>
          </label>
          {/* User Profile */}
          <div className="flex items-center gap-3 pl-6 border-l border-[#232f48]">
            <div className="text-right hidden lg:block">
              <p className="text-white text-sm font-bold leading-none">Admin User</p>
              <p className="text-[#92a4c9] text-xs leading-none mt-1">HR Manager</p>
            </div>
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-[#232f48] bg-gray-600 flex items-center justify-center text-white font-bold">
              AU
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
            <div className="mb-6 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider text-[#92a4c9]">
              <Link to="/admin/applicants" className="hover:text-primary">
                Dashboard
              </Link>
              <span className="text-[#324467]">/</span>
              <Link to="/admin/applicants" className="hover:text-primary">
                Candidates
              </Link>
              <span className="text-[#324467]">/</span>
              <span className="text-white">Application</span>
            </div>

            {/* Overview: photo, identity, job match, remarks */}
            <div className="mb-8 grid gap-6 rounded-xl border border-[#232f48] bg-[#161e2c] p-6 lg:grid-cols-[140px_1fr_260px]">
              <div className="flex justify-center lg:justify-start">
                <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border-2 border-[#324467] bg-[#232f48]">
                  {idPhotoUrl ? (
                    <img src={idPhotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                      {getInitials(applicant?.first_name, applicant?.last_name)}
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold leading-tight text-white lg:text-3xl">
                      {[applicant?.first_name, applicant?.middle_name, applicant?.last_name].filter(Boolean).join(' ')}
                      {applicant?.name_extension ? ` ${applicant.name_extension}` : ''}
                    </h1>
                    <p className="mt-1 text-sm text-[#92a4c9]">
                      {[applicant?.city, applicant?.province].filter(Boolean).join(', ') || '—'}
                    </p>
                    <p className="mt-1 text-sm text-white">
                      <span className="text-[#92a4c9]">Phone</span> {applicant?.phone || '—'}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#92a4c9]">
                      ID: {applicant?.reference_code || application?.id}
                    </p>
                    <p className="mt-2 text-sm text-[#92a4c9]">{job?.title || 'General application'}</p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(application?.status)}</div>
                </div>
                <div className="mt-4 max-w-md">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-[#92a4c9]">Job match</span>
                    <span className="text-sm font-bold tabular-nums text-emerald-400">
                      {resumeBundleLoading ? '…' : `${jobMatchScore} match`}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#232f48]">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, Number(jobMatchScore) || 0)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#92a4c9]">Remarks</p>
                <div className="rounded-lg border border-orange-800/40 bg-orange-950/30 p-3">
                  <p className="text-[10px] font-bold uppercase text-orange-200">Rejected / date</p>
                  <p className="mt-1 text-sm text-white">{st === 'REJECTED' ? formatLongDate(application?.updated_at) : 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-blue-800/40 bg-blue-950/30 p-3">
                  <p className="text-[10px] font-bold uppercase text-blue-200">Date interviewed</p>
                  <p className="mt-1 text-sm text-white">
                    {st === 'INTERVIEW' ? formatLongDate(application?.updated_at) : st === 'HIRED' ? '—' : 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 p-3">
                  <p className="text-[10px] font-bold uppercase text-emerald-200">Date hired</p>
                  <p className="mt-1 text-sm text-white">{st === 'HIRED' ? formatLongDate(application?.updated_at) : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Resume accordions */}
            <div className="mb-8 space-y-2">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#92a4c9]">Resume / profile</h2>
              {(resumeBundle?.breakdown?.rows || []).map((row) => (
                <div key={row.categoryKey} className="overflow-hidden rounded-lg border border-[#232f48] bg-[#1a2332]">
                  <button
                    type="button"
                    onClick={() => setExpandedAccordion((prev) => (prev === row.categoryKey ? null : row.categoryKey))}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[#232f48]/60"
                  >
                    <span className="font-semibold text-white">{row.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold tabular-nums text-[#92a4c9]">Score {row.weightedPoints}</span>
                      <span className="material-symbols-outlined text-primary">
                        {expandedAccordion === row.categoryKey ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </button>
                  {expandedAccordion === row.categoryKey && (
                    <div className="border-t border-[#232f48] bg-[#111722] px-4 py-4 text-sm text-[#cbd5e1]">
                      {renderAccordionBody(row.categoryKey)}
                    </div>
                  )}
                </div>
              ))}
              {!resumeBundle?.breakdown?.rows?.length && !resumeBundleLoading && (
                <p className="text-sm text-[#92a4c9]">No scoring breakdown available.</p>
              )}
            </div>

            {/* Documents */}
            <div className="rounded-xl border border-[#232f48] bg-[#0d121c] overflow-hidden">
              <div className="border-b border-[#232f48] bg-[#111722] px-4 py-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#92a4c9]">Documents</h2>
              </div>
              <div className="flex flex-col lg:flex-row lg:min-h-[480px]">
                <div className="border-b border-[#232f48] lg:w-72 lg:border-b-0 lg:border-r lg:border-[#232f48]">
                  <div className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-x-visible">
                    {files.length === 0 ? (
                      <p className="p-2 text-xs text-[#92a4c9]">No files</p>
                    ) : (
                      files.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => setActiveFile(file.id)}
                          className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium lg:w-full ${
                            activeFile === file.id
                              ? 'bg-primary/15 text-white ring-1 ring-primary/40'
                              : 'text-[#92a4c9] hover:bg-[#232f48]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {file.type === 'pdf' ? 'picture_as_pdf' : 'image'}
                          </span>
                          <span className="truncate">{file.name || file.id}</span>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="hidden items-center justify-center gap-2 border-t border-[#232f48] p-2 lg:flex">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(50, z - 10))}
                      className="rounded p-1 text-[#92a4c9] hover:bg-[#232f48]"
                    >
                      <span className="material-symbols-outlined text-[20px]">remove</span>
                    </button>
                    <span className="font-mono text-xs text-white">{zoom}%</span>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(200, z + 10))}
                      className="rounded p-1 text-[#92a4c9] hover:bg-[#232f48]"
                    >
                      <span className="material-symbols-outlined text-[20px]">add</span>
                    </button>
                  </div>
                </div>
                <div className="min-h-[360px] flex-1 overflow-auto bg-[#0d121c] p-4">
                  {fileUrl ? (
                    <div className="mx-auto bg-white shadow-lg" style={{ maxWidth: `${Math.min(900, 850 * (zoom / 100))}px` }}>
                      {files.find((f) => f.id === activeFile)?.type === 'pdf' ? (
                        <iframe src={fileUrl} className="h-[70vh] w-full min-h-[400px]" title="Document" />
                      ) : (
                        <img src={fileUrl} alt="" className="h-auto w-full" />
                      )}
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center text-[#92a4c9]">
                      <span className="material-symbols-outlined mr-2">description</span>
                      No preview
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer: application date + status actions (wireframe) */}
      <footer className="shrink-0 border-t border-[#232f48] bg-[#111722] px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] z-30 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#92a4c9]">Application date</p>
            <p className="mt-1 font-mono text-sm text-white">
              {formatDate(application?.submitted_at || application?.created_at)}
            </p>
          </div>
          <div className="flex flex-1 flex-wrap items-stretch justify-end gap-3">
            <button
              type="button"
              onClick={handleReject}
              disabled={rejectedFooterDisabled}
              className="min-h-[48px] min-w-[140px] flex-1 rounded-lg bg-orange-600 px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-orange-500 disabled:pointer-events-none disabled:opacity-40 sm:flex-none sm:px-8"
            >
              Rejected
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={interviewFooterDisabled}
              className="min-h-[48px] min-w-[160px] flex-1 rounded-lg bg-primary px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#1151d3] disabled:pointer-events-none disabled:opacity-40 sm:flex-none sm:px-8"
            >
              For interview
            </button>
            <button
              type="button"
              onClick={handleMarkHired}
              disabled={hiredFooterDisabled}
              className="min-h-[48px] min-w-[140px] flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-40 sm:flex-none sm:px-8"
            >
              Hired
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ApplicantDetailView

