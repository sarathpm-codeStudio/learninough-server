
import { supabase } from "../../../../../shared/config/supabase";
import { TestBaseDetailsData, QuestionData } from "../../../../../shared/constants/types"




export const facultyTestRepository = {


    createTestBaseDetails: async (data: TestBaseDetailsData, faculty_id: string) => {
        try {



            // check if course is valid
            if (data.course_id) {
                const { data: course, error } = await supabase.from("courses")
                    .select("*")
                    .eq("id", data.course_id)
                    .eq("faculty_id", faculty_id)
                    .single();
                if (error) throw error;
                if (!course) throw new Error("Course not found");
            }



            // if is new create new test
            if (data.is_new) {

                console.log("data new>>>>>>", data);

                const { data: result, error } = await supabase
                    .from("tests")
                    .insert({
                        faculty_id: faculty_id,
                        title: data.title,
                        chapter: data.chapter,
                        course_id: data?.course_id || null,
                        module_id: data?.module_id || null,
                        total_marks: data.total_marks,
                        is_draft: data.is_draft,
                        duration_minutes: data.duration,
                        instructions: data.instructions,
                        type: data.type,
                        is_random: data.is_random,
                    })
                    .select()
                    .single();

                if (error) {
                    console.log("error create test ", error);
                    throw error;
                }

                return result;


            } else {

                // if not new update draft test
                const { data: result, error } = await supabase
                    .from("test")
                    .update({
                        faculty_id: faculty_id,
                        title: data.title,
                        chapter: data.chapter,
                        course_id: data?.course_id || null,
                        module_id: data?.module_id || null,
                        total_marks: data.total_marks,
                        is_draft: data.is_draft,
                        duration_minutes: data.duration,
                        instructions: data.instructions,
                        type: data.type,
                        is_random: data.is_random,
                    })
                    .eq("id", data.test_id)
                    .select()
                    .single();

                if (error) throw error;

                return result;

            }

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getMyAllTests: async (faculty_id: string, filter: string, page: number, limit: number, search: string) => {
        try {

            const from = (page - 1) * limit;
            const to = from + limit - 1;


            let query: any = await supabase.from("tests")
                .select("*")
                .eq("faculty_id", faculty_id)


            if (filter !== "all") {
                query = query.eq("is_draft", filter);
            }

            if (search) {
                query = query.or(`title.ilike.%${search}%,chapter.ilike.%${search}%`);
            }

            const { data: result, error } = await query
                .range(from, to)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getTestById: async (test_id: string) => {
        try {

            const { data: result, error } = await supabase.from("tests")
                .select("*")
                .eq("id", test_id)
                .single();
            if (error) throw error;
            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    updateTest: async (test_id: string, data: TestBaseDetailsData, faculty_id: string) => {
        try {

            // check if course is valid
            if (data.course_id) {
                const { data: course, error } = await supabase.from("courses")
                    .select("*")
                    .eq("id", data.course_id)
                    .eq("faculty_id", faculty_id)
                    .single();
                if (error) throw error;
                if (!course) throw new Error("Course not found");
            }


            const { data: result, error } = await supabase.from("tests")
                .update({

                    title: data.title,
                    chapter: data.chapter,
                    course_id: data?.course_id || null,
                    module_id: data?.module_id || null,
                    total_marks: data.total_marks,
                    is_draft: data.is_draft,
                    duration_minutes: data.duration,
                    instructions: data.instructions,
                    type: data.type,
                    is_random: data.is_random,
                })
                .eq("id", test_id)
                .select()
                .single();
            if (error) throw error;
            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    deleteTest: async (test_id: string) => {
        try {

            const { data: result, error } = await supabase.from("tests")
                .update({
                    is_deleted: true
                })
                .eq("id", test_id)
                .select()
                .single();

            if (error) throw error;
            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },


    createTestQuestion: async (data: QuestionData, test_id: string) => {
        try {

            const { data: result, error } = await supabase.from("questions")
                .insert({
                    test_id: test_id,
                    question: data.question,
                    type: data.type,
                    marks: data.marks,

                })
                .select()
                .single();
            if (error) throw error;

            // creating options

            if (data.option && data.option.length > 0) {


                data.option.forEach(async (option: any) => {
                    const { data: optionResult, error: optionError } = await supabase.from("options")
                        .insert({
                            question_id: result.id,
                            option_text: option.option_text,
                            is_correct: option.is_correct,
                            label: option.label,
                        })
                        .select()
                        .single();
                    if (optionError) throw optionError;
                });

            }


            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    updateTestQuestion: async (data: QuestionData, test_id: string) => {
        try {

            const { data: result, error } = await supabase.from("questions")
                .update({
                    test_id: test_id,
                    question: data.question,
                    type: data.type,
                    marks: data.marks,

                })
                .eq("id", test_id)
                .select()
                .single();
            if (error) throw error;


            // delete old options
            const { data: deleteResult, error: deleteError } = await supabase.from("options")
                .delete()
                .eq("question_id", result.id);
            if (deleteError) throw deleteError;

            // creating new options

            if (data.option && data.option.length > 0) {


                data.option.forEach(async (option: any) => {
                    const { data: optionResult, error: optionError } = await supabase.from("options")
                        .insert({
                            question_id: result.id,
                            option_text: option.option_text,
                            is_correct: option.is_correct,
                            label: option.label,
                        })
                        .select()
                        .single();
                    if (optionError) throw optionError;
                });

            }


            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    deleteTestQuestion: async (question_id: string) => {
        try {

            const { data: result, error } = await supabase.from("questions")
                .delete()
                .eq("id", question_id)
                .select()
                .single();
            if (error) throw error;

            // delete options
            const { data: deleteResult, error: deleteError } = await supabase.from("options")
                .delete()
                .eq("question_id", question_id);
            if (deleteError) throw deleteError;

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    publishTest: async (test_id: string) => {
        try {

            const { data: result, error } = await supabase.from("tests")
                .update({
                    is_draft: false
                })
                .eq("id", test_id)
                .select()
                .single();
            if (error) throw error;
            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },


}   
