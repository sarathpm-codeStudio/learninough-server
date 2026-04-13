import { facultyCourseService } from "../../modules/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const course = await facultyCourseService.createCourseWithBasicDetails(event);

        return handleResponse.success(course, "Course created successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error creating course", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
