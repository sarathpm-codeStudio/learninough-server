
import { announcementRepository } from "./announcements.repository";
import { createAnnouncementSchema } from "../../../../../shared/validators/announcement.validator"
import { validate } from "../../../../../shared/utils/validate";
// import { cacheService } from "../../../../../shared/cache/cache.service"




export const announcementService = {

    createAnnouncement: async (event: any) => {
        try {

            const validatedData: any = validate(createAnnouncementSchema, JSON.parse(event.body));

            const announcement = await announcementRepository.createAnnouncement(validatedData, event.user.id, event.supabase);

            // await cacheService.delete(`announcements:faculty:${event.user.id}`);

            return announcement;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getAllAnnouncements: async (event: any) => {
        try {

            const cacheKey = `announcements:faculty:${event.user.id}`;

            // const cached = await cacheService.get(cacheKey);
            // if (cached) return cached;
            const { filter, page, limit, search } = event.queryStringParameters;


            const announcements = await announcementRepository.getAllAnnouncements(event.user.id, filter, page, limit, search, event.supabase);

            // await cacheService.set(cacheKey, announcements, 3600);

            return announcements;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getAnnouncementById: async (event: any) => {
        try {

            const announcementId = event.pathParameters?.announcementId;
            console.log("announcementId", announcementId);

            if (!announcementId) {
                throw new Error("Announcement ID is required")
            }

            const announcement = await announcementRepository.getAnnouncementById(announcementId, event.supabase);

            return announcement;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    deleteAnnouncement: async (event: any) => {
        try {

            const announcementId = event.pathParameters?.announcementId;

            if (!announcementId) {
                throw new Error("Announcement ID is required")
            }

            const result = await announcementRepository.deleteAnnouncement(announcementId, event.user.id, event.supabase);

            // await cacheService.delete(`announcements:faculty:${event.user.id}`);

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    updateAnnouncement: async (event: any) => {
        try {

            const announcementId = event.pathParameters?.announcementId;

            if (!announcementId) {
                throw new Error("Announcement ID is required")
            }

            const validatedData: any = validate(createAnnouncementSchema, JSON.parse(event.body));

            const announcement = await announcementRepository.updateAnnouncement(validatedData, announcementId, event.supabase);

            // await cacheService.delete(`announcements:faculty:${event.user.id}`);

            return announcement;


        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

}
