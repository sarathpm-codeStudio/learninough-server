
import { validate } from "../../../../../shared/utils/validate";
import { couponValidator } from "../../../../../shared/validators/coupon.validator"
import { couponRepository } from "./coupon.repository"
import { CouponData } from "../../../../../shared/constants/types";



export const couponService = {

    createCoupon: async (event: any) => {
        try {

            const validatedData = validate(couponValidator, JSON.parse(event.body)) as CouponData;

            return await couponRepository.createCoupon(validatedData, event.user.id);

        } catch (error: any) {

            throw new Error(error.message);
        }
    },

    getMyCoupons: async (event: any) => {
        try {

            const filter = event.queryStringParameters?.filter || "all";
            const page = event.queryStringParameters?.page || 1;
            const limit = event.queryStringParameters?.limit || 10;
            const coupons = await couponRepository.getMyCoupons(event.user.id, filter, page, limit);

            return coupons

        } catch (error: any) {

            throw new Error(error.message);
        }
    },

    updateCouponStatus: async (event: any) => {
        try {

            const couponId = event.pathParameters?.couponId;
            const status = event.body.status;
            const coupon = await couponRepository.updateCouponStatus(event.user.id, couponId, status);

            return coupon

        } catch (error: any) {

            throw new Error(error.message);
        }
    },

    deleteCoupon: async (event: any) => {
        try {

            const couponId = event.pathParameters?.couponId;
            const coupon = await couponRepository.deleteCoupon(event.user.id, couponId);

            return coupon

        } catch (error: any) {

            throw new Error(error.message);
        }
    },



}


