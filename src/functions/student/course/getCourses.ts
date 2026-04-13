


import { studentCourseService } from "../../../modules/students/course/course.service";



export const handler = async (event: any) => {

    try {

        const courses = await studentCourseService.getCourses();
        return {
            statusCode: 200,
            body: JSON.stringify(courses)
        };


    } catch (err: any) {
        return {
            statusCode: 401,
            body: err.message
        };
    }
};