import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const DocumentUploadForm = () => {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState({ resume: false, file201: false, idPhoto: false })
  
  const [documents, setDocuments] = useState({
    resume: null,
    file201: null,
    idPhoto: null
  })

  // Load existing documents
  useEffect(() => {
    const loadDocuments = async () => {
      if (!user?.id) return

      try {
        // Get applicant
        const { data: applicant } = await supabase
          .from('applicants')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!applicant) return

        // Load documents for this applicant
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('applicant_id', applicant.id)

        if (docs) {
          const docsMap = {}
          docs.forEach(doc => {
            if (doc.file_type === 'Resume') {
              docsMap.resume = {
                url: doc.file_path,
                name: doc.file_name,
                size: doc.file_size,
                id: doc.id
              }
            } else if (doc.file_type === '201File') {
              docsMap.file201 = {
                url: doc.file_path,
                name: doc.file_name,
                size: doc.file_size,
                id: doc.id
              }
            } else if (doc.file_type === 'IDPhoto') {
              docsMap.idPhoto = {
                url: doc.file_path,
                name: doc.file_name,
                size: doc.file_size,
                id: doc.id
              }
            }
          })
          setDocuments(docsMap)
        }
      } catch (error) {
        console.error('Error loading documents:', error)
      }
    }

    loadDocuments()
  }, [user, jobId])

  const handleFileUpload = async (file, type) => {
    // Validate file
    const maxSize = 10 * 1024 * 1024 // 10MB
    let allowedTypes = []

    if (type === 'resume') {
      allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    } else if (type === 'file201') {
      allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    } else if (type === 'idPhoto') {
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    }

    if (file.size > maxSize) {
      alert('File size must be less than 10MB')
      return
    }

    if (!allowedTypes.includes(file.type)) {
      const typeNames = {
        resume: 'PDF or DOCX',
        file201: 'PDF, JPG, or PNG',
        idPhoto: 'JPG or PNG'
      }
      alert(`File must be ${typeNames[type]}`)
      return
    }

    setUploading(prev => ({ ...prev, [type]: true }))

    try {
      // Get applicant
      const { data: applicant } = await supabase
        .from('applicants')
        .select('id')
        .eq('user_id', user?.id || null)
        .single()

      if (!applicant) {
        alert('Please complete previous steps first')
        return
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${applicant.id}/${type}_${Date.now()}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('Failed to upload file. Please ensure the storage bucket is set up.')
        return
      }

      // Get signed URL (for private bucket access)
      const { data: { signedUrl } } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 3600)

      // Map file type
      const fileTypeMap = {
        resume: 'Resume',
        file201: '201File',
        idPhoto: 'IDPhoto'
      }

      // Check if document already exists for this type
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('id')
        .eq('applicant_id', applicant.id)
        .eq('file_type', fileTypeMap[type])
        .single()

      if (existingDoc) {
        // Update existing document
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type
          })
          .eq('id', existingDoc.id)

        if (updateError) throw updateError
      } else {
        // Create new document record
        const { error: insertError } = await supabase
          .from('documents')
          .insert({
            applicant_id: applicant.id,
            file_path: filePath,
            file_name: file.name,
            file_type: fileTypeMap[type],
            file_size: file.size,
            mime_type: file.type
          })

        if (insertError) throw insertError
      }

      const fileData = {
        url: signedUrl || filePath,
        path: filePath,
        name: file.name,
        size: file.size,
        type: file.type,
        uploaded_at: new Date().toISOString()
      }

      setDocuments(prev => ({ ...prev, [type]: fileData }))
      alert('File uploaded successfully!')
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }))
    }
  }


  const handleRemoveFile = async (type) => {
    if (!confirm('Are you sure you want to remove this file?')) return

    try {
      // Get applicant
      const { data: applicant } = await supabase
        .from('applicants')
        .select('id')
        .eq('user_id', user?.id || null)
        .single()

      if (!applicant) return

      const fileTypeMap = {
        resume: 'Resume',
        file201: '201File',
        idPhoto: 'IDPhoto'
      }

      // Get document record
      const { data: doc } = await supabase
        .from('documents')
        .select('id, file_path')
        .eq('applicant_id', applicant.id)
        .eq('file_type', fileTypeMap[type])
        .single()

      if (doc) {
        // Remove from storage
        if (doc.file_path) {
          await supabase.storage
            .from('resumes')
            .remove([doc.file_path])
        }

        // Delete document record
        await supabase
          .from('documents')
          .delete()
          .eq('id', doc.id)
      }

      setDocuments(prev => ({ ...prev, [type]: null }))
    } catch (error) {
      console.error('Error removing file:', error)
      alert('Failed to remove file. Please try again.')
    }
  }

  const handleBack = () => {
    navigate(`/apply/${jobId || ''}/qualifications`)
  }

  const handleNext = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get applicant
      const { data: applicant } = await supabase
        .from('applicants')
        .select('id')
        .eq('user_id', user?.id || null)
        .single()

      if (!applicant) {
        alert('Please complete previous steps first')
        return
      }

      // Update application current_step
      if (jobId) {
        const { error } = await supabase
          .from('applications')
          .update({
            current_step: 3
          })
          .eq('applicant_id', applicant.id)
          .eq('job_id', jobId)

        if (error) throw error
      }

      // Navigate to success page (Step 4)
      navigate(`/apply/${jobId || ''}/success`)
    } catch (error) {
      console.error('Error saving step 3:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  const DocumentCard = ({ type, title, acceptedFormats, icon, file, onUpload, onRemove, uploading }) => {
    const hasFile = file !== null
    const isUploading = uploading

    return (
      <div className="flex flex-col">
        <div
          className={`flex flex-col h-full items-center justify-center gap-6 rounded-2xl border-2 ${
            hasFile
              ? 'border-solid border-primary bg-surface-dark'
              : 'border-dashed border-accent-green bg-surface-dark/50 hover:bg-surface-dark/80 hover:border-primary/50'
          } transition-all p-6 py-10 group cursor-pointer relative overflow-hidden`}
        >
          {/* Success Badge */}
          {hasFile && (
            <div className="absolute top-4 right-4">
              <span className="material-symbols-outlined text-primary">check_circle</span>
            </div>
          )}

          {/* Icon Circle */}
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
            hasFile ? 'bg-primary/20' : 'bg-border-dark group-hover:bg-primary/20'
          } transition-colors`}>
            <span className={`material-symbols-outlined text-3xl text-primary ${
              !hasFile && 'group-hover:scale-110'
            } transition-transform`}>
              {icon}
            </span>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-white text-lg font-bold">{title}</h3>
            {hasFile ? (
              <>
                <p className="text-primary text-sm font-medium break-all px-4">{file.name}</p>
                <p className="text-[#92c9a8] text-xs">{formatFileSize(file.size)}</p>
              </>
            ) : (
              <p className="text-[#92c9a8] text-xs">{acceptedFormats}</p>
            )}
          </div>

          {/* Actions */}
          {hasFile ? (
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(type)
                }}
                className="flex items-center justify-center rounded-full h-10 w-10 bg-border-dark text-[#92c9a8] hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
                title="Remove file"
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
              <label className="flex items-center justify-center rounded-full h-10 px-6 bg-border-dark text-white text-sm font-bold tracking-wide hover:bg-accent-green transition-colors cursor-pointer">
                {isUploading ? 'Uploading...' : 'Replace'}
                <input
                  type="file"
                  className="hidden"
                  accept={type === 'resume' ? '.pdf,.doc,.docx' : type === 'file201' ? '.pdf,.jpg,.jpeg,.png' : '.jpg,.jpeg,.png'}
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      onUpload(e.target.files[0], type)
                    }
                  }}
                  disabled={isUploading}
                />
              </label>
            </div>
          ) : (
            <label className="mt-2 flex items-center justify-center rounded-full h-10 px-6 bg-border-dark text-white text-sm font-bold tracking-wide group-hover:bg-primary group-hover:text-background-dark transition-all shadow-lg cursor-pointer">
              {isUploading ? 'Uploading...' : 'Upload'}
              <input
                type="file"
                className="hidden"
                accept={type === 'resume' ? '.pdf,.doc,.docx' : type === 'file201' ? '.pdf,.jpg,.jpeg,.png' : '.jpg,.jpeg,.png'}
                onChange={(e) => {
                  if (e.target.files[0]) {
                    onUpload(e.target.files[0], type)
                  }
                }}
                disabled={isUploading}
              />
            </label>
          )}
        </div>
      </div>
    )
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
            <p className="text-[#92c9a8] text-sm md:text-base font-normal leading-relaxed max-w-2xl">
              Please provide your Resume, 201 File, and ID Photo. Ensure all text is legible.
              <br className="hidden md:block" />
              Accepted formats: PDF, JPG, PNG. Max file size: 10MB.
            </p>
          </div>

          {/* Upload Grid */}
          <form onSubmit={handleNext} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DocumentCard
                type="resume"
                title="Resume / CV"
                acceptedFormats="PDF or DOCX"
                icon="description"
                file={documents.resume}
                onUpload={handleFileUpload}
                onRemove={handleRemoveFile}
                uploading={uploading.resume}
              />
              <DocumentCard
                type="file201"
                title="201 File"
                acceptedFormats="PDF, JPG, or PNG"
                icon="folder_shared"
                file={documents.file201}
                onUpload={handleFileUpload}
                onRemove={handleRemoveFile}
                uploading={uploading.file201}
              />
              <DocumentCard
                type="idPhoto"
                title="ID Photo"
                acceptedFormats="JPG or PNG (2x2)"
                icon="badge"
                file={documents.idPhoto}
                onUpload={handleFileUpload}
                onRemove={handleRemoveFile}
                uploading={uploading.idPhoto}
              />
            </div>

            {/* Additional Info / Help */}
            <div className="rounded-xl bg-[#1a3326] p-4 flex items-start gap-3 border border-border-dark">
              <span className="material-symbols-outlined text-[#92c9a8] mt-0.5">info</span>
              <p className="text-sm text-[#92c9a8] leading-relaxed">
                <strong>Note:</strong> The 201 File must include your NBI Clearance, Birth Certificate, and Government Numbers (SSS, PhilHealth, Pag-IBIG). If you don't have all documents ready, you can save your progress and return later.
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
                className="flex items-center justify-center rounded-full h-12 px-10 bg-primary text-background-dark font-bold hover:bg-green-400 transition-colors shadow-[0_0_20px_rgba(43,238,121,0.2)] w-full sm:w-auto disabled:opacity-50"
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

