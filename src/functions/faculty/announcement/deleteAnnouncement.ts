
import { announcementService } from "../../../modules/faculty/announcements/announcements.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";


export const handlerFun = async (event: any) => {
    try {

        const result = await announcementService.deleteAnnouncement(event);

        return handleResponse.success(result, "Announcement deleted successfully", 200);


    } catch (error: any) {

        return handleResponse.error(error, "Error deleting announcement", 400);
    }
}


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
