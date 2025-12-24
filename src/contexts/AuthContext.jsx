import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from users table
  const fetchUserProfile = async (userId) => {
    if (!userId) {
      setUserProfile(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user profile:', error)
        setUserProfile(null)
      } else {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        return { data: null, error }
      }
      
      // Fetch user profile after signin
      if (data?.user) {
        await fetchUserProfile(data.user.id)
      }
      
      return { data, error: null }
    } catch (error) {
      return { 
        data: null, 
        error: { 
          message: error.message || 'An unexpected error occurred during sign in' 
        } 
      }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        return { error }
      }
      // Clear local state immediately
      setUser(null)
      setUserProfile(null)
      setSession(null)
      return { error: null }
    } catch (error) {
      console.error('Error signing out:', error)
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

