
import { facultyCourseService } from "../../../modules/faculty/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// get course content 

export const handlerFun = async (event: any) => {

    try {


        const content = await facultyCourseService.getCourseContent(event);

        return handleResponse.success(content, "Course content fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching course content", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);