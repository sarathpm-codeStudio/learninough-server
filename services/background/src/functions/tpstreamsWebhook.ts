import { handleResponse } from "../../../../shared/utils/response";
import { videoWebhookService } from "../modules/webhook/video.webhook.service";


export const handler = async (event: any) => {

    try {

        const result = await videoWebhookService.handleVideoWebhook(event);

        return handleResponse.success(result, "Video webhook processed successfully");

    } catch (error: any) {

        return handleResponse.error(error, "Error processing video webhook");
    }
}
