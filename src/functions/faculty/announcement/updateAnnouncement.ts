
import { announcementService } from "../../../modules/faculty/announcements/announcements.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




export const handlerFun = async (event: any) => {
    try {

        const announcement = await announcementService.updateAnnouncement(event);

        return handleResponse.success(announcement, "Announcement updated successfully", 200);


    } catch (error: any) {

        return handleResponse.error(error, "Error updating announcement", 400);
    }
}


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);