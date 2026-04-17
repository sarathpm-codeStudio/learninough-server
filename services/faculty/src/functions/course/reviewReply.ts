




import { facultyCourseService } from "../../modules/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const result = await facultyCourseService.addReviewReply(event);

        return handleResponse.success(result, "Review reply added successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error adding review reply", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
