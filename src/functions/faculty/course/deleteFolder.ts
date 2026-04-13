

import { facultyCourseService } from "../../../modules/faculty/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// delete folder  

export const handlerFun = async (event: any) => {

    try {


        const folder = await facultyCourseService.deleteFolder(event);

        return handleResponse.success(folder, "Folder deleted successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error deleting folder", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);