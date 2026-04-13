



import { facultyCourseService } from "../../../modules/faculty/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// create folder in course 

export const handlerFun = async (event: any) => {

    try {


        const folder = await facultyCourseService.createFolderInCourse(event);

        return handleResponse.success(folder, "Folder created successfully", 201);


    } catch (err: any) {

        return handleResponse.error(err, "Error creating folder", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);