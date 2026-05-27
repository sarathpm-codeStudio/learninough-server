
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../shared/config/supabase";
import { CourseBundleData } from "../../../../../shared/constants/types";




export const bundleRepository = {

    createCourseBundle: async (data: CourseBundleData, facultyId: string, client?: SupabaseClient) => {

        try {

            const supabase = client ?? anonSupabase;
            // create new bundle


            const { data: bundle, error } = await supabase.from("course_bundle").insert({

                faculty_id: facultyId,
                title: data.title,
                description: data.description,
                price: data.price,
                final_price: data.finalPrice,
                discount: Number(data?.discount) ?? null,
                discount_type: "percentage",
                image_url: data.coverImage ?? null,
                enable_coupons: data.enableCoupons ?? false,
                total_courses_count: data.courses.length,
                is_draft: data.isDraft ?? false,
            })
                .select()
                .single();

            if (error) {
                throw new Error(error.message)
            }

            const bundleId = bundle?.id;

            const courseBundleMapping = data.courses.map((courseId) => ({
                bundle_id: bundleId,
                course_id: courseId,
            }));

            const { data: courseBundleMappingData, error: courseBundleMappingError } = await supabase.from("course_bundle_courses").insert(courseBundleMapping);

            if (courseBundleMappingError) {
                throw new Error(courseBundleMappingError.message)
            }

            return { bundle };





        } catch (error: any) {


            throw new Error(error.message)
        }

    },

    getMyBundles: async (facultyId: string, filter: boolean, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
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
        final_price,
        total_courses_count,

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

    getbundleById: async (bundleId: string, facultyId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
            console.log("bundleId", bundleId);
            const { data: bundle, error } = await supabase
                .from("course_bundle")
                .select(`
        id,
        title,
        description,
        price,
        discount,
        image_url,
        is_active,
        is_draft,
        created_at,
        final_price,
        enable_coupons,
        total_courses_count,
        course_bundle_courses (
            courses (
                id,
                title
            )
        ),
        course_bundle_courses_count:course_bundle_courses(count)
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

    updateBundle: async (bundleId: string, data: CourseBundleData, facultyId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
            // Fix: proper discount handling
            const discount = data.discount != null ? Number(data.discount) : null;

            const [{ data: bundle, error: bundleError }] = await Promise.all([
                supabase
                    .from("course_bundle")
                    .update({
                        title: data.title,
                        description: data.description,
                        price: data.price,
                        final_price: data.finalPrice,
                        discount: Number(data.discount),
                        discount_type: "percentage",
                        image_url: data.coverImage ?? null,
                        enable_coupons: data.enableCoupons ?? false,
                        total_courses_count: data.courses.length,
                        is_draft: data.isDraft,
                    })
                    .eq("id", bundleId)
                    .eq("faculty_id", facultyId)
                    .select()
                    .single(),
            ]);

            // Fix: check bundle update error
            if (bundleError) throw new Error(bundleError.message);

            // Fix: delete + insert is cleaner than delete + upsert
            const { error: deleteError } = await supabase
                .from("course_bundle_courses")
                .delete()
                .eq("bundle_id", bundleId);

            if (deleteError) throw new Error(deleteError.message);

            // Only insert if courses exist
            if (data.courses.length > 0) {
                const courseBundleMapping = data.courses.map((courseId) => ({
                    bundle_id: bundleId,
                    course_id: courseId,
                }));

                const { error: insertError } = await supabase
                    .from("course_bundle_courses")
                    .insert(courseBundleMapping);

                if (insertError) throw new Error(insertError.message);
            }

            return { bundle };
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    deleteBundle: async (bundleId: string, facultyId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
            const { error } = await supabase
                .from("course_bundle")
                .delete()
                .eq("id", bundleId)
                .eq("faculty_id", facultyId);

            if (error) {
                throw new Error(error.message);
            }
            return { success: true };

        } catch (error: any) {

            throw new Error(error.message);
        }
    },



}
