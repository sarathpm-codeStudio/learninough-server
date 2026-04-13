



import { studentsService } from "../../../modules/faculty/students/students.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// get all students of a faculty 

export const handlerFun = async (event: any) => {

    try {


        const students = await studentsService.getAllMyStudents(event);

        return handleResponse.success(students, "Students fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching students", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);