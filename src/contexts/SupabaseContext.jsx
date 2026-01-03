import React, { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    console.log('[SUPABASE] fetchJobs called')

    try {
      console.log('[SUPABASE] Setting loading state...')
      setLoading(true)
      setError(null)

      console.log('[SUPABASE] Fetching jobs...')
      console.log('[SUPABASE] Supabase client exists:', !!supabase)
      console.log('[SUPABASE] Supabase URL:', supabase?.supabaseUrl)

      const startTime = Date.now()

      // Simple direct query with timeout
      console.log('[SUPABASE] Executing query NOW...')

      const queryPromise = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })

      // Add 10 second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
      )

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      const elapsed = Date.now() - startTime
      console.log(`[SUPABASE] Query completed in ${elapsed}ms`)

      if (error) {
        console.error('[SUPABASE] Error fetching jobs:', error)

        // Check if it's an RLS/permissions issue
        if (error.message?.includes('permission') || error.code === 'PGRST301') {
          setError('Permission denied. Please check RLS policies for the jobs table.')
        } else {
          setError(error.message || 'Failed to fetch jobs')
        }

        setJobs([])
        return
      }

      console.log('[SUPABASE] Fetched jobs successfully:', data?.length || 0)
      setJobs(data || [])

    } catch (err) {
      console.error('[SUPABASE] Exception fetching jobs:', err)

      // Check if it's a network/timeout error
      if (err.message?.includes('fetch') || err.name === 'TypeError') {
        setError('Network error. Check if your Supabase project is active (free tier projects pause after 7 days of inactivity).')
      } else {
        setError(err.message || 'Failed to fetch jobs')
      }

      setJobs([])
    } finally {
      setLoading(false)
    }
  }

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

