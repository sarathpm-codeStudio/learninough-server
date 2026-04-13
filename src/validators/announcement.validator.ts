
import { z } from "zod";

export const createAnnouncementSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    course_id: z.string().optional(),
    image_url: z.string().optional(),
});