import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const [timeoutReached, setTimeoutReached] = useState(false)

  // Set a timeout to prevent infinite loading (3 seconds)
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setTimeoutReached(true)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      setTimeoutReached(false)
    }
  }, [loading])

  // Show loading state while checking authentication (but only for a reasonable time)
  if (loading && !timeoutReached) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // If timeout reached but still loading, check user anyway
  // If not authenticated, redirect to home
  if (!user) {
    return <Navigate to="/" replace />
  }

  // User is authenticated, allow access
  return children
}

export default ProtectedRoute

