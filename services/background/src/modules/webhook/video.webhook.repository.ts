
import { supabase } from "../../../../../shared/config/supabase";
import { MaterialStatus } from "../../../../../shared/constants/types";


export const videoWebhookRepository = {

    handleVideoWebhook: async (data: any) => {
        try {

            console.log("updatedUploadProgress", data);
            let courseId = ""


            const videoStatus =
                data?.video?.status === "Completed" ? MaterialStatus.COMPLETED :
                    data?.video?.status === "Error" ? MaterialStatus.FAILED :
                        MaterialStatus.TRANSCODING;

            const { data: updatedUploadProgress, error: uploadProgressError } = await supabase
                .from("video_upload_progress")
                .update({
                    uploading_status: videoStatus,
                    upload_progress: data?.video?.progress, // this not valid
                })
                .eq("asset_id", data?.id)
                .select()
                .single();


            if (updatedUploadProgress?.type === "intro") {

                // update course intro video status
                const { data: updatedCourse, error: courseError } = await supabase
                    .from("courses")
                    .update({
                        video_uploading_status: videoStatus,
                        video_upload_progress: data?.video?.progress, // this not valid
                    })
                    .eq("video_asset_id", updatedUploadProgress?.asset_id)
                    .select()
                    .single();

                courseId = updatedCourse?.id;

            } else {

                // update material video status
                const { data: updatedCourse, error: courseError } = await supabase
                    .from("course_materials")
                    .update({
                        video_uploading_status: videoStatus,
                        video_upload_progress: data?.video?.progress, // this not valid
                        duration_sec: data?.video?.duration,
                    })
                    .eq("video_asset_id", updatedUploadProgress?.asset_id)
                    .select()
                    .single();

                courseId = updatedCourse?.course_id;

            }


            if (videoStatus === MaterialStatus.TRANSCODING) return true

            const { data: course } = await supabase
                .from("courses")
                .select("id, title, faculty_id, pending_publish, is_draft, video_uploading_status")
                .eq("id", courseId)
                .single()

            if (videoStatus === MaterialStatus.FAILED) {

                // create notification to faculty
            }

            if (!course?.pending_publish) return true


            //  Get all material videos
            const { data: allVideos } = await supabase
                .from("course_materials")
                .select("id, title, video_uploading_status")
                .eq("course_id", courseId)
                .eq("is_deleted", false)
                .eq("type", "VIDEO")

            // 7. Check intro video status from course table ✅
            const introFailed = course.video_uploading_status === MaterialStatus.FAILED
            const introProcessing = course.video_uploading_status !== MaterialStatus.COMPLETED
                && course.video_uploading_status !== MaterialStatus.FAILED
                && course.video_uploading_status !== null
            // null = no intro video uploaded → skip check

            // 8. Combine intro + material videos
            const failedVideos = [
                // Failed material videos
                ...(allVideos?.filter(
                    v => v.video_uploading_status === MaterialStatus.FAILED
                ) ?? []),
                // Failed intro video ✅
                ...(introFailed ? [{
                    id: courseId,
                    title: 'Intro Video',
                }] : []),
            ]

            const processingVideos = [
                // Processing material videos
                ...(allVideos?.filter(
                    v => v.video_uploading_status !== MaterialStatus.COMPLETED &&
                        v.video_uploading_status !== MaterialStatus.FAILED
                ) ?? []),
                // Processing intro video ✅
                ...(introProcessing ? [{
                    id: courseId,
                    title: 'Intro Video',
                }] : []),
            ]

            // ─── FAILED → abort auto publish ────────────────────
            if (failedVideos.length > 0) {

                // Reset pending_publish ❌
                await supabase
                    .from("courses")
                    .update({ pending_publish: false })
                    .eq("id", courseId)

                // Notify faculty
                console.log(`Auto publish aborted — ${failedVideos.length} failed videos`)
                return true
            }

            // ─── STILL PROCESSING → keep waiting ────────────────
            if (processingVideos.length > 0) {
                console.log(`Still waiting — ${processingVideos.length} videos processing`)
                return true
            }


            // ─── ALL COMPLETED → auto publish ✅ ────────────────
            await supabase
                .from("courses")
                .update({
                    is_draft: false,
                    pending_publish: false,
                })
                .eq("id", courseId)

            // Notify faculty

            console.log(`Course ${courseId} auto published! ✅`)
            return true


        } catch (error: any) {
            console.log("error", error);
            throw new Error(error);
        }
    },

}
