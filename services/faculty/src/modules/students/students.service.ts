
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
                search,
                client: event.supabase,
            });

            return students;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getStudentCourses: async (event: any) => {
        try {
            const { studentId } = event.pathParameters;
            const { page, limit, search } = event.queryStringParameters;

            const result = await studentsRepository.getStudentCourses({
                facultyId: event.user.id,
                studentId,
                page,
                limit,
                search,
                client: event.supabase,
            });

            return result;
        } catch (error: any) {
            console.log("error", error);
            throw new Error(error)
        }
    },

    getStudentAnalytics: async (event: any) => {
        try {
            const { studentId } = event.pathParameters;
            const studentAnalytics = await studentsRepository.getStudentAnalytics({
                facultyId: event.user.id,
                studentId,
                client: event.supabase
            });
            return studentAnalytics;
        } catch (error: any) {
            console.log("error", error);
            throw new Error(error)
        }
    },

    

}
