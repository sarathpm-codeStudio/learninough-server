import { facultyCourseService } from "../../modules/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const content = await facultyCourseService.getCourseContent(event);

        return handleResponse.success(content, "Course content fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching course content", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
