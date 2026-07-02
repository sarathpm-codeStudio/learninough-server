import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client for background workers.
//
// The shared client (shared/config/supabase.ts) uses the ANON key and relies on
// the caller's JWT + RLS. A background worker has no user JWT and must read rows
// that belong to OTHER users (e.g. a recipient's FCM device tokens) and write
// notification rows, so it needs the service-role key, which bypasses RLS.
//
// NEVER expose this client or the service-role key to any browser/mobile app.

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
        "Missing Supabase admin configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
