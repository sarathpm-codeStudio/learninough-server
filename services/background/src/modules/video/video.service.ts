import { videoRepository } from "./video.repository";

export const videoService = {



    createVideoUploadProgress: async (event: any) => {

        try {

            const data = JSON.parse(event.body);

            await videoRepository.createVideoUploadProgress(data.uniqueId, event.user.id, data.assetId, data.type);
            return true;

        } catch (error: any) {

            throw new Error(error.message)
        }


    },





    // backgroundProcessVideoUpload: async (event: any) => {

    //     try {

    //         await videoRepository.backgroundProcessVideoUpload(event);

    //     } catch (error: any) {

    //         throw new Error(error.message)
    //     }


    // },

    // uploadCourseIntroVideo: async (event: any) => {

    //     try {

    //         await videoRepository.uploadCourseIntroVideo(event);

    //     } catch (error: any) {

    //         throw new Error(error.message)
    //     }


    // },

}
