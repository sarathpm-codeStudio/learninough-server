
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../shared/config/supabase";
import { CouponData } from "../../../../../shared/constants/types";



export const couponRepository = {

    getMyCouponsAnalytics: async (facultyId: string, client?: SupabaseClient) => {
        try {
            const db = client ?? anonSupabase;
    
            const now = new Date().toISOString().replace("T", " ").replace("Z", "+00");
    
            // 1. Active coupons count
            const { count: activeCoupons, error: activeCouponsError } = await db
                .from("coupons")
                .select("*", { count: "exact", head: true })
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false)
                .eq("is_active", true)
                .eq("is_draft", false)
                .gt("expire_date", now);
    
            if (activeCouponsError) throw new Error(activeCouponsError.message);
    
            // 2. Total redeemed users (unique students) + save_amount
            const { data: redemptions, error: redemptionsError } = await db
                .from("coupon_redemptions")
                .select("student_id, save_amount")
                .eq("faculty_id", facultyId);
    
            if (redemptionsError) throw new Error(redemptionsError.message);
    
            // 3. Unique students using Set
            const totalRedeemedUsers = new Set(redemptions.map((r) => r.student_id)).size;
    
            // 4. Total savings generated
            const totalSavingsGenerated = redemptions.reduce(
                (sum, r) => sum + Number(r.save_amount),
                0
            );
    
            return {
                active_coupons: activeCoupons ?? 0,
                total_redeemed_users: totalRedeemedUsers,
                total_savings_generated: totalSavingsGenerated,
            };
    
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    // get my all coupon enabled courses
   
    createCoupon: async (
        couponData: CouponData,
        facultyId: string,
        client?: SupabaseClient
      ) => {
      
        // Use authenticated client
        const db = client ?? anonSupabase;
      
        const isAllCourses = couponData.courses.includes("all");
      
        /**
         * Validate selected courses
         */
        if (!isAllCourses) {
      
          const { data: courses, error: coursesError } = await db
            .from("courses")
            .select("id")
            .in("id", couponData.courses)
            .eq("faculty_id", facultyId)
            .eq("is_deleted", false)
            .eq("enableCoupons", true);
      
          if (coursesError) {
            throw new Error(coursesError.message);
          }
      
          if (!courses || courses.length !== couponData.courses.length) {
            throw new Error(
              "One or more selected courses are invalid or do not belong to you."
            );
          }
        }
      
        /**
         * Check coupon already exists
         */
        const { data: existingCoupon, error: couponCheckError } = await db
          .from("coupons")
          .select("id")
          .eq("code", couponData.code)
          .eq("is_deleted", false)
          .maybeSingle();
      
        if (couponCheckError) {
          throw new Error("Coupon code already exists. Please use a different code.");
        }
      
        if (existingCoupon) {
          throw new Error(
            "Coupon code already exists. Please use a different code."
          );
        }
      
        /**
         * Create coupon
         */
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
            is_all_courses: isAllCourses,
            is_draft: false,
          })
          .select()
          .single();
      
        if (couponError) {
      
          /**
           * PostgreSQL unique constraint error
           */
          if (couponError.code === "23505") {
            throw new Error(
              "Coupon code already exists. Please use a different code."
            );
          }
      
          throw new Error(couponError.message);
        }
      
        /**
         * Insert coupon courses
         */
        if (!isAllCourses) {
      
          const couponCourseRows = couponData.courses.map((courseId) => ({
            coupon_id: coupon.id,
            course_id: courseId,
          }));
      
          const { error: couponCoursesError } = await db
            .from("coupon_courses")
            .insert(couponCourseRows);
      
          if (couponCoursesError) {
            throw new Error(couponCoursesError.message);
          }
        }
      
        return coupon;
    },
      
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
    
    // getMyCoupons: async (facultyId: string, filter: "active" | "deactivate" | "expired", page: number = 1, limit: number = 10, search: string = "", client?: SupabaseClient) => {
    //     try {
    //         const db = client ?? anonSupabase;
    
    //         // Calculate offset
    //         const from = (page - 1) * limit;
    //         const to = from + limit - 1;
    
    //         // Base query
    //         let query = db
    //             .from("coupons")
    //             .select(`
    //                 *,
    //                 coupon_courses (
    //                     course_id,
    //                     courses (
    //                         id,
    //                         title
                            
    //                     )
    //                 )
    //             `, { count: "exact" })
    //             .eq("faculty_id", facultyId)
    //             .eq("is_deleted", false)
    //             .order("created_at", { ascending: false })
    //             .range(from, to);
    
    //         // Apply filter
    //         if (filter === "active") {
    //             query = query.eq("is_active", true);
    //         } else if (filter === "deactivate") {
    //             query = query.eq("is_active", false);
    //         } else if (filter === "expired") {
    //             const now = new Date().toISOString();
    //             query = query.lt("expire_date", now).not("expire_date", "is", null);
    //         }
    
    //         // Apply search
    //         if (search.trim()) {
    //             query = query.or(`code.ilike.%${search}%,title.ilike.%${search}%`);
    //         }
    
    //         const { data: coupons, error, count } = await query;
    //         if (error) throw new Error(error.message);
    
    //         // Calculate pagination meta
    //         const totalPages = Math.ceil((count ?? 0) / limit);
    //         const hasNextPage = page < totalPages;
    //         const hasPrevPage = page > 1;
    
    //         return {
    //             coupons,
    //             pagination: {
    //                 total: count ?? 0,
    //                 total_pages: totalPages,
    //                 current_page: page,
    //                 limit,
    //                 has_next: hasNextPage,
    //                 has_prev: hasPrevPage,
    //             }
    //         };
    
    //     } catch (error: any) {
    //         throw new Error(error.message);
    //     }
    // },
    

    getMyCoupons: async (facultyId: string, filter: "active" | "deactivate" | "expired", page: number = 1, limit: number = 10, search: string = "", client?: SupabaseClient) => {
        try {
            const db  = client ?? anonSupabase;
            const now = new Date().toISOString();
    
            // 0. Auto-deactivate expired coupons for this faculty before fetching
            const { error: deactivateError } = await db
                .from("coupons")
                .update({ is_active: false })
                .eq("faculty_id", facultyId)
                .eq("is_active", true)
                .eq("is_deleted", false)
                .lt("expire_date", now);
    
            if (deactivateError) throw new Error(deactivateError.message);
    
            // Calculate offset
            const from = (page - 1) * limit;
            const to   = from + limit - 1;
    
            // Base query
            let query = db
                .from("coupons")
                .select(`
                    *,
                    coupon_courses (
                        course_id,
                        courses (
                            id,
                            title
                        )
                    )
                `, { count: "exact" })
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false })
                .range(from, to);
    
            // Apply filter
            if (filter === "active") {
                query = query
                    .eq("is_active", true)
                    .gt("expire_date", now);   // ✅ extra safety — not expired
            } else if (filter === "deactivate") {
                query = query.eq("is_active", false);
            } else if (filter === "expired") {
                query = query
                    .lt("expire_date", now)
                    .not("expire_date", "is", null);
            }
    
            // Apply search
            if (search.trim()) {
                query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
            }
    
            const { data: coupons, error, count } = await query;
            if (error) throw new Error(error.message);
    
            // Calculate pagination meta
            const totalPages  = Math.ceil((count ?? 0) / limit);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;
    
            return {
                coupons,
                pagination: {
                    total:        count ?? 0,
                    total_pages:  totalPages,
                    current_page: page,
                    limit,
                    has_next:     hasNextPage,
                    has_prev:     hasPrevPage,
                }
            };
    
        } catch (error: any) {
            throw new Error(error.message);
        }
    },


    updateCouponStatus: async (facultyId: string, couponId: string, status: boolean, client?: SupabaseClient) => {
        try {

            console.log("facultyId", facultyId);
            console.log("couponId", couponId);
            console.log("status", status);
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

    updateCoupon: async (facultyId: string, couponId: string, couponData: CouponData, client?: SupabaseClient) => {
        try {
            const db = client ?? anonSupabase;

            const isAllCourses = couponData.courses.includes("all");

            /**
             * Validate selected courses
             */
            if (!isAllCourses) {

                const { data: courses, error: coursesError } = await db
                    .from("courses")
                    .select("id")
                    .in("id", couponData.courses)
                    .eq("faculty_id", facultyId)
                    .eq("is_deleted", false)
                    .eq("enableCoupons", true);

                if (coursesError) {
                    throw new Error(coursesError.message);
                }

                if (!courses || courses.length !== couponData.courses.length) {
                    throw new Error(
                        "One or more selected courses are invalid or do not belong to you."
                    );
                }
            }

            /**
             * Update coupon
             */
            const { data: coupon, error } = await db
                .from("coupons")
                .update({
                    expire_date: couponData.expiryDate,
                    max_usage: couponData.maxUsage,
                    usage_per_person: couponData.usagePerPerson,
                    is_all_courses: isAllCourses,
                })
                .eq("id", couponId)
                .eq("faculty_id", facultyId)
                .select()
                .single();
            if (error) throw new Error(error.message);

            /**
             * Sync coupon courses (diff-based: only remove deselected, only add newly selected)
             */
            const { data: existingCouponCourses, error: fetchExistingError } = await db
                .from("coupon_courses")
                .select("course_id")
                .eq("coupon_id", couponId);

            if (fetchExistingError) {
                throw new Error(fetchExistingError.message);
            }

            const existingCourseIds: string[] = (existingCouponCourses ?? []).map(
                (row: { course_id: string }) => row.course_id
            );

            if (isAllCourses) {

                /**
                 * Switched to "all courses" — remove any per-course mappings
                 */
                if (existingCourseIds.length > 0) {

                    const { error: deleteError } = await db
                        .from("coupon_courses")
                        .delete()
                        .eq("coupon_id", couponId);

                    if (deleteError) {
                        throw new Error(deleteError.message);
                    }
                }

            } else {

                const newCourseIds = couponData.courses;

                const toRemove = existingCourseIds.filter(
                    (id) => !newCourseIds.includes(id)
                );
                const toAdd = newCourseIds.filter(
                    (id) => !existingCourseIds.includes(id)
                );

                if (toRemove.length > 0) {

                    const { error: deleteError } = await db
                        .from("coupon_courses")
                        .delete()
                        .eq("coupon_id", couponId)
                        .in("course_id", toRemove);

                    if (deleteError) {
                        throw new Error(deleteError.message);
                    }
                }

                if (toAdd.length > 0) {

                    const couponCourseRows = toAdd.map((courseId) => ({
                        coupon_id: couponId,
                        course_id: courseId,
                    }));

                    const { error: couponCoursesError } = await db
                        .from("coupon_courses")
                        .insert(couponCourseRows);

                    if (couponCoursesError) {
                        throw new Error(couponCoursesError.message);
                    }
                }
            }

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