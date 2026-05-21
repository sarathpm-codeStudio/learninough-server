import { supabase, getSupabaseClient } from "../config/supabase";
import { Role, AccountStatus } from "../constants/types";
import { handleResponse } from "./response";

// middleware.ts
export const verifyAuth = (handler: any) => async (event: any) => {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) return handleResponse.error(null, "Unauthorized", 401);

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) return handleResponse.error(error, "User not found", 401);

    // Build a per-request Supabase client that carries the caller's JWT so
    // PostgREST evaluates RLS policies against the real user (auth.uid()).
    const authedSupabase = getSupabaseClient(token);

    // get user profile from profiles table
    const { data: profile, error: profileError } = await authedSupabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (profileError) return handleResponse.error(profileError, "User not found", 401);
    console.log("profile", profile)
    event.user = { ...data.user, profile };
    event.token = token;
    event.supabase = authedSupabase;

    return handler(event);
};

export const verifyRole = (role: Role) => (handler: any) => async (event: any) => {
    // ✅ Reuse user already attached by verifyAuth
    if (!event.user) return handleResponse.error(null, "User not found", 401);

    console.log("user", event?.user)

    if (event.user.profile.role !== role) {
        return handleResponse.error(null, "You are not authorized to perform this action", 401);
    }

    return handler(event);
};


export const verifyAccountStatus = (handler: any) => async (event: any) => {
    // ✅ Reuse user already attached by verifyAuth
    if (!event.user) return handleResponse.error(null, "User not found", 401);

    const client = event.supabase ?? supabase;
    const userDetails = await client.from("profiles").select("*").eq("id", event.user.id).single();

    if (userDetails.error) return handleResponse.error(userDetails.error, "User not found", 401);

    if (userDetails.data.account_verified !== AccountStatus.APPROVED) {
        return handleResponse.error(null, "Your account is not approved", 401);
    }

    return handler(event);
};
