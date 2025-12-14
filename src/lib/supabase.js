import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aampmpkrrjlbfkgphswq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbXBtcGtycmpsYmZrZ3Boc3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODA5NDMsImV4cCI6MjA3NDE1Njk0M30.Cdxwo8F_OtXAWFndg_AOBuSl4f6_TTH7dtObykhkqf4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

