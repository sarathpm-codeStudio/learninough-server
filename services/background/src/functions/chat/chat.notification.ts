

import { handleResponse } from "../../../../../shared/utils/response";
import { chatService } from "../../modules/chat/chat.service";


export const handler = async (event: any) => {

    try {

        await chatService.chatNotificationWorker(event);

    } catch (err: any) {

        return handleResponse.error(err, "Error processing chat notification", 400);

    }
};
