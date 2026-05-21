
import { supabase } from "../../../../../shared/config/supabase";


type Arggu = {
    facultyId: string,
    filter: {
        selectedCourse: string,
        selectedDate: string,
    },
    page: number,
    limit: number,
    search: string,
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


    getAllMyStudents: async ({ facultyId, filter, page, limit, search }: Arggu) => {
        try {
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
                    full_name,
                    email
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


    getStudentDetails: async ({
        facultyId,
        studentId
    }: {
        facultyId: string;
        studentId: string;
    }) => {
        try {
            const { data: enrollments, error } = await supabase
                .from("enrollments")
                .select(`
        student:profiles!enrollments_student_id_fkey (
          id,
          full_name
        ),
        course:courses!enrollments_course_id_fkey (
          id,
          title,
          faculty_id
        )
      `)
                .eq("student_id", studentId)
                .eq("course.faculty_id", facultyId);

            if (error) throw new Error(error.message);
            if (!enrollments || enrollments.length === 0) return null;

            const student = enrollments[0]?.student;
            const courseIds = enrollments.map((e: any) => e.course.id);

            const { data: materials, error: matError } = await supabase
                .from("course_materials")
                .select("id, course_id")
                .in("course_id", courseIds)
                .eq("type", "VIDEO");

            if (matError) throw new Error(matError.message);

            const { data: progressData, error: progError } = await supabase
                .from("video_progress")
                .select("material_id, course_id, completed")
                .eq("student_id", studentId)
                .in("course_id", courseIds);

            if (progError) throw new Error(progError.message);

            const courseStats: Record<
                string,
                { total: number; completed: number }
            > = {};

            materials?.forEach((m: any) => {
                const courseId = m.course_id;

                if (!courseStats[courseId]) {
                    courseStats[courseId] = { total: 0, completed: 0 };
                }

                const stats = courseStats[courseId];
                stats.total++;
            });

            progressData?.forEach((p: any) => {
                const courseId = p.course_id;

                if (!courseStats[courseId]) {
                    courseStats[courseId] = { total: 0, completed: 0 };
                }

                if (p.completed) {
                    courseStats[courseId].completed++;
                }
            });

            const courses = enrollments.map((item: any) => {
                const course = item.course;
                const stats = courseStats[course.id] || {
                    total: 0,
                    completed: 0
                };

                const progress =
                    stats.total > 0
                        ? Math.round((stats.completed / stats.total) * 100)
                        : 0;

                return {
                    id: course.id,
                    title: course.title,
                    total_materials: stats.total,
                    completed_materials: stats.completed,
                    progress,
                    completed: progress === 100
                };
            });

            return {
                student,
                courses
            };

        } catch (error: any) {
            throw new Error(error.message);
        }
    },




}
