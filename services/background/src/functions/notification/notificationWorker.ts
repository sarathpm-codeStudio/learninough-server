import { notificationService } from "../../modules/notification/notification.service";

// SQS consumer for the shared NotificationQueue. Must return
// { batchItemFailures } at the TOP LEVEL so the ReportBatchItemFailures contract
// works — do NOT wrap in an HTTP response.
export const handler = async (event: any) => {
    return await notificationService.notificationWorker(event);
};
