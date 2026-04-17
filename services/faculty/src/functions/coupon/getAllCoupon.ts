


import { couponService } from "../../modules/coupon/coupon.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const coupons = await couponService.getMyCoupons(event);

        return handleResponse.success(coupons, "Coupons fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching coupons", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
