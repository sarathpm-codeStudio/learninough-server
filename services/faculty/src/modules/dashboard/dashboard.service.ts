
import { facultyDashboardRepository } from "./dashboard.repository"


export const facultyDashboardService = {

    getFacultyDashboardAnalytics: async (event: any) => {
        try {
            const analytics = await facultyDashboardRepository.getFacultyDashboardAnalytics(event.user.id, event.supabase);
            return analytics;
        } catch (error: any) {
            throw new Error(error.message);
        }
    },
   
    getEnrollmentTrend: async (event: any) => {
        try {
            const period = event.queryStringParameters?.period || "week";
            const trend = await facultyDashboardRepository.getEnrollmentTrend(event.user.id, period, event.supabase);
            return trend;
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getRevenueTrend: async (event: any) => {
        try {
            const period = event.queryStringParameters?.period || "week";
            const trend = await facultyDashboardRepository.getRevenueTrend(event.user.id, period, event.supabase);
            return trend;
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getTopCoursesPerformance: async (event: any) => {
        try {
            const limit = event.queryStringParameters?.limit || 3;
            const performance = await facultyDashboardRepository.getTopCoursesPerformance(event.user.id, limit, event.supabase);
            return performance;
        } catch (error: any) {
            throw new Error(error.message);
        }
    },


}
