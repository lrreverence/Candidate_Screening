import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedAdminRoute = ({ children }) => {
  const { user, userProfile, loading, isAdmin, refreshUserProfile } = useAuth()
  const [profileLoadAttempted, setProfileLoadAttempted] = useState(false)
  const [waitTimeout, setWaitTimeout] = useState(false)

  // Try to refresh profile if user exists but profile is missing
  useEffect(() => {
    if (user && !userProfile && !loading && !profileLoadAttempted) {
      setProfileLoadAttempted(true)
      refreshUserProfile()
    }
  }, [user, userProfile, loading, refreshUserProfile, profileLoadAttempted])

  // Set a timeout to prevent infinite loading (5 seconds)
  useEffect(() => {
    if (user && !userProfile && !loading) {
      const timer = setTimeout(() => {
        setWaitTimeout(true)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [user, userProfile, loading])

  // Show loading state while checking authentication or while userProfile is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, redirect to home
  if (!user) {
    return <Navigate to="/" replace />
  }

  // If we've waited too long and profile still isn't loaded, check if user is admin anyway
  // This handles edge cases where profile fetch might have issues but user is authenticated
  if (waitTimeout && !userProfile) {
    console.warn('Profile load timeout - checking admin status anyway')
    // If we can't load profile, we can't verify admin status, so redirect
    return <Navigate to="/" replace />
  }

  // Show loading while waiting for profile (but only for a reasonable time)
  if (user && !userProfile && !waitTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  // If userProfile is still null after loading and timeout, redirect to home
  if (!userProfile) {
    return <Navigate to="/" replace />
  }

  // If authenticated but not admin, redirect to home
  if (!isAdmin()) {
    return <Navigate to="/" replace />
  }

  // User is authenticated and is admin, allow access
  return children
}

export default ProtectedAdminRoute

