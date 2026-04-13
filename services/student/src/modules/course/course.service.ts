import { studentCourseRepository } from "./course.repository";


export const studentCourseService = {

    getCourses: async () => {

        const courses = await studentCourseRepository.getCourses();
        return courses;
    }
}
