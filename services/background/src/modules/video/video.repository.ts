
import { supabase } from "../../../../../shared/config/supabase";
import { MaterialStatus } from "../../../../../shared/constants/types";


const TPSTREAMS_API_KEY = process.env.TPSTREAMS_API_KEY!;
const TPSTREAMS_ORG_ID = process.env.TPSTREAMS_ORG_ID!;


export const videoRepository = {



    // create video upload progress 

    createVideoUploadProgress: async (uniqueId: string, facultyId: string, assetId: string, type: string) => {

        try {

            await supabase
                .from("video_upload_progress")
                .insert({
                    faculty_id: facultyId,
                    unique_id: uniqueId,
                    type: type,
                    asset_id: assetId,
                    uploading_status: 'transcoding',
                    upload_progress: 0,
                    transcoding_progress: 0,
                });

            return true;

        } catch (error: any) {

            console.log("error", error);
            throw new Error(error);
        }

    },





















    // // uplaod course material video to tpstreams
    // backgroundProcessVideoUpload: async (event: any) => {
    //     try {
    //         for (const record of event.Records) {
    //             const { material_id, video_data, file_name } = JSON.parse(record.body);

    //             try {
    //                 console.log(`Processing video for material: ${material_id}`);

    //                 // 1. Update status → processing
    //                 await supabase
    //                     .from("course_materials")
    //                     .update({ material_status: MaterialStatus.PROCESSING })
    //                     .eq("id", material_id);

    //                 // 2. Upload to TPStreams
    //                 const formData = new FormData();
    //                 const buffer = Buffer.from(video_data, "base64");
    //                 const blob = new Blob([buffer]);
    //                 formData.append("file", blob, file_name);
    //                 formData.append("title", file_name);

    //                 const response = await fetch(
    //                     `https://app.tpstreams.com/api/v1/${TPSTREAMS_ORG_ID}/assets/videos/`,
    //                     {
    //                         method: "POST",
    //                         headers: { Authorization: `Token ${TPSTREAMS_API_KEY}` },
    //                         body: formData,
    //                     }
    //                 );

    //                 const tpData = await response.json();

    //                 // 3. Update material with TPStreams video ID
    //                 await supabase
    //                     .from("course_materials")
    //                     .update({
    //                         material_status: MaterialStatus.PROCESSING,
    //                         video_upload_id: tpData.id,
    //                         video_asset_id: tpData.asset_id,
    //                         duration_sec: tpData.duration,
    //                     })
    //                     .eq("id", material_id);



    //                 console.log(`Video uploaded successfully: ${tpData.id}`);

    //             } catch (err: any) {
    //                 console.error(`Video upload failed for material ${material_id}:`, err.message);

    //                 await supabase
    //                     .from("course_materials")
    //                     .update({ material_status: MaterialStatus.FAILED })
    //                     .eq("id", material_id);
    //             }
    //         }

    //     } catch (error: any) {
    //         console.log("error", error);
    //         throw new Error(error);
    //     }
    // },

    // // upload course intro video to tpstreams
    // uploadCourseIntroVideo: async (event: any) => {
    //     try {
    //         for (const record of event.Records) {
    //             const { course_id, video_data, file_name } = JSON.parse(record.body);

    //             try {
    //                 console.log(`Processing video for course: ${course_id}`);

    //                 // 1. Update status → processing
    //                 // await supabase
    //                 //     .from("courses")
    //                 //     .update({ course_status: CourseStatus.PROCESSING })
    //                 //     .eq("id", course_id);

    //                 // 2. Upload to TPStreams
    //                 const formData = new FormData();
    //                 const buffer = Buffer.from(video_data, "base64");
    //                 const blob = new Blob([buffer]);
    //                 formData.append("file", blob, file_name);
    //                 formData.append("title", file_name);

    //                 const response = await fetch(
    //                     `https://app.tpstreams.com/api/v1/${TPSTREAMS_ORG_ID}/assets/videos/`,
    //                     {
    //                         method: "POST",
    //                         headers: { Authorization: `Token ${TPSTREAMS_API_KEY}` },
    //                         body: formData,
    //                     }
    //                 );

    //                 const tpData = await response.json();

    //                 // 3. Update course with TPStreams video ID
    //                 await supabase
    //                     .from("courses")
    //                     .update({
    //                         // course_status: CourseStatus.READY,
    //                         video_upload_id: tpData.id,
    //                         video_asset_id: tpData.asset_id,
    //                         duration_sec: tpData.duration,
    //                     })
    //                     .eq("id", course_id);

    //                 console.log(`Video uploaded successfully: ${tpData.id}`);

    //             } catch (err: any) {
    //                 console.error(`Video upload failed for course ${course_id}:`, err.message);

    //                 // await supabase
    //                 //     .from("courses")
    //                 //     .update({ course_status: CourseStatus.FAILED })
    //                 //     .eq("id", course_id);
    //             }
    //         }

    //     } catch (error: any) {
    //         console.log("error", error);
    //         throw new Error(error);
    //     }
    // },






}
