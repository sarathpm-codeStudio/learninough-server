
import { supabase } from "../../../../../shared/config/supabase";
import { MaterialStatus } from "../../../../../shared/constants/types";


const TPSTREAMS_API_KEY = process.env.TPSTREAMS_API_KEY!;
const TPSTREAMS_ORG_ID = process.env.TPSTREAMS_ORG_ID!;


export const videoRepository = {

    backgroundProcessVideoUpload: async (event: any) => {
        try {
            for (const record of event.Records) {
                const { material_id, video_data, file_name } = JSON.parse(record.body);

                try {
                    console.log(`Processing video for material: ${material_id}`);

                    // 1. Update status → processing
                    await supabase
                        .from("course_materials")
                        .update({ material_status: MaterialStatus.PROCESSING })
                        .eq("id", material_id);

                    // 2. Upload to TPStreams
                    const formData = new FormData();
                    const buffer = Buffer.from(video_data, "base64");
                    const blob = new Blob([buffer]);
                    formData.append("file", blob, file_name);
                    formData.append("title", file_name);

                    const response = await fetch(
                        `https://app.tpstreams.com/api/v1/${TPSTREAMS_ORG_ID}/assets/videos/`,
                        {
                            method: "POST",
                            headers: { Authorization: `Token ${TPSTREAMS_API_KEY}` },
                            body: formData,
                        }
                    );

                    const tpData = await response.json();

                    // 3. Update material with TPStreams video ID
                    await supabase
                        .from("course_materials")
                        .update({
                            material_status: MaterialStatus.READY,
                            video_upload_id: tpData.id,
                            video_asset_id: tpData.asset_id,
                            duration_sec: tpData.duration,
                        })
                        .eq("id", material_id);

                    console.log(`Video uploaded successfully: ${tpData.id}`);

                } catch (err: any) {
                    console.error(`Video upload failed for material ${material_id}:`, err.message);

                    await supabase
                        .from("course_materials")
                        .update({ material_status: MaterialStatus.FAILED })
                        .eq("id", material_id);
                }
            }

        } catch (error: any) {
            console.log("error", error);
            throw new Error(error);
        }
    },

}
