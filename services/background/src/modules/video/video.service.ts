import { videoRepository } from "./video.repository";

export const videoService = {



    createVideoUploadProgress: async (event: any) => {

        try {


            // Return the { batchItemFailures } from the repo so SQS's
            // ReportBatchItemFailures contract works (retries only failed records).
            return await videoRepository.createVideoUploadProgress(event);

        } catch (error: any) {

            throw new Error(error.message)
        }


    },


}
