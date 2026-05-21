
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../shared/config/supabase";
import { CouponData } from "../../../../../shared/constants/types";



export const couponRepository = {


  createCoupon: async (couponData: CouponData, facultyId: string, client?: SupabaseClient) => {

        try {

            console.log("couponData", client);

            // Use the per-request authenticated client (set by verifyAuth) so
            // RLS policies see the caller's auth.uid(). Fall back to the
            // anonymous client only if one was not attached.
            const db = client ?? anonSupabase;

            // check select course is exist or not

           if(!couponData.courses.includes("all")){
            const { data: courses, error } = await db
            .from("courses")
            .select("id")
            .in("id", couponData.courses)        // ← check ALL course IDs at once
            .eq("faculty_id", facultyId)
            .eq("is_deleted", false)
            .eq("enableCoupons", true);

        if (error) throw new Error(error.message);

        if(!courses || courses.length !== couponData.courses.length){
            throw new Error(" You selected one or more courses not found or not yours");
        }

           }
            
            // create coupon
              const { data: coupon, error: couponError } = await db
                    .from("coupons")
                    .insert({
                        code: couponData.code,
                        discount_type: couponData.discountType,
                        discount: couponData.discountValue,
                        expire_date: couponData.expiryDate,
                        max_usage: couponData.maxUsage,
                        usage_per_person: couponData.usagePerPerson,
                        faculty_id: facultyId,
                        is_active: true,
                        is_all_courses:couponData.courses.includes("all"),
                        is_draft: false,
                    })
                    .select()
                    .single();
                if (couponError) throw new Error(couponError.message);


                if(!couponData.courses.includes("all")){
                    console.log("couponData.courses", couponData.courses);
                    // Build one row per course
                const couponCourseRows = couponData.courses.map(courseId => ({
                    coupon_id: coupon.id,
                    course_id: courseId,    // ← one course per row ✅
                }));

                // Insert ALL rows at once
                const { data: couponCourses, error: couponCoursesError } = await db
                    .from("coupon_courses")
                    .insert(couponCourseRows)  // ← array of rows ✅
                    .select();

                if (couponCoursesError) throw new Error(couponCoursesError.message);

                }
                
                return coupon;

           } catch (error: any) {

            throw new Error(error.message);
        }

    },

    // get my all coupon enabled courses
   getMyCourses: async (facultyId: string, client?: SupabaseClient) => {
        console.log("facultyId", facultyId);
        try {
            const db = client ?? anonSupabase;
            const { data: courses, error } = await db
                .from("courses")
                .select("id, title")
                .eq("faculty_id", facultyId)
                .eq("is_draft", false)
                .eq("enableCoupons", true)
                .order("created_at", { ascending: false });

            if (error) throw new Error(error.message);
            return courses;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },


    getMyCoupons: async (facultyId: string, filter: "all" | "draft" | "active" | "expired", page: number = 1, limit: number = 10, client?: SupabaseClient) => {
        try {

            const db = client ?? anonSupabase;

            // Calculate offset
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            // Base query
            let query = db
                .from("coupons")
                .select(`
                *,
                coupon_courses (
                    course_id,
                    courses (
                        id,
                        name,
                        cover_image
                    )
                )
            `, { count: "exact" })   // ← count total rows
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false })
                .range(from, to);        // ← pagination range

            // Apply filter
            switch (filter) {
                case "draft":
                    query = query.eq("is_draft", true);
                    break;

                case "active":
                    query = query
                        .eq("is_draft", false)
                        .eq("is_active", true)
                        .gt("expire_date", new Date().toISOString());
                    break;

                case "expired":
                    query = query
                        .eq("is_draft", false)
                        .lt("expire_date", new Date().toISOString());
                    break;

                case "all":
                default:
                    break;
            }

            const { data: coupons, error, count } = await query;
            if (error) throw new Error(error.message);

            // Calculate pagination meta
            const totalPages = Math.ceil((count ?? 0) / limit);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;

            return {
                coupons,
                pagination: {
                    total: count ?? 0,
                    total_pages: totalPages,
                    current_page: page,
                    limit,
                    has_next: hasNextPage,
                    has_prev: hasPrevPage,
                }
            };

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    updateCouponStatus: async (facultyId: string, couponId: string, status: boolean, client?: SupabaseClient) => {
        try {

            const db = client ?? anonSupabase;
            const { data: coupon, error } = await db
                .from("coupons")
                .update({
                    is_active: status,
                })
                .eq("id", couponId)
                .eq("faculty_id", facultyId)
                .select()
                .single();
            if (error) throw new Error(error.message);

            return coupon;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    deleteCoupon: async (facultyId: string, couponId: string, client?: SupabaseClient) => {
        try {

            const db = client ?? anonSupabase;
            const { data: coupon, error } = await db
                .from("coupons")
                .update({
                    is_deleted: true,
                })
                .eq("id", couponId)
                .eq("faculty_id", facultyId)
                .select()
                .single();
            if (error) throw new Error(error.message);

            return coupon;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

}   