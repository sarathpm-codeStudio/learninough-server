import { supabaseAdmin } from "../../utils/supabaseAdmin";
import { sendPushToTokens } from "../../utils/fcm";

// ─── Generic notification worker ────────────────────────────
// One SQS queue (NotificationQueue) carries EVERY push scenario. Each job has a
// `type` that this worker switches on to build the copy + in-app row. Adding a
// new scenario = add one entry to `templates` and enqueue with that type — no
// new queue, no new worker, no new FCM code (we reuse utils/fcm).
//
// Job shape on the queue:
//   { type: "STREAK_REWARD" | "STREAK_BROKEN" | ..., user_id: string, data?: object }

interface NotificationTemplate {
    // notifications.type is the `notification_type` enum — must be a valid label.
    notifType:
        | "COINS_EARNED"
        | "STREAK_REMINDER"
        | "BADGE_UNLOCKED"
        | "COURSE_UPDATE"
        | "EXAM_REMINDER";
    title: string;
    body: string;
    // Extra string map delivered to the app for deep-linking.
    pushData?: Record<string, string>;
}

const templates: Record<string, (data: any) => NotificationTemplate> = {
    // Student completed the streak goal and earned coins.
    STREAK_REWARD: (d) => ({
        notifType: "COINS_EARNED",
        title: `🔥 ${d?.days ?? ""}-day streak!`.replace(/\s+/g, " ").trim(),
        body: `You earned ${d?.coins ?? 0} coins — keep it going!`,
        pushData: {
            type: "STREAK_REWARD",
            coins: String(d?.coins ?? 0),
            days: String(d?.days ?? 0),
        },
    }),

    // Student missed a day and lost their streak — re-engagement nudge.
    STREAK_BROKEN: () => ({
        notifType: "STREAK_REMINDER",
        title: "💔 You lost your streak",
        body: "Start a new one today!",
        pushData: { type: "STREAK_BROKEN" },
    }),
};

// ─── in-app notification row (mirrors the video/chat pattern) ─
const createNotification = async (
    userId: string,
    tpl: NotificationTemplate,
    data: Record<string, any> | null
) => {
    const { error } = await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: tpl.notifType,
        title: tpl.title,
        body: tpl.body,
        data: data ?? null,
        is_admin: false,
        sent_at: new Date().toISOString(),
    });
    if (error) console.log("createNotification error", error);
};

// ─── one queue message → one push fan-out ───────────────────
const processRecord = async (record: any) => {
    const job = JSON.parse(record.body);
    const { type, user_id, data } = job ?? {};

    const build = type ? templates[type] : undefined;
    if (!build || !user_id) {
        // Unknown type or missing recipient — drop it (don't retry a bad job).
        console.log("notificationWorker: skipping unactionable job", job);
        return;
    }

    const tpl = build(data);

    // Leave an in-app notification row.
    await createNotification(user_id, tpl, data ?? null);

    // All active FCM device tokens for this user.
    const { data: devices, error: devErr } = await supabaseAdmin
        .from("notification_devices")
        .select("token")
        .eq("user_id", user_id)
        .eq("is_active", true);

    if (devErr) throw new Error(devErr.message);

    const tokens = (devices ?? [])
        .map((d: any) => d.token)
        .filter(Boolean);

    if (tokens.length === 0) return; // no registered device

    const { invalidTokens } = await sendPushToTokens(tokens, {
        title: tpl.title,
        body: tpl.body,
        data: tpl.pushData ?? {},
    });

    // Deactivate dead tokens so we stop trying them next time.
    if (invalidTokens.length) {
        await supabaseAdmin
            .from("notification_devices")
            .update({ is_active: false })
            .in("token", invalidTokens);
    }
};

export const notificationRepository = {
    // SQS consumer. Returns { batchItemFailures } so ReportBatchItemFailures
    // retries only the records that actually failed.
    processQueue: async (event: any) => {
        const results = await Promise.allSettled(
            event.Records.map((record: any) => processRecord(record))
        );

        const failures = results
            .map((r, i) => ({ result: r, record: event.Records[i] }))
            .filter(({ result }) => result.status === "rejected")
            .map(({ record }) => ({ itemIdentifier: record.messageId }));

        return { batchItemFailures: failures };
    },
};
