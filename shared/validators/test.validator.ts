

import { z } from "zod";



export const createTestBaseDetailsSchema = z.object({

    title: z.string().min(1, "Title is required"),
    module: z.string().optional(),
    courseId: z.string().min(1, "Course ID is required"),
    totalMarks: z.number().min(1, "Total marks is required"),
    duration: z.number().min(1, "Duration is required"),
    isDraft: z.boolean(),
    instructions: z.string().optional(),
    type: z.string(),
    isNew: z.boolean(),
    testId: z.string().optional(),
    isRandom: z.boolean().optional(),

});


export const createTestQuestionSchema = z.object({

    // test_id: z.string().min(1, "Test ID is required"),
    question: z.string().min(1, "Question is required"),
    type: z.string().min(1, "Type is required"),
    marks: z.number().min(1, "Marks is required"),

});
