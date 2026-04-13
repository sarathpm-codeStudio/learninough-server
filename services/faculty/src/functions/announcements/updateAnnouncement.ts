import { announcementService } from "../../modules/announcements/announcements.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


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
