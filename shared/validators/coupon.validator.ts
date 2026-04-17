
import { z } from "zod";



export const couponValidator = z.object({

    title: z.string().min(3, "Coupon title must be at least 3 characters long"),
    description: z.string().optional(),
    discount_type: z.string().min(1, "Discount type is required"),
    discount: z.number().min(1, "Discount is required"),
    is_new: z.boolean(),
    is_draft: z.boolean(),
    courses: z.array(z.string()),
    coupon_id: z.string().optional(),

});


export type CouponValidator = z.infer<typeof couponValidator>;
