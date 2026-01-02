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

