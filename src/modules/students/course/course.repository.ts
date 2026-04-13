

import { prisma } from "../../../shared/DB/prisma";


export const studentCourseRepository = {

    getCourses: async () => {

        const courses = await prisma.courses.findMany();
        console.log("courses", courses);
        return courses;

    }
}   