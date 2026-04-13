


// src/validators/course.validator.ts
import { z } from "zod";
import { MaterialType } from "../shared/constants/types";

// for basic details of course
export const createCourseSchema = z.object({
    title: z.string().min(3, "Course name min 3 characters"),
    description: z.string().min(10, "Description too short"),
    category: z.string(),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),

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

});


export const uploadMaterialSchema = z.object({
    title: z.string(),
    type: z.nativeEnum(MaterialType),
});


export const createCourseBundleSchema = z.object({
    title: z.string(),
    description: z.string(),
    price: z.number(),
    discount_type: z.string(),
    discount_price: z.number(),
    discount: z.number(),
    course_ids: z.array(z.string()),
    img_url: z.string(),
    is_new: z.boolean(),
    is_draft: z.boolean(),
});




// Type is automatically inferred — no need to write interface manually
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
