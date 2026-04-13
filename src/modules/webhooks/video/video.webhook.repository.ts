

import { MaterialStatus } from "../../../shared/constants/types";
import { prisma } from "../../../shared/DB/prisma";






export const videoWebhookRepository = {


    handleVideoWebhook: async (data: any) => {

        try {

            const { asset_id, status, percent_done } = data;

            const videoStatus = status === "ready" ? MaterialStatus.READY : status === "failed" ? MaterialStatus.FAILED : MaterialStatus.PROCESSING;


            // Update material in DB

            const updatedMaterial = await prisma.course_materials.update({
                where: {
                    video_asset_id: asset_id
                },
                data: {
                    material_status: videoStatus,
                    transcoding_progress: percent_done
                }
            })


            if (!updatedMaterial) {

                throw new Error("Material not found");
            }

            return updatedMaterial;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }


    }



}

