import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS. Only use server-side.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqeWRzd3JpaXNtcWV1Z2tjYXF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ5OTk0NywiZXhwIjoyMDkyMDc1OTQ3fQ.G3eA8nUQDUtKjFEhNfXe1CwZevC36CBRP0tz0G_Kjbo'

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
