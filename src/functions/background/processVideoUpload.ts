
import { handleResponse } from "../../shared/utils/response";
import { videoService } from "../../modules/background/processVideoUpload.ts/video.service";




// create course with basic details 

export const handler = async (event: any) => {

    try {


        await videoService.backgroundProcessVideoUpload(event);


    } catch (err: any) {

        return handleResponse.error(err, "Error processing video upload", 400);

    }
};


