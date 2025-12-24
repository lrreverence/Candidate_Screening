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
    try {
      setLoading(true)
      setError(null)
      
      // Try to fetch from Supabase, fallback to empty array if table doesn't exist
      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        // If table doesn't exist or there's an error, that's okay - we'll use fallback data
        console.log('Jobs table error, using fallback data:', fetchError.message)
        setJobs([])
      } else {
        setJobs(data || [])
      }
    } catch (err) {
      console.error('Error fetching jobs:', err)
      setError(err.message)
      setJobs([])
    } finally {
      // Always set loading to false, even if there's an error
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

