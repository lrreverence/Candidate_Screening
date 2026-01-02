import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from users table using RPC function to bypass RLS complexity
  const fetchUserProfile = async (userId) => {
    if (!userId) {
      setUserProfile(null)
      return
    }

    try {
      console.log('[AUTH] Fetching user profile for:', userId)

      // Check if we have a valid session first
      const { data: sessionData } = await supabase.auth.getSession()
      console.log('[AUTH] Current session valid:', !!sessionData?.session)
      console.log('[AUTH] User email from session:', sessionData?.session?.user?.email)

      // Try direct query with a short timeout
      console.log('[AUTH] Fetching user profile with direct query...')
      const directPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      const { data, error } = await Promise.race([
        directPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 2000))
      ])

      if (error) {
        console.error('[AUTH] Database query failed:', error.message)

        if (error.message === 'Query timeout') {
          console.error('[AUTH] ⚠️ DATABASE TIMEOUT - This is likely an RLS (Row Level Security) issue')
          console.error('[AUTH] The users table RLS policy may not be allowing authenticated reads')
          console.error('[AUTH] Check your Supabase RLS policies for the users table')
        }

        // FALLBACK: Create a minimal profile from session data
        console.warn('[AUTH] Using fallback profile from session data')
        const fallbackProfile = {
          id: sessionData?.session?.user?.id || userId,
          email: sessionData?.session?.user?.email || '',
          role: sessionData?.session?.user?.user_metadata?.role || 'applicant',
          full_name: sessionData?.session?.user?.user_metadata?.full_name || '',
          created_at: sessionData?.session?.user?.created_at
        }
        console.log('[AUTH] Fallback profile created:', fallbackProfile)
        setUserProfile(fallbackProfile)
      } else {
        console.log('[AUTH] ✓ User profile loaded successfully from database:', data)
        setUserProfile(data)
      }
    } catch (error) {
      console.error('[AUTH] Exception fetching user profile:', error)
      setUserProfile(null)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AUTH] Initial session:', session?.user?.id)
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AUTH] Auth state changed:', _event, session?.user?.id)
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}`,
        },
      })
      
      if (error) {
        return { data: null, error }
      }
      
      // Ensure user record is created with applicant role and create applicant record
      if (data?.user) {
        // Wait a bit for the trigger to complete, then verify/create user record
        setTimeout(async () => {
          try {
            // Check if user record exists
            const { data: existingUser, error: fetchError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single()

            if (fetchError || !existingUser) {
              // If user record doesn't exist, create it with applicant role
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: data.user.id,
                  email: data.user.email || email,
                  full_name: metadata.full_name || '',
                  first_name: metadata.first_name || '',
                  last_name: metadata.last_name || '',
                  role: 'applicant' // Always assign applicant role
                })

              if (insertError) {
                console.error('Error creating user record:', insertError)
              }
            } else if (existingUser.role !== 'applicant' && existingUser.role !== 'admin') {
              // If role is somehow invalid, set it to applicant
              await supabase
                .from('users')
                .update({ role: 'applicant' })
                .eq('id', data.user.id)
            }

            // Create applicant record in applicants table
            const firstName = metadata.first_name || ''
            const lastName = metadata.last_name || ''
            
            // Check if applicant already exists for this user
            const { data: existingApplicant } = await supabase
              .from('applicants')
              .select('id')
              .eq('user_id', data.user.id)
              .single()

            if (!existingApplicant) {
              // Generate reference code
              const { data: refCode, error: refError } = await supabase
                .rpc('generate_reference_code')
              
              let referenceCode = refCode
              if (refError || !refCode) {
                // Fallback reference code
                const year = new Date().getFullYear()
                const timestamp = Date.now().toString().slice(-6)
                referenceCode = `REF-${year}-${timestamp.slice(0, 3)}`
              }

              // Create applicant record
              const { error: applicantError } = await supabase
                .from('applicants')
                .insert({
                  reference_code: referenceCode,
                  first_name: firstName,
                  last_name: lastName,
                  email: data.user.email || email,
                  user_id: data.user.id,
                  status: 'Pending'
                })

              if (applicantError) {
                console.error('Error creating applicant record:', applicantError)
              }
            }

            // Fetch the updated profile
            await fetchUserProfile(data.user.id)
          } catch (err) {
            console.error('Error ensuring user and applicant records:', err)
          }
        }, 500)
      }
      
      return { data, error: null }
    } catch (error) {
      return { 
        data: null, 
        error: { 
          message: error.message || 'An unexpected error occurred during sign up' 
        } 
      }
    }
  }

  const signIn = async (email, password) => {
    console.log('[AUTH] signIn called for:', email)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.log('[AUTH] Auth error:', error.message)
        return { data: null, error, profile: null }
      }

      console.log('[AUTH] Sign in successful, user ID:', data?.user?.id)
      console.log('[AUTH] Session:', data?.session ? 'present' : 'missing')

      // Update user state immediately
      setUser(data.user)
      setSession(data.session)
      setLoading(false)

      // Wait a moment for cookies to be written
      console.log('[AUTH] Waiting for cookie storage to settle...')
      await new Promise(resolve => setTimeout(resolve, 300))

      // Verify session is in storage
      const { data: verifySession } = await supabase.auth.getSession()
      console.log('[AUTH] Session verified in storage:', !!verifySession?.session)

      // Fetch profile with authenticated session
      if (data?.user?.id) {
        console.log('[AUTH] Fetching profile after cookie storage settled...')
        try {
          await fetchUserProfile(data.user.id)
          console.log('[AUTH] Profile fetch completed')
        } catch (profileError) {
          console.error('[AUTH] Profile fetch failed:', profileError)
          // Continue anyway - user can still be logged in
        }
      }

      return { data, error: null, profile: userProfile }
    } catch (error) {
      console.error('[AUTH] Sign in exception:', error)
      return {
        data: null,
        error: {
          message: error.message || 'An unexpected error occurred during sign in'
        },
        profile: null
      }
    }
  }

  const signOut = async () => {
    try {
      console.log('[AUTH] Starting sign out...')

      // Clear local state first to provide immediate UI feedback
      setUser(null)
      setUserProfile(null)
      setSession(null)

      // Sign out from Supabase (this will trigger the auth state change listener)
      console.log('[AUTH] Calling supabase.auth.signOut()...')
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[AUTH] Error signing out from Supabase:', error)
        // Continue with cleanup even if signOut fails
      } else {
        console.log('[AUTH] Supabase signOut successful')
      }

      // Manually clear ALL cookies (not just sb- prefix, to catch double-prefixed ones too)
      console.log('[AUTH] Manually clearing ALL cookies...')
      const allCookies = document.cookie.split(';')
      const cookieCount = allCookies.length
      console.log(`[AUTH] Found ${cookieCount} cookies to check`)

      allCookies.forEach(cookie => {
        const cookieName = cookie.split('=')[0].trim()
        if (cookieName) {
          console.log('[AUTH] Removing cookie:', cookieName)
          const deleteConfigs = [
            'path=/;SameSite=Lax',
            'path=/;SameSite=Strict',
            'path=/;SameSite=None;Secure',
            'path=/;domain=localhost;SameSite=Lax',
            'path=/;domain=.localhost;SameSite=Lax',
            'path=/',
            ''
          ]
          deleteConfigs.forEach(config => {
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;${config}`
          })
        }
      })

      // Verify cookies are gone
      const remainingCookies = document.cookie.split(';').filter(c => c.trim())
      console.log('[AUTH] Remaining cookies after deletion:', remainingCookies.length)

      // Clear any remaining storage
      console.log('[AUTH] Clearing localStorage and sessionStorage...')
      localStorage.clear()
      sessionStorage.clear()

      console.log('[AUTH] Sign out complete - all cookies and storage cleared')

      return { error: error || null }
    } catch (error) {
      console.error('[AUTH] Exception during sign out:', error)
      // Clear state even on error
      setUser(null)
      setUserProfile(null)
      setSession(null)
      return { error }
    }
  }

  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Helper function to check if user is admin
  const isAdmin = () => {
    return userProfile?.role === 'admin'
  }

  // Helper function to check if user is applicant
  const isApplicant = () => {
    return userProfile?.role === 'applicant' || !userProfile
  }

  // Helper function to get user role
  const getUserRole = () => {
    return userProfile?.role || 'applicant'
  }

  const value = {
    user,
    userProfile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    isAdmin,
    isApplicant,
    getUserRole,
    refreshUserProfile: () => user?.id && fetchUserProfile(user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { AuthProvider }

