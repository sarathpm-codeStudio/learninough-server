// shared/validators/course.validator.ts
import { z } from "zod";
import { MaterialType } from "../constants/types";

// for basic details of course
export const createCourseSchema = z.object({
    unique_id: z.string(),
    title: z.string().min(3, "Course name min 3 characters"),
    description: z.string().min(10, "Description too short"),
    category: z.string(),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    languages: z.array(z.string()).min(1, "Language is required"),
    cover_image: z.string().min(1, "Course image is required"),

});


// for update course details
export const updateCourseSchema = z.object({
    title: z.string().min(3, "Course name min 3 characters"),
    description: z.string().min(10, "Description too short"),
    category: z.string(),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    price: z.number(),
    duration: z.string(),

});


export const createFolderSchema = z.object({

    title: z.string(),
    parent_id: z.string().optional(),

});


export const uploadMaterialSchema = z.object({
    title: z.string(),
    type: z.nativeEnum(MaterialType),
});


export const createCourseBundleSchema = z.object({
    title: z.string(),
    description: z.string(),
    price: z.number(),
    finalPrice: z.number(),
    discount: z.string(),
    courses: z.array(z.string()),
    coverImage: z.string(),
    enableCoupons: z.boolean().optional(),
    isDraft: z.boolean().optional(),

});


export const addCoursePricingSchema = z.object({
    duration: z.string().min(1, "Duration is required"),
    price: z.number(),
    discount_type: z.string().optional(),
    discount: z.number().optional(),
    final_price: z.number(),
    enableCoupons: z.boolean(),
});




// Type is automatically inferred — no need to write interface manually
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
