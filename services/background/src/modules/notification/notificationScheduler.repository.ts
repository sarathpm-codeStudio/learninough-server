import { supabaseAdmin } from "../../utils/supabaseAdmin";
import { pushToQueue } from "../../../../../shared/utils/queue";

// ─── Scheduled-notification dispatch (Cron B) ───────────────
// Runs at 08:00 IST. Drains every scheduled_notifications row that is `pending`
// and whose `scheduled_for` is due, enqueues it onto the shared Notification
// Queue (→ notificationWorker → FCM), and marks it `sent`.
//
// A row is only marked `sent` after it was successfully enqueued, so a transient
// failure leaves it `pending` for the next run instead of being silently lost.

// Safety cap per run so one invocation can't try to enqueue an unbounded set.
const DISPATCH_LIMIT = 1000;

export const notificationSchedulerRepository = {
    dispatchDue: async () => {
        const nowIso = new Date().toISOString();

        const { data: due, error } = await supabaseAdmin
            .from("scheduled_notifications")
            .select("id, type, user_id, data, is_push")
            .eq("status", "pending")
            .lte("scheduled_for", nowIso)
            .order("scheduled_for", { ascending: true })
            .limit(DISPATCH_LIMIT);

        if (error) throw new Error(error.message);
        if (!due || due.length === 0) {
            console.log("dispatchDue: nothing due");
            return { dispatched: 0, failed: 0 };
        }

        const queueUrl = process.env.NOTIFICATION_QUEUE_URL;
        if (!queueUrl) throw new Error("NOTIFICATION_QUEUE_URL is not set");

        // Enqueue each job; collect only the ids that made it onto the queue.
        const results = await Promise.allSettled(
            due.map((row: any) =>
                pushToQueue(queueUrl, {
                    type: row.type,
                    user_id: row.user_id,
                    data: row.data,
                    // false → worker creates the in-app row only, no FCM push.
                    // null/undefined (column absent) → defaults to a normal push.
                    isPush: row.is_push ?? true,
                }).then(() => row.id)
            )
        );

        const sentIds = results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
            .map((r) => r.value);

        if (sentIds.length) {
            const { error: upErr } = await supabaseAdmin
                .from("scheduled_notifications")
                .update({ status: "sent", sent_at: nowIso })
                .in("id", sentIds);
            if (upErr) throw new Error(upErr.message);
        }

        const summary = { dispatched: sentIds.length, failed: due.length - sentIds.length };
        console.log("dispatchDue summary", summary);
        return summary;
    },
};
