import { createClient } from '@supabase/supabase-js';

// Service role bypasses RLS — only ever used server-side (API routes).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
