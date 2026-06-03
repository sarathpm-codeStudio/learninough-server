import { studentsService } from "../../modules/students/students.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const studentAnalytics = await studentsService.getStudentAnalytics(event);

        return handleResponse.success(studentAnalytics, "Student analytics fetched successfully", 200);


    } catch (err: any) {

            return handleResponse.error(err, "Error fetching student analytics", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
