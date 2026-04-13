import { videoWebhookRepository } from "./video.webhook.repository";

export const videoWebhookService = {

    handleVideoWebhook: async (event: any) => {

        try {

            const updatedMaterial = await videoWebhookRepository.handleVideoWebhook(JSON.parse(event.body));

            return updatedMaterial;

        } catch (error: any) {

            throw new Error(error.message);
        }
    }

}
