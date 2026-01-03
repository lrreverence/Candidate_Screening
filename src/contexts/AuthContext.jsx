import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile - try database first, fall back to session data
  const fetchUserProfile = async (userId, sessionData = null) => {
    if (!userId) {
      setUserProfile(null)
      return
    }

    try {
      // If session not provided, fetch it
      if (!sessionData) {
        const { data } = await supabase.auth.getSession()
        sessionData = data
      }

      const sessionUser = sessionData?.session?.user

      if (!sessionUser) {
        console.warn('[AUTH] No session user found')
        setUserProfile(null)
        return
      }

      // Try to get profile from database with a short timeout
      try {
        const { data: dbProfile, error } = await Promise.race([
          supabase.from('users').select('*').eq('id', userId).single(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 2000)
          )
        ])

        if (!error && dbProfile) {
          console.log('[AUTH] ✓ User profile loaded from database:', dbProfile)
          setUserProfile(dbProfile)
          return
        }
      } catch (dbError) {
        console.log('[AUTH] Database query failed, using session fallback')
      }

      // Fallback: Use session data
      const profile = {
        id: sessionUser.id,
        email: sessionUser.email,
        role: sessionUser.user_metadata?.role || 'applicant',
        full_name: sessionUser.user_metadata?.full_name || '',
        first_name: sessionUser.user_metadata?.first_name || '',
        last_name: sessionUser.user_metadata?.last_name || '',
        created_at: sessionUser.created_at
      }

      console.log('[AUTH] ✓ User profile loaded from session fallback:', profile)
      setUserProfile(profile)
    } catch (error) {
      console.error('[AUTH] Error fetching user profile:', error)
      setUserProfile(null)
    }
  }

  useEffect(() => {
    let isInitialLoad = true

    // Get initial session
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const session = sessionData.session
      console.log('[AUTH] Initial session:', session?.user?.id)
      setSession(session)
      setUser(session?.user ?? null)

      try {
        if (session?.user) {
          // Add timeout to prevent hanging forever - pass session to avoid re-fetching
          await Promise.race([
            fetchUserProfile(session.user.id, sessionData),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Profile fetch timeout (5s)')), 5000)
            )
          ])
        }
      } catch (error) {
        console.error('[AUTH] Error in initial profile fetch:', error)
        // Set a minimal fallback profile to prevent blocking
        if (session?.user) {
          setUserProfile({
            id: session.user.id,
            email: session.user.email,
            role: session.user.user_metadata?.role || 'applicant'
          })
        }
      } finally {
        setLoading(false)
        isInitialLoad = false
      }
    }).catch((error) => {
      console.error('[AUTH] Error getting initial session:', error)
      setLoading(false)
      isInitialLoad = false
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AUTH] Auth state changed:', _event, session?.user?.id)

      // Skip if this is the initial SIGNED_IN event (already handled above)
      if (isInitialLoad && _event === 'SIGNED_IN') {
        console.log('[AUTH] Skipping duplicate initial SIGNED_IN event')
        return
      }

      setSession(session)
      setUser(session?.user ?? null)

      try {
        if (session?.user) {
          // Add timeout to prevent hanging forever - pass session to avoid re-fetching
          await Promise.race([
            fetchUserProfile(session.user.id, { session }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Profile fetch timeout (5s)')), 5000)
            )
          ])
        } else {
          setUserProfile(null)
        }
      } catch (error) {
        console.error('[AUTH] Error in auth state change profile fetch:', error)
        // Set a minimal fallback profile to prevent blocking
        if (session?.user) {
          setUserProfile({
            id: session.user.id,
            email: session.user.email,
            role: session.user.user_metadata?.role || 'applicant'
          })
        }
      } finally {
        setLoading(false)
      }
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
          await fetchUserProfile(data.user.id, { session: data.session })
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

      // Clear storage FIRST (before Supabase call that might hang)
      console.log('[AUTH] Clearing localStorage and sessionStorage...')
      localStorage.clear()
      sessionStorage.clear()
      console.log('[AUTH] Storage cleared successfully')

      // Try to sign out from Supabase (non-blocking - don't await)
      console.log('[AUTH] Calling supabase.auth.signOut() (non-blocking)...')
      supabase.auth.signOut().then(({ error }) => {
        if (error) {
          console.error('[AUTH] Error signing out from Supabase:', error)
        } else {
          console.log('[AUTH] Supabase signOut successful')
        }
      }).catch(err => {
        console.error('[AUTH] Exception in Supabase signOut:', err)
      })

      console.log('[AUTH] Sign out complete')

      return { error: null }
    } catch (error) {
      console.error('[AUTH] Exception during sign out:', error)
      // Clear state even on error
      setUser(null)
      setUserProfile(null)
      setSession(null)
      // Clear storage even on error
      localStorage.clear()
      sessionStorage.clear()
      return { error }
    }
  }

  // Stable function reference for refreshing user profile
  const refreshUserProfile = React.useCallback(() => {
    if (user?.id) {
      return fetchUserProfile(user.id)
    }
  }, [user?.id])

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
  const isAdmin = React.useCallback(() => {
    return userProfile?.role === 'admin'
  }, [userProfile?.role])

  // Helper function to check if user is applicant
  const isApplicant = React.useCallback(() => {
    return userProfile?.role === 'applicant' || !userProfile
  }, [userProfile?.role])

  // Helper function to get user role
  const getUserRole = React.useCallback(() => {
    return userProfile?.role || 'applicant'
  }, [userProfile?.role])

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
    refreshUserProfile,
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

