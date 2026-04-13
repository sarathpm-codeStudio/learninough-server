

import { handleResponse } from "../../shared/utils/response";
import { videoWebhookService } from "../../modules/webhooks/video/video.webhook.service";




export const tpstreamsWebhook = async (event: any) => {

    try {

        const result = await videoWebhookService.handleVideoWebhook(event);

        return handleResponse.success(result, "Video webhook processed successfully");

    } catch (error: any) {

        return handleResponse.error(error, "Error processing video webhook");
    }
}