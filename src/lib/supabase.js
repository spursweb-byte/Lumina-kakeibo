import { createClient } from '@supabase/supabase-js'

// --- IMPORTANT: Supabase Configuration ---
// Please replace these with your actual Supabase project URL and API Key
// You can get these from the Supabase Project Settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
