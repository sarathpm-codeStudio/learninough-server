
import { supabase } from "../../../../../shared/config/supabase";
import { CouponData } from "../../../../../shared/constants/types";



export const couponRepository = {


    createCoupon: async (couponData: CouponData, facultyId: string) => {

        try {

            // check select course is exist or not

            const { data: courses, error } = await supabase
                .from("courses")
                .select("id")
                .in("id", couponData.courses)        // ← check ALL course IDs at once
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false);

            if (error) throw new Error(error.message);

            // Check if ALL provided courses were found
            if (!courses || courses.length !== couponData.courses.length) {
                throw new Error("One or more courses not found or not yours");
            }

            if (couponData?.is_new) {

                // create coupon

                const { data: coupon, error: couponError } = await supabase
                    .from("coupons")
                    .insert({
                        title: couponData.title,
                        description: couponData.description || "",
                        discount_type: couponData.discount_type,
                        discount: couponData.discount,
                        is_draft: couponData.is_draft,
                        faculty_id: facultyId,
                        is_active: couponData.is_draft ? false : true,
                    })
                    .select()
                    .single();
                if (couponError) throw new Error(couponError.message);


                // Build one row per course
                const couponCourseRows = couponData.courses.map(courseId => ({
                    coupon_id: coupon.id,
                    course_id: courseId,    // ← one course per row ✅
                }));

                // Insert ALL rows at once
                const { data: couponCourses, error: couponCoursesError } = await supabase
                    .from("coupon_courses")
                    .insert(couponCourseRows)  // ← array of rows ✅
                    .select();

                if (couponCoursesError) throw new Error(couponCoursesError.message);

                return coupon;

            } else {

                // update draft coupon

                if (couponData?.coupon_id) {

                    const { data: coupon, error: couponError } = await supabase
                        .from("coupons")
                        .update({
                            title: couponData.title,
                            description: couponData.description || "",
                            discount_type: couponData.discount_type,
                            discount: couponData.discount,
                            is_draft: couponData.is_draft,
                            faculty_id: facultyId,
                            is_active: couponData.is_draft ? false : true,
                        })
                        .eq("id", couponData.coupon_id)
                        .select()
                        .single();
                    if (couponError) throw new Error(couponError.message);

                    // delete old coupon courses
                    const { error: deleteError } = await supabase
                        .from("coupon_courses")
                        .delete()
                        .eq("coupon_id", couponData.coupon_id);
                    if (deleteError) throw new Error(deleteError.message);

                    // create new coupon courses
                    const couponCourseRows = couponData.courses.map(courseId => ({
                        coupon_id: coupon.id,
                        course_id: courseId,
                    }));
                    const { data: couponCourses, error: couponCoursesError } = await supabase
                        .from("coupon_courses")
                        .insert(couponCourseRows)
                        .select();
                    if (couponCoursesError) throw new Error(couponCoursesError.message);

                    return coupon;

                } else {

                    throw new Error("Coupon ID is required");
                }


            }








        } catch (error: any) {

            throw new Error(error.message);
        }

    },

    getMyCoupons: async (facultyId: string, filter: "all" | "draft" | "active" | "expired", page: number = 1, limit: number = 10) => {
        try {

            // Calculate offset
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            // Base query
            let query = supabase
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

    updateCouponStatus: async (facultyId: string, couponId: string, status: boolean) => {
        try {

            const { data: coupon, error } = await supabase
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

    deleteCoupon: async (facultyId: string, couponId: string) => {
        try {

            const { data: coupon, error } = await supabase
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