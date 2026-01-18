import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Document types that applicants can upload
const DOCUMENT_TYPES = [
  'BIO-DATA',
  'PHOTOCOPY OF SECURITY LICENSE / SBR',
  'BARANGAY CLEARANCE',
  'POLICE CLEARANCE',
  'NBI CLEARANCE',
  'EMPLOYMENT CERTIFICATE',
  'DRUG TEST',
  'NEURO-PSYCHIATRIC TEST / MEDICAL EXAMINATION',
  'RE-TRAINING CERTIFICATE / GUN',
  'BIRTH CERTIFICATE',
  'EDUCATIONAL DIPLOMA\'S / TRANSCRIPT OF RECORD',
  'OTHER GKE, OPENING AND CLOSING REPORT',
  'VACCINATION CARD'
]

const DocumentUploadForm = () => {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState('')
  const [requiredDocuments, setRequiredDocuments] = useState([])
  const [availableDocumentTypes, setAvailableDocumentTypes] = useState(DOCUMENT_TYPES)
  
  const [documents, setDocuments] = useState([])

  // Fetch job requirements
  useEffect(() => {
    const fetchJobRequirements = async () => {
      if (!jobId) {
        // If no jobId, show all document types
        setAvailableDocumentTypes(DOCUMENT_TYPES)
        setSelectedDocumentType(DOCUMENT_TYPES[0])
        return
      }

      try {
        const { data: job, error } = await supabase
          .from('jobs')
          .select('required_documents')
          .eq('id', jobId)
          .single()

        if (error) throw error

        if (job?.required_documents && Array.isArray(job.required_documents) && job.required_documents.length > 0) {
          // Job has specific requirements
          setRequiredDocuments(job.required_documents)
          const requiredTypes = job.required_documents.map(doc => doc.document_type)
          setAvailableDocumentTypes(requiredTypes)
          setSelectedDocumentType(requiredTypes[0] || DOCUMENT_TYPES[0])
        } else {
          // No specific requirements, show all
          setRequiredDocuments([])
          setAvailableDocumentTypes(DOCUMENT_TYPES)
          setSelectedDocumentType(DOCUMENT_TYPES[0])
        }
      } catch (error) {
        console.error('Error fetching job requirements:', error)
        // Fallback to all document types
        setAvailableDocumentTypes(DOCUMENT_TYPES)
        setSelectedDocumentType(DOCUMENT_TYPES[0])
      }
    }

    fetchJobRequirements()
  }, [jobId])

  // Load existing documents from localStorage (if any were uploaded previously in this session)
  useEffect(() => {
    const savedDocs = localStorage.getItem(`application_documents_${jobId || 'general'}`)
    if (savedDocs) {
      try {
        const parsed = JSON.parse(savedDocs)
        // Handle both old format (object) and new format (array)
        if (Array.isArray(parsed)) {
          setDocuments(parsed)
        } else {
          // Convert old format to new format
          const docsArray = Object.values(parsed).filter(doc => doc !== null)
          setDocuments(docsArray)
        }
      } catch (e) {
        console.error('Error loading saved documents:', e)
      }
    }
  }, [jobId])

  const handleMultipleFileUpload = async (files) => {
    // Validate all files are PDFs
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedType = 'application/pdf'
    
    const invalidFiles = []
    Array.from(files).forEach((file, index) => {
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (exceeds 10MB)`)
      }
      if (file.type !== allowedType) {
        invalidFiles.push(`${file.name} (not a PDF)`)
      }
    })

    if (invalidFiles.length > 0) {
      alert(`Invalid files:\n${invalidFiles.join('\n')}\n\nPlease upload PDF files only, max 10MB each.`)
      return
    }

    setUploading(true)

    try {
      // Check if personal info exists in localStorage (from step 1)
      const personalInfo = localStorage.getItem(`application_form_${jobId || 'general'}`)
      if (!personalInfo) {
        alert('Please complete Step 1 first')
        return
      }

      const uploadedFiles = []
      const tempId = user?.id || `temp_${Date.now()}`

      // Upload all files
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop()
        const timestamp = Date.now() + Math.random().toString(36).substring(7)
        const fileName = `${tempId}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = fileName

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error for', file.name, ':', uploadError)
          continue // Skip this file and continue with others
        }

        // Get signed URL (for private bucket access)
        const { data: { signedUrl } } = await supabase.storage
          .from('resumes')
          .createSignedUrl(filePath, 3600)

        const fileData = {
          id: `${timestamp}_${file.name}`,
          url: signedUrl || filePath,
          path: filePath,
          name: file.name,
          size: file.size,
          type: file.type,
          file_type: selectedDocumentType, // Use selected document type
          uploaded_at: new Date().toISOString()
        }

        uploadedFiles.push(fileData)
      }

      if (uploadedFiles.length === 0) {
        alert('No files were uploaded. Please check the storage bucket is set up correctly.')
        return
      }

      // Add to existing documents
      setDocuments(prev => [...prev, ...uploadedFiles])
      
      // Save document info to localStorage
      const allDocs = [...documents, ...uploadedFiles]
      localStorage.setItem(`application_documents_${jobId || 'general'}`, JSON.stringify(allDocs))
      
      alert(`${uploadedFiles.length} file(s) uploaded successfully!`)
    } catch (error) {
      console.error('Error uploading files:', error)
      alert('Failed to upload files. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await handleMultipleFileUpload(files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleMultipleFileUpload(files)
    }
  }


  const handleRemoveFile = async (fileId) => {
    if (!confirm('Are you sure you want to remove this file?')) return

    try {
      const fileToRemove = documents.find(doc => doc.id === fileId)
      
      if (fileToRemove?.path) {
        // Remove from storage
        await supabase.storage
          .from('resumes')
          .remove([fileToRemove.path])
      }

      // Remove from state and localStorage
      const updatedDocs = documents.filter(doc => doc.id !== fileId)
      setDocuments(updatedDocs)
      
      localStorage.setItem(`application_documents_${jobId || 'general'}`, JSON.stringify(updatedDocs))
    } catch (error) {
      console.error('Error removing file:', error)
      alert('Failed to remove file. Please try again.')
    }
  }

  const handleBack = () => {
    navigate(`/apply/${jobId || ''}`)
  }

  const handleNext = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get applicant by user_id or email
      let applicantId = null
      
      if (user?.id) {
        const { data: applicant } = await supabase
          .from('applicants')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (applicant) {
          applicantId = applicant.id
        }
      }

      // If no applicant found by user_id, try by email
      if (!applicantId && user?.email) {
        const { data: applicant } = await supabase
          .from('applicants')
          .select('id')
          .eq('email', user.email)
          .maybeSingle()

        if (applicant) {
          applicantId = applicant.id
        }
      }

      if (!applicantId) {
        alert('Please complete previous steps first')
        navigate(`/apply/${jobId || ''}`)
        return
      }

      // Save document records to database
      if (documents.length > 0) {
        const documentRecords = documents
          .filter(doc => doc && doc.path)
          .map(doc => ({
            applicant_id: applicantId,
            file_path: doc.path,
            file_name: doc.name,
            file_type: doc.file_type || 'Document',
            file_size: doc.size,
            mime_type: doc.type
          }))
        
        if (documentRecords.length > 0) {
          // Insert all documents (allow multiple documents per applicant)
          const { error: insertError } = await supabase
            .from('documents')
            .insert(documentRecords)

          if (insertError) {
            // If bulk insert fails, try inserting one by one
            console.warn('Bulk insert failed, trying individual inserts:', insertError)
            for (const docRecord of documentRecords) {
              const { error: singleInsertError } = await supabase
                .from('documents')
                .insert(docRecord)
              
              if (singleInsertError) {
                console.error('Error inserting document:', singleInsertError)
                // Continue with other documents even if one fails
              }
            }
          }
        }
      }

      // Update application current_step
      if (jobId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(jobId)) {
          const { error } = await supabase
            .from('applications')
            .update({
              current_step: 3
            })
            .eq('applicant_id', applicantId)
            .eq('job_id', jobId)

          if (error) throw error
        }
      }

      // Navigate to success page (Step 4)
      navigate(`/apply/${jobId || ''}/success`)
    } catch (error) {
      console.error('Error saving step 3:', error)
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred'
      alert(`Failed to save: ${errorMessage}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
      {/* Navigation Bar */}
      <div className="relative flex w-full flex-col bg-surface-dark border-b border-border-dark">
        <div className="px-4 md:px-10 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 text-white">
            <div className="size-8 text-primary">
              <span className="material-symbols-outlined text-4xl">shield_person</span>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">E Power Security</h2>
          </Link>
          <button className="flex items-center justify-center rounded-full bg-border-dark text-white p-2 hover:bg-accent-green transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex justify-center py-8 px-4 md:px-6">
        <div className="flex flex-col max-w-[960px] w-full gap-8">
          {/* Progress Bar Section */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <p className="text-white text-base font-medium leading-normal">Step 3 of 4: Document Submission</p>
              <p className="text-primary text-sm font-bold leading-normal">75%</p>
            </div>
            <div className="rounded-full bg-border-dark h-2 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: '75%' }}></div>
            </div>
          </div>

          {/* Page Heading Section */}
          <div className="flex flex-col gap-3">
            <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">
              Upload Your Documents
            </h1>
            <p className="text-[#93c5fd] text-sm md:text-base font-normal leading-relaxed max-w-2xl">
              Upload your documents. You can upload multiple PDF files at once.
              <br className="hidden md:block" />
              Accepted format: PDF only. Max file size: 10MB per file.
            </p>
          </div>

          {/* Upload Area */}
          <form onSubmit={handleNext} className="flex flex-col gap-6">
            {/* Document Type Selector */}
            <div className="rounded-xl bg-[#1e293b] p-6 border border-[#2563eb]">
              <label className="block text-white text-sm font-bold mb-3">
                <span className="material-symbols-outlined text-primary align-middle mr-2">category</span>
                Document Type
                {requiredDocuments.length > 0 && (
                  <span className="text-xs font-normal text-[#93c5fd] ml-2">
                    (Required for this position)
                  </span>
                )}
              </label>
              <select
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#0f172a] border border-[#2563eb] text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={uploading}
              >
                {availableDocumentTypes.map((type) => {
                  const docReq = requiredDocuments.find(doc => doc.document_type === type)
                  const percentage = docReq?.percentage || 0
                  return (
                    <option key={type} value={type} className="bg-[#0f172a] text-white">
                      {type}{percentage > 0 ? ` (${percentage}%)` : ''}
                    </option>
                  )
                })}
              </select>
              <p className="text-[#93c5fd] text-xs mt-2">
                {requiredDocuments.length > 0 
                  ? `Select the type of document you're uploading. This position requires ${requiredDocuments.length} document type${requiredDocuments.length !== 1 ? 's' : ''}.`
                  : 'Select the type of document you're uploading. All files uploaded will be tagged with this type.'
                }
              </p>
              {requiredDocuments.length > 0 && (
                <div className="mt-3 p-3 bg-[#0f172a] rounded-lg border border-[#2563eb]">
                  <p className="text-xs font-semibold text-white mb-2">Required Documents for this Position:</p>
                  <div className="space-y-1">
                    {requiredDocuments.map((doc) => (
                      <div key={doc.document_type} className="flex items-center justify-between text-xs">
                        <span className="text-[#93c5fd]">{doc.document_type}</span>
                        <span className="text-primary font-bold">{doc.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drag and Drop Upload Area */}
            <div
              className="rounded-xl border-2 border-dashed border-[#2563eb] bg-[#1e293b] p-8 hover:border-primary hover:bg-[#1e293b]/80 transition-all cursor-pointer relative"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload').click()}
            >
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                  <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold mb-2">
                    {uploading ? 'Uploading files...' : 'Click to upload or drag and drop'}
                  </h3>
                  <p className="text-[#93c5fd] text-sm">
                    PDF files only • Max 10MB per file • Multiple files allowed
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
            </div>

            {/* Uploaded Files List */}
            {documents.length > 0 && (
              <div className="rounded-xl bg-[#1e293b] p-6 border border-[#2563eb]">
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">description</span>
                  Uploaded Documents ({documents.length})
                </h3>
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-[#0f172a] border border-[#2563eb] hover:border-primary transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="material-symbols-outlined text-primary flex-shrink-0">picture_as_pdf</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{doc.name}</p>
                          <p className="text-[#93c5fd] text-xs">{formatFileSize(doc.size)}</p>
                          {doc.file_type && (
                            <p className="text-[#60a5fa] text-xs mt-1 font-semibold">{doc.file_type}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveFile(doc.id)
                        }}
                        className="flex items-center justify-center rounded-full h-10 w-10 bg-[#2563eb] text-white hover:bg-red-500/20 hover:text-red-400 transition-colors flex-shrink-0 ml-4"
                        title="Remove file"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info / Help */}
            <div className="rounded-xl bg-[#1e293b] p-4 flex items-start gap-3 border border-[#2563eb]">
              <span className="material-symbols-outlined text-[#93c5fd] mt-0.5">info</span>
              <p className="text-sm text-[#93c5fd] leading-relaxed">
                <strong>Note:</strong> You can upload multiple PDF files at once. Please select the document type before uploading. All files uploaded will be tagged with the selected document type. Each file must be a PDF and under 10MB.
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-4 pt-4 border-t border-border-dark">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center rounded-full h-12 px-8 border border-accent-green text-white font-bold hover:bg-surface-dark transition-colors w-full sm:w-auto"
              >
                <span className="mr-2 material-symbols-outlined text-sm">arrow_back</span>
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center rounded-full h-12 px-10 bg-primary text-background-dark font-bold hover:bg-blue-400 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.2)] w-full sm:w-auto disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Next Step'}
                <span className="ml-2 material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default DocumentUploadForm

