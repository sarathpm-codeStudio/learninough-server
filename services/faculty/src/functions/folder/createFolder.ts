import { facultyCourseService } from "../../modules/course/course.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const folder = await facultyCourseService.createFolderInCourse(event);

        return handleResponse.success(folder, "Folder created successfully", 201);


    } catch (err: any) {

        return handleResponse.error(err, "Error creating folder", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
