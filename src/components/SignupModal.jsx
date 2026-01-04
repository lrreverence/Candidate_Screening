import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const SignupModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp, signInWithGoogle } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const fullName = `${firstName} ${lastName}`.trim()

      const { data, error } = await signUp(email, password, {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
      })

      if (error) {
        // Provide user-friendly error messages
        let errorMessage = error.message || 'Failed to create account. Please try again.'
        if (error.message?.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.'
        } else if (error.message?.includes('Password')) {
          errorMessage = 'Password does not meet requirements. Please use a stronger password.'
        } else if (error.message?.includes('email')) {
          errorMessage = 'Please enter a valid email address.'
        }
        setError(errorMessage)
      } else {
        // Check if email confirmation is required
        if (data?.user && !data?.session) {
          // Email confirmation required
          setSuccess(true)
          setTimeout(() => {
            onClose()
            setEmail('')
            setPassword('')
            setConfirmPassword('')
            setFirstName('')
            setLastName('')
            setSuccess(false)
          }, 3000)
        } else if (data?.session) {
          // User is immediately signed in (email confirmation disabled)
          setSuccess(true)
          setTimeout(() => {
            onClose()
            setEmail('')
            setPassword('')
            setConfirmPassword('')
            setFirstName('')
            setLastName('')
            setSuccess(false)
          }, 2000)
        } else {
          setError('Account creation failed. Please try again.')
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
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
            <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-text-muted text-sm">Join E Power Security today</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-primary/20 border border-primary/50 text-primary text-sm">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <div>
                  <p className="font-semibold mb-1">Account created successfully!</p>
                  <p className="text-xs">Please check your email to verify your account before signing in.</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-white mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#0f172a] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-white mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#0f172a] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0f172a] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-[#0f172a] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-[#0f172a] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="Confirm your password"
              />
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 mr-2 rounded"
              />
              <label htmlFor="terms" className="text-sm text-text-muted">
                I agree to the{' '}
                <Link to="/terms" className="text-primary hover:text-[#60a5fa] transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary hover:text-[#60a5fa] transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  Creating account...
                </>
              ) : (
                'Create Account'
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
          </div>

          {/* Switch to Login */}
          <div className="mt-6 text-center">
            <p className="text-text-muted text-sm">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-primary hover:text-[#60a5fa] font-medium transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignupModal

