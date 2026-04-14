

import { z } from "zod";



export const createTestBaseDetailsSchema = z.object({

    title: z.string().min(1, "Title is required"),
    chapter: z.string().optional(),
    course_id: z.string().min(1, "Course ID is required"),
    module_id: z.string().optional(),
    total_marks: z.number().min(1, "Total marks is required"),
    duration: z.number().min(1, "Duration is required"),
    is_draft: z.boolean(),
    instructions: z.string(),
    type: z.string(),
    is_new: z.boolean(),
    test_id: z.string().optional(),
    is_random: z.boolean().optional(),

});


export const createTestQuestionSchema = z.object({

    // test_id: z.string().min(1, "Test ID is required"),
    question: z.string().min(1, "Question is required"),
    type: z.string().min(1, "Type is required"),
    marks: z.number().min(1, "Marks is required"),

});
