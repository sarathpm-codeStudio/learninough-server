import { facultyCourseService } from "../../modules/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";

export const handlerFun = async (event: any) => {
    try {
        const trend = await facultyCourseService.getCourseRevenueTrend(event);
        return handleResponse.success(trend, "Course revenue trend fetched successfully", 200);
    } catch (err: any) {
        return handleResponse.error(err, "Error fetching course revenue trend", 400);
    }
};

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
