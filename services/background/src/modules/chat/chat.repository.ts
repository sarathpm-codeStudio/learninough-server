import { supabaseAdmin } from "../../utils/supabaseAdmin";
import { sendPushToTokens } from "../../utils/fcm";

// ─── in-app notification helper ─────────────────────────────
// Mirrors the notifications-table pattern used by the video worker so a chat
// push also leaves an in-app notification row for the recipient.
const createNotification = async (notification: {
    user_id: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any> | null;
}) => {
    const { error } = await supabaseAdmin.from("notifications").insert({
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? null,
        is_admin: false,
        sent_at: new Date().toISOString(),
    });
    if (error) console.log("createNotification error", error);
};

// Human-readable push text. The message body itself is encrypted, so we
// intentionally do NOT try to show its content — just who sent it and what kind
// of message it was.
const buildBody = (senderName: string, messageType: string): string => {
    switch (messageType) {
        case "IMAGE":
            return `${senderName} sent a photo`;
        case "PDF":
            return `${senderName} sent a document`;
        case "VIDEO":
            return `${senderName} sent a video`;
        default:
            return `${senderName} sent you a message`;
    }
};

// ─── one queue message → one push fan-out ───────────────────
const processRecord = async (record: any) => {
    const data = JSON.parse(record.body);
    const { room_id, sender_id, message_id, message_type = "TEXT" } = data;

    if (!room_id || !sender_id) {
        // Nothing actionable — drop it (do not retry a malformed job).
        console.log(
            "chatNotificationWorker: skipping record without room_id/sender_id",
            data
        );
        return;
    }

    // Recipients = STUDENT members of the room except the sender. We derive this
    // from chat_room_members (not a receiver_id column) because the faculty/admin
    // web clients insert messages without setting receiver_id. Push notifications
    // are only for students, so we filter on profile role here as well.
    const { data: members, error: memberErr } = await supabaseAdmin
        .from("chat_room_members")
        .select("user_id, profiles!inner(role)")
        .eq("room_id", room_id)
        .eq("is_deleted", false)
        .neq("user_id", sender_id)
        .eq("profiles.role", "STUDENT");

    if (memberErr) throw new Error(memberErr.message);

    const recipientIds = (members ?? [])
        .map((m: any) => m.user_id)
        .filter(Boolean);
    if (recipientIds.length === 0) return;

    // Sender's display name for the push title/body.
    const { data: sender } = await supabaseAdmin
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", sender_id)
        .maybeSingle();

    const senderName =
        [sender?.first_name, sender?.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() || "New message";
    const body = buildBody(senderName, message_type);

    // Leave an in-app notification row for each recipient.
    // await Promise.all(
    //     recipientIds.map((uid: string) =>
    //         createNotification({
    //             user_id: uid,
    //             type: "CHAT_MESSAGE",
    //             title: senderName,
    //             body,
    //             data: { room_id, message_id: message_id ?? null },
    //         })
    //     )
    // );

    // All active FCM device tokens for the recipients.
    const { data: devices, error: devErr } = await supabaseAdmin
        .from("notification_devices")
        .select("token")
        .in("user_id", recipientIds)
        .eq("is_active", true);

    if (devErr) throw new Error(devErr.message);

    const tokens = (devices ?? [])
        .map((d: any) => d.token)
        .filter(Boolean);

    if (tokens.length === 0) return; // recipient has no registered device

    const { invalidTokens } = await sendPushToTokens(tokens, {
        title: senderName,
        body,
        data: {
            type: "CHAT_MESSAGE",
            room_id: String(room_id),
            message_id: message_id ? String(message_id) : "",
        },
    });

    // Deactivate dead tokens so we stop trying them next time.
    if (invalidTokens.length) {
        await supabaseAdmin
            .from("notification_devices")
            .update({ is_active: false })
            .in("token", invalidTokens);
    }
};

export const chatRepository = {
    // SQS consumer for chat push notifications. Every chat message enqueues one
    // job here (no online/offline check) and we fan a push out to all of the
    // recipient's devices. Returns { batchItemFailures } so SQS retries only the
    // records that actually failed.
    chatNotificationWorker: async (event: any) => {
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
