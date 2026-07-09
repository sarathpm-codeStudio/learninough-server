import { streakService } from "../../modules/streak/streak.service";

// Scheduled (EventBridge cron) entry point — runs once daily at 08:00 IST for
// the day that just ended. Settles every student's streak, awards coins on the
// goal, and enqueues reward / broken push jobs onto NotificationQueue.
export const handler = async () => {
    const summary = await streakService.runDailyStreaks();
    return { statusCode: 200, body: JSON.stringify(summary) };
};
