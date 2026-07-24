import { notificationTriggerService } from "../../modules/notification/notificationTrigger.service";
import { verifyAuth, verifyRole } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";

// POST /notifications/trigger
// Body: { key: "<scenario>", ...payload }  e.g. { key: "COURSE_NOTE", courseId, note }
// Resolves the scenario → enqueues one NotificationQueue job. No direct DB writes
// from the frontend.
export const handlerFun = async (event: any) => {
    try {
        const result = await notificationTriggerService.dispatch(event);
        return handleResponse.success(result, "Notification queued", 200);
    } catch (err: any) {
        return handleResponse.error(err, "Error queuing notification", 400);
    }
};

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY")
)(handlerFun);
