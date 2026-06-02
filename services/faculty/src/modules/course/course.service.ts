
import { facultyCourseRepository } from "./course.repository"
import { validate } from "../../../../../shared/utils/validate";
import { createCourseSchema, updateCourseSchema, createFolderSchema, uploadMaterialSchema, createCourseBundleSchema, addCoursePricingSchema } from "../../../../../shared/validators/course.validator";
import { MaterialData } from "../../../../../shared/constants/types";


export const facultyCourseService = {


    createCourseWithBasicDetails: async (event: any) => {

        try {

            console.log("validatedData>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", JSON.parse(event.body));


            const validatedData = validate(createCourseSchema, JSON.parse(event.body));

            console.log("validatedData>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", validatedData);

            const course = await facultyCourseRepository.createCourseWithBasicDetails(validatedData, event.user.id, event.supabase);

            return course;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }

    },

    uploadCourseIntroVideo: async (event: any) => {
        try {

            const result = await facultyCourseRepository.uploadCourseIntroVideo(event.body, event.pathParameters.courseId, event.user.id, event.supabase);

            return result;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    addCoursePricing: async (event: any) => {
        try {

            const validatedData = validate(addCoursePricingSchema, JSON.parse(event.body));

            const result = await facultyCourseRepository.addCoursePricing(validatedData, event.pathParameters.courseId, event.user.id, event.supabase);

            return result;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getMyCourses: async (event: any) => {

        try {

            const filter = event.queryStringParameters?.filter ?? "all";

            const courses = await facultyCourseRepository.getMyCourses(
                event.user.id,
                filter,
                event.queryStringParameters?.search,
                event.supabase
            );

            return courses;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }

    },

    getPreviewCourse: async (event: any) => {

        try {

            const course = await facultyCourseRepository.getPreviewCourse(event.pathParameters.courseId, event.supabase);

            return course;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },


    getCourseById: async (event: any) => {

        try {

            const course = await facultyCourseRepository.getCourseById(event.pathParameters.courseId, event.supabase);

            return course;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }

    },


    updateCourseDetails: async (event: any) => {

        try {

            const validatedData = validate(createCourseSchema, JSON.parse(event.body));


            const course = await facultyCourseRepository.updateCourseDetails(validatedData, event.pathParameters.courseId, event.user.id, event.supabase);

            return course;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }

    },

    publishCourse: async (event: any) => {

        try {

            const course = await facultyCourseRepository.publishCourse(event.pathParameters.courseId, event.user.id, event.supabase);

            return course;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }

    },

    createFolderInCourse: async (event: any) => {
        try {


            const validatedData = validate(createFolderSchema, JSON.parse(event.body));

            const folder = await facultyCourseRepository.createFolder(validatedData, event.pathParameters.courseId, event.user.id, event.supabase);

            return folder;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    updateFolder: async (event: any) => {
        try {

            const validatedData = validate(createFolderSchema, JSON.parse(event.body));

            const folder = await facultyCourseRepository.updateFolder(validatedData, event.pathParameters.folderId, event.supabase);

            return folder;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    deleteFolder: async (event: any) => {
        try {

            const folder = await facultyCourseRepository.deleteFolder(event.pathParameters.folderId, event.supabase);

            return folder;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    addMaterialToFolder: async (event: any) => {
        try {

            // const validatedData: MaterialData = validate(uploadMaterialSchema, JSON.parse(event.body));

            const material = await facultyCourseRepository.addMaterialToFolder(JSON.parse(event.body), event.pathParameters.courseId, event.user.id, event.supabase);

            return material;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    updateMaterial: async (event: any) => {
        try {

            // const validatedData = validate(uploadMaterialSchema, JSON.parse(event.body));

            const material = await facultyCourseRepository.updateMaterial(JSON.parse(event.body), event.pathParameters.materialId, event.supabase);

            return material;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getAllProcessingMaterial: async (event: any) => {
        try {

            const material = await facultyCourseRepository.getAllProcessingMaterial(event.user.id, event.supabase);

            return material;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    deleteMaterial: async (event: any) => {
        try {

            const material = await facultyCourseRepository.deleteMaterial(event.pathParameters.materialId, event.supabase);

            return material;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getCourseContent: async (event: any) => {
        try {

            console.log("event}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}", event);
            const courseId = event.pathParameters.courseId;
            const parentId = event.queryStringParameters?.parentId || null;

            const content = await facultyCourseRepository.getCourseContent(courseId, parentId, event.supabase);

            return content;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getCourseReviews: async (event: any) => {

        try {

            const courseId = event.pathParameters.courseId;
            const page = Number(event.queryStringParameters?.page ?? 1);
            const limit = Number(event.queryStringParameters?.limit ?? 10);

            const reviews = await facultyCourseRepository.getCourseReviews(courseId, page, limit, event.supabase);

            return reviews;

        } catch (error: any) {

            throw new Error(error)
        }
    },

    addReviewReply: async (event: any) => {
        try {

            const { reply } = JSON.parse(event.body);

            const result = await facultyCourseRepository.addReviewReply(event.pathParameters.reviewId, reply, event.user.id, event.supabase);

            return result;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getFullFoldersInCourse: async (event: any) => {
        try {

            const folders = await facultyCourseRepository.getFullFoldersInCourse(event.pathParameters.courseId, event.user.id, event.supabase);

            return folders;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getAllMaterialModule: async (event: any) => {
        try {
            const contents = await facultyCourseRepository.getAllMaterialModule(event.pathParameters.materialId, event.supabase);
            return contents;
        } catch (error: any) {
            console.log("error", error);
            throw new Error(error)
        }
    },

    getCourseAnalytics: async (event: any) => {
        try {
            const analytics = await facultyCourseRepository.getCourseAnalytics(event.pathParameters.courseId, event.supabase);
            return analytics;
        } catch (error: any) {
            console.log("error", error);
            throw new Error(error)
        }
    },


    getCourseEnrollmentVsCompletionChart: async (event: any) => {
        try {
            const chart = await facultyCourseRepository.getCourseEnrollmentVsCompletionChart(event.pathParameters.courseId, event.queryStringParameters.period as "week" | "month" | "year", event.supabase);
            return chart;
        } catch (error: any) {
            console.log("error", error);
            throw new Error(error)
        }
    },

    getCourseRevenueTrend: async (event: any) => {
        try {
            const period = (event.queryStringParameters?.period || "week") as "week" | "month" | "year";
            const trend = await facultyCourseRepository.getCourseRevenueTrend(
                event.pathParameters.courseId,
                period,
                event.supabase
            );
            return trend;
        } catch (error: any) {
            console.log("error", error);
            throw new Error(error);
        }
    },

    deleteCourse: async (event: any) => {
        try {
            const course = await facultyCourseRepository.deleteCourse(event.pathParameters.courseId, event.supabase);
            return course;
        } catch (error: any) {
            console.log("error", error);
            throw new Error(error);
        }
    },




}
