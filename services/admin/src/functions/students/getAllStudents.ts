import { adminStudentsService } from "../../modules/students/students.service";
import { verifyAuth, verifyRole } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const students = await adminStudentsService.getAllStudents(event);

        return handleResponse.success(students, "Students fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching students", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("ADMIN")
)(handlerFun);
