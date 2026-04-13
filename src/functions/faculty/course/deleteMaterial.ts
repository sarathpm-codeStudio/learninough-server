




import { facultyCourseService } from "../../../modules/faculty/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// delete material  

export const handlerFun = async (event: any) => {

    try {


        const material = await facultyCourseService.deleteMaterial(event);

        return handleResponse.success(material, "Material deleted successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error deleting material", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);