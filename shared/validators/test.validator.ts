

import { z } from "zod";



export const createTestBaseDetailsSchema = z.object({

    unique_id: z.string().min(1, "Unique ID is required"),
    title: z.string().min(1, "Title is required"),
    module: z.string().optional(),
    course: z.string().min(1, "Course ID is required"),
    totalMarks: z.string().min(1, "Total marks is required"),
    duration: z.string().min(1, "Duration is required"),
    instructions: z.string().optional(),
    testType: z.string(),


});


export const createTestQuestionSchema = z.object({

    // test_id: z.string().min(1, "Test ID is required"),
    question: z.string().min(1, "Question is required"),
    type: z.string().min(1, "Type is required"),
    marks: z.number().min(1, "Marks is required"),

});
