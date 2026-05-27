import { videoRepository } from "./video.repository";




export const videoService = {



    createVideoUploadProgress: async (event: any) => {

        try {

            const data = JSON.parse(event.body);
            console.log("event####################################", data);

            await videoRepository.createVideoUploadProgress(data.unique_id, event.user.id, data.asset_id, data.type, event.supabase);
            return true;

        } catch (error: any) {

            throw new Error(error.message)
        }


    },

}