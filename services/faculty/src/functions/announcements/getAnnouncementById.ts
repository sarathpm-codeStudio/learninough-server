

import { announcementService } from "../../modules/announcements/announcements.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {
    try {

        const announcement = await announcementService.getAnnouncementById(event);

        return handleResponse.success(announcement, "Announcement fetched successfully", 200);


    } catch (error: any) {

        console.log("error", error);

        return handleResponse.error(error, "Error fetching announcement", 400);
    }
}


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
