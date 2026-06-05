import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../shared/config/supabase";



export const videoRepository = {



    // create video upload progress 

    // createVideoUploadProgress: async (uniqueId: string, facultyId: string, assetId: string, type: string) => {

    //     try {

    //         console.log(">>>>>>>>>>>>>>>>>>", uniqueId, facultyId, assetId, type)

    //         await supabase
    //             .from("video_upload_progress")
    //             .insert({
    //                 faculty_id: facultyId,
    //                 unique_id: uniqueId,
    //                 type: type,
    //                 asset_id: assetId,
    //                 uploading_status: 'uploading',
    //                 upload_progress: 0,
    //                 transcoding_progress: 0,
    //             });

    //         return true;

    //     } catch (error: any) {

    //         console.log("error", error);
    //         throw new Error(error);
    //     }

    // },

    createVideoUploadProgress: async (uniqueId: string, facultyId: string, assetId: string, type: string, status: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
            console.log(">>>>>>>>>>>>>>>>>>", uniqueId, facultyId, assetId, type, status)

            // upsert = insert if not exists, update if exists ✅
            const { error } = await supabase
                .from("video_upload_progress")
                .upsert({
                    faculty_id: facultyId,
                    unique_id: uniqueId,
                    type: type,
                    asset_id: assetId,
                    uploading_status: status,
                    upload_progress: 0,
                    transcoding_progress: 0,
                }, {
                    onConflict: 'unique_id'  // ← if unique_id exists → update ✅
                })

            if (type === "intro") {
                // check this unique_id use to have course add this video detisl in course table

                const { data: course } = await supabase
                    .from("courses")
                    .select("*")
                    .eq("unique_id", uniqueId)
                    .single();

                if (course) {
                    await supabase
                        .from("courses")
                        .update({
                            video_asset_id: assetId,
                            video_uploading_status: 'uploaded',
                            video_upload_progress: 0,
                            video_transcoding_progress: 0,


                        })
                        .eq("unique_id", uniqueId);
                }

                if (error) throw new Error(error.message)
            } else {

                // check this unique_id use to have course add this video detisl in course meterials table

                const { data: course } = await supabase
                    .from("course_materials")
                    .select("*")
                    .eq("unique_id", uniqueId)
                    .single();

                if (course) {
                    await supabase
                        .from("course_materials")
                        .update({
                            video_asset_id: assetId,
                            video_uploading_status: status,
                            video_upload_progress: 0,
                            video_transcoding_progress: 0,


                        })
                        .eq("unique_id", uniqueId);
                }

                if (error) throw new Error(error.message)
            }

            return true

        } catch (error: any) {
            console.log("error", error)
            throw new Error(error)
        }
    },

}