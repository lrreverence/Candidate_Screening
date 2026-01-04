import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const LoginModal = ({ isOpen, onClose, onSwitchToSignup, redirectTo }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signInWithGoogle, signInWithFacebook, user, userProfile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const hasRedirected = useRef(false)
  const signInAttempted = useRef(false)
  const timeoutRef = useRef(null)

  // Redirect admin users after profile loads
  useEffect(() => {
    if (signInAttempted.current && user && userProfile && !authLoading && !hasRedirected.current) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      hasRedirected.current = true
      setLoading(false)

      if (userProfile.role === 'admin') {
        onClose()
        navigate('/admin')
      } else {
        // User is logged in but not admin
        onClose()
        // Redirect to intended destination if provided
        if (redirectTo) {
          navigate(redirectTo)
        }
      }
    }
  }, [user, userProfile, authLoading, navigate, onClose])

  // Fallback: If user exists but profile hasn't loaded, wait a bit then close modal anyway
  useEffect(() => {
    if (signInAttempted.current && user && !userProfile && !authLoading && !hasRedirected.current) {
      const fallbackTimeout = setTimeout(() => {
        if (!hasRedirected.current) {
          setLoading(false)
          hasRedirected.current = true
          onClose()
        }
      }, 2000)

      return () => clearTimeout(fallbackTimeout)
    }
  }, [user, userProfile, authLoading, onClose])

  // Reset flags when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasRedirected.current = false
      signInAttempted.current = false
      setError('')
      setLoading(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isOpen])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    hasRedirected.current = false
    signInAttempted.current = true

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    try {
      const { data, error: signInError } = await signIn(email, password)

      if (signInError) {
        setError(signInError.message || 'Failed to sign in. Please check your credentials.')
        setLoading(false)
        signInAttempted.current = false
        return
      }

      // Sign in succeeded - the useEffect will handle redirect when profile loads
      // Clear loading after a short delay to let the profile load
      setTimeout(() => {
        if (!hasRedirected.current) {
          setLoading(false)
        }
      }, 500)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.')
      setLoading(false)
      signInAttempted.current = false
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-card-dark border border-secondary rounded-2xl p-6 md:p-8 shadow-2xl">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-text-muted text-sm">Sign in to your account to continue</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0f172a] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0f172a] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 rounded" />
                <span className="text-sm text-text-muted">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-primary hover:text-[#60a5fa] transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-secondary"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card-dark text-text-muted">Or continue with</span>
            </div>
          </div>

          {/* Social Sign In Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={async () => {
                setError('')
                setLoading(true)
                const { error: oauthError } = await signInWithGoogle()
                if (oauthError) {
                  setError(oauthError.message || 'Failed to sign in with Google')
                  setLoading(false)
                }
                // OAuth will redirect, so we don't need to handle success here
              }}
              disabled={loading}
              className="w-full h-12 rounded-lg bg-white text-gray-900 text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-gray-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={async () => {
                setError('')
                setLoading(true)
                const { error: oauthError } = await signInWithFacebook()
                if (oauthError) {
                  setError(oauthError.message || 'Failed to sign in with Facebook')
                  setLoading(false)
                }
                // OAuth will redirect, so we don't need to handle success here
              }}
              disabled={loading}
              className="w-full h-12 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:bg-[#166FE5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Continue with Facebook
            </button>
          </div>

          {/* Switch to Signup */}
          <div className="mt-6 text-center">
            <p className="text-text-muted text-sm">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-primary hover:text-[#60a5fa] font-medium transition-colors"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginModal

