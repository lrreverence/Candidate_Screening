import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Check if there's a valid password reset session
    const checkSession = async () => {
      try {
        // Check for hash parameters in URL (password reset token)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')
        
        // If we have recovery token in URL, Supabase should process it automatically
        // due to detectSessionInUrl: true in supabase client config
        if (accessToken && type === 'recovery') {
          // Wait a moment for Supabase to process the hash and establish session
          setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
              setHasValidSession(true)
            } else {
              setError('Invalid or expired password reset link. Please request a new one.')
            }
            setCheckingSession(false)
          }, 1000)
        } else {
          // Check if there's already a valid session
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setHasValidSession(true)
          } else {
            setError('Invalid or expired password reset link. Please request a new one.')
          }
          setCheckingSession(false)
        }
      } catch (err) {
        console.error('Error checking session:', err)
        setError('An error occurred while verifying your reset link.')
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(updateError.message || 'Failed to update password. Please try again.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)

      // Redirect to home page after 2 seconds
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-card-dark border border-secondary rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex flex-col items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl mb-4">
              refresh
            </span>
            <p className="text-text-muted">Verifying reset link...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!hasValidSession && !checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-card-dark border border-secondary rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center">
            <span className="material-symbols-outlined text-red-500 text-5xl mb-4 block">
              error
            </span>
            <h2 className="text-2xl font-bold text-white mb-4">Invalid Reset Link</h2>
            <p className="text-text-muted mb-6">{error || 'This password reset link is invalid or has expired.'}</p>
            <button
              onClick={() => navigate('/')}
              className="w-full h-12 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-card-dark border border-secondary rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
        {success ? (
          <div className="text-center">
            <span className="material-symbols-outlined text-green-500 text-5xl mb-4 block">
              check_circle
            </span>
            <h2 className="text-2xl font-bold text-white mb-4">Password Reset Successful</h2>
            <p className="text-text-muted mb-6">
              Your password has been successfully updated. You will be redirected to the home page shortly.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Reset Your Password</h2>
              <p className="text-text-muted text-sm">Enter your new password below</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-[#0f172a] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  placeholder="Enter your new password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-[#0f172a] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  placeholder="Confirm your new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    Updating Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-primary hover:text-[#60a5fa] transition-colors"
              >
                Back to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
