import { notificationTriggerRepository } from "./notificationTrigger.repository";
import { parseJsonBody } from "../../../../../shared/utils/parseBody";

export const notificationTriggerService = {
    // Frontend calls this with { key, ...payload }. We resolve the scenario and
    // enqueue the job; the shared worker does the actual fan-out.
    dispatch: async (event: any) => {
        try {
            const body = parseJsonBody(event);
            return await notificationTriggerRepository.dispatch(
                body,
                event.user,
                event.supabase
            );
        } catch (error: any) {
            console.log("notificationTrigger error", error);
            throw new Error(error.message ?? error);
        }
    },
};
