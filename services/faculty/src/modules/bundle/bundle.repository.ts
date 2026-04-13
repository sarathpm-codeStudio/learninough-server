
import { supabase } from "../../../../../shared/config/supabase";
import { CourseBundleData } from "../../../../../shared/constants/types";




export const bundleRepository = {

    createCourseBundle: async (data: CourseBundleData, facultyId: string) => {

        try {

            // create new bundle
            if (data.is_new) {

                const { data: bundle, error } = await supabase.from("course_bundles").insert({

                    faculty_id: facultyId,
                    title: data.title,
                    description: data.description,
                    price: data.price,
                    discount_type: data?.discount_type ?? null,
                    discount_price: data?.discount_price ?? null,
                    discount: data?.discount ?? null,
                    img_url: data.img_url ?? null,
                    is_draft: data.is_draft,
                })
                    .select()
                    .single();

                if (error) {
                    throw new Error(error.message)
                }

                const bundleId = bundle?.id;

                const courseBundleMapping = data.course_ids.map((courseId) => ({
                    bundle_id: bundleId,
                    course_id: courseId,
                }));

                const { data: courseBundleMappingData, error: courseBundleMappingError } = await supabase.from("course_bundle_courses").insert(courseBundleMapping);

                if (courseBundleMappingError) {
                    throw new Error(courseBundleMappingError.message)
                }

                return { bundle, is_draft: data.is_draft };



            } else {

                // update drafted bundle

                const { data: bundle, error } = await supabase.from("course_bundles").update({

                    title: data.title,
                    description: data.description,
                    price: data.price,
                    discount_type: data?.discount_type ?? null,
                    discount_price: data?.discount_price ?? null,
                    discount: data?.discount ?? null,
                    img_url: data.img_url ?? null,
                    is_draft: data.is_draft,
                })
                    .eq("id", data.bundle_id)
                    .select()
                    .single();

                if (error) {
                    throw new Error(error.message)
                }

                const bundleId = bundle?.id;

                const courseBundleMapping = data.course_ids.map((courseId) => ({
                    bundle_id: bundleId,
                    course_id: courseId,
                }));

                const { data: courseBundleMappingData, error: courseBundleMappingError } = await supabase.from("course_bundle_courses").update(courseBundleMapping);

                if (courseBundleMappingError) {

                    throw new Error(courseBundleMappingError.message)
                }

                return { bundle, is_draft: data.is_draft };



            }

        } catch (error: any) {


            throw new Error(error.message)
        }

    },

    getMyBundles: async (facultyId: string, filter: boolean) => {
        try {
            const { data: bundles, error } = await supabase
                .from("course_bundle")
                .select(`
        id,
        title,
        description,
        price,
        discount_price,
        image_url,
        is_active,
        is_draft,
        created_at,

            course_bundle_courses(count)

      `)
                .eq("faculty_id", facultyId)
                .eq("is_draft", filter);

            if (error) {
                throw new Error(error.message);
            }

            return bundles;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getbundleById: async (bundleId: string, facultyId: string) => {
        try {
            const { data: bundle, error } = await supabase
                .from("course_bundle")
                .select(`
        id,
        title,
        description,
        price,
        discount_price,
        image_url,
        is_active,
        is_draft,
        created_at,

        course_bundle_courses (
      courses (
        id,
        title,
        thumbnail_url
      )
    ),

            course_bundle_courses(count)

      `)
                .eq("id", bundleId)
                .eq("faculty_id", facultyId)
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return bundle;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },



}
