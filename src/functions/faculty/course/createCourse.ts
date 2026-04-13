

import { facultyCourseService } from "../../../modules/faculty/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// create course with basic details 

export const handlerFun = async (event: any) => {

    try {


        const course = await facultyCourseService.createCourseWithBasicDetails(event);

        return handleResponse.success(course, "Course created successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error creating course", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);