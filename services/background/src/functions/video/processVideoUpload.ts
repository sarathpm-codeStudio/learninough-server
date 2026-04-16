import { handleResponse } from "../../../../../shared/utils/response";
import { videoService } from "../../modules/video/video.service";


export const handler = async (event: any) => {

    try {

        await videoService.backgroundProcessVideoUpload(event);

    } catch (err: any) {

        return handleResponse.error(err, "Error processing video upload", 400);

    }
};
