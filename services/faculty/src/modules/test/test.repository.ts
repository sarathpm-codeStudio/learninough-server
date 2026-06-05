
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../shared/config/supabase";
import { TestBaseDetailsData, QuestionData, MaterialStatus } from "../../../../../shared/constants/types"




export const facultyTestRepository = {


    createTestBaseDetails: async (data: TestBaseDetailsData, facultyId: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;

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
                    // total_marks: data.totalMarks,
                    duration_minutes: data.duration,
                    instructions: data.instructions,
                    type: data.testType,
                })
                .select()
                .single();
            if (testError) throw testError;

            // add  this test in course metirial 

            const nextSortOrder = await getNextSortOrder(data?.course, data?.module && data.module.trim() !== '' ? data.module : null, supabase);
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

            const folderId = data?.module?.trim() ? data.module : null;
            if (folderId) {
                const { data: existingFolder, error: fetchError } = await supabase
                    .from("course_folders")
                    .select("total_test")
                    .eq("id", folderId)
                    .single();

                if (fetchError) throw new Error(fetchError.message);

                const currentCount = Number(existingFolder?.total_test ?? 0);
                const { error: folderError } = await supabase
                    .from("course_folders")
                    .update({ total_test: currentCount + 1 })
                    .eq("id", folderId);

                if (folderError) throw new Error(folderError.message);
            }

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

    getMyAllTests: async (faculty_id: string, filter: string, page: number, limit: number, search: string, client?: SupabaseClient) => {
        const supabase = client ?? anonSupabase;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        console.log("filter", filter);
        console.log("faculty_id", faculty_id);

    let filterValue:any = "all";

    if(filter === "true"){
        filterValue = true;
    }else if(filter === "false"){
        filterValue = false;
    }

        let query = supabase
            .from("tests")
            .select("*, courses(*), test_attempts(count)", { count: "exact" })
            .eq("faculty_id", faculty_id)
            .eq("is_deleted", false);


        if (filterValue !== "all") {
            console.log("filter)))))))))))))))))))))))))))))))))))))))))", filter);
            query = query.eq("is_draft", filterValue);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%`);
        }

        const { data, error, count } = await query
            .range(from, to)
            .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        const dataWithAttemptCount = (data ?? []).map((test: { test_attempts?: { count: number }[] }) => {
            const attempt_count = test.test_attempts?.[0]?.count ?? 0;
            const { test_attempts: _attempts, ...rest } = test;
            return { ...rest, attempt_count };
        });

        return { data: dataWithAttemptCount, total: count ?? 0 };
    },

    getTestsPageAnalytics: async (facultyId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
    
            // 1. Active tests count
            const { count: activeTests, error: activeError } = await supabase
                .from('tests')
                .select('*', { count: 'exact', head: true })
                .eq('faculty_id', facultyId)
                .eq('is_draft', false)
                .eq('is_deleted', false);
    
            if (activeError) throw new Error(activeError.message);
    
            // 2. Draft tests count
            const { count: draftTests, error: draftError } = await supabase
                .from('tests')
                .select('*', { count: 'exact', head: true })
                .eq('faculty_id', facultyId)
                .eq('is_draft', true)
                .eq('is_deleted', false);
    
            if (draftError) throw new Error(draftError.message);
    
            // 3. Total completed attempts
            //    submitted_at IS NOT NULL means student submitted the test
            const { count: totalCompletedAttempts, error: attemptError } = await supabase
                .from('test_attempts')
                .select('tests!inner(faculty_id)', { count: 'exact', head: true })
                .eq('tests.faculty_id', facultyId)
                .not('submitted_at', 'is', null);
    
            if (attemptError) throw new Error(attemptError.message);
    
            return {
                activeTests:            activeTests ?? 0,
                draftTests:             draftTests ?? 0,
                totalCompletedAttempts: totalCompletedAttempts ?? 0,
            };
    
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    // getTestAnalytics: async (testId: string, client?: SupabaseClient) => {
    //     try {
    //         const supabase = client ?? anonSupabase;
    
    //         // 1. Get test details (allocated duration)
    //         const { data: test, error: testError } = await supabase
    //             .from('tests')
    //             .select('duration_minutes, title')
    //             .eq('id', testId)
    //             .single();
    
    //         if (testError) throw new Error(testError.message);
    
    //         // 2. Get all attempts for this test
    //         const { data: attempts, error: attemptsError } = await supabase
    //             .from('test_attempts')
    //             .select(`
    //                 id,
    //                 student_id,
    //                 started_at,
    //                 submitted_at,
    //                 correct_count,
    //                 total_questions,
    //                 profiles!test_attempts_student_id_fkey (
    //                     id,
    //                     first_name,
    //                     last_name
    //                 )
    //             `)
    //             .eq('test_id', testId);
    
    //         if (attemptsError) throw new Error(attemptsError.message);
    
    //         const totalAttempts     = attempts?.length ?? 0;
    //         const completedAttempts = attempts?.filter(a => a.submitted_at !== null) ?? [];
    //         const completedCount    = completedAttempts.length;
    
    //         // 3. Completion rate
    //         const completionRate = totalAttempts > 0
    //             ? Math.round((completedCount / totalAttempts) * 100)
    //             : 0;
    
    //         // 4. Avg duration (only from completed attempts)
    //         let avgDurationSeconds = 0;
    //         if (completedCount > 0) {
    //             const totalSeconds = completedAttempts.reduce((sum, a) => {
    //                 const start = new Date(a.started_at).getTime();
    //                 const end   = new Date(a.submitted_at!).getTime();
    //                 return sum + Math.floor((end - start) / 1000);
    //             }, 0);
    //             avgDurationSeconds = Math.floor(totalSeconds / completedCount);
    //         }
    
    //         const avgHours   = Math.floor(avgDurationSeconds / 3600);
    //         const avgMinutes = Math.floor((avgDurationSeconds % 3600) / 60);
    
    //         // 5. Top student — highest correct_count among completed attempts
    //         //    tie-break: whoever took less time
    //         let topStudent: {
    //             name: string;
    //             score: number;
    //             totalQuestions: number;
    //         } | null = null;
    
    //         if (completedCount > 0) {
    //             const top = completedAttempts.reduce((best, current) => {
    //                 if (!best) return current;
    
    //                 const bestScore    = best.correct_count    ?? 0;
    //                 const currentScore = current.correct_count ?? 0;
    
    //                 if (currentScore > bestScore) return current;
    
    //                 // tie-break: less time taken wins
    //                 if (currentScore === bestScore) {
    //                     const bestTime    = new Date(best.submitted_at!).getTime()    - new Date(best.started_at).getTime();
    //                     const currentTime = new Date(current.submitted_at!).getTime() - new Date(current.started_at).getTime();
    //                     return currentTime < bestTime ? current : best;
    //                 }
    
    //                 return best;
    //             }, null as typeof completedAttempts[0] | null);
    
    //             if (top) {
    //                 topStudent = {
    //                     name:           `${(top.profiles as any)?.first_name ?? ''} ${(top.profiles as any)?.last_name ?? ''}`.trim() || 'Unknown',
    //                     score:          top.correct_count    ?? 0,
    //                     totalQuestions: top.total_questions  ?? 0,
    //                 };
    //             }
    //         }
    
    //         return {
    //             // Completion rate card
    //             completedCount,                        // 6
    //             totalAttempts,                         // 6
    //             completionRate,                        // 100
    
    //             // Avg duration card
    //             avgDuration: {
    //                 hours:   avgHours,                 // 1
    //                 minutes: avgMinutes,               // 42
    //                 display: avgHours > 0             
    //                     ? `${avgHours}h ${avgMinutes}m`
    //                     : `${avgMinutes}m`,            // "1h 42m"
    //             },
    
    //             // Allocated duration from test table
    //             allocatedDuration: {
    //                 raw:     test.duration_minutes,    // "120"
    //                 display: (() => {
    //                     const mins = parseInt(test.duration_minutes);
    //                     const h    = Math.floor(mins / 60);
    //                     const m    = mins % 60;
    //                     return h > 0 ? `${h}h ${m.toString().padStart(2,'0')}m` : `${m}m`;
    //                 })(),                              // "2h 00m"
    //             },
    
    //             // Top student card
    //             topStudent,                            // { name, score, totalQuestions }
    //         };
    
    //     } catch (error: any) {
    //         throw new Error(error.message);
    //     }
    // },

    getTestAnalytics: async (testId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
    
            // 1. Get test details (allocated duration)
            const { data: test, error: testError } = await supabase
                .from('tests')
                .select('duration_minutes, title, question_count')
                .eq('id', testId)
                .single();
    
            if (testError) throw new Error(testError.message);
    
            // 2. Get all attempts for this test
            const { data: attempts, error: attemptsError } = await supabase
                .from('test_attempts')
                .select(`
                    id,
                    student_id,
                    started_at,
                    submitted_at,
                    correct_count,
                    total_questions,
                    profiles!test_attempts_student_id_fkey (
                        id,
                        first_name,
                        last_name
                    )
                `)
                .eq('test_id', testId);
    
            if (attemptsError) throw new Error(attemptsError.message);
    
            const totalAttempts     = attempts?.length ?? 0;
            const completedAttempts = attempts?.filter(a => a.submitted_at !== null) ?? [];
            const completedCount    = completedAttempts.length;
    
            // 3. Completion rate
            const completionRate = totalAttempts > 0
                ? Math.round((completedCount / totalAttempts) * 100)
                : 0;
    
            // 4. Avg duration (only from completed attempts)
            let avgDurationSeconds = 0;
            if (completedCount > 0) {
                const totalSeconds = completedAttempts.reduce((sum, a) => {
                    const start = new Date(a.started_at).getTime();
                    const end   = new Date(a.submitted_at!).getTime();
                    return sum + Math.floor((end - start) / 1000);
                }, 0);
                avgDurationSeconds = Math.floor(totalSeconds / completedCount);
            }
    
            const avgHours   = Math.floor(avgDurationSeconds / 3600);
            const avgMinutes = Math.floor((avgDurationSeconds % 3600) / 60);
    
            // 5. Top student — highest correct_count among completed attempts
            //    tie-break: whoever took less time
            let topStudent: {
                name:           string;
                score:          number;
                totalQuestions: number;
            } | null = null;
    
            if (completedCount > 0) {
                const top = completedAttempts.reduce((best, current) => {
                    if (!best) return current;
    
                    const bestScore    = best.correct_count    ?? 0;
                    const currentScore = current.correct_count ?? 0;
    
                    if (currentScore > bestScore) return current;
    
                    // tie-break: less time taken wins
                    if (currentScore === bestScore) {
                        const bestTime    = new Date(best.submitted_at!).getTime()    - new Date(best.started_at).getTime();
                        const currentTime = new Date(current.submitted_at!).getTime() - new Date(current.started_at).getTime();
                        return currentTime < bestTime ? current : best;
                    }
    
                    return best;
                }, null as typeof completedAttempts[0] | null);
    
                if (top) {
                    topStudent = {
                        name:           `${(top.profiles as any)?.first_name ?? ''} ${(top.profiles as any)?.last_name ?? ''}`.trim() || 'Unknown',
                        score:          top.correct_count    ?? 0,
                        totalQuestions: top.total_questions  ?? 0,
                    };
                }
            }
    
            return {
                // Completion rate card
                completedCount,
                totalAttempts,
                completionRate,
    
                // Avg duration card
                avgDuration: {
                    hours:   avgHours,
                    minutes: avgMinutes,
                    display: avgHours > 0
                        ? `${avgHours}h ${avgMinutes}m`
                        : `${avgMinutes}m`,
                },
    
                // Allocated duration from test table
                allocatedDuration: {
                    raw:     test.duration_minutes,
                    display: (() => {
                        const mins = parseInt(test.duration_minutes);
                        const h    = Math.floor(mins / 60);
                        const m    = mins % 60;
                        return h > 0 ? `${h}h ${m.toString().padStart(2,'0')}m` : `${m}m`;
                    })(),
                },
    
                // Top student card — default values when no attempts yet
                topStudent: topStudent ?? {
                    name:           'No attempts yet',
                    score:          0,
                    totalQuestions: test.question_count ?? 0,
                },
            };
    
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getAllAttemptsByTestId: async (
        test_id: string,
        page: number,
        limit: number,
        client?: SupabaseClient
    ) => {
        try {
            const supabase = client ?? anonSupabase;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data: attempts, error: attemptsError, count } = await supabase
                .from('test_attempts')
                .select(`
                    id,
                    test_id,
                    student_id,
                    attempt_number,
                    started_at,
                    submitted_at,
                    total_questions,
                    attempted_count,
                    correct_count,
                    created_at,
                    profiles!test_attempts_student_id_fkey (
                        id,
                        first_name,
                        last_name
                    )
                `, { count: 'exact' })
                .eq('test_id', test_id)
                .order('submitted_at', { ascending: false, nullsFirst: false })
                .order('started_at', { ascending: false })
                .range(from, to);

            if (attemptsError) throw new Error(attemptsError.message);

            const PASS_THRESHOLD_PERCENT = 50;

            const data = (attempts ?? []).map((attempt) => {
                const profile = attempt.profiles as {
                    first_name?: string | null;
                    last_name?:  string | null;
                } | null;

                const firstName = profile?.first_name ?? '';
                const lastName  = profile?.last_name  ?? '';
                const correct   = attempt.correct_count    ?? 0;
                const total     = attempt.total_questions  ?? 0;
                const isCompleted = attempt.submitted_at !== null;

                const percentage = total > 0
                    ? Math.round((correct / total) * 100)
                    : 0;

                let resultStatus: 'PASS' | 'FAIL' | 'IN_PROGRESS';
                let resultDisplay: string;

                if (!isCompleted) {
                    resultStatus  = 'IN_PROGRESS';
                    resultDisplay = 'In progress';
                } else if (percentage >= PASS_THRESHOLD_PERCENT) {
                    resultStatus  = 'PASS';
                    resultDisplay = `PASS • ${percentage}%`;
                } else {
                    resultStatus  = 'FAIL';
                    resultDisplay = `FAIL • ${percentage}%`;
                }

                const timing = formatAttemptTiming(
                    attempt.started_at,
                    attempt.submitted_at
                );

                return {
                    id:             attempt.id,
                    test_id:        attempt.test_id,
                    student_id:     attempt.student_id,
                    attempt_number: attempt.attempt_number,
                    first_name:     firstName,
                    last_name:      lastName,
                    studentName:    `${firstName} ${lastName}`.trim() || 'Unknown',
                    started_at:     attempt.started_at,
                    submitted_at:   attempt.submitted_at,
                    total_questions: attempt.total_questions,
                    attempted_count: attempt.attempted_count,
                    correct_count:   attempt.correct_count,
                    isCompleted,
                    timing,
                    score: {
                        correct,
                        total,
                        display: `${correct} / ${total}`,
                    },
                    result: {
                        status:     resultStatus,
                        percentage: isCompleted ? percentage : null,
                        display:    resultDisplay,
                    },
                };
            });

            return { data, total: count ?? 0 };

        } catch (error: any) {
            throw new Error(error.message);
        }
    },


    getTestById: async (test_id: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
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

    updateTest: async (test_id: string, data: TestBaseDetailsData, facultyId: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
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

    deleteTest: async (test_id: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
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

            if (module?.folder_id) {
                const { data: existingFolder, error: fetchError } = await supabase
                    .from("course_folders")
                    .select("total_test")
                    .eq("id", module.folder_id)
                    .single();

                if (fetchError) throw new Error(fetchError.message);

                const currentCount = Number(existingFolder?.total_test ?? 0);
                const { error: folderError } = await supabase
                    .from("course_folders")
                    .update({ total_test: Math.max(0, currentCount - 1) })
                    .eq("id", module.folder_id);

                if (folderError) throw new Error(folderError.message);
            }

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },


    createTestQuestion: async (data: QuestionData, test_id: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
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
                    material_id: data.material_id,
                    material_title: data.material_title,
                    question_number: nextQuestionNumber, // ✅
                })
                .select()
                .single();

            // update test total questions
            const { data: testResult, error: testError } = await supabase.from("tests")
                .update({
                    question_count: nextQuestionNumber
                })
                .eq("id", test_id)
                .select()
                .single();
            if (testError) throw testError;

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

    getTestQuestionByTestId: async (test_id: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
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

            return result;

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


    updateTestQuestion: async (data: QuestionData, question_id: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
            const { data: result, error } = await supabase.from("questions")
                .update({
                    question: data.question,
                    // type: data.type,
                    // marks: data.marks,

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

    deleteTestQuestion: async (question_id: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
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

            // update test question count
            const { error: testError } = await supabase.rpc(
                "decrement_question_count",
                {
                    test_id: result.test_id,
                }
            );

            if (testError) throw testError;

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    publishTest: async (test_id: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
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
                    material_status: MaterialStatus.READY
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

function formatTime12h(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
        hour:   '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function formatDurationDisplay(totalSeconds: number): string {
    const hours   = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m total` : `${minutes}m total`;
}

function formatAttemptTiming(
    startedAt: string,
    submittedAt: string | null
): {
    start:          string;
    end:            string | null;
    rangeDisplay:   string;
    durationSeconds: number | null;
    durationDisplay: string | null;
} {
    const start = formatTime12h(startedAt);

    if (!submittedAt) {
        return {
            start,
            end:             null,
            rangeDisplay:    start,
            durationSeconds: null,
            durationDisplay: null,
        };
    }

    const end = formatTime12h(submittedAt);
    const durationSeconds = Math.max(
        0,
        Math.floor(
            (new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000
        )
    );

    return {
        start,
        end,
        rangeDisplay:    `${start} – ${end}`,
        durationSeconds,
        durationDisplay: formatDurationDisplay(durationSeconds),
    };
}

async function getNextSortOrder(courseId: string, parentId: string | null, client?: SupabaseClient): Promise<number> {
    const supabase = client ?? anonSupabase;
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
