import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import ApplicationHeader from '../components/application/ApplicationHeader'
import ApplicationBreadcrumbs from '../components/application/ApplicationBreadcrumbs'
import ApplicationProgress from '../components/application/ApplicationProgress'
import ApplicationFooter from '../components/application/ApplicationFooter'

const IdPictureUpload = () => {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  // Load existing ID picture if available for this specific application
  useEffect(() => {
    const loadExistingPicture = async () => {
      if (!user?.id) return

      try {
        // Find applicant
        const { data: applicant } = await supabase
          .from('applicants')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!applicant) return

        // Get or find application for this job
        let applicationId = null
        if (jobId) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (uuidRegex.test(jobId)) {
            const { data: existingApp } = await supabase
              .from('applications')
              .select('id')
              .eq('applicant_id', applicant.id)
              .eq('job_id', jobId)
              .maybeSingle()

            if (existingApp) {
              applicationId = existingApp.id
            }
          }
        }

        // Check if ID picture document exists for this application
        let query = supabase
          .from('documents')
          .select('*')
          .eq('applicant_id', applicant.id)
          .eq('file_type', '2x2_ID_PICTURE')

        // Filter by application_id if available
        if (applicationId) {
          query = query.eq('application_id', applicationId)
        }

        const { data: documents } = await query
          .order('created_at', { ascending: false })
          .limit(1)

        if (documents && documents.length > 0) {
          const doc = documents[0]
          // Get signed URL for preview
          const { data: signedUrlData } = await supabase.storage
            .from('id-pictures')
            .createSignedUrl(doc.file_path, 3600)

          if (signedUrlData?.signedUrl) {
            setUploadedFile({
              id: doc.id,
              name: doc.file_name,
              path: doc.file_path,
              size: doc.file_size,
              type: doc.mime_type
            })
            setPreviewUrl(signedUrlData.signedUrl)
          }
        }
      } catch (error) {
        console.error('Error loading existing ID picture:', error)
      }
    }

    loadExistingPicture()
  }, [user?.id])

  // Convert image to JPEG format for compatibility with storage bucket
  const convertImageToJpeg = (file) => {
    return new Promise((resolve, reject) => {
      // Normalize JPEG MIME type - ensure it's exactly 'image/jpeg'
      const normalizeJpegFile = (originalFile) => {
        if (originalFile.type === 'image/jpeg') {
          return originalFile
        }
        // If it's image/jpg, create a new file with image/jpeg MIME type
        if (originalFile.type === 'image/jpg') {
          return new File([originalFile], originalFile.name.replace(/\.jpg$/i, '.jpg'), {
            type: 'image/jpeg',
            lastModified: originalFile.lastModified
          })
        }
        return originalFile
      }

      // If already JPEG, normalize and return
      if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        const normalized = normalizeJpegFile(file)
        console.log('[ID_PICTURE] Original MIME type:', file.type, 'Normalized to:', normalized.type)
        resolve(normalized)
        return
      }

      // Convert PNG/WebP to JPEG
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image'))
              return
            }
            // Create a new File object with normalized JPEG MIME type
            const jpegFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            console.log('[ID_PICTURE] Converted file MIME type:', jpegFile.type)
            resolve(jpegFile)
          }, 'image/jpeg', 0.92) // 92% quality
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target.result
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file - image only
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    if (file.size > maxSize) {
      alert('File size exceeds 5MB. Please upload a smaller image.')
      return
    }

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload an image file (JPEG, PNG, or WebP).')
      return
    }

    // Create preview from original file
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result)
    }
    reader.readAsDataURL(file)

    // Convert to JPEG if needed and upload
    try {
      const fileToUpload = await convertImageToJpeg(file)
      await uploadFile(fileToUpload)
    } catch (error) {
      console.error('Error converting image:', error)
      alert('Failed to process image. Please try again.')
    }
  }

  const uploadFile = async (file) => {
    if (!user?.id) {
      alert('You must be logged in to upload files')
      return
    }

    setUploading(true)

    try {
      // Find applicant
      const { data: applicant } = await supabase
        .from('applicants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!applicant) {
        alert('Please complete Step 1 (Personal Information) first')
        navigate(`/apply/${jobId || ''}`)
        setUploading(false)
        return
      }

      const applicantId = applicant.id

      // Get or create application for this job
      let applicationId = null
      if (jobId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(jobId)) {
          const { data: existingApp, error: appError } = await supabase
            .from('applications')
            .select('id')
            .eq('applicant_id', applicantId)
            .eq('job_id', jobId)
            .maybeSingle()

          if (appError) {
            console.error('[ID_PICTURE] Error finding application:', appError)
          } else if (existingApp) {
            applicationId = existingApp.id
            console.log('[ID_PICTURE] Found application ID:', applicationId)
          } else {
            // Create application if it doesn't exist
            const { data: newApp, error: createError } = await supabase
              .from('applications')
              .insert({
                applicant_id: applicantId,
                job_id: jobId,
                status: 'Pending',
                current_step: 2
              })
              .select('id')
              .single()

            if (createError) {
              console.error('[ID_PICTURE] Error creating application:', createError)
            } else if (newApp) {
              applicationId = newApp.id
              console.log('[ID_PICTURE] Created application ID:', applicationId)
            }
          }
        }
      }

      // Remove existing ID picture if any (only for this application)
      if (uploadedFile?.path && applicationId) {
        // Only remove if it belongs to this application
        const { data: existingDoc } = await supabase
          .from('documents')
          .select('application_id')
          .eq('id', uploadedFile.id)
          .maybeSingle()

        if (existingDoc?.application_id === applicationId) {
          await supabase.storage
            .from('id-pictures')
            .remove([uploadedFile.path])

          await supabase
            .from('documents')
            .delete()
            .eq('id', uploadedFile.id)
        }
      } else if (uploadedFile?.path && !applicationId) {
        // Fallback: remove if no application context
        await supabase.storage
          .from('id-pictures')
          .remove([uploadedFile.path])

        if (uploadedFile?.id) {
          await supabase
            .from('documents')
            .delete()
            .eq('id', uploadedFile.id)
        }
      }
      if (uploadedFile?.path) {
        await supabase.storage
          .from('id-pictures')
          .remove([uploadedFile.path])
      }

      if (uploadedFile?.id) {
        await supabase
          .from('documents')
          .delete()
          .eq('id', uploadedFile.id)
      }

      // Generate file path
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${user.id}/id_picture_${timestamp}_${sanitizedName}`

      // Log file details for debugging
      console.log('[ID_PICTURE] Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        path: filePath
      })

      // Ensure file has correct MIME type - create new File if needed
      let fileToUpload = file
      if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
        // Create a new File with explicit image/jpeg type
        fileToUpload = new File([file], file.name.replace(/\.[^/.]+$/, '.jpg'), {
          type: 'image/jpeg',
          lastModified: file.lastModified || Date.now()
        })
        console.log('[ID_PICTURE] Normalized MIME type from', file.type, 'to', fileToUpload.type)
      }

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('id-pictures')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Failed to upload: ${uploadError.message}`)
      }

      // Save to documents table
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert({
          applicant_id: applicantId,
          application_id: applicationId,
          file_path: filePath,
          file_name: file.name,
          file_type: '2x2_ID_PICTURE',
          file_size: file.size,
          mime_type: file.type
        })
        .select()
        .single()

      if (documentError) {
        console.error('Error saving document to database:', documentError)
        // File is uploaded even if DB save fails
      }

      setUploadedFile({
        id: documentData?.id || `temp_${Date.now()}`,
        name: file.name,
        path: filePath,
        size: file.size,
        type: file.type
      })

      alert('2x2 ID picture uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      alert(`Upload failed: ${error.message}`)
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = async () => {
    if (!confirm('Are you sure you want to remove this ID picture?')) return

    try {
      if (uploadedFile?.path) {
        await supabase.storage
          .from('id-pictures')
          .remove([uploadedFile.path])
      }

      if (uploadedFile?.id && !uploadedFile.id.startsWith('temp_')) {
        await supabase
          .from('documents')
          .delete()
          .eq('id', uploadedFile.id)
      }

      setUploadedFile(null)
      setPreviewUrl(null)
      alert('ID picture removed successfully')
    } catch (error) {
      console.error('Error removing file:', error)
      alert('Failed to remove file. Please try again.')
    }
  }

  const handleNext = async (e) => {
    e.preventDefault()

    if (!uploadedFile) {
      alert('Please upload a 2x2 ID picture before proceeding.')
      return
    }

    setLoading(true)

    try {
      // Find applicant
      const { data: applicant } = await supabase
        .from('applicants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!applicant) {
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
            console.warn('Could not update application step:', appError)
          }
        }
      }

      // Navigate to documents page
      navigate(`/apply/${jobId || ''}/documents`)
    } catch (error) {
      console.error('Error:', error)
      alert(`Failed to save: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate(`/apply/${jobId || ''}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display transition-colors duration-200">
      <ApplicationHeader />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <ApplicationBreadcrumbs />

        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Upload Your 2x2 ID Picture</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Please upload a recent 2x2 ID picture. This will be used for your application and identification.
          </p>
        </div>

        <ApplicationProgress currentStep={2} totalSteps={4} />

        {/* Main Form Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 md:p-10 border border-gray-200 dark:border-white/5 shadow-xl">
          <form onSubmit={handleNext} className="space-y-8">
            {/* Upload Area */}
            <div className="space-y-4">
              <label className="text-xl font-bold mb-4 flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/10">
                <span className="material-symbols-outlined text-primary">photo_camera</span>
                2x2 ID Picture
              </label>

              <div
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
                  uploading
                    ? 'border-primary bg-primary/5 cursor-wait'
                    : 'border-gray-300 dark:border-[#2563eb] hover:bg-gray-50 dark:hover:bg-[#1e293b] cursor-pointer group'
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const files = e.dataTransfer.files
                  if (files && files.length > 0 && !uploading) {
                    handleFileSelect({ target: { files } })
                  }
                }}
                onClick={() => !uploading && document.getElementById('id-picture-upload').click()}
              >
                {uploading ? (
                  <div className="text-center">
                    <div className="inline-block animate-spin mb-4">
                      <span className="material-symbols-outlined text-primary text-5xl">sync</span>
                    </div>
                    <p className="text-primary font-semibold">Uploading...</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please wait</p>
                  </div>
                ) : previewUrl ? (
                  <div className="relative w-full max-w-xs">
                    <img
                      src={previewUrl}
                      alt="2x2 ID Picture Preview"
                      className="w-full h-auto rounded-lg border-2 border-primary shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveFile()
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                      title="Remove picture"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 mx-auto mb-4">
                      <span className="material-symbols-outlined text-4xl text-primary">photo_camera</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2">Click to upload or drag and drop</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      JPEG, PNG, or WebP • Max 5MB • 2x2 inches recommended
                    </p>
                  </div>
                )}
                <input
                  id="id-picture-upload"
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </div>

              {uploadedFile && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-[#0f172a] rounded-lg border border-gray-200 dark:border-[#2563eb]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">check_circle</span>
                      <div>
                        <p className="font-semibold text-sm">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
                      Uploaded
                    </span>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 mt-0.5">info</span>
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-semibold mb-1">Photo Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Recent 2x2 inch photo (passport size)</li>
                      <li>Clear, front-facing, professional appearance</li>
                      <li>Plain white or light-colored background</li>
                      <li>File formats: JPEG, PNG, or WebP</li>
                      <li>Maximum file size: 5MB</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 pt-6 mt-8 border-t border-gray-100 dark:border-white/10">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 rounded-full border border-gray-300 dark:border-[#2563eb] text-slate-700 dark:text-white font-bold hover:bg-gray-100 dark:hover:bg-[#1e293b] transition-all"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Back
              </button>
              <button
                type="submit"
                disabled={loading || uploading || !uploadedFile}
                className="px-10 py-4 rounded-full bg-primary text-background-dark font-bold hover:bg-primary/90 transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </main>

      <ApplicationFooter />
    </div>
  )
}

export default IdPictureUpload

