import { notificationService } from "../../modules/notification/notification.service";

// Scheduled (EventBridge cron) entry point — Cron B, runs 08:00 IST. Drains due
// scheduled_notifications rows into NotificationQueue for delivery.
export const handler = async () => {
    const summary = await notificationService.dispatchScheduled();
    return { statusCode: 200, body: JSON.stringify(summary) };
};
