




import { couponService } from "../../modules/coupon/coupon.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const coupons = await couponService.deleteCoupon(event);

        return handleResponse.success(coupons, "Coupon deleted successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error deleting coupon", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
