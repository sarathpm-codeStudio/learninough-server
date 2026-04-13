import { facultyCourseService } from "../../modules/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const materials = await facultyCourseService.getAllProcessingMaterial(event);

        return handleResponse.success(materials, "All processing materials fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching all processing materials", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
