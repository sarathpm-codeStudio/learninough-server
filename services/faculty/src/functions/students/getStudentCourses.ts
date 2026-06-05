import { studentsService } from "../../modules/students/students.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const studentCourses = await studentsService.getStudentCourses(event);

        return handleResponse.success(studentCourses, "Student courses fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching student courses", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
