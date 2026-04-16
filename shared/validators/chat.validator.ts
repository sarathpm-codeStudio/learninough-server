

import { z } from "zod";



export const sendMessageSchema = z.object({

    receiverId: z.string().min(1, "Receiver ID is required"),
    content: z.string().min(1, "Content is required"),
    messageType: z.enum(['TEXT', 'IMAGE', 'PDF', 'VIDEO']),
    file_name: z.string().optional(),
    file_url: z.string().optional(),

})