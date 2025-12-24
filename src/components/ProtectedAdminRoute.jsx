import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedAdminRoute = ({ children }) => {
  const { user, userProfile, loading, isAdmin, refreshUserProfile } = useAuth()

  // Try to refresh profile if user exists but profile is missing
  useEffect(() => {
    if (user && !userProfile && !loading) {
      refreshUserProfile()
    }
  }, [user, userProfile, loading, refreshUserProfile])

  // Show loading state while checking authentication or while userProfile is being fetched
  if (loading || (user && !userProfile)) {
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

  // If userProfile is still null after loading, redirect to home
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

