import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qdxwtwelwufnsclvqaur.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkeHd0d2Vsd3VmbnNjbHZxYXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjI3NjQsImV4cCI6MjA4OTgzODc2NH0.dQDMGxgvp_a908fV_hHySiHPNk8fWG9pj6Ra7kd-Z6Y'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
