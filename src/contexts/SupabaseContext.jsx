import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SupabaseContext = createContext({})

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

export const SupabaseProvider = ({ children }) => {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const retryCountRef = useRef(0)
  const MAX_RETRIES = 2

  const fetchJobs = useCallback(async (isRetry = false) => {
    console.log('[SUPABASE] fetchJobs called', { isRetry })

    try {
      console.log('[SUPABASE] Setting loading state...')
      setLoading(true)
      setError(null)

      console.log('[SUPABASE] Fetching jobs...')
      console.log('[SUPABASE] Supabase client exists:', !!supabase)
      console.log('[SUPABASE] Supabase URL:', supabase?.supabaseUrl)

      const startTime = Date.now()

      // Simple direct query
      console.log('[SUPABASE] Executing query NOW...')
      console.log('[SUPABASE] Supabase client:', {
        exists: !!supabase,
        url: supabase?.supabaseUrl,
        hasFrom: typeof supabase?.from === 'function'
      })

      // Try using REST API directly as fallback if client query hangs
      let data, error
      let useRestApi = false

      try {
        // First try the normal client query with a timeout
        const queryPromise = supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false })

        // Race with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 2000)
        )

        const result = await Promise.race([queryPromise, timeoutPromise])
        data = result.data
        error = result.error
        console.log('[SUPABASE] Client query succeeded')
      } catch (queryErr) {
        console.warn('[SUPABASE] Client query failed or timed out, trying REST API:', queryErr.message)
        useRestApi = true
        
        // Fallback to REST API
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sbmwzgtlqmwtbrgdehuw.supabase.co'
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibXd6Z3RscW13dGJyZ2RlaHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDUyMDMsImV4cCI6MjA3ODY4MTIwM30.LaXLtSuHVnY0JbN5YTa-2JlbrN2_cLAbAd6NfXtdyJY'
          
          const response = await fetch(`${supabaseUrl}/rest/v1/jobs?select=*&order=created_at.desc`, {
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            }
          })

          if (!response.ok) {
            throw new Error(`REST API error: ${response.status} ${response.statusText}`)
          }

          data = await response.json()
          error = null
          console.log('[SUPABASE] REST API query succeeded')
        } catch (restErr) {
          console.error('[SUPABASE] REST API also failed:', restErr)
          error = restErr
          data = null
        }
      }

      const elapsed = Date.now() - startTime
      console.log(`[SUPABASE] Query completed in ${elapsed}ms (${useRestApi ? 'REST API' : 'Client'})`, { 
        hasData: !!data, 
        dataLength: data?.length,
        hasError: !!error,
        errorMessage: error?.message 
      })

      if (error) {
        console.error('[SUPABASE] Error fetching jobs:', error)
        console.error('[SUPABASE] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })

        // Check if it's an RLS/permissions issue
        if (error.message?.includes('permission') || error.code === 'PGRST301') {
          setError('Permission denied. Please check RLS policies for the jobs table.')
          setJobs([])
          setLoading(false)
          return
        } else if ((error.message?.includes('timeout') || error.message?.includes('aborted')) && retryCountRef.current < MAX_RETRIES) {
          // Retry on timeout (up to MAX_RETRIES times)
          retryCountRef.current += 1
          console.log(`[SUPABASE] Timeout/abort error, retrying (${retryCountRef.current}/${MAX_RETRIES})...`)
          setTimeout(() => fetchJobs(true), 2000)
          return // Don't set loading to false here, let retry handle it
        } else {
          setError(error.message || 'Failed to fetch jobs')
          setJobs([])
          setLoading(false)
          return
        }
      }

      console.log('[SUPABASE] Fetched jobs successfully:', data?.length || 0)
      console.log('[SUPABASE] Jobs data type:', typeof data, 'isArray:', Array.isArray(data))
      console.log('[SUPABASE] Jobs data:', data)
      
      if (data && Array.isArray(data)) {
        console.log('[SUPABASE] Setting jobs state with', data.length, 'jobs')
        setJobs(data)
      } else {
        console.warn('[SUPABASE] Data is not an array or is null/undefined:', data)
        setJobs([])
      }
      retryCountRef.current = 0 // Reset retry count on success
      setLoading(false)
      console.log('[SUPABASE] Fetch complete, loading set to false')

    } catch (err) {
      console.error('[SUPABASE] Exception fetching jobs:', err)
      console.error('[SUPABASE] Exception details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      })

      // Check if it's a network/timeout error
      if (err.message?.includes('fetch') || err.name === 'TypeError') {
        setError('Network error. Check if your Supabase project is active (free tier projects pause after 7 days of inactivity).')
        setJobs([])
        setLoading(false)
      } else if ((err.message?.includes('timeout') || err.message?.includes('aborted')) && retryCountRef.current < MAX_RETRIES) {
        // Retry on timeout (up to MAX_RETRIES times)
        retryCountRef.current += 1
        console.log(`[SUPABASE] Timeout/abort exception, retrying (${retryCountRef.current}/${MAX_RETRIES})...`)
        setTimeout(() => {
          setLoading(true)
          fetchJobs(true)
        }, 2000)
        return // Don't set loading to false here, let retry handle it
      } else {
        setError(err.message || 'Failed to fetch jobs')
        setJobs([])
        setLoading(false)
      }
    } finally {
      // Safety net: if loading is still true and we're not retrying, set it to false
      // (Most cases already handle loading state, but this ensures we don't get stuck)
      if (retryCountRef.current >= MAX_RETRIES) {
        console.log('[SUPABASE] Finally block: max retries reached, ensuring loading is false')
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    console.log('[SUPABASE] useEffect triggered - initializing')
    // Jobs are publicly readable, so we don't need to wait for auth session
    // Just fetch jobs directly after a small delay to ensure Supabase client is ready
    const initializeAndFetch = async () => {
      try {
        console.log('[SUPABASE] Starting initialization...')
        
        // Small delay to ensure Supabase client is fully initialized
        await new Promise(resolve => setTimeout(resolve, 200))
        
        retryCountRef.current = 0 // Reset retry count on initial load
        console.log('[SUPABASE] Calling fetchJobs...')
        await fetchJobs()
      } catch (err) {
        console.error('[SUPABASE] Error initializing:', err)
        console.error('[SUPABASE] Initialization error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        })
        setLoading(false)
        setError('Failed to load jobs. Please refresh the page.')
      }
    }
    
    initializeAndFetch().catch(err => {
      console.error('[SUPABASE] Unhandled error in initializeAndFetch:', err)
      setLoading(false)
      setError('Failed to initialize. Please refresh the page.')
    })
  }, [fetchJobs])


  const addJob = async (jobData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single()

      if (insertError) throw insertError

      if (data) {
        setJobs(prev => [data, ...prev])
      }

      return { data, error: insertError }
    } catch (err) {
      console.error('Error adding job:', err)
      return { data: null, error: err }
    }
  }

  const updateJob = async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      if (data) {
        setJobs(prev => prev.map(job => job.id === id ? data : job))
      }

      return { data, error: updateError }
    } catch (err) {
      console.error('Error updating job:', err)
      return { data: null, error: err }
    }
  }

  const deleteJob = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setJobs(prev => prev.filter(job => job.id !== id))

      return { error: deleteError }
    } catch (err) {
      console.error('Error deleting job:', err)
      return { error: err }
    }
  }

  const value = {
    supabase,
    jobs,
    loading,
    error,
    fetchJobs,
    addJob,
    updateJob,
    deleteJob,
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

