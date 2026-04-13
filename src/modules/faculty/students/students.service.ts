
import { studentsRepository } from "./students.repository"






export const studentsService = {


    getAllMyStudents: async (event: any) => {
        try {

            const { courseId, filter, page, limit, search } = event.queryStringParameters;

            const students = await studentsRepository.getAllMyStudents({
                facultyId: event.user.id,
                courseId,
                filter,
                page,
                limit,
                search
            });

            return students;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },



}