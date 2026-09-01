import { createClient } from '@supabase/supabase-js'

// These environment variables connect to your free cloud database.
// We will add the actual keys later in your hosting dashboard.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseKey)