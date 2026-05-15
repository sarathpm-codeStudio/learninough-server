
import { supabase } from "../../../../../shared/config/supabase";
import { TestBaseDetailsData, QuestionData } from "../../../../../shared/constants/types"




export const facultyTestRepository = {


    createTestBaseDetails: async (data: TestBaseDetailsData, facultyId: string) => {
        try {



            // check if course is valid
            const { data: course, error } = await supabase.from("courses")
                .select("*")
                .eq("id", data?.course)
                .eq("faculty_id", facultyId)
                .single();
            if (error) throw error;
            if (!course) throw new Error("Course not found");

            // create new test

            const { data: test, error: testError } = await supabase.from("tests")
                .insert({
                    faculty_id: facultyId,
                    unique_id: data.unique_id,
                    title: data.title,
                    course_id: data?.course,
                    module_id: data?.module || null,
                    total_marks: data.totalMarks,
                    duration_minutes: data.duration,
                    instructions: data.instructions,
                    type: data.testType,
                })
                .select()
                .single();
            if (testError) throw testError;

            // add  this test in course metirial 

            const nextSortOrder = await getNextSortOrder(data?.course, data?.module && data.module.trim() !== '' ? data.module : null);
            console.log("nextSortOrder", nextSortOrder);
            const { data: material, error: materialError } = await supabase
                .from("course_materials")
                .insert({

                    unique_id: data.unique_id,
                    course_id: data?.course,
                    folder_id: data?.module && data.module.trim() !== '' ? data.module : null,
                    sort_order: nextSortOrder,
                    title: data.title,
                    type: "TEST",
                    material_status: "PENDING",
                })
                .select()
                .single();
            if (materialError) throw new Error(materialError.message);

            return test;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },



    // getMyAllTests: async (faculty_id: string, filter: string, page: number, limit: number, search: string) => {
    //     try {
    //         const from = (page - 1) * limit;
    //         const to = from + limit - 1;

    //         // ✅ No await here — keep it as a query builder
    //         let query = supabase
    //             .from("tests")
    //             .select("*")
    //             .eq("faculty_id", faculty_id);

    //         if (filter !== "all") {
    //             query = query.eq("is_draft", filter);
    //         }

    //         if (search) {
    //             query = query.or(`title.ilike.%${search}%,chapter.ilike.%${search}%`);
    //         }

    //         // ✅ Only await at the final execution
    //         const { data: result, error } = await query
    //             .range(from, to)
    //             .order("created_at", { ascending: false });

    //         if (error) throw error;

    //         return result;

    //     } catch (error: any) {
    //         console.log("error", error);
    //         throw new Error(error?.message || JSON.stringify(error)); // ✅ also fix error serialization
    //     }
    // },

    getMyAllTests: async (faculty_id: string, filter: string, page: number, limit: number, search: string) => {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from("tests")
            .select("*, courses(*)", { count: "exact" }) // ✅ get total count
            .eq("faculty_id", faculty_id)
            .eq("is_deleted", false);


        if (filter !== "all") {
            query = query.eq("is_draft", filter);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%`);
        }

        const { data, error, count } = await query
            .range(from, to)
            .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        return { data, total: count ?? 0 }; // ✅ return both
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

    updateTest: async (test_id: string, data: TestBaseDetailsData, facultyId: string) => {
        try {

            console.log("data", data);

            // check if course is valid
            if (data.course) {
                const { data: course, error } = await supabase.from("courses")
                    .select("*")
                    .eq("id", data.course)
                    .eq("faculty_id", facultyId)
                    .single();
                if (error) throw error;
                if (!course) throw new Error("Course not found");
            }

            console.log("test_id", test_id);


            const { data: result, error } = await supabase.from("tests")
                .update({

                    course_id: data.course,
                    module_id: data.module,
                    title: data.title,
                    total_marks: data.totalMarks,
                    duration_minutes: data.duration,
                    instructions: data.instructions,
                    type: data.testType,

                })
                .eq("id", test_id)
                .select()
                .single();
            if (error) throw error;

            console.log("result", result);

            // update course material
            const { data: material, error: materialError } = await supabase.from("course_materials")
                .update({
                    title: data.title,

                })
                .eq("unique_id", result.unique_id)
                .select()
                .single();
            if (materialError) throw materialError;

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    deleteTest: async (test_id: string) => {
        try {

            const { data: result, error } = await supabase.from("tests")
                .update({ is_deleted: true })
                .eq("id", test_id)
                .select()
                .single();

            if (error) throw error;

            // delete course module
            const { data: module, error: moduleError } = await supabase.from("course_materials")
                .update({ is_deleted: true })
                .eq("unique_id", result.unique_id)
                .select()
                .single();
            if (moduleError) throw moduleError;

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },


    createTestQuestion: async (data: QuestionData, test_id: string) => {
        try {

            // Step 1: get the current max question_number for this test
            const { data: lastQuestion, error: countError } = await supabase
                .from("questions")
                .select("question_number")
                .eq("test_id", test_id)
                .order("question_number", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (countError) throw countError;

            const nextQuestionNumber = (lastQuestion?.question_number ?? 0) + 1;

            // Step 2: insert with the correct question_number
            const { data: result, error } = await supabase.from("questions")
                .insert({
                    test_id: test_id,
                    question: data.question,
                    type: data.type,
                    marks: data.marks,
                    question_number: nextQuestionNumber, // ✅
                })
                .select()
                .single();

            if (error) throw error;

            // creating options

            if (data.options && data.options.length > 0) {


                data.options.forEach(async (option: any) => {
                    const { data: optionResult, error: optionError } = await supabase.from("options")
                        .insert({
                            question_id: result.id,
                            option_text: option.text,
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

    // getTestQuestionByTestId: async (test_id: string) => {
    //     try {

    //         const { data: result, error } = await supabase.from("questions")
    //             .select(`
    //             *,
    //             options (
    //                 id,
    //                 option_text,
    //                 is_correct,
    //                 label
    //             )
    //         `)
    //             .eq("test_id", test_id)
    //             .order("question_number", { ascending: true }); // ✅ order by question_number not created_at

    //         if (error) throw error;

    //         console.log("result", result);

    //         // map result: only MCQ questions get options, others get empty array
    //         const mapped = result.map((question: any) => ({
    //             ...question,
    //             options: question.type === 'mcq' ? (question.options ?? []) : [],
    //         }));

    //         return mapped;

    //     } catch (error: any) {
    //         console.log("error", error);
    //         throw new Error(error?.message ?? JSON.stringify(error));
    //     }
    // },

    getTestQuestionByTestId: async (test_id: string) => {
        try {
            // ✅ Validate input
            if (!test_id || test_id.trim() === '') {
                throw new Error("test_id is required");
            }

            const { data: result, error } = await supabase.from("questions")
                .select(`
                *,
                options (
                    id,
                    option_text,
                    is_correct,
                    label
                )
            `)
                .eq("test_id", test_id)
                .order("question_number", { ascending: true });

            // ✅ Check for error first
            if (error) {
                console.error("Supabase error:", error);
                throw new Error(error.message);
            }

            // ✅ Handle null/undefined result
            if (!result) {
                console.warn("No questions found for test_id:", test_id);
                return [];
            }

            console.log("result", result);

            // ✅ Safe mapping with type safety
            const mapped = result.map((question: any) => ({
                ...question,
                options: question.type === 'mcq' ? (question.options ?? []) : [],
            }));

            return mapped;

        } catch (error: any) {
            console.error("Error in getTestQuestionByTestId:", error);
            // ✅ Return error object instead of throwing
            return {
                success: false,
                error: error?.message ?? "Unknown error occurred",
                data: null
            };
        }
    },


    updateTestQuestion: async (data: QuestionData, question_id: string) => {
        try {

            const { data: result, error } = await supabase.from("questions")
                .update({
                    question: data.question,
                    type: data.type,
                    marks: data.marks,

                })
                .eq("id", question_id)
                .select()
                .single();
            if (error) throw error;

            // updating options

            if (data.options && data.options.length > 0) {

                data.options.forEach(async (option: any) => {
                    const { data: optionResult, error: optionError } = await supabase.from("options")
                        .upsert({
                            question_id: result.id,
                            option_text: option.text,
                            is_correct: option.is_correct,
                            label: option.label,
                        })
                        .eq("question_id", question_id)
                        .eq("label", option.label)
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

            // update test material status
            const { data: materialResult, error: materialError } = await supabase.from("course_materials")
                .update({
                    material_status: "READY"
                })
                .eq("unique_id", result.unique_id)
                .select()
                .single();
            if (materialError) throw materialError;


            if (error) throw error;
            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },


}


// ── helpers ──────────────────────────────────────────────────────────────────

async function getNextSortOrder(courseId: string, parentId: string | null): Promise<number> {
    let folderQuery = supabase
        .from("course_folders")
        .select("sort_order")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: false })
        .limit(1);

    let materialQuery = supabase
        .from("course_materials")
        .select("sort_order")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: false })
        .limit(1);

    if (parentId === null) {
        folderQuery = folderQuery.is("parent_id", null);
        materialQuery = materialQuery.is("folder_id", null);
    } else {
        folderQuery = folderQuery.eq("parent_id", parentId);
        materialQuery = materialQuery.eq("folder_id", parentId);
    }

    const [{ data: lastFolder }, { data: lastMaterial }] = await Promise.all([folderQuery, materialQuery]);

    const lastFolderOrder = lastFolder?.[0]?.sort_order ?? 0;
    const lastMaterialOrder = lastMaterial?.[0]?.sort_order ?? 0;
    return Math.max(lastFolderOrder, lastMaterialOrder) + 1;
}
