import { handleResponse } from "../../../../../shared/utils/response";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { videoService } from "../../modules/video/video.service";


export const handlerFun = async (event: any) => {

    try {

        const result = await videoService.createVideoUploadProgress(event);

        return handleResponse.success(result, "Video upload progress created successfully", 200);

    } catch (err: any) {

        return handleResponse.error(err, "Error processing video upload", 400);

    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);