import { chatRepository } from "./chat.repository";

export const chatService = {
    // Delegates to the repository and RETURNS its result so the
    // { batchItemFailures } contract reaches the SQS handler intact.
    chatNotificationWorker: async (event: any) => {
        return await chatRepository.chatNotificationWorker(event);
    },
};
