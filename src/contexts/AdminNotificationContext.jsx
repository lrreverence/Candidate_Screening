import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AdminNotificationContext = createContext(null)

export function AdminNotificationProvider({ children }) {
  const [newApplicationsCount, setNewApplicationsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNewApplicationsCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'submitted'])

      if (error) throw error
      setNewApplicationsCount(count ?? 0)
    } catch (err) {
      console.error('Error fetching new applications count:', err)
      setNewApplicationsCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNewApplicationsCount()

    const channel = supabase
      .channel('admin-applications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => {
          fetchNewApplicationsCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNewApplicationsCount])

  return (
    <AdminNotificationContext.Provider
      value={{
        newApplicationsCount,
        loading,
        refresh: fetchNewApplicationsCount
      }}
    >
      {children}
    </AdminNotificationContext.Provider>
  )
}

export function useAdminNotifications() {
  const ctx = useContext(AdminNotificationContext)
  if (!ctx) {
    throw new Error('useAdminNotifications must be used within AdminNotificationProvider')
  }
  return ctx
}
