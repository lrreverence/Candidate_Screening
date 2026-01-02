import React, { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const DocumentsForm = () => {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [currentUploadFile, setCurrentUploadFile] = useState(null)

  const handleFileSelect = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Validate files - PDF only
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedType = 'application/pdf'

    const invalidFiles = []
    Array.from(files).forEach((file) => {
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

    // Upload files immediately
    await uploadFiles(Array.from(files))
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
      uploadFiles(Array.from(files))
    }
  }

  const uploadFiles = async (files) => {
    if (!user?.id) {
      alert('You must be logged in to upload files')
      return
    }

    setUploading(true)
    const newUploadedFiles = []

    try {
      // Step 1: Find applicant
      console.log('[DOCUMENTS] Finding applicant...')
      const { data: applicant, error: findError } = await supabase
        .from('applicants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (findError) {
        throw new Error(`Failed to find applicant: ${findError.message}`)
      }

      if (!applicant) {
        alert('Please complete Step 1 (Personal Information) first')
        navigate(`/apply/${jobId || ''}`)
        return
      }

      const applicantId = applicant.id
      console.log('[DOCUMENTS] Found applicant ID:', applicantId)

      // Step 2: Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setCurrentUploadFile(`Uploading ${i + 1}/${files.length}: ${file.name}`)

        try {
          // Generate file path
          const timestamp = Date.now()
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const filePath = `${user.id}/${timestamp}_${sanitizedName}`

          console.log('[DOCUMENTS] Uploading file:', file.name, 'to path:', filePath)

          // Upload to storage with timeout
          const uploadPromise = supabase.storage
            .from('resumes')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
          })

          const { data: uploadData, error: uploadError } = await Promise.race([
            uploadPromise,
            timeoutPromise
          ])

          if (uploadError) {
            console.error('[DOCUMENTS] Upload error:', uploadError)
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
          }

          if (!uploadData) {
            throw new Error('Upload completed but no data returned')
          }

          console.log('[DOCUMENTS] File uploaded successfully:', uploadData.path)

          // Save to documents table
          console.log('[DOCUMENTS] Saving document to database...')
          const { data: documentData, error: documentError } = await supabase
            .from('documents')
            .insert({
              applicant_id: applicantId,
              file_path: filePath,
              file_name: file.name,
              file_type: 'Document',
              file_size: file.size,
              mime_type: file.type
            })
            .select()
            .single()

          if (documentError) {
            console.error('[DOCUMENTS] Error saving document to database:', documentError)
            // Continue - file is uploaded even if DB save fails
          } else {
            console.log('[DOCUMENTS] Document saved to database:', documentData.id)
          }

          newUploadedFiles.push({
            id: documentData?.id || `temp_${Date.now()}`,
            name: file.name,
            path: filePath,
            size: file.size,
            type: file.type,
            uploaded_at: new Date().toISOString()
          })
        } catch (error) {
          console.error(`[DOCUMENTS] Error uploading ${file.name}:`, error)
          alert(`Failed to upload ${file.name}: ${error.message}`)
        }
      }

      // Update uploaded files list
      setUploadedFiles(prev => [...prev, ...newUploadedFiles])
      
      if (newUploadedFiles.length > 0) {
        alert(`${newUploadedFiles.length} file(s) uploaded successfully!`)
      }
    } catch (error) {
      console.error('[DOCUMENTS] Upload error:', error)
      alert(`Upload failed: ${error.message}`)
    } finally {
      setUploading(false)
      setCurrentUploadFile(null)
    }
  }

  const handleRemoveFile = async (fileToRemove) => {
    try {
      // Remove from storage
      if (fileToRemove.path) {
        const { error } = await supabase.storage
          .from('resumes')
          .remove([fileToRemove.path])
        
        if (error) {
          console.error('Error removing file from storage:', error)
        }
      }

      // Remove from database
      if (fileToRemove.id && !fileToRemove.id.startsWith('temp_')) {
        const { error } = await supabase
          .from('documents')
          .delete()
          .eq('id', fileToRemove.id)
        
        if (error) {
          console.error('Error removing document from database:', error)
        }
      }

      // Remove from state
      setUploadedFiles(prev => prev.filter(f => f.id !== fileToRemove.id))
    } catch (error) {
      console.error('Error removing file:', error)
      alert('Failed to remove file. Please try again.')
    }
  }

  const handleNext = async (e) => {
    e.preventDefault()

    if (uploadedFiles.length === 0) {
      const proceed = confirm('No documents uploaded. Do you want to continue without uploading documents?')
      if (!proceed) return
    }

    setLoading(true)

    try {
      // Find applicant
      const { data: applicant, error: findError } = await supabase
        .from('applicants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (findError || !applicant) {
        throw new Error('Failed to find applicant. Please complete previous steps first.')
      }

      // Update application progress
      if (jobId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(jobId)) {
          const { error: appError } = await supabase
            .from('applications')
            .update({ current_step: 3 })
            .eq('applicant_id', applicant.id)
            .eq('job_id', jobId)

          if (appError) {
            console.warn('[DOCUMENTS] Could not update application step:', appError)
          }
        }
      }

      // Navigate to success page
      navigate(`/apply/${jobId || ''}/success`)
    } catch (error) {
      console.error('[DOCUMENTS] Error:', error)
      alert(`Failed to save: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate(`/apply/${jobId || ''}/qualifications`)
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
                <p className="text-slate-500 dark:text-[#93c5fd] text-sm font-normal">Step 3 of 4: Document Upload</p>
              </div>
              <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
            </div>
            <div className="rounded-full bg-gray-200 dark:bg-[#2563eb] h-3 overflow-hidden">
              <div className="h-full rounded-full bg-primary relative w-3/4">
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Page Heading */}
          <div className="flex flex-col gap-2 pt-4">
            <h1 className="text-slate-900 dark:text-white text-3xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
              Upload Documents
            </h1>
            <p className="text-slate-600 dark:text-[#93c5fd] text-base md:text-lg font-normal leading-relaxed max-w-2xl">
              Upload your supporting documents (PDF format only, max 10MB per file). Documents are saved immediately to secure storage.
            </p>
          </div>

          <form onSubmit={handleNext} className="flex flex-col gap-8">
            {/* Document Upload Area */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#2563eb]">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">upload_file</span>
                Document Upload
              </h3>
              <div
                className={`mt-2 flex justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-all ${
                  uploading 
                    ? 'border-primary bg-primary/5 cursor-wait' 
                    : 'border-gray-300 dark:border-[#2563eb] hover:bg-gray-50 dark:hover:bg-[#1e293b] cursor-pointer group'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !uploading && document.getElementById('file-upload').click()}
              >
                <div className="text-center">
                  {uploading ? (
                    <>
                      <div className="inline-block animate-spin">
                        <span className="material-symbols-outlined text-primary text-5xl">sync</span>
                      </div>
                      <div className="mt-4 text-sm leading-6 text-primary font-semibold">
                        Uploading files...
                      </div>
                      {currentUploadFile && (
                        <p className="text-xs leading-5 text-primary mt-2 font-medium">
                          {currentUploadFile}
                        </p>
                      )}
                      <p className="text-xs leading-5 text-slate-500 dark:text-gray-500 mt-2">Please wait while we upload your files</p>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-gray-400 dark:text-[#93c5fd] text-5xl group-hover:text-primary transition-colors">cloud_upload</span>
                      <div className="mt-4 flex text-sm leading-6 text-slate-600 dark:text-gray-400">
                        <span className="relative cursor-pointer rounded-md font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:text-blue-400">
                          <span>Upload a file</span>
                        </span>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-slate-500 dark:text-gray-500">PDF files only, up to 10MB each</p>
                    </>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                </div>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="text-sm text-slate-600 dark:text-gray-400 font-semibold">
                    Uploaded files ({uploadedFiles.length}):
                  </p>
                  {uploadedFiles.map((file, index) => (
                    <div key={file.id || index} className="flex items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-[#1e293b] rounded-lg text-sm text-slate-700 dark:text-gray-300">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="material-symbols-outlined text-primary flex-shrink-0">description</span>
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-slate-500 flex-shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full flex-shrink-0">
                          Uploaded
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors flex-shrink-0"
                        title="Remove file"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                disabled={loading || uploading}
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

export default DocumentsForm

