
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../shared/config/supabase";


type Arggu = {
    facultyId: string,
    filter: {
        selectedCourse: string,
        selectedDate: string,
    },
    page: number,
    limit: number,
    search: string,
    client?: SupabaseClient,
}



export const studentsRepository = {


    // getAllMyStudents: async ({ facultyId, filter, page, limit, search }: Arggu) => {

    //     try {


    //         const from = (page - 1) * limit;
    //         const to = from + limit - 1;


    //         let query = supabase
    //             .from("enrollments")
    //             .select(`
    //     id,
    //     created_at,
    //     student:profiles!enrollments_student_id_fkey (
    //       id,
    //       full_name
    //     ),
    //     course:courses!enrollments_course_id_fkey (
    //       id,
    //       title,
    //       faculty_id
    //     )
    //   `, { count: "exact" })
    //             .eq("course.faculty_id", facultyId)
    //             .order("created_at", { ascending: false })
    //             .range(from, to);

    //         if (filter.selectedCourse !== "all") {
    //             query = query.eq("course_id", filter.selectedCourse);
    //         }

    //         if (search) {
    //             query = query.ilike(
    //                 "profiles.full_name",
    //                 `%${search}%`
    //             );
    //         }

    //         const { data, error, count } = await query;

    //         if (error) throw new Error(error.message);

    //         const studentMap: Record<string, any> = {};

    //         data?.forEach((item: any) => {
    //             const student = item.student;
    //             const course = item.course;

    //             if (!studentMap[student.id]) {
    //                 studentMap[student.id] = {
    //                     ...student,
    //                     courses: [],
    //                     enrolled_at: item.created_at
    //                 };
    //             }

    //             studentMap[student.id].courses.push(course);
    //         });


    //         const final = Object.values(studentMap);

    //         return {
    //             data: final,
    //             pagination: {
    //                 page,
    //                 limit,
    //                 total: count,
    //                 totalPages: Math.ceil((count || 0) / limit)
    //             }
    //         };


    //     } catch (error: any) {

    //         throw new Error(error.message)
    //     }
    // },


    getAllMyStudents: async ({ facultyId, filter, page, limit, search, client }: Arggu) => {
        try {
            const supabase = client ?? anonSupabase;
            console.log("filter", filter);
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            // Step 1: Get faculty course IDs
            const { data: facultyCourses, error: courseError } = await supabase
                .from("courses")
                .select("id")
                .eq("faculty_id", facultyId);

            if (courseError) throw new Error(courseError.message);

            const courseIds = facultyCourses?.map((c) => c.id) ?? [];

            if (courseIds.length === 0) {
                return {
                    data: [],
                    pagination: { page, limit, total: 0, totalPages: 0 },
                };
            }

            const targetCourseIds =
                filter.selectedCourse !== "all" ? [filter.selectedCourse] : courseIds;

            // Step 2: Get distinct student_ids with latest enrollment (for pagination)
            let studentIdsQuery = supabase
                .from("enrollments")
                .select("student_id", { count: "exact" })
                .in("course_id", targetCourseIds);

            if (filter.selectedDate) {
                const startOfDay = new Date(filter.selectedDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(filter.selectedDate);
                endOfDay.setHours(23, 59, 59, 999);

                studentIdsQuery = studentIdsQuery
                    .gte("created_at", startOfDay.toISOString())
                    .lte("created_at", endOfDay.toISOString());
            }

            const { data: allStudentRows, error: countError, count } =
                await studentIdsQuery;

            if (countError) throw new Error(countError.message);

            // Deduplicate student IDs
            const uniqueStudentIds = [
                ...new Set(allStudentRows?.map((r) => r.student_id) ?? []),
            ];

            // Step 3: Paginate unique student IDs
            const paginatedStudentIds = uniqueStudentIds.slice(from, to + 1);

            if (paginatedStudentIds.length === 0) {
                return {
                    data: [],
                    pagination: {
                        page,
                        limit,
                        total: uniqueStudentIds.length,
                        totalPages: Math.ceil(uniqueStudentIds.length / limit),
                    },
                };
            }

            // Step 4: Fetch full student + enrollment details for paginated IDs
            let query = supabase
                .from("enrollments")
                .select(`
                id,
                created_at,
                course_id,
                student:profiles!enrollments_student_id_fkey (
                    id,
                    first_name,
                    last_name,
                    email,
                    avatar_url
                ),
                course:courses!enrollments_course_id_fkey (
                    id,
                    title,
                    faculty_id
                )
            `)
                .in("course_id", targetCourseIds)
                .in("student_id", paginatedStudentIds)
                .order("created_at", { ascending: false });

            if (filter.selectedDate) {
                const startOfDay = new Date(filter.selectedDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(filter.selectedDate);
                endOfDay.setHours(23, 59, 59, 999);

                query = query
                    .gte("created_at", startOfDay.toISOString())
                    .lte("created_at", endOfDay.toISOString());
            }

            if (search) {
                paginatedStudentIds.filter((id) => id); // already filtered below
            }

            const { data, error } = await query;

            if (error) throw new Error(error.message);

            // Step 5: Deduplicate and build student map
            const studentMap: Record<string, any> = {};

            data?.forEach((item: any) => {
                const student = item.student;
                const course = item.course;

                if (!student) return;

                if (!studentMap[student.id]) {
                    studentMap[student.id] = {
                        ...student,
                        courses: [course],
                        latest_enrolled_at: item.created_at,
                    };
                } else {
                    const alreadyAdded = studentMap[student.id].courses.some(
                        (c: any) => c.id === course.id
                    );
                    if (!alreadyAdded) {
                        studentMap[student.id].courses.push(course);
                    }
                }
            });

            // Step 6: Search filter on full_name
            let students = Object.values(studentMap);

            if (search) {
                const lowerSearch = search.toLowerCase();
                students = students.filter((s: any) =>
                    s.full_name?.toLowerCase().includes(lowerSearch)
                );
            }

            const totalUniqueStudents = uniqueStudentIds.length;

            return {
                data: students,
                pagination: {
                    page,
                    limit,
                    total: totalUniqueStudents,
                    totalPages: Math.ceil(totalUniqueStudents / limit),
                },
            };
        } catch (error: any) {
            throw new Error(error.message);
        }
    },


    getStudentCourses: async ({
        facultyId,
        studentId,
        page,
        limit,
        search,
        client,
    }: {
        facultyId: string;
        studentId: string;
        page: number;
        limit: number;
        search: string;
        client?: SupabaseClient;
    }) => {
        try {
            const supabase = client ?? anonSupabase;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data: student, error: studentError } = await supabase
                .from("profiles")
                .select("id, first_name, last_name, avatar_url")
                .eq("id", studentId)
                .single();

            if (studentError) throw new Error(studentError.message);

            let enrollmentQuery = supabase
                .from("enrollments")
                .select(
                    `
        course:courses!enrollments_course_id_fkey (
          id,
          title,
          faculty_id
        )
      `,
                    { count: "exact" }
                )
                .eq("student_id", studentId)
                .eq("course.faculty_id", facultyId);

            if (search) {
                const { data: matchingCourses, error: courseSearchError } =
                    await supabase
                        .from("courses")
                        .select("id")
                        .eq("faculty_id", facultyId)
                        .ilike("title", `%${search}%`);

                if (courseSearchError) throw new Error(courseSearchError.message);

                const matchingCourseIds = matchingCourses?.map((c) => c.id) ?? [];
                if (matchingCourseIds.length === 0) {
                    return { student, data: [], total: 0 };
                }

                enrollmentQuery = enrollmentQuery.in(
                    "course_id",
                    matchingCourseIds
                );
            }

            const { data: enrollments, error, count } = await enrollmentQuery
                .range(from, to)
                .order("created_at", { ascending: false });

            if (error) throw new Error(error.message);
            if (!enrollments || enrollments.length === 0) {
                return { student, data: [], total: count ?? 0 };
            }

            const courseIds = enrollments.map((e: any) => e.course.id);

            const { data: courseProgressList, error: progressError } =
                await supabase
                    .from("course_progress")
                    .select(
                        "course_id, total_materials, completed_materials, completion_pct, is_completed, started_at, completed_at"
                    )
                    .eq("student_id", studentId)
                    .in("course_id", courseIds);

            if (progressError) throw new Error(progressError.message);

            const progressByCourseId: Record<string, any> = {};
            courseProgressList?.forEach((row) => {
                progressByCourseId[row.course_id] = row;
            });

            const { data: tests, error: testsError } = await supabase
                .from("tests")
                .select("id, course_id")
                .in("course_id", courseIds)
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false);

            if (testsError) throw new Error(testsError.message);

            const testIds = tests?.map((t) => t.id) ?? [];
            const attemptsByTestId: Record<string, any[]> = {};

            if (testIds.length > 0) {
                const { data: attempts, error: attemptsError } = await supabase
                    .from("test_attempts")
                    .select(
                        "test_id, correct_count, total_questions, submitted_at, started_at"
                    )
                    .eq("student_id", studentId)
                    .in("test_id", testIds);

                if (attemptsError) throw new Error(attemptsError.message);

                attempts?.forEach((attempt) => {
                    const existing = attemptsByTestId[attempt.test_id] ?? [];
                    existing.push(attempt);
                    attemptsByTestId[attempt.test_id] = existing;
                });
            }

            const pickBestCompletedAttempt = (attempts: any[]) => {
                const completed = attempts.filter((a) => a.submitted_at !== null);
                if (completed.length === 0) return null;

                return completed.reduce((best, current) => {
                    const bestScore = best.correct_count ?? 0;
                    const currentScore = current.correct_count ?? 0;

                    if (currentScore > bestScore) return current;

                    if (currentScore === bestScore) {
                        const bestTime =
                            new Date(best.submitted_at).getTime() -
                            new Date(best.started_at).getTime();
                        const currentTime =
                            new Date(current.submitted_at).getTime() -
                            new Date(current.started_at).getTime();
                        return currentTime < bestTime ? current : best;
                    }

                    return best;
                });
            };

            const testScoreByCourseId: Record<
                string,
                { correct: number; total: number }
            > = {};

            tests?.forEach((test) => {
                const bestAttempt = pickBestCompletedAttempt(
                    attemptsByTestId[test.id] ?? []
                );
                if (!bestAttempt) return;

                const courseTestStats = testScoreByCourseId[test.course_id] ?? {
                    correct: 0,
                    total: 0,
                };
                courseTestStats.correct += bestAttempt.correct_count ?? 0;
                courseTestStats.total += bestAttempt.total_questions ?? 0;
                testScoreByCourseId[test.course_id] = courseTestStats;
            });

            const courses = enrollments.map((item: any) => {
                const course = item.course;
                const courseProgress = progressByCourseId[course.id];

                const total_materials = courseProgress?.total_materials ?? 0;
                const completed_materials =
                    courseProgress?.completed_materials ?? 0;
                const progress = courseProgress
                    ? Math.round(Number(courseProgress.completion_pct))
                    : 0;

                const testStats = testScoreByCourseId[course.id];
                const test_score =
                    testStats && testStats.total > 0
                        ? Math.round((testStats.correct / testStats.total) * 100)
                        : 0;

                let status: "Completed" | "Active" | "Not start";
                if (courseProgress?.is_completed) {
                    status = "Completed";
                } else if (courseProgress?.started_at) {
                    status = "Active";
                } else {
                    status = "Not start";
                }

                return {
                    id: course.id,
                    title: course.title,
                    total_materials,
                    completed_materials,
                    progress,
                    status,
                    test_score,
                };
            });

            return {
                // student,
                data: courses,
                total: count ?? 0,
            };

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getStudentAnalytics: async ({
        facultyId,
        studentId,
        client,
    }: {
        facultyId: string;
        studentId: string;
        client?: SupabaseClient;
    }) => {
        try {
            const supabase = client ?? anonSupabase;

            const { data: student, error: studentError } = await supabase
                .from("profiles")
                .select("id, first_name, last_name, avatar_url")
                .eq("id", studentId)
                .single();

            if (studentError) throw new Error(studentError.message);
    
            // 1. Direct course enrollments for this faculty
            const { data: directEnrollments, error: directError } = await supabase
                .from('enrollments')
                .select('id, course_id, amount_paid, is_bundle_enrollment, enrolled_at')
                .eq('faculty_id', facultyId)
                .eq('student_id', studentId)
                
    
            if (directError) throw new Error(directError.message);
    
            // 2. Bundle enrollments for this faculty
            const { data: bundleEnrollments, error: bundleError } = await supabase
                .from('bundle_enrollments')
                .select('id, bundle_id, amount_paid, enrolled_at')
                .eq('faculty_id', facultyId)
                .eq('student_id', studentId);
    
            if (bundleError) throw new Error(bundleError.message);
    
            // 3. Count enrolled courses
            //    - Direct non-bundle enrollments → count each as 1 course
            //    - Bundle enrollments → count the is_bundle_enrollment rows (amount = 0)
            //      but revenue comes from bundle_enrollments table
            const directCourseCount  = directEnrollments?.filter(e => !e.is_bundle_enrollment).length ?? 0;
            const bundleCourseCount  = directEnrollments?.filter(e => e.is_bundle_enrollment).length ?? 0;
            const totalCourseCount   = directCourseCount + bundleCourseCount;
    
            // 4. Total amount spent
            //    - Direct purchases: sum amount_paid from enrollments (is_bundle_enrollment = false)
            //    - Bundle purchases: sum amount_paid from bundle_enrollments
            const directRevenue = directEnrollments
                ?.filter(e => !e.is_bundle_enrollment)
                .reduce((sum, e) => sum + (e.amount_paid ?? 0), 0) ?? 0;
    
            const bundleRevenue = bundleEnrollments
                ?.reduce((sum, e) => sum + (e.amount_paid ?? 0), 0) ?? 0;
    
            const totalAmountSpent = directRevenue + bundleRevenue;
    
            // 5. Test score rate for this faculty's tests
            //    score rate = (total correct answers / total questions attempted) * 100
            const { data: attempts, error: attemptsError } = await supabase
                .from('test_attempts')
                .select(`
                    correct_count,
                    total_questions,
                    submitted_at,
                    tests!inner (
                        faculty_id
                    )
                `)
                .eq('student_id', studentId)
                .eq('tests.faculty_id', facultyId)
                .not('submitted_at', 'is', null); // only completed attempts
    
            if (attemptsError) throw new Error(attemptsError.message);
    
            const totalCorrect   = attempts?.reduce((sum, a) => sum + (a.correct_count   ?? 0), 0) ?? 0;
            const totalQuestions = attempts?.reduce((sum, a) => sum + (a.total_questions  ?? 0), 0) ?? 0;
            const totalAttempts  = attempts?.length ?? 0;
    
            const testScoreRate = totalQuestions > 0
                ? Math.round((totalCorrect / totalQuestions) * 100)
                : 0;
    
            return {
                student,

                // Course enrollment
                totalCourseCount,       // total courses enrolled under this faculty
                directCourseCount,      // via direct purchase
                bundleCourseCount,      // via bundle purchase
    
                // Revenue
                totalAmountSpent,       // total ₹ spent with this faculty
                directRevenue,          // from direct course purchases
                bundleRevenue,          // from bundle purchases
    
                // Test performance
                testScoreRate,          // e.g. 78 → "78%"
                totalAttempts,          // how many tests completed
                totalCorrect,           // total correct answers
                totalQuestions,         // total questions attempted
            };
    
        } catch (error: any) {
            throw new Error(error.message);
        }
    },




}
