
import { supabase } from "../../../../../shared/config/supabase";
import { MaterialStatus } from "../../../../../shared/constants/types";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: "ap-south-1" });


// ─── notification helper ────────────────────────────────────
const createNotification = async (notification: {
    user_id?: string | null;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any> | null;
    is_admin?: boolean;
}) => {
    const { error } = await supabase.from("notifications").insert({
        user_id: notification.user_id ?? null,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? null,
        is_admin: notification.is_admin ?? false,
        sent_at: new Date().toISOString(),
    });

    if (error) console.log("createNotification error", error);
};


export const videoWebhookRepository = {

    // handleVideoWebhook: async (data: any) => {
    //     try {

    //         console.log("updatedUploadProgress", data);
    //         let courseId = ""


    //         const videoStatus =
    //             data?.video?.status === "Completed" ? MaterialStatus.COMPLETED :
    //                 data?.video?.status === "Error" ? MaterialStatus.FAILED :
    //                     MaterialStatus.TRANSCODING;

    //         const materialStatus = videoStatus === MaterialStatus.COMPLETED ? MaterialStatus.READY : videoStatus === MaterialStatus.TRANSCODING ? MaterialStatus.PROCESSING : videoStatus === MaterialStatus.FAILED ? MaterialStatus.FAILED : MaterialStatus.PENDING;

    //         const { data: updatedUploadProgress, error: uploadProgressError } = await supabase
    //             .from("video_upload_progress")
    //             .update({
    //                 uploading_status: videoStatus,
    //                 upload_progress: data?.video?.progress, // this not valid
    //             })
    //             .eq("asset_id", data?.id)
    //             .select()
    //             .single();


    //         if (updatedUploadProgress?.type === "intro") {

    //             // update course intro video status
    //             const { data: updatedCourse, error: courseError } = await supabase
    //                 .from("courses")
    //                 .update({
    //                     video_uploading_status: videoStatus,
    //                     video_upload_progress: data?.video?.progress, // this not valid
    //                 })
    //                 .eq("video_asset_id", updatedUploadProgress?.asset_id)
    //                 .select()
    //                 .single();

    //             courseId = updatedCourse?.id;

    //         } else {

    //             // update material video status
    //             const { data: updatedCourse, error: courseError } = await supabase
    //                 .from("course_materials")
    //                 .update({
    //                     material_status: materialStatus,
    //                     video_uploading_status: videoStatus,
    //                     video_upload_progress: data?.video?.progress, // this not valid
    //                     duration_sec: data?.video?.duration,
    //                 })
    //                 .eq("video_asset_id", updatedUploadProgress?.asset_id)
    //                 .select()
    //                 .single();

    //             courseId = updatedCourse?.course_id;

    //         }


    //         if (videoStatus === MaterialStatus.TRANSCODING) return true

    //         const { data: course } = await supabase
    //             .from("courses")
    //             .select("id, title, faculty_id, pending_publish, is_draft, video_uploading_status")
    //             .eq("id", courseId)
    //             .single()

    //         if (videoStatus === MaterialStatus.FAILED) {

    //             // create notification to faculty
    //         }

    //         if (!course?.pending_publish) return true


    //         //  Get all material videos
    //         const { data: allVideos } = await supabase
    //             .from("course_materials")
    //             .select("id, title, video_uploading_status")
    //             .eq("course_id", courseId)
    //             .eq("is_deleted", false)
    //             .eq("type", "VIDEO")

    //         // 7. Check intro video status from course table ✅
    //         const introFailed = course.video_uploading_status === MaterialStatus.FAILED
    //         const introProcessing = course.video_uploading_status !== MaterialStatus.COMPLETED
    //             && course.video_uploading_status !== MaterialStatus.FAILED
    //             && course.video_uploading_status !== null
    //         // null = no intro video uploaded → skip check

    //         // 8. Combine intro + material videos
    //         const failedVideos = [
    //             // Failed material videos
    //             ...(allVideos?.filter(
    //                 v => v.video_uploading_status === MaterialStatus.FAILED
    //             ) ?? []),
    //             // Failed intro video ✅
    //             ...(introFailed ? [{
    //                 id: courseId,
    //                 title: 'Intro Video',
    //             }] : []),
    //         ]

    //         const processingVideos = [
    //             // Processing material videos
    //             ...(allVideos?.filter(
    //                 v => v.video_uploading_status !== MaterialStatus.COMPLETED &&
    //                     v.video_uploading_status !== MaterialStatus.FAILED
    //             ) ?? []),
    //             // Processing intro video ✅
    //             ...(introProcessing ? [{
    //                 id: courseId,
    //                 title: 'Intro Video',
    //             }] : []),
    //         ]

    //         // ─── FAILED → abort auto publish ────────────────────
    //         if (failedVideos.length > 0) {

    //             // Reset pending_publish ❌
    //             await supabase
    //                 .from("courses")
    //                 .update({ pending_publish: false })
    //                 .eq("id", courseId)

    //             // Notify faculty ✅
    //             await createNotification({
    //                 user_id: course?.faculty_id,
    //                 type: "COURSE_UPDATE",
    //                 title: "Auto publish failed",
    //                 body: `"${course?.title}" could not be published — ${failedVideos.length} video(s) failed to process.`,
    //                 data: {
    //                     course_id: courseId,
    //                     failed_videos: failedVideos.map(v => ({ id: v.id, title: v.title })),
    //                 },
    //             })

    //             console.log(`Auto publish aborted — ${failedVideos.length} failed videos`)
    //             return true
    //         }

    //         // ─── STILL PROCESSING → keep waiting ────────────────
    //         if (processingVideos.length > 0) {
    //             console.log(`Still waiting — ${processingVideos.length} videos processing`)
    //             return true
    //         }


    //         // ─── ALL COMPLETED → auto publish ✅ ────────────────
    //         await supabase
    //             .from("courses")
    //             .update({
    //                 is_draft: false,
    //                 pending_publish: false,
    //             })
    //             .eq("id", courseId)

    //         // Notify faculty ✅
    //         await createNotification({
    //             user_id: course?.faculty_id,
    //             type: "COURSE_UPDATE",
    //             title: "Course published",
    //             body: `"${course?.title}" is now live — all videos finished processing.`,
    //             data: { course_id: courseId },
    //         })

    //         // Notify admin ✅
    //         await createNotification({
    //             type: "COURSE_UPDATE",
    //             title: "New course published",
    //             body: `"${course?.title}" has been auto published.`,
    //             data: { course_id: courseId, faculty_id: course?.faculty_id },
    //             is_admin: true,
    //         })

    //         console.log(`Course ${courseId} auto published! ✅`)
    //         return true


    //     } catch (error: any) {
    //         console.log("error", error);
    //         throw new Error(error);
    //     }
    // },



    handleVideoWebhook: async (data: any) => {
        try {

            // Just push raw webhook data to SQS — nothing else
            await sqs.send(new SendMessageCommand({
                QueueUrl: process.env.VIDEO_UPLOAD_QUEUE_URL,
                MessageBody: JSON.stringify(data),   // raw tpstreams payload
            }));

            // Return 200 immediately to TPStreams
            // TPStreams won't retry if it gets 200 fast ✅
            return {
                statusCode: 200,
                body: JSON.stringify({ received: true }),
            };

        } catch (error: any) {

            console.error("Webhook receiver error:", error);
            // Still return 200 to avoid TPStreams retrying
            // SQS handles retry internally
            return {
                statusCode: 200,
                body: JSON.stringify({ received: true }),
            };


        }
    }




}
