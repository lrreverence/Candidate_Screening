import { supabase } from './supabase'

/**
 * Uploads a file to Supabase Storage with timeout protection
 * @param {File} file - The file to upload
 * @param {string} userId - User ID for the file path
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<{path: string, url: string}>}
 */
export const uploadFileToStorage = async (file, userId, onProgress = null) => {
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid file object')
  }

  if (!userId) {
    throw new Error('User ID is required')
  }

  // Generate file path
  const timestamp = Date.now() + Math.random().toString(36).substring(7)
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `${userId}/${timestamp}_${sanitizedName}`

  console.log('[STORAGE_UPLOAD] Starting upload:', {
    fileName: file.name,
    fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
    filePath: filePath,
    bucket: 'resumes'
  })

  try {
    // Direct upload without timeout wrapper
    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    console.log('[STORAGE_UPLOAD] Upload response:', { data, error })

    if (error) {
      console.error('[STORAGE_UPLOAD] Upload error:', error)
      throw new Error(error.message || 'Upload failed')
    }

    const uploadedPath = data?.path || filePath
    console.log('[STORAGE_UPLOAD] Upload successful, path:', uploadedPath)

    // Get signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(uploadedPath, 3600)

    if (signedUrlError) {
      console.warn('[STORAGE_UPLOAD] Could not create signed URL:', signedUrlError)
    }

    const finalUrl = signedUrlData?.signedUrl || uploadedPath
    console.log('[STORAGE_UPLOAD] Final URL:', finalUrl)

    return {
      path: uploadedPath,
      url: finalUrl
    }
  } catch (error) {
    console.error('[STORAGE_UPLOAD] Upload failed:', error)
    throw error
  }
}

/**
 * Uploads multiple files to Supabase Storage
 * @param {File[]} files - Array of files to upload
 * @param {string} userId - User ID for the file paths
 * @param {Function} onProgress - Optional progress callback (fileIndex, fileName)
 * @returns {Promise<Array<{path: string, url: string, name: string, size: number, type: string}>>}
 */
export const uploadMultipleFiles = async (files, userId, onProgress = null) => {
  const results = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    if (onProgress) {
      onProgress(i + 1, files.length, file.name)
    }

    try {
      const { path, url } = await uploadFileToStorage(file, userId)
      
      results.push({
        path,
        url,
        name: file.name,
        size: file.size,
        type: file.type
      })
    } catch (error) {
      console.error(`[STORAGE_UPLOAD] Failed to upload ${file.name}:`, error)
      throw error // Re-throw to stop on first error
    }
  }

  return results
}

/**
 * Uploads a job image to Supabase Storage
 * @param {File} file - The image file to upload
 * @param {string} jobId - Job ID for the file path (optional, for updates)
 * @returns {Promise<{path: string, url: string}>}
 */
export const uploadJobImage = async (file, jobId = null) => {
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid file object')
  }

  // Validate it's an image
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  // Generate file path
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const pathPrefix = jobId ? `job_${jobId}` : 'jobs'
  const filePath = `${pathPrefix}/${timestamp}_${sanitizedName}`

  console.log('[JOB_IMAGE_UPLOAD] Starting upload:', {
    fileName: file.name,
    fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
    filePath: filePath,
    bucket: 'job-images'
  })

  try {
    // Upload to job-images bucket
    const { data, error } = await supabase.storage
      .from('job-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    console.log('[JOB_IMAGE_UPLOAD] Upload response:', { data, error })

    if (error) {
      console.error('[JOB_IMAGE_UPLOAD] Upload error:', error)
      throw new Error(error.message || 'Upload failed')
    }

    const uploadedPath = data?.path || filePath
    console.log('[JOB_IMAGE_UPLOAD] Upload successful, path:', uploadedPath)

    // Return the path (we'll use signed URLs when displaying)
    return {
      path: uploadedPath,
      url: uploadedPath // Store path, not signed URL (signed URLs expire)
    }
  } catch (error) {
    console.error('[JOB_IMAGE_UPLOAD] Upload failed:', error)
    throw error
  }
}

/**
 * Gets a signed URL for a job image from storage
 * @param {string} imagePath - The storage path of the image
 * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string|null>} - The signed URL or null if error
 */
export const getJobImageUrl = async (imagePath, expiresIn = 3600) => {
  if (!imagePath) {
    return null
  }

  // If it's already a full URL (external link), return it as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }

  try {
    const { data, error } = await supabase.storage
      .from('job-images')
      .createSignedUrl(imagePath, expiresIn)

    if (error) {
      console.error('[JOB_IMAGE] Error creating signed URL:', error)
      return null
    }

    return data?.signedUrl || null
  } catch (error) {
    console.error('[JOB_IMAGE] Error getting image URL:', error)
    return null
  }
}

/**
 * Deletes a job image from storage
 * @param {string} imagePath - The storage path of the image to delete
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const deleteJobImage = async (imagePath) => {
  if (!imagePath) {
    return false
  }

  // Don't delete external URLs
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return false
  }

  try {
    const { error } = await supabase.storage
      .from('job-images')
      .remove([imagePath])

    if (error) {
      console.error('[JOB_IMAGE] Error deleting image:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[JOB_IMAGE] Error deleting image:', error)
    return false
  }
}

