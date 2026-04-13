





import { facultyCourseService } from "../../../modules/faculty/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// create material 

export const handlerFun = async (event: any) => {

    try {


        const material = await facultyCourseService.uploadMaterial(event);

        return handleResponse.success(material, "Material created successfully", 201);


    } catch (err: any) {

        return handleResponse.error(err, "Error creating material", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);