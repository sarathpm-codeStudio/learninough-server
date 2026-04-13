






import { facultyCourseService } from "../../../modules/faculty/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// get all processing material 

export const handlerFun = async (event: any) => {

    try {


        const materials = await facultyCourseService.getAllProcessingMaterial(event);

        return handleResponse.success(materials, "All processing materials fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching all processing materials", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);