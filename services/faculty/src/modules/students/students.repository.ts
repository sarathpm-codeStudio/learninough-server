
import { supabase } from "../../../../../shared/config/supabase";


type Arggu = {
    facultyId: string,
    courseId: string,
    filter: string,
    page: number,
    limit: number,
    search: string,
}



export const studentsRepository = {


    getAllMyStudents: async ({ facultyId, courseId, filter, page, limit, search }: Arggu) => {

        try {


            const from = (page - 1) * limit;
            const to = from + limit - 1;


            let query = supabase
                .from("enrollments")
                .select(`
        id,
        created_at,
        student:profiles!enrollments_student_id_fkey (
          id,
          full_name
        ),
        course:courses!enrollments_course_id_fkey (
          id,
          title,
          faculty_id
        )
      `, { count: "exact" })
                .eq("course.faculty_id", facultyId)
                .order("created_at", { ascending: false })
                .range(from, to);

            if (filter !== "all") {
                query = query.eq("course_id", filter);
            }

            if (search) {
                query = query.ilike(
                    "profiles.full_name",
                    `%${search}%`
                );
            }

            const { data, error, count } = await query;

            if (error) throw new Error(error.message);

            const studentMap: Record<string, any> = {};

            data?.forEach((item: any) => {
                const student = item.student;
                const course = item.course;

                if (!studentMap[student.id]) {
                    studentMap[student.id] = {
                        ...student,
                        courses: [],
                        enrolled_at: item.created_at
                    };
                }

                studentMap[student.id].courses.push(course);
            });


            const final = Object.values(studentMap);

            return {
                data: final,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            };


        } catch (error: any) {

            throw new Error(error.message)
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
