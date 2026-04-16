

import { chatRepository } from "./chat.repository";


export const chatService = {

    chatNotificationWorker: async (event: any) => {
        try {

            await chatRepository.chatNotificationWorker(event);

        } catch (error: any) {

            throw new Error(error.message);

        }
    },


}



