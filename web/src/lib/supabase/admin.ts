import { createClient } from '@supabase/supabase-js';

// Runs once when this module is first loaded by the server — confirms the
// config actually in effect, without ever printing the key itself.
console.log(`[supabase-admin] SUPABASE_SERVICE_ROLE_KEY : ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'clé présente' : 'CLÉ MANQUANTE — toutes les requêtes admin échoueront'}`);
console.log(`[supabase-admin] NEXT_PUBLIC_SUPABASE_URL : ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'MANQUANT'}`);

// Service role bypasses RLS — only ever used server-side (API routes).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
