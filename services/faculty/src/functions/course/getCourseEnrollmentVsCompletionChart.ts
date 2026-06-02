




import { facultyCourseService } from "../../modules/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const course = await facultyCourseService.getCourseEnrollmentVsCompletionChart(event);

        return handleResponse.success(course, "Course enrollment vs completion chart fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching course enrollment vs completion chart", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
