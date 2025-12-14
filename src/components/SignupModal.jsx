import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const SignupModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()

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
      const [firstName, ...lastNameParts] = fullName.split(' ')
      const lastName = lastNameParts.join(' ') || ''

      const { error } = await signUp(email, password, {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        // Don't close immediately - show success message
        setTimeout(() => {
          onClose()
          setEmail('')
          setPassword('')
          setConfirmPassword('')
          setFullName('')
          setSuccess(false)
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
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
              Account created! Please check your email to verify your account.
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
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-white mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#112218] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="John Doe"
              />
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
                className="w-full px-4 py-3 bg-[#112218] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
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
                className="w-full px-4 py-3 bg-[#112218] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
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
                className="w-full px-4 py-3 bg-[#112218] border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
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
                <a href="#" className="text-primary hover:text-[#5aff9d] transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary hover:text-[#5aff9d] transition-colors">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-primary text-[#112218] text-sm font-bold hover:bg-[#5aff9d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          {/* Switch to Login */}
          <div className="mt-6 text-center">
            <p className="text-text-muted text-sm">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-primary hover:text-[#5aff9d] font-medium transition-colors"
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

