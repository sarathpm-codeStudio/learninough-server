
import { z } from "zod";



export const couponValidator = z.object({

    code: z.string().min(3, "Coupon title must be at least 3 characters long"),
    discountType: z.string().min(1, "Discount type is required"),
    discountValue: z.number().min(1, "Discount is required"),
    courses: z.array(z.string()),
    expiryDate: z.string().min(1, "Expiry date is required"),
    maxUsage: z.number().min(1, "Max usage is required"),
    usagePerPerson: z.number().min(1, "Usage per person is required"),
    
});


export type CouponValidator = z.infer<typeof couponValidator>;
