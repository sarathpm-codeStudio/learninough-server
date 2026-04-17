


import { couponService } from "../../modules/coupon/coupon.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const coupons = await couponService.updateCouponStatus(event);

        return handleResponse.success(coupons, "Coupon status updated successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error updating coupon status", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
