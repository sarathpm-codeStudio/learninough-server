

import { couponService } from "../../modules/coupon/coupon.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const coupon = await couponService.createCoupon(event);

        return handleResponse.success(coupon, "Coupon created successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error creating coupon", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
