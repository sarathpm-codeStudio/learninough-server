
import { supabase } from "../../../../../shared/config/supabase";
import { MaterialStatus } from "../../../../../shared/constants/types";


export const videoWebhookRepository = {

    handleVideoWebhook: async (data: any) => {
        try {
            const { asset_id, status, percent_done } = data;

            const videoStatus =
                status === "ready" ? MaterialStatus.READY :
                status === "failed" ? MaterialStatus.FAILED :
                MaterialStatus.PROCESSING;

            const { data: updatedMaterial, error } = await supabase
                .from("course_materials")
                .update({
                    material_status: videoStatus,
                    transcoding_progress: percent_done,
                })
                .eq("video_asset_id", asset_id)
                .select()
                .single();

            if (error) throw new Error(error.message);
            if (!updatedMaterial) throw new Error("Material not found");

            return updatedMaterial;

        } catch (error: any) {
            console.log("error", error);
            throw new Error(error);
        }
    },

}
