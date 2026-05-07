
// import { handleResponse } from "../../../../../shared/utils/response";
// import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
// import { compose } from "../../../../../shared/utils/compose";
// import { videoService } from "../../modules/video/video.service";


// export const handlerFun = async (event: any) => {

//     try {

//         await videoService.uploadCourseIntroVideo(event);

//     } catch (err: any) {

//         return handleResponse.error(err, "Error processing video upload", 400);

//     }
// };



// export const handler = compose(
//     verifyAuth,
//     verifyRole("FACULTY"),
//     verifyAccountStatus
// )(handlerFun);