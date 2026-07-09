import { parseJsonBody } from "../../../../../shared/utils/parseBody";
import { pushToQueue } from "../../../../../shared/utils/queue";
import { supabaseAdmin } from "../../utils/supabaseAdmin";

// HTTP entry for the Supabase database webhook fired on every INSERT into
// chat_messages. We do the minimum here — authenticate, extract the row, and
// enqueue a job onto ChatNotificationQueue — then return 200 immediately. The
// actual FCM fan-out happens in the SQS worker (chat.notification handler).
//
// This is the single, universal trigger for chat push: it fires no matter which
// client inserted the message (faculty web, admin web, mobile) and does NOT
// check whether the recipient is online.

const CHAT_WEBHOOK_SECRET = process.env.CHAT_WEBHOOK_SECRET;

export const handler = async (event: any) => {
    try {
        // Shared-secret guard so only Supabase can trigger this endpoint.
        const headers = event.headers ?? {};
        const provided =
            headers["x-webhook-secret"] ?? headers["X-Webhook-Secret"];
        if (!CHAT_WEBHOOK_SECRET || provided !== CHAT_WEBHOOK_SECRET) {
            return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
        }

        const payload = parseJsonBody(event);

        // Supabase webhook shape: { type, table, schema, record, old_record }.
        const record = payload?.record ?? payload;
        const room_id = record?.room_id;
        const sender_id = record?.sender_id;

        if (!room_id || !sender_id) {
            // Ack anyway so Supabase doesn't retry a row we can't act on.
            return { statusCode: 200, body: JSON.stringify({ skipped: true }) };
        }

        // Push notifications are ONLY for students. Look at the room's recipients
        // (everyone except the sender) and require at least one whose profile
        // role is STUDENT. If the recipient isn't a student (e.g. a message sent
        // TO faculty/admin), ignore this webhook and don't enqueue anything.
        const { data: studentMembers, error: roleErr } = await supabaseAdmin
            .from("chat_room_members")
            .select("user_id, profiles!inner(role)")
            .eq("room_id", room_id)
            .eq("is_deleted", false)
            .neq("user_id", sender_id)
            .eq("profiles.role", "STUDENT");

        if (roleErr) throw new Error(roleErr.message);

        if (!studentMembers || studentMembers.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ skipped: true, reason: "no student recipient" }),
            };
        }

        await pushToQueue(process.env.CHAT_NOTIFICATION_QUEUE_URL!, {
            type: "CHAT_MESSAGE",
            message_id: record.id,
            room_id,
            sender_id,
            message_type: record.message_type ?? "TEXT",
        });

        return { statusCode: 200, body: JSON.stringify({ queued: true }) };
    } catch (error: any) {
        console.error("chatMessageWebhook error", error);
        // 500 lets Supabase retry the webhook.
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
