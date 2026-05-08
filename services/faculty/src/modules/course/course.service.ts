
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

            const course = await facultyCourseRepository.createCourseWithBasicDetails(validatedData, event.user.id);

            return course;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }

    },

    uploadCourseIntroVideo: async (event: any) => {
        try {

            const result = await facultyCourseRepository.uploadCourseIntroVideo(event.body, event.pathParameters.courseId, event.user.id);

            return result;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    addCoursePricing: async (event: any) => {
        try {

            const validatedData = validate(addCoursePricingSchema, JSON.parse(event.body));

            const result = await facultyCourseRepository.addCoursePricing(validatedData, event.pathParameters.courseId, event.user.id);

            return result;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getMyCourses: async (event: any) => {

        try {


            const filter = event.queryStringParameters.filter === "true"

            console.log("filter>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", filter);

            const courses = await facultyCourseRepository.getMyCourses(event.user.id, filter);

            return courses;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }

    },

    getPreviewCourse: async (event: any) => {

        try {

            const course = await facultyCourseRepository.getPreviewCourse(event.pathParameters.courseId);

            return course;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },


    getCourseById: async (event: any) => {

        try {

            const course = await facultyCourseRepository.getCourseById(event.pathParameters.courseId);

            return course;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }

    },


    updateCourseDetails: async (event: any) => {

        try {

            const validatedData = validate(createCourseSchema, JSON.parse(event.body));


            const course = await facultyCourseRepository.updateCourseDetails(validatedData, event.pathParameters.courseId, event.user.id);

            return course;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }

    },

    publishCourse: async (event: any) => {

        try {

            const course = await facultyCourseRepository.publishCourse(event.pathParameters.courseId, event.user.id);

            return course;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }

    },

    createFolderInCourse: async (event: any) => {
        try {


            const validatedData = validate(createFolderSchema, JSON.parse(event.body));

            const folder = await facultyCourseRepository.createFolder(validatedData, event.pathParameters.courseId, event.user.id);

            return folder;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    updateFolder: async (event: any) => {
        try {

            const validatedData = validate(createFolderSchema, JSON.parse(event.body));

            const folder = await facultyCourseRepository.updateFolder(validatedData, event.pathParameters.folderId);

            return folder;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    deleteFolder: async (event: any) => {
        try {

            const folder = await facultyCourseRepository.deleteFolder(event.pathParameters.folderId);

            return folder;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    addMaterialToFolder: async (event: any) => {
        try {

            // const validatedData: MaterialData = validate(uploadMaterialSchema, JSON.parse(event.body));

            const material = await facultyCourseRepository.addMaterialToFolder(JSON.parse(event.body), event.pathParameters.courseId, event.user.id);

            return material;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    updateMaterial: async (event: any) => {
        try {

            // const validatedData = validate(uploadMaterialSchema, JSON.parse(event.body));

            const material = await facultyCourseRepository.updateMaterial(JSON.parse(event.body), event.pathParameters.materialId);

            return material;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getAllProcessingMaterial: async (event: any) => {
        try {

            const material = await facultyCourseRepository.getAllProcessingMaterial(event.user.id);

            return material;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    deleteMaterial: async (event: any) => {
        try {

            const material = await facultyCourseRepository.deleteMaterial(event.pathParameters.materialId);

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

            const content = await facultyCourseRepository.getCourseContent(courseId, parentId);

            return content;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getCourseReviews: async (event: any) => {

        try {

            const courseId = event.pathParameters.courseId;
            const { page, limit } = event.queryStringParameters;

            const reviews = await facultyCourseRepository.getCourseReviews(courseId, page, limit);

            return reviews;

        } catch (error: any) {

            throw new Error(error)
        }
    },

    addReviewReply: async (event: any) => {
        try {

            const { reply } = JSON.parse(event.body);

            const result = await facultyCourseRepository.addReviewReply(event.pathParameters.reviewId, reply, event.user.id);

            return result;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    }




}
