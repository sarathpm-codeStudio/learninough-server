
import { announcementRepository } from "./announcements.repository";
import { createAnnouncementSchema } from "../../../../../shared/validators/announcement.validator"
import { validate } from "../../../../../shared/utils/validate";
import { cacheService } from "../../../../../shared/cache/cache.service"




export const announcementService = {

    createAnnouncement: async (event: any) => {
        try {

            const validatedData: any = validate(createAnnouncementSchema, JSON.parse(event.body));

            const announcement = await announcementRepository.createAnnouncement(validatedData, event.user.id);

            await cacheService.delete(`announcements:faculty:${event.user.id}`);

            return announcement;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getAllAnnouncements: async (event: any) => {
        try {

            const cacheKey = `announcements:faculty:${event.user.id}`;

            const cached = await cacheService.get(cacheKey);
            if (cached) return cached;

            const announcements = await announcementRepository.getAllAnnouncements(event.user.id);

            await cacheService.set(cacheKey, announcements, 3600);

            return announcements;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    deleteAnnouncement: async (event: any) => {
        try {

            const announcementId = event.pathParameters?.id;

            if (!announcementId) {
                throw new Error("Announcement ID is required")
            }

            const result = await announcementRepository.deleteAnnouncement(announcementId, event.user.id);

            await cacheService.delete(`announcements:faculty:${event.user.id}`);

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    updateAnnouncement: async (event: any) => {
        try {

            const announcementId = event.pathParameters?.id;

            if (!announcementId) {
                throw new Error("Announcement ID is required")
            }

            const validatedData: any = validate(createAnnouncementSchema, JSON.parse(event.body));

            const announcement = await announcementRepository.updateAnnouncement(validatedData, announcementId);

            await cacheService.delete(`announcements:faculty:${event.user.id}`);

            return announcement;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

}
