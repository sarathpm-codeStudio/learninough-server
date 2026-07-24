
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../../shared/config/supabase";


export const facultyQuestionImportRepository = {

    /** Confirm the test exists and is visible to the caller (RLS scopes it to the owning faculty). */
    getTest: async (testId: string, client?: SupabaseClient) => {

        const supabase = (client ?? anonSupabase) as SupabaseClient;

        const { data: test, error } = await supabase
            .from("tests")
            .select("id, title, course_id, folder_id, material_id")
            .eq("id", testId)
            .maybeSingle();

        if (error) throw new Error(error.message);

        return test;
    },

    /** Highest question_number already used by this test — imports continue from there. */
    getLastQuestionNumber: async (testId: string, client?: SupabaseClient) => {

        const supabase = (client ?? anonSupabase) as SupabaseClient;

        const { data: lastQuestion, error } = await supabase
            .from("questions")
            .select("question_number")
            .eq("test_id", testId)
            .order("question_number", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw new Error(error.message);

        return lastQuestion?.question_number ?? 0;
    },

    /**
     * Insert every question and its options in two batched round-trips.
     *
     * Postgres does not guarantee the order of returned rows, so options are matched
     * back to their question by `question_number` rather than by array position. If the
     * option insert fails the questions are removed again — a question with no options
     * is worse than no question at all.
     */
    bulkInsertQuestions: async (
        testId: string,
        questions: {
            question: string;
            module_id?: string | null;
            material_id?: string | null;
            material_title?: string | null;
            options: { label: string; text: string; is_correct: boolean }[];
        }[],
        startNumber: number,
        client?: SupabaseClient
    ) => {

        const supabase = (client ?? anonSupabase) as SupabaseClient;

        const { data: insertedQuestions, error: questionError } = await supabase
            .from("questions")
            .insert(
                questions.map((question, index) => ({
                    test_id: testId,
                    question: question.question,
                    folder_id: question.module_id || null,
                    material_id: question.material_id || null,
                    material_title: question.material_title || null,
                    question_number: startNumber + index,
                }))
            )
            .select();

        if (questionError) throw new Error(questionError.message);

        const questionIdByNumber = new Map(
            (insertedQuestions ?? []).map((row: any) => [row.question_number, row.id])
        );

        const optionRows = questions.flatMap((question, index) =>
            question.options.map((option) => ({
                question_id: questionIdByNumber.get(startNumber + index),
                option_text: option.text,
                is_correct: option.is_correct,
                label: option.label,
            }))
        );

        const { error: optionError } = await supabase.from("options").insert(optionRows);

        if (optionError) {

            await supabase
                .from("questions")
                .delete()
                .in("id", (insertedQuestions ?? []).map((row: any) => row.id));

            throw new Error(optionError.message);
        }

        return insertedQuestions ?? [];
    },

    /** Keep tests.question_count in step with the last question number written. */
    updateQuestionCount: async (testId: string, questionCount: number, client?: SupabaseClient) => {

        const supabase = (client ?? anonSupabase) as SupabaseClient;

        const { error } = await supabase
            .from("tests")
            .update({ question_count: questionCount })
            .eq("id", testId);

        if (error) throw new Error(error.message);
    },

}
