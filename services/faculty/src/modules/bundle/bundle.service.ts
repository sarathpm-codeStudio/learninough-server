
import { validate } from "../../../../../shared/utils/validate";
import { createCourseBundleSchema } from "../../../../../shared/validators/course.validator";
import { bundleRepository } from "./bundle.repository";




export const bundleService = {


    createCourseBundle: async (event: any) => {

        try {

            const validatedData = validate(createCourseBundleSchema, JSON.parse(event.body));

            const bundle = await bundleRepository.createCourseBundle(validatedData, event.user.id);

            return bundle;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getMyBundles: async (event: any) => {
        try {

            const filter = event.queryStringParameters.filter;

            const bundles = await bundleRepository.getMyBundles(event.user.id, filter);

            return bundles;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getBundleById: async (event: any) => {
        try {

            const bundleId = event.pathParameters.bundleId;

            const bundle = await bundleRepository.getbundleById(bundleId, event.user.id);

            return bundle;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

}
