import { SupabaseClient } from "@supabase/supabase-js";
import { pushToQueue } from "../../../../../shared/utils/queue";
import { scenarios } from "../../utils/notificationScenarios";

// ─── Frontend notification trigger ──────────────────────────
// Resolves a scenario `key` into { who, template, push? } and enqueues one job
// onto the shared NotificationQueue (→ notificationWorker → in-app row [+ FCM]).
// The frontend calls this instead of writing to Supabase directly.

export const notificationTriggerRepository = {
    dispatch: async (body: any, caller: any, db: SupabaseClient) => {
        const { key, ...payload } = body ?? {};

        const scenario = key ? scenarios[key] : undefined;
        if (!scenario) throw new Error(`Unknown notification key: ${key ?? "(none)"}`);

        // Scenario decides WHO to notify and the shared template data.
        const { userIds, data } = await scenario.resolve({ payload, db, caller });

        if (!userIds.length) {
            return { queued: false, recipients: 0 };
        }

        const queueUrl = process.env.NOTIFICATION_QUEUE_URL;
        if (!queueUrl) throw new Error("NOTIFICATION_QUEUE_URL is not set");

        await pushToQueue(queueUrl, {
            type: scenario.templateType,
            user_ids: userIds,
            data,
            isPush: scenario.isPush,
        });

        return { queued: true, recipients: userIds.length };
    },
};
