
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../../shared/config/supabase";


export const adminEnrollmentCsvRepository = {

    /** Fetch the course title so the export can be labelled/named. */
    getCourse: async (courseId: string, client?: SupabaseClient) => {

        const supabase = (client ?? anonSupabase) as SupabaseClient;

        // Only used to label the download filename — a missing/inaccessible
        // course must not abort the export, so use maybeSingle() and don't throw.
        const { data: course, error } = await supabase
            .from("courses")
            .select("id, title")
            .eq("id", courseId)
            .maybeSingle();

        if (error) {
            console.log("getCourse error", error.message);
            return null;
        }

        return course;
    },

    /** Fetch every enrollment for a course, with the enrolled student's details. */
    getCourseEnrollments: async (courseId: string, client?: SupabaseClient) => {

        const supabase = (client ?? anonSupabase) as SupabaseClient;

        const { data: enrollments, error } = await supabase
            .from("enrollments")
            .select(`
                id,
                enrolled_at,
                created_at,
                amount_paid,
                course_price,
                gst_amount,
                payment_id,
                payment_method,
                is_bundle_enrollment,
                student:profiles!enrollments_student_id_fkey (
                    id,
                    first_name,
                    last_name,
                    email
                )
            `)
            .eq("course_id", courseId)
            .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        return enrollments ?? [];
    },

}
