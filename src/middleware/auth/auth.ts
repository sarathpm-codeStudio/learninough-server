
import { supabase } from "../../shared/supabase/supabase";
import { Role, AccountStatus } from "../../shared/constants/types";
import { handleResponse } from "../../shared/utils/response";

// middleware.ts
export const verifyAuth = (handler: any) => async (event: any) => {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) return handleResponse.error(null, "Unauthorized", 401);

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) return handleResponse.error(error, "User not found", 401);

    // ✅ Attach user to event — no need to fetch again in next middleware
    event.user = data.user;

    return handler(event);
};

export const verifyRole = (role: Role) => (handler: any) => async (event: any) => {
    // ✅ Reuse user already attached by verifyAuth
    if (!event.user) return handleResponse.error(null, "User not found", 401);

    if (event.user.user_metadata.role !== role) {
        return handleResponse.error(null, "You are not authorized to perform this action", 401);
    }

    return handler(event);
};


export const verifyAccountStatus = (handler: any) => async (event: any) => {
    // ✅ Reuse user already attached by verifyAuth
    if (!event.user) return handleResponse.error(null, "User not found", 401);

    const userDetails = await supabase.from("profiles").select("*").eq("id", event.user.id).single();

    if (userDetails.error) return handleResponse.error(userDetails.error, "User not found", 401);

    if (userDetails.data.account_verified !== AccountStatus.APPROVED) {
        return handleResponse.error(null, "Your account is not approved", 401);
    }

    return handler(event);
};