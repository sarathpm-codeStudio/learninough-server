import { parseJsonBody } from "../../../../../shared/utils/parseBody";
import { videoWebhookRepository } from "./video.webhook.repository";

export const videoWebhookService = {

    handleVideoWebhook: async (event: any) => {

        try {

            const updatedMaterial = await videoWebhookRepository.handleVideoWebhook(parseJsonBody(event));

            return updatedMaterial;

        } catch (error: any) {

            throw new Error(error.message);
        }
    }

}
