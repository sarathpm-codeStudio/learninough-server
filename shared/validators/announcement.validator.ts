import { z } from "zod";

export const createAnnouncementSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    audience: z.string().optional(),
    image_url: z.string().optional(),
    timePeriod: z.string().optional(),
    isDraft: z.boolean().optional(),
});
