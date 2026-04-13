

import { facultyCourseService } from "../../../modules/faculty/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// update course details 

export const handlerFun = async (event: any) => {

    try {


        const course = await facultyCourseService.updateCourseDetails(event);

        return handleResponse.success(course, "Course updated successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error updating course", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);