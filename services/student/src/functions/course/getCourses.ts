import { studentCourseService } from "../../modules/course/course.service";
import { handleResponse } from "../../../../../shared/utils/response";


export const handler = async (event: any) => {

    try {

        const courses = await studentCourseService.getCourses();
        return handleResponse.success(courses, "Courses fetched successfully", 200);


    } catch (err: any) {
        return handleResponse.error(err, "Error fetching courses", 400);
    }
};
