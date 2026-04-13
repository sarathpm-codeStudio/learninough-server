
import { announcementService } from "../../../modules/faculty/announcements/announcements.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";


export const handlerFun = async (event: any) => {
    try {

        const announcements = await announcementService.getAllAnnouncements(event);

        return handleResponse.success(announcements, "Announcements fetched successfully", 200);


    } catch (error: any) {

        console.log("error", error);

        return handleResponse.error(error, "Error fetching announcements", 400);
    }
}


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);