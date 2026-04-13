import { videoRepository } from "./video.repository";





export const videoService = {

    backgroundProcessVideoUpload: async (event: any) => {

        try {

            await videoRepository.backgroundProcessVideoUpload(event);

        } catch (error: any) {

            throw new Error(error.message)
        }


    }


}