
import { announcementService } from "../../../modules/faculty/announcements/announcements.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




export const handlerFun = async (event: any) => {
    try {

        const announcement = await announcementService.createAnnouncement(event);

        return handleResponse.success(announcement, "Announcement created successfully", 200);


    } catch (error: any) {

        return handleResponse.error(error, "Error creating announcement", 400);
    }
}


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);