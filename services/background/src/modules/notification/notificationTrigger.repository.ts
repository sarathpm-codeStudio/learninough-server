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
        console.log(`🔔[NOTIF-TRIGGER] API called key=${key ?? "(none)"} caller=${caller?.id ?? caller?.sub ?? "?"} payload=${JSON.stringify(payload)}`);

        const scenario = key ? scenarios[key] : undefined;
        if (!scenario) throw new Error(`Unknown notification key: ${key ?? "(none)"}`);

        // Scenario decides WHO to notify and the shared template data.
        const { userIds, data } = await scenario.resolve({ payload, db, caller });
        console.log(`🔔[NOTIF-TRIGGER] scenario=${key} resolved recipients=${userIds.length} type=${scenario.templateType} isPush=${scenario.isPush}`);

        if (!userIds.length) {
            console.log(`🔔[NOTIF-TRIGGER] no recipients — nothing queued (key=${key})`);
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
        console.log(`🔔[NOTIF-TRIGGER] queued OK key=${key} recipients=${userIds.length}`);

        return { queued: true, recipients: userIds.length };
    },
};
