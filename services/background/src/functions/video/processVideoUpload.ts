import { videoService } from "../../modules/video/video.service";


// SQS consumer — must return { batchItemFailures } at the TOP LEVEL so the
// ReportBatchItemFailures contract works. Do NOT wrap in an HTTP response.
export const handler = async (event: any) => {
    return await videoService.createVideoUploadProgress(event);
};


