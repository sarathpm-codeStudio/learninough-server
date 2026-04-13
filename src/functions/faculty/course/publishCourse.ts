





import { facultyCourseService } from "../../../modules/faculty/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// publish course 

export const handlerFun = async (event: any) => {

    try {


        const course = await facultyCourseService.publishCourse(event);

        return handleResponse.success(course, "Course published successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error publishing course", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);