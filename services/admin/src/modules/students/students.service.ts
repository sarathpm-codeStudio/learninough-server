
import { adminStudentsRepository } from "./students.repository"


export const adminStudentsService = {

    getAllStudents: async (event: any) => {
        try {

            const students = await adminStudentsRepository.getAllStudents();

            return students;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

}
