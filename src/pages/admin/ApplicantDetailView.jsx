import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ApplicantDetailView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState(null)
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [activeFile, setActiveFile] = useState('resume')
  const [zoom, setZoom] = useState(100)
  const [copied, setCopied] = useState(false)
  const [fileUrl, setFileUrl] = useState(null)

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
            required_documents
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
          status: 'interview',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      alert('Applicant approved for interview!')
      navigate('/admin/applicants')
    } catch (error) {
      console.error('Error approving applicant:', error)
      alert('Failed to approve applicant. Please try again.')
    }
  }

  const handleReject = async () => {
    if (!confirm('Reject this applicant? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      alert('Applicant rejected.')
      navigate('/admin/applicants')
    } catch (error) {
      console.error('Error rejecting applicant:', error)
      alert('Failed to reject applicant. Please try again.')
    }
  }

  const handleFlag = async () => {
    try {
      // You could add a flagged field to the database
      alert('Application flagged for review')
    } catch (error) {
      console.error('Error flagging application:', error)
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
    const statusMap = {
      'pending': { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20', label: 'Pending Review' },
      'submitted': { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20', label: 'Pending Review' },
      'screening': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', label: 'Screening' },
      'interview': { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20', label: 'Interview' },
      'hired': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', label: 'Hired' },
      'rejected': { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', label: 'Rejected' }
    }

    const config = statusMap[status?.toLowerCase()] || statusMap['pending']
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide ${config.bg} ${config.text} ${config.border} border`}>
        {status === 'pending' || status === 'submitted' ? (
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
    // Calculate match percentage based solely on job requirements (documents and credentials)
    const applicant = application?.applicants
    if (!applicant) return 0
    
    const jobData = application?.jobs || job
    const documents = applicant?.documents || []
    const applicantLicenses = Array.isArray(applicant?.licenses) ? applicant.licenses : []
    
    // Get required documents and credentials from the job
    const requiredDocuments = Array.isArray(jobData?.required_documents) ? jobData.required_documents : []
    const requiredCredentials = Array.isArray(jobData?.required_credentials) ? jobData.required_credentials : []
    
    // If no requirements are set, return 0 (cannot calculate match)
    if (requiredDocuments.length === 0 && requiredCredentials.length === 0) {
      return 0
    }
    
    let documentScore = 0
    let documentTotal = 0
    let credentialScore = 0
    let credentialTotal = 0
    
    // Calculate document compliance based on assigned percentages
    if (requiredDocuments.length > 0) {
      requiredDocuments.forEach(reqDoc => {
        const percentage = parseFloat(reqDoc.percentage) || 0
        documentTotal += percentage
        
        const hasDocument = documents.some(doc => doc.file_type === reqDoc.document_type)
        if (hasDocument) {
          documentScore += percentage
        }
      })
    }
    
    // Calculate credential compliance (each credential has equal weight)
    if (requiredCredentials.length > 0) {
      const matchedCredentials = requiredCredentials.filter(cred => 
        applicantLicenses.includes(cred)
      ).length
      
      credentialTotal = requiredCredentials.length
      credentialScore = matchedCredentials
    }
    
    // Calculate match percentage
    // If documents are required and sum to 100%, use them as the primary measure
    // If credentials are also required, they fill any gap or are averaged
    let matchPercentage = 0
    
    if (documentTotal > 0 && credentialTotal > 0) {
      // Both documents and credentials are required
      // Documents contribute their percentage (normalized to 100% if they sum to 100%)
      // Credentials contribute equally, filling the remainder
      const documentMatch = documentTotal > 0 ? (documentScore / documentTotal) * 100 : 0
      const credentialMatch = (credentialScore / credentialTotal) * 100
      
      // Weight: documents get their total percentage, credentials get the remainder
      const documentWeight = Math.min(documentTotal / 100, 1) // Cap at 100%
      const credentialWeight = Math.max(0, 1 - documentWeight)
      
      matchPercentage = (documentMatch * documentWeight) + (credentialMatch * credentialWeight)
    } else if (documentTotal > 0) {
      // Only documents are required - use their percentage directly
      matchPercentage = (documentScore / documentTotal) * 100
    } else if (credentialTotal > 0) {
      // Only credentials are required
      matchPercentage = (credentialScore / credentialTotal) * 100
    }
    
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
  const requiredDocuments = Array.isArray(job?.required_documents) ? job.required_documents : []
  
  // Calculate document completion percentage
  const calculateDocumentCompletion = () => {
    if (requiredDocuments.length === 0) {
      // If no required documents specified, return null
      return null
    }
    
    let completedPercentage = 0
    let totalPercentage = 0
    
    requiredDocuments.forEach(reqDoc => {
      const percentage = parseFloat(reqDoc.percentage) || 0
      totalPercentage += percentage
      const hasDocument = documents.some(doc => doc.file_type === reqDoc.document_type)
      if (hasDocument) {
        completedPercentage += percentage
      }
    })
    
    if (totalPercentage === 0) return null
    
    return {
      completed: completedPercentage,
      total: totalPercentage,
      percentage: Math.round((completedPercentage / totalPercentage) * 100)
    }
  }
  
  const documentCompletion = calculateDocumentCompletion()
  
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

      {/* Main Content (Split View) */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: Applicant Profile & Data */}
        <aside className="w-full lg:w-[420px] xl:w-[480px] flex flex-col border-r border-[#232f48] bg-[#111722] overflow-y-auto shrink-0 relative custom-scrollbar">
          {/* Breadcrumbs */}
          <div className="px-6 pt-5 pb-2">
            <div className="flex flex-wrap gap-2 items-center text-xs uppercase tracking-wider font-bold">
              <Link to="/admin/applicants" className="text-[#92a4c9] hover:text-primary transition-colors">
                Dashboard
              </Link>
              <span className="text-[#324467]">/</span>
              <Link to="/admin/applicants" className="text-[#92a4c9] hover:text-primary transition-colors">
                Candidates
              </Link>
              <span className="text-[#324467]">/</span>
              <span className="text-white">Detail View</span>
            </div>
          </div>

          {/* Profile Header Card */}
          <div className="p-6 pb-2">
            <div className="flex flex-col gap-4">
              <div className="flex gap-5 items-start">
                <div className="relative shrink-0">
                  <div className="bg-center bg-no-repeat bg-cover rounded-xl h-28 w-28 border-2 border-[#324467] shadow-lg bg-gray-700 flex items-center justify-center text-white text-3xl font-bold">
                    {getInitials(applicant?.first_name, applicant?.last_name)}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-[#111722] p-1 rounded-full">
                    <div className="bg-blue-500 rounded-full h-4 w-4 border-2 border-[#111722]" title="Online"></div>
                  </div>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h1 className="text-white text-3xl font-bold leading-tight tracking-tight truncate">
                      {applicant?.first_name} {applicant?.last_name}
                    </h1>
                    <span className="text-[#92a4c9] text-xs font-mono bg-[#1a2332] px-2 py-1 rounded border border-[#232f48]">
                      ID: {applicant?.reference_code || `#${application?.id}`}
                    </span>
                  </div>
                  <p className="text-[#92a4c9] text-base font-medium mt-1">
                    {job?.title || 'General Application'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {getStatusBadge(application?.status)}
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                      {getMatchPercentage()}% Match
                    </span>
                    {documentCompletion && (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide border ${
                        documentCompletion.percentage === 100
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : documentCompletion.percentage >= 75
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : documentCompletion.percentage >= 50
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {documentCompletion.percentage}% Documents
                      </span>
                    )}
                  </div>
                  {documentCompletion && (
                    <div className="mt-3 p-3 bg-[#1a2332] rounded-lg border border-[#232f48]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[#92a4c9] uppercase tracking-wide">201 File Completion</span>
                        <span className="text-sm font-bold text-white">{documentCompletion.completed.toFixed(1)}% / {documentCompletion.total.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-[#232f48] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            documentCompletion.percentage === 100
                              ? 'bg-green-500'
                              : documentCompletion.percentage >= 75
                              ? 'bg-blue-500'
                              : documentCompletion.percentage >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${documentCompletion.percentage}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 text-xs text-[#92a4c9]">
                        {requiredDocuments.filter(reqDoc => 
                          documents.some(doc => doc.file_type === reqDoc.document_type)
                        ).length} of {requiredDocuments.length} required documents uploaded
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="px-6 mt-4 border-b border-[#232f48] sticky top-0 bg-[#111722]/95 backdrop-blur z-10">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 border-b-[3px] pb-3 pt-2 transition-all ${
                  activeTab === 'profile'
                    ? 'border-primary text-white'
                    : 'border-transparent text-[#92a4c9] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
                <span className="text-sm font-bold tracking-wide">PROFILE</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 border-b-[3px] pb-3 pt-2 transition-all ${
                  activeTab === 'history'
                    ? 'border-primary text-white'
                    : 'border-transparent text-[#92a4c9] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">history</span>
                <span className="text-sm font-bold tracking-wide">HISTORY</span>
              </button>
              <button
                onClick={() => setActiveTab('screening')}
                className={`flex items-center gap-2 border-b-[3px] pb-3 pt-2 transition-all ${
                  activeTab === 'screening'
                    ? 'border-primary text-white'
                    : 'border-transparent text-[#92a4c9] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">fact_check</span>
                <span className="text-sm font-bold tracking-wide">SCREENING</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <div className="p-6 flex flex-col gap-8 pb-32">
              {/* Contact Section */}
              <section>
                <h3 className="text-[#92a4c9] text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-3 bg-primary rounded-full"></span> Contact Details
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-[#161e2c] p-4 rounded-lg border border-[#232f48] flex items-center gap-4 group hover:border-primary/40 transition-colors cursor-default">
                    <div className="bg-[#232f48] p-2 rounded-md text-[#92a4c9] group-hover:text-white group-hover:bg-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">mail</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[#92a4c9] text-xs uppercase font-bold">Email Address</p>
                      <p className="text-white text-sm font-medium">{applicant?.email || 'N/A'}</p>
                    </div>
                    {applicant?.email && (
                      <button
                        onClick={() => handleCopy(applicant.email)}
                        className="text-[#92a4c9] hover:text-white"
                        title="Copy email"
                      >
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      </button>
                    )}
                  </div>
                  <div className="bg-[#161e2c] p-4 rounded-lg border border-[#232f48] flex items-center gap-4 group hover:border-primary/40 transition-colors cursor-default">
                    <div className="bg-[#232f48] p-2 rounded-md text-[#92a4c9] group-hover:text-white group-hover:bg-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">call</span>
                    </div>
                    <div>
                      <p className="text-[#92a4c9] text-xs uppercase font-bold">Phone Number</p>
                      <p className="text-white text-sm font-medium">{applicant?.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="bg-[#161e2c] p-4 rounded-lg border border-[#232f48] flex items-center gap-4 group hover:border-primary/40 transition-colors cursor-default">
                    <div className="bg-[#232f48] p-2 rounded-md text-[#92a4c9] group-hover:text-white group-hover:bg-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">location_on</span>
                    </div>
                    <div>
                      <p className="text-[#92a4c9] text-xs uppercase font-bold">Residence</p>
                      <p className="text-white text-sm font-medium">
                        {applicant?.street_address && (
                          <>
                            {applicant.street_address}
                            {applicant.barangay && `, ${applicant.barangay}`}
                            {applicant.city && `, ${applicant.city}`}
                            {applicant.province && `, ${applicant.province}`}
                            {applicant.zip_code && ` ${applicant.zip_code}`}
                          </>
                        ) || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Credentials Section */}
              <section>
                <h3 className="text-[#92a4c9] text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-3 bg-yellow-500 rounded-full"></span> Security Credentials
                </h3>
                <div className="bg-[#161e2c] rounded-lg border border-[#232f48] divide-y divide-[#232f48]">
                  {availableLicenses.length > 0 && (
                    <div className="p-4 flex justify-between items-center">
                      <div>
                        <p className="text-[#92a4c9] text-xs uppercase">Licenses</p>
                        <p className="text-white font-medium text-sm mt-1">
                          {availableLicenses.join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/20">
                          Active
                        </span>
                      </div>
                    </div>
                  )}
                  {applicant?.license_type && (
                    <div className="p-4 flex justify-between items-center">
                      <div>
                        <p className="text-[#92a4c9] text-xs uppercase">License Type</p>
                        <p className="text-white font-medium text-sm mt-1">{applicant.license_type}</p>
                      </div>
                    </div>
                  )}
                  {applicant?.height_cm && (
                    <div className="p-4 flex justify-between items-center">
                      <div>
                        <p className="text-[#92a4c9] text-xs uppercase">Height</p>
                        <p className="text-white font-medium text-sm mt-1">{applicant.height_cm} cm</p>
                      </div>
                    </div>
                  )}
                  {applicant?.weight_kg && (
                    <div className="p-4 flex justify-between items-center">
                      <div>
                        <p className="text-[#92a4c9] text-xs uppercase">Weight</p>
                        <p className="text-white font-medium text-sm mt-1">{applicant.weight_kg} kg</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Attributes Section */}
              {availableLicenses.length > 0 && (
                <section>
                  <h3 className="text-[#92a4c9] text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1 h-3 bg-primary rounded-full"></span> Attributes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {availableLicenses.map((license, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 rounded-md bg-[#232f48] text-[#92a4c9] text-xs font-bold border border-[#324467]"
                      >
                        {license}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-6 pb-32">
              <p className="text-[#92a4c9] text-sm">Application history will be displayed here.</p>
            </div>
          )}

          {activeTab === 'screening' && (
            <div className="p-6 pb-32">
              <p className="text-[#92a4c9] text-sm">Screening results will be displayed here.</p>
            </div>
          )}
        </aside>

        {/* RIGHT PANEL: Document Viewer */}
        <main className="flex-1 bg-[#0d121c] flex flex-col h-full relative overflow-hidden">
          {/* Viewer Toolbar */}
          <div className="h-16 border-b border-[#232f48] bg-[#111722] flex items-center justify-between px-6 shrink-0 shadow-md z-10">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar mask-gradient pr-4">
              <p className="text-[#92a4c9] text-xs font-bold uppercase mr-2 tracking-wide">Files:</p>
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setActiveFile(file.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                    activeFile === file.id
                      ? 'bg-[#135bec]/10 text-white border-[#135bec]/50 shadow-[0_0_10px_rgba(19,91,236,0.2)]'
                      : 'text-[#92a4c9] hover:text-white border-transparent hover:bg-[#232f48]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${
                    file.type === 'pdf' ? 'text-red-400' : 'text-blue-400'
                  }`}>
                    {file.type === 'pdf' ? 'picture_as_pdf' : 'image'}
                  </span>
                  {file.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 border-l border-[#232f48] pl-4 ml-2 shrink-0">
              <button
                onClick={() => setZoom(prev => Math.max(50, prev - 10))}
                className="p-2 text-[#92a4c9] hover:text-white rounded-md hover:bg-[#232f48] transition-colors"
                title="Zoom Out"
              >
                <span className="material-symbols-outlined text-[20px]">remove_circle_outline</span>
              </button>
              <span className="text-white font-mono text-sm w-12 text-center select-none">{zoom}%</span>
              <button
                onClick={() => setZoom(prev => Math.min(200, prev + 10))}
                className="p-2 text-[#92a4c9] hover:text-white rounded-md hover:bg-[#232f48] transition-colors"
                title="Zoom In"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle_outline</span>
              </button>
              <div className="w-px h-6 bg-[#232f48] mx-2"></div>
              {files.find(f => f.id === activeFile)?.path && (
                <button
                  onClick={async () => {
                    const file = files.find(f => f.id === activeFile)
                    if (file?.path) {
                      // Use id-pictures bucket for 2x2 ID pictures, resumes bucket for others
                      const bucket = file.file_type === '2x2_ID_PICTURE' ? 'id-pictures' : 'resumes'
                      const { data } = await supabase.storage
                        .from(bucket)
                        .createSignedUrl(file.path, 3600)
                      if (data?.signedUrl) {
                        window.open(data.signedUrl, '_blank')
                      }
                    }
                  }}
                  className="p-2 text-primary hover:text-white rounded-md hover:bg-primary transition-colors"
                  title="Download"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                </button>
              )}
            </div>
          </div>

          {/* Document Canvas Area */}
          <div className="flex-1 overflow-auto bg-[#0d121c] flex justify-center p-8 relative scroll-smooth custom-scrollbar-dark">
            {fileUrl ? (
              <div
                className="bg-white min-h-[1100px] shadow-2xl relative transform origin-top transition-transform duration-200"
                style={{ width: `${850 * (zoom / 100)}px`, transform: `scale(${zoom / 100})` }}
              >
                {files.find(f => f.id === activeFile)?.type === 'pdf' ? (
                  <iframe
                    src={fileUrl}
                    className="w-full h-full min-h-[1100px]"
                    title="Document Viewer"
                  />
                ) : (
                  <img
                    src={fileUrl}
                    alt={files.find(f => f.id === activeFile)?.name}
                    className="w-full h-auto"
                  />
                )}
                {/* Watermark */}
                <div className="absolute top-10 right-10 border-4 border-red-500/20 text-red-500/20 font-black text-6xl uppercase transform -rotate-12 p-4 pointer-events-none select-none">
                  Confidential
                </div>
              </div>
            ) : (
              <div className="w-[850px] bg-white min-h-[1100px] shadow-2xl relative text-[#111418] p-12 flex flex-col gap-8">
                <div className="text-center text-gray-500 py-20">
                  <span className="material-symbols-outlined text-6xl mb-4 block">description</span>
                  <p className="text-lg">No document available</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Sticky Footer Actions */}
      <footer className="h-20 bg-[#111722] border-t border-[#232f48] shrink-0 flex items-center justify-between px-8 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-6">
          <button
            onClick={handleFlag}
            className="flex items-center gap-2 text-[#92a4c9] hover:text-white px-4 py-2.5 rounded-lg text-sm font-bold border border-[#324467] hover:bg-[#232f48] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">flag</span>
            Flag for Review
          </button>
          <div className="h-8 w-px bg-[#232f48]"></div>
          <div>
            <p className="text-[#92a4c9] text-xs font-bold uppercase tracking-wide">Application Date</p>
            <p className="text-white text-sm font-mono">
              {formatDate(application?.submitted_at || application?.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!['interview', 'rejected'].includes(application?.status?.toLowerCase()) && (
            <>
              <button
                onClick={handleReject}
                className="px-6 py-3 rounded-lg text-red-400 font-bold text-sm border border-red-500/30 hover:bg-red-500/10 hover:border-red-500 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
                Reject Applicant
              </button>
              <button
                onClick={handleApprove}
                className="px-8 py-3 rounded-lg text-white bg-primary hover:bg-[#1151d3] font-bold text-sm shadow-[0_0_20px_rgba(19,91,236,0.3)] hover:shadow-[0_0_25px_rgba(19,91,236,0.5)] transition-all flex items-center gap-2 transform active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Approve for Interview
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}

export default ApplicantDetailView

