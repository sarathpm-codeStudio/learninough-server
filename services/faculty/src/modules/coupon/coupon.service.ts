
import { validate } from "../../../../../shared/utils/validate";
import { couponValidator } from "../../../../../shared/validators/coupon.validator"
import { couponRepository } from "./coupon.repository"
import { CouponData } from "../../../../../shared/constants/types";



export const couponService = {

    getMyCouponsAnalytics: async (event: any) => {
        try {
            const analytics = await couponRepository.getMyCouponsAnalytics(event.user.id, event.supabase);
            return analytics;
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    createCoupon: async (event: any) => {
        try {

            const validatedData = validate(couponValidator, JSON.parse(event.body)) as CouponData;

             const coupon = await couponRepository.createCoupon(validatedData, event.user.id, event.supabase);

            return coupon;

        } catch (error: any) {

            throw new Error(error.message);
        }
    },

    getMyCourses: async (event: any) => {
        try {
            const courses = await couponRepository.getMyCourses(event.user.id, event.supabase);
            return courses;
        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getMyCoupons: async (event: any) => {
        try {

            const filter = event.queryStringParameters?.filter || "active";
            const page = event.queryStringParameters?.page || 1;
            const limit = event.queryStringParameters?.limit || 10;
            const search = event.queryStringParameters?.search || "";
            const coupons = await couponRepository.getMyCoupons(event.user.id, filter, page, limit, search, event.supabase);

            return coupons

        } catch (error: any) {

            throw new Error(error.message);
        }
    },

    updateCouponStatus: async (event: any) => {
        try {

            const couponId = event.pathParameters?.couponId;
            console.log("body", JSON.parse(event.body));
            const status = JSON.parse(event.body).status;
            const coupon = await couponRepository.updateCouponStatus(event.user.id, couponId, status, event.supabase);

            return coupon

        } catch (error: any) {

            throw new Error(error.message);
        }
    },
    updateCoupon: async (event: any) => {
        try {
            const couponId = event.pathParameters?.couponId;
            const couponData = JSON.parse(event.body);
            const coupon = await couponRepository.updateCoupon(event.user.id, couponId, couponData, event.supabase);
            return coupon;
        } catch (error: any) {
            throw new Error(error.message);
        }
    },
    deleteCoupon: async (event: any) => {
        try {

            const couponId = event.pathParameters?.couponId;
            const coupon = await couponRepository.deleteCoupon(event.user.id, couponId, event.supabase);

            return coupon

        } catch (error: any) {

            throw new Error(error.message);
        }
    },



}


