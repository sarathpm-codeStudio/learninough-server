

import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../shared/config/supabase";


export const facultyDashboardRepository = {

    getFacultyDashboardAnalytics: async (facultyId: string, client?: SupabaseClient) => {
        try {
            const db = client ?? anonSupabase;
    
            const now = new Date().toISOString().replace("T", " ").replace("Z", "+00");
    
            // 1. Get all faculty courses (not deleted)
            const { data: courses, error: coursesError } = await db
                .from("courses")
                .select("id")
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false)
                .eq("is_draft", false);
    
            if (coursesError) throw new Error(coursesError.message);
    
            const courseIds = courses.map((c) => c.id);

            console.log("courseIds",courseIds);
    
            // 2. Active courses count
            const activeCourses = courses.length;
    
            // 3. Total students (unique students enrolled in faculty courses)
            const { data: enrollments, error: enrollmentsError } = await db
                .from("enrollments")
                .select("student_id, amount_paid")
                .in("course_id", courseIds);
    
            if (enrollmentsError) throw new Error(enrollmentsError.message);

            console.log("enrollments",enrollments);
    
            const totalStudents = new Set(enrollments.map((e) => e.student_id)).size;
    
            // 4. Total revenue
            const totalRevenue = enrollments.reduce(
                (sum, e) => sum + Number(e.amount_paid),
                0
            );
    
            // 5. Active coupons count
            const { count: activeCoupons, error: couponsError } = await db
                .from("coupons")
                .select("*", { count: "exact", head: true })
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false)
                .eq("is_active", true)
                .eq("is_draft", false)
                .gt("expire_date", now);
    
            if (couponsError) throw new Error(couponsError.message);
    
            return {
                total_students: totalStudents,
                active_courses: activeCourses,
                active_coupons: activeCoupons ?? 0,
                total_revenue: totalRevenue,
            };
    
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getEnrollmentTrend: async (facultyId: string, period: "week" | "month" | "year", client?: SupabaseClient) => {
        try {
            const db = client ?? anonSupabase;
    
            // 1. Get all faculty course ids
            const { data: courses, error: coursesError } = await db
                .from("courses")
                .select("id")
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false);
    
            if (coursesError) throw new Error(coursesError.message);
            const courseIds = courses.map((c) => c.id);
    
            // 2. Calculate date range
            const now = new Date();
            let startDate: Date;
    
            if (period === "week") {
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 6); // last 7 days
            } else if (period === "month") {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1); // start of month
            } else {
                startDate = new Date(now.getFullYear(), 0, 1); // start of year
            }
    
            // 3. Fetch enrollments within date range (skip query when no courses — .in([]) is invalid)
            let enrollments: { enrolled_at?: string }[] = [];
            if (courseIds.length > 0) {
                const { data, error: enrollmentsError } = await db
                    .from("enrollments")
                    .select("enrolled_at")
                    .in("course_id", courseIds)
                    .gte("enrolled_at", startDate.toISOString())
                    .lte("enrolled_at", now.toISOString());
    
                if (enrollmentsError) throw new Error(enrollmentsError.message);
                enrollments = data ?? [];
            }
    
            // 4. Group data based on period
            if (period === "week") {
                const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
                const result: Record<string, { primary: string; secondary: string; value: number }> = {};
    
                // Build last 7 days map
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(now.getDate() - i);
                    const dayName = days[d.getDay()]!;
                    const dayNum = String(d.getDate()).padStart(2, "0");
                    const key = d.toISOString().split("T")[0]!;
                    result[key] = { primary: dayName, secondary: dayNum, value: 0 };
                }
    
                // Count enrollments per day
                enrollments.forEach((e) => {
                    const key = e.enrolled_at?.split("T")[0];
                    if (key && result[key]) result[key].value += 1;
                });
    
                return Object.values(result);
    
            } else if (period === "month") {
                const result: Record<string, { primary: string; value: number }> = {
                    "Week 1": { primary: "Week 1", value: 0 },
                    "Week 2": { primary: "Week 2", value: 0 },
                    "Week 3": { primary: "Week 3", value: 0 },
                    "Week 4": { primary: "Week 4", value: 0 },
                };
    
                enrollments.forEach((e) => {
                    const day = new Date(e.enrolled_at!).getDate();
                    if (day <= 7) result["Week 1"]!.value += 1;
                    else if (day <= 14) result["Week 2"]!.value += 1;
                    else if (day <= 21) result["Week 3"]!.value += 1;
                    else result["Week 4"]!.value += 1;
                });
    
                return Object.values(result);
    
            } else {
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
                const result: Record<number, { primary: string; value: number }> = {};
                months.forEach((m, i) => {
                    result[i] = { primary: m, value: 0 };
                });
    
                enrollments.forEach((e) => {
                    const month = new Date(e.enrolled_at!).getMonth();
                    result[month]!.value += 1;
                });
    
                return Object.values(result);
            }
    
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getRevenueTrend: async (facultyId: string, period: "week" | "month" | "year", client?: SupabaseClient) => {
        try {
            const db = client ?? anonSupabase;
    
            // 1. Get all faculty course ids
            const { data: courses, error: coursesError } = await db
                .from("courses")
                .select("id")
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false);
    
            if (coursesError) throw new Error(coursesError.message);
            const courseIds = courses.map((c) => c.id);
    
            // 2. Calculate current and previous date ranges
            const now = new Date();
            let currentStart: Date;
            let previousStart: Date;
            let previousEnd: Date;
    
            if (period === "week") {
                currentStart = new Date(now);
                currentStart.setDate(now.getDate() - 6);
                previousEnd = new Date(currentStart);
                previousStart = new Date(previousEnd);
                previousStart.setDate(previousEnd.getDate() - 7);
            } else if (period === "month") {
                currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
                previousEnd = new Date(currentStart);
                previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            } else {
                currentStart = new Date(now.getFullYear(), 0, 1);
                previousEnd = new Date(currentStart);
                previousStart = new Date(now.getFullYear() - 1, 0, 1);
            }
    
            // 3. Fetch current period enrollments (skip when no courses — .in([]) is invalid)
            let currentEnrollments: { enrolled_at?: string; amount_paid?: number }[] = [];
            let previousEnrollments: { amount_paid?: number }[] = [];
            if (courseIds.length > 0) {
                const { data: current, error: currentError } = await db
                    .from("enrollments")
                    .select("enrolled_at, amount_paid")
                    .in("course_id", courseIds)
                    .gte("enrolled_at", currentStart.toISOString())
                    .lte("enrolled_at", now.toISOString());
    
                if (currentError) throw new Error(currentError.message);
                currentEnrollments = current ?? [];
    
                // 4. Fetch previous period enrollments (for trend %)
                const { data: previous, error: previousError } = await db
                    .from("enrollments")
                    .select("amount_paid")
                    .in("course_id", courseIds)
                    .gte("enrolled_at", previousStart.toISOString())
                    .lte("enrolled_at", previousEnd.toISOString());
    
                if (previousError) throw new Error(previousError.message);
                previousEnrollments = previous ?? [];
            }
    
            // 5. Calculate trend percentage
            const currentTotal = currentEnrollments.reduce((sum, e) => sum + Number(e.amount_paid), 0);
            const previousTotal = previousEnrollments.reduce((sum, e) => sum + Number(e.amount_paid), 0);
    
            let trendText = "0% no change";
            if (previousTotal > 0) {
                const change = ((currentTotal - previousTotal) / previousTotal) * 100;
                const direction = change >= 0 ? "increase" : "decrease";
                const periodLabel = period === "week" ? "last week" : period === "month" ? "last month" : "last year";
                trendText = `${Math.abs(change).toFixed(1)}% ${direction} from ${periodLabel}`;
            }
    
            // 6. Group data based on period
            let chartData: { label: string; value: number }[] = [];
    
            if (period === "week") {
                const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
                const result: Record<string, { label: string; value: number }> = {};
    
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(now.getDate() - i);
                    const key = d.toISOString().split("T")[0]!;
                    result[key] = { label: days[d.getDay()]!, value: 0 };
                }
    
                currentEnrollments.forEach((e) => {
                    const key = e.enrolled_at?.split("T")[0];
                    if (key && result[key]) result[key].value += Number(e.amount_paid);
                });
    
                chartData = Object.values(result);
    
            } else if (period === "month") {
                const result = {
                    "Wk 1": { label: "Wk 1", value: 0 },
                    "Wk 2": { label: "Wk 2", value: 0 },
                    "Wk 3": { label: "Wk 3", value: 0 },
                    "Wk 4": { label: "Wk 4", value: 0 },
                };
    
                currentEnrollments.forEach((e) => {
                    const day = new Date(e.enrolled_at!).getDate();
                    if (day <= 7) result["Wk 1"].value += Number(e.amount_paid);
                    else if (day <= 14) result["Wk 2"].value += Number(e.amount_paid);
                    else if (day <= 21) result["Wk 3"].value += Number(e.amount_paid);
                    else result["Wk 4"].value += Number(e.amount_paid);
                });
    
                chartData = Object.values(result);
    
            } else {
                const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                                "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    
                const result: Record<number, { label: string; value: number }> = {};
                months.forEach((m, i) => { result[i] = { label: m, value: 0 }; });
    
                currentEnrollments.forEach((e) => {
                    const month = new Date(e.enrolled_at!).getMonth();
                    result[month]!.value += Number(e.amount_paid);
                });
    
                chartData = Object.values(result);
            }
    
            return { data: chartData, trend: trendText };
    
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getTopCoursesPerformance: async (facultyId: string, limit: number = 3, client?: SupabaseClient) => {
        try {
            const db = client ?? anonSupabase;
    
            // 1. Get all faculty courses
            const { data: courses, error: coursesError } = await db
                .from("courses")
                .select("id, title")
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false)
                .eq("is_draft", false);
    
            if (coursesError) throw new Error(coursesError.message);
            const courseIds = courses.map((c) => c.id);
            if (courseIds.length === 0) return { has_data: false, data: [] };
    
            // 2. Get enrollments for all faculty courses
            const { data: enrollments, error: enrollmentsError } = await db
                .from("enrollments")
                .select("course_id, student_id, amount_paid")
                .in("course_id", courseIds);
    
            if (enrollmentsError) throw new Error(enrollmentsError.message);
    
            // 3. Group by course_id
            const courseMap: Record<string, { total_students: number; total_revenue: number }> = {};
    
            enrollments.forEach((e) => {
                const entry = courseMap[e.course_id] ?? { total_students: 0, total_revenue: 0 };
                entry.total_students += 1;
                entry.total_revenue += Number(e.amount_paid);
                courseMap[e.course_id] = entry;
            });
    
            // 4. Merge with course title — skip courses with 0 students and 0 revenue
            const result = courses
                .map((course) => ({
                    course_id: course.id,
                    title: course.title,
                    total_students: courseMap[course.id]?.total_students ?? 0,
                    total_revenue: courseMap[course.id]?.total_revenue ?? 0,
                }))
                .filter((course) => course.total_students > 0 && course.total_revenue > 0)
                .sort((a, b) => b.total_revenue - a.total_revenue)
                .slice(0, limit);
    
            return {
                has_data: result.length > 0,
                data: result,
            };
    
        } catch (error: any) {
            throw new Error(error.message);
        }
    },


}
