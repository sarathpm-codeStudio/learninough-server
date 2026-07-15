
import { supabase } from "../../../../../shared/config/supabase";
import { MaterialStatus } from "../../../../../shared/constants/types";



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

export const videoRepository = {



    // create video upload progress 

    createVideoUploadProgress: async (event: any) => {

        // batchSize: 1 so Records always has one item
        const results = await Promise.allSettled(
            event.Records.map((record: any) => processRecord(record))
        );

        // Report failed messages back to SQS for retry
        const failures = results
            .map((r, i) => ({ result: r, record: event.Records[i] }))
            .filter(({ result }) => result.status === "rejected")
            .map(({ record }) => ({ itemIdentifier: record.messageId }));

        return { batchItemFailures: failures };

    },

}

// ── Core Processor (your existing handleVideoWebhook logic) ───
async function processRecord(record: any) {
    const data = JSON.parse(record.body);

    try {
        console.log("Processing video webhook:", data);

        let courseId = "";

        const videoStatus =
            data?.video?.status === "Completed" ? MaterialStatus.COMPLETED :
                data?.video?.status === "Error" ? MaterialStatus.FAILED :
                    MaterialStatus.TRANSCODING;

        const materialStatus =
            videoStatus === MaterialStatus.COMPLETED ? MaterialStatus.READY :
                videoStatus === MaterialStatus.TRANSCODING ? MaterialStatus.PROCESSING :
                    videoStatus === MaterialStatus.FAILED ? MaterialStatus.FAILED :
                        MaterialStatus.PENDING;

        // ── 1. Update video_upload_progress ──────────────────────
        const { data: updatedUploadProgress, error: uploadProgressError } =
            await supabase
                .from("video_upload_progress")
                .update({
                    uploading_status: videoStatus,
                    upload_progress: data?.video?.progress,
                })
                .eq("asset_id", data?.id)
                .select()
                .single();

        if (uploadProgressError) throw uploadProgressError;

        // ── 2. Update course or material ─────────────────────────
        if (updatedUploadProgress?.type === "intro") {

            const { data: updatedCourse, error: courseError } = await supabase
                .from("courses")
                .update({
                    video_uploading_status: videoStatus,
                    video_upload_progress: data?.video?.progress,
                })
                .eq("video_asset_id", updatedUploadProgress?.asset_id)
                .select()
                .single();

            if (courseError) throw courseError;
            courseId = updatedCourse?.id;

        } else {

            const { data: updatedMaterial, error: materialError } = await supabase
                .from("course_materials")
                .update({
                    material_status: materialStatus,
                    video_uploading_status: videoStatus,
                    video_upload_progress: data?.video?.progress,
                    duration_sec: data?.video?.duration,
                    file_size: data?.bytes,
                })
                .eq("video_asset_id", updatedUploadProgress?.asset_id)
                .select()
                .single();

            if (materialError) throw materialError;
            courseId = updatedMaterial?.course_id;
        }

        // ── 3. Stop here if still transcoding ────────────────────
        if (videoStatus === MaterialStatus.TRANSCODING) {
            console.log("Still transcoding, waiting...");
            return true;
        }

        // ── 4. Get course details ─────────────────────────────────
        const { data: course } = await supabase
            .from("courses")
            .select("id, title, faculty_id, pending_publish, is_draft, video_uploading_status")
            .eq("id", courseId)
            .single();

        // ── 5. Handle failed video ────────────────────────────────
        if (videoStatus === MaterialStatus.FAILED) {
            await createNotification({
                user_id: course?.faculty_id,
                type: "COURSE_UPDATE",
                title: "Video processing failed",
                body: `A video in "${course?.title}" failed to process.`,
                data: { course_id: courseId },
            });
        }

        if (!course?.pending_publish) return true;

        // ── 6. Get all material videos ────────────────────────────
        const { data: allVideos } = await supabase
            .from("course_materials")
            .select("id, title, video_uploading_status")
            .eq("course_id", courseId)
            .eq("is_deleted", false)
            .eq("type", "VIDEO");

        // ── 7. Check intro video status ───────────────────────────
        const introFailed =
            course.video_uploading_status === MaterialStatus.FAILED;

        const introProcessing =
            course.video_uploading_status !== MaterialStatus.COMPLETED &&
            course.video_uploading_status !== MaterialStatus.FAILED &&
            course.video_uploading_status !== null;

        // ── 8. Combine failed + processing ────────────────────────
        const failedVideos = [
            ...(allVideos?.filter(
                v => v.video_uploading_status === MaterialStatus.FAILED
            ) ?? []),
            ...(introFailed ? [{ id: courseId, title: "Intro Video" }] : []),
        ];

        const processingVideos = [
            ...(allVideos?.filter(
                v => v.video_uploading_status !== MaterialStatus.COMPLETED &&
                    v.video_uploading_status !== MaterialStatus.FAILED
            ) ?? []),
            ...(introProcessing ? [{ id: courseId, title: "Intro Video" }] : []),
        ];

        // ── 9. FAILED → abort auto publish ───────────────────────
        if (failedVideos.length > 0) {
            await supabase
                .from("courses")
                .update({ pending_publish: false })
                .eq("id", courseId);

            await createNotification({
                user_id: course?.faculty_id,
                type: "COURSE_UPDATE",
                title: "Auto publish failed",
                body: `"${course?.title}" could not be published — ${failedVideos.length} video(s) failed.`,
                data: {
                    course_id: courseId,
                    failed_videos: failedVideos.map(v => ({ id: v.id, title: v.title })),
                },
            });

            console.log(`Auto publish aborted — ${failedVideos.length} failed videos`);
            return true;
        }

        // ── 10. STILL PROCESSING → keep waiting ──────────────────
        if (processingVideos.length > 0) {
            console.log(`Still waiting — ${processingVideos.length} videos processing`);
            return true;
        }

        // ── 11. ALL COMPLETED → auto publish ─────────────────────
        await supabase
            .from("courses")
            .update({
                is_draft: false,
                pending_publish: false,
            })
            .eq("id", courseId);

        await createNotification({
            user_id: course?.faculty_id,
            type: "COURSE_UPDATE",
            title: "Course published",
            body: `"${course?.title}" is now live — all videos finished processing.`,
            data: { course_id: courseId },
        });

        await createNotification({
            type: "COURSE_UPDATE",
            title: "New course published",
            body: `"${course?.title}" has been auto published.`,
            data: { course_id: courseId, faculty_id: course?.faculty_id },
            is_admin: true,
        });

        console.log(`Course ${courseId} auto published! ✅`);
        return true;

    } catch (error: any) {
        console.error("processRecord error:", error);
        throw error; // rethrow so SQS marks as failed and retries
    }
}

