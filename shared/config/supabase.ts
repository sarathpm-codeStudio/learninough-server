
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";
import ws from "ws";

function findEnvFile(startDirs: string[]): string | undefined {
    for (const start of startDirs) {
        let dir = start;
        // Walk up to filesystem root looking for a .env
        // (handles both ts-node source layout and bundled .serverless/build output)
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const candidate = path.join(dir, ".env");
            if (fs.existsSync(candidate)) return candidate;
            const parent = path.dirname(dir);
            if (parent === dir) break;
            dir = parent;
        }
    }
    return undefined;
}

const envPath = findEnvFile([__dirname, process.cwd()]);
if (envPath) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Missing Supabase configuration: SUPABASE_URL and SUPABASE_ANON_KEY must be set"
    );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        transport: ws as any,
    },
});

/**
 * Build a Supabase client that is authenticated as the calling user.
 *
 * The provided access token is attached to every PostgREST request via the
 * `Authorization` header, so RLS policies that depend on `auth.uid()` (e.g.
 * `auth.uid() = faculty_id`) evaluate against the real user instead of the
 * anonymous role. Use this inside Lambda handlers after `verifyAuth` has
 * validated the token.
 */
export const getSupabaseClient = (accessToken: string): SupabaseClient => {
    return createClient(supabaseUrl as string, supabaseKey as string, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        realtime: {
            transport: ws as any,
        },
    });
};
