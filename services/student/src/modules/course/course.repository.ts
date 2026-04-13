
import { supabase } from "../../../../../shared/config/supabase";


export const studentCourseRepository = {

    getCourses: async () => {
        const { data: courses, error } = await supabase
            .from("courses")
            .select("*")
            .eq("is_draft", false)
            .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        return courses;
    },
}
