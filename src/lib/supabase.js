import { createClient } from '@supabase/supabase-js'
import CookieStorage from './cookieStorage.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sbmwzgtlqmwtbrgdehuw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibXd6Z3RscW13dGJyZ2RlaHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDUyMDMsImV4cCI6MjA3ODY4MTIwM30.LaXLtSuHVnY0JbN5YTa-2JlbrN2_cLAbAd6NfXtdyJY'

// Create cookie storage instance
const cookieStorage = new CookieStorage()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: cookieStorage
  }
})

