// Supabase configuration
const SUPABASE_URL = 'https://rpjmdkvravopqtuzxksv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwam1ka3ZyYXZvcHF0dXp4a3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4OTEwNTcsImV4cCI6MjA1NjQ2NzA1N30.I4u76FDus2nRPfQWwKYaV39DhqYWLFionPSB4KMk1PE';

// Initialize Supabase client
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY); 