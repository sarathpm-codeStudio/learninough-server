

import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../shared/config/supabase";
import {
    buildChartPeriodSlots,
    endOfLocalDay,
    getChartPeriodBounds,
    groupTimestampForChartPeriod,
    type ChartPeriod,
} from "../../utils/chartPeriod";

const ENROLLMENT_YEAR_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;


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
    
            // 2. Active courses count
            const activeCourses = courses.length;
    
            // 3. Total students (unique students enrolled in faculty courses)
            let enrollments: { student_id: string; amount_paid?: number }[] = [];
            if (courseIds.length > 0) {
                const { data, error: enrollmentsError } = await db
                    .from("enrollments")
                    .select("student_id, amount_paid")
                    .in("course_id", courseIds);
    
                if (enrollmentsError) throw new Error(enrollmentsError.message);
                enrollments = data ?? [];
            }
    
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

    getEnrollmentTrend: async (facultyId: string, period: ChartPeriod, client?: SupabaseClient) => {
        try {
            const db = client ?? anonSupabase;
    
            const { data: courses, error: coursesError } = await db
                .from("courses")
                .select("id")
                .eq("faculty_id", facultyId)
                .eq("is_draft", false)
                .eq("is_deleted", false);
    
            if (coursesError) throw new Error(coursesError.message);
            const courseIds = courses.map((c) => c.id);
    
            const bounds = getChartPeriodBounds(period);
            const slots = buildChartPeriodSlots(period, bounds);
            const counts = new Map(slots.map((s) => [s.group, 0]));
    
            if (courseIds.length > 0) {
                const { data, error: enrollmentsError } = await db
                    .from("enrollments")
                    .select("enrolled_at")
                    .in("course_id", courseIds)
                    .gte("enrolled_at", bounds.fromDate.toISOString())
                    .lte("enrolled_at", bounds.rangeEnd.toISOString());
    
                if (enrollmentsError) throw new Error(enrollmentsError.message);
    
                for (const e of data ?? []) {
                    if (!e.enrolled_at) continue;
                    const grouped = groupTimestampForChartPeriod(e.enrolled_at, period, bounds);
                    if (!grouped) continue;
                    counts.set(grouped.group, (counts.get(grouped.group) ?? 0) + 1);
                }
            }
    
            if (period === "week") {
                return slots.map((s) => ({
                    primary: s.label,
                    secondary: s.dayOfMonth!,
                    value: counts.get(s.group) ?? 0,
                }));
            }
    
            if (period === "month") {
                return slots.map((s) => ({
                    primary: s.label.replace("Wk", "Week"),
                    value: counts.get(s.group) ?? 0,
                }));
            }
    
            return slots.map((s, i) => ({
                primary: ENROLLMENT_YEAR_LABELS[i]!,
                value: counts.get(s.group) ?? 0,
            }));
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getRevenueTrend: async (facultyId: string, period: ChartPeriod, client?: SupabaseClient) => {
        try {
            const db = client ?? anonSupabase;
    
            const { data: courses, error: coursesError } = await db
                .from("courses")
                .select("id")
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false);
    
            if (coursesError) throw new Error(coursesError.message);
            const courseIds = courses.map((c) => c.id);
    
            const bounds = getChartPeriodBounds(period);
            const slots = buildChartPeriodSlots(period, bounds);
            const today = bounds.today;
    
            let previousStart: Date;
            let previousEnd: Date;
    
            if (period === "week") {
                const prevWeekMonday = new Date(
                    bounds.fromDate.getFullYear(),
                    bounds.fromDate.getMonth(),
                    bounds.fromDate.getDate() - 7
                );
                previousStart = prevWeekMonday;
                previousEnd = endOfLocalDay(
                    new Date(
                        bounds.fromDate.getFullYear(),
                        bounds.fromDate.getMonth(),
                        bounds.fromDate.getDate() - 1
                    )
                );
            } else if (period === "month") {
                previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                previousEnd = endOfLocalDay(
                    new Date(today.getFullYear(), today.getMonth(), 0)
                );
            } else {
                previousStart = new Date(today.getFullYear() - 1, 0, 1);
                previousEnd = endOfLocalDay(new Date(today.getFullYear() - 1, 11, 31));
            }
    
            let currentEnrollments: { enrolled_at?: string; amount_paid?: number }[] = [];
            let previousEnrollments: { amount_paid?: number }[] = [];
            if (courseIds.length > 0) {
                const { data: current, error: currentError } = await db
                    .from("enrollments")
                    .select("enrolled_at, amount_paid")
                    .in("course_id", courseIds)
                    .gte("enrolled_at", bounds.fromDate.toISOString())
                    .lte("enrolled_at", bounds.rangeEnd.toISOString());
    
                if (currentError) throw new Error(currentError.message);
                currentEnrollments = current ?? [];
    
                const { data: previous, error: previousError } = await db
                    .from("enrollments")
                    .select("amount_paid")
                    .in("course_id", courseIds)
                    .gte("enrolled_at", previousStart.toISOString())
                    .lte("enrolled_at", previousEnd.toISOString());
    
                if (previousError) throw new Error(previousError.message);
                previousEnrollments = previous ?? [];
            }
    
            const currentTotal = currentEnrollments.reduce((sum, e) => sum + Number(e.amount_paid), 0);
            const previousTotal = previousEnrollments.reduce((sum, e) => sum + Number(e.amount_paid), 0);
    
            let trendText = "0% no change";
            if (previousTotal > 0) {
                const change = ((currentTotal - previousTotal) / previousTotal) * 100;
                const direction = change >= 0 ? "increase" : "decrease";
                const periodLabel = period === "week" ? "last week" : period === "month" ? "last month" : "last year";
                trendText = `${Math.abs(change).toFixed(1)}% ${direction} from ${periodLabel}`;
            }
    
            const revenueByGroup = new Map(slots.map((s) => [s.group, 0]));
    
            for (const e of currentEnrollments) {
                if (!e.enrolled_at) continue;
                const grouped = groupTimestampForChartPeriod(e.enrolled_at, period, bounds);
                if (!grouped) continue;
                revenueByGroup.set(
                    grouped.group,
                    (revenueByGroup.get(grouped.group) ?? 0) + Number(e.amount_paid)
                );
            }
    
            const chartData = slots.map((s) => ({
                label: s.label,
                value: revenueByGroup.get(s.group) ?? 0,
            }));
    
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
