
import { supabase } from "../../../../../shared/config/supabase";


export const adminStudentsRepository = {

    getAllStudents: async () => {

        try {

            const { data: students, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("role", "STUDENT")
                .order("created_at", { ascending: false });

            if (error) throw new Error(error.message);

            return students;

        } catch (error: any) {

            throw new Error(error.message)
        }
    },

}
