import { notificationRepository } from "./notificationWorker.repository";
import { notificationSchedulerRepository } from "./notificationScheduler.repository";

export const notificationService = {
    // Drains one SQS batch from NotificationQueue and fans each job out to FCM +
    // an in-app notification row. Returns { batchItemFailures } untouched so the
    // handler can hand it straight back to SQS.
    notificationWorker: async (event: any) => {
        return await notificationRepository.processQueue(event);
    },

    // Cron B — enqueues every staged notification that is now due (08:00 IST).
    dispatchScheduled: async () => {
        return await notificationSchedulerRepository.dispatchDue();
    },
};
