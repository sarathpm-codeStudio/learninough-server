
import { studentsRepository } from "./students.repository"




export const studentsService = {


    getAllMyStudents: async (event: any) => {
        try {

            const { page, limit, search } = event.queryStringParameters;

            const filter = {
                selectedCourse: event.queryStringParameters["filter[selectedCourse]"] || "all",
                selectedDate: event.queryStringParameters["filter[selectedDate]"] || "",
            };

            const students = await studentsRepository.getAllMyStudents({
                facultyId: event.user.id,
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
