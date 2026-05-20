
import { supabase } from "../../../../../shared/config/supabase";
import { AnnouncementData } from "../../../../../shared/constants/types";




export const announcementRepository = {


    createAnnouncement: async (data: AnnouncementData, facultyId: string) => {

        try {

            if (data?.audience !== "all") {
                const { data: course, error } = await supabase.from("courses")
                    .select("*")
                    .eq("id", data.audience)
                    .eq("faculty_id", facultyId)
                    .single();
                if (error) {
                    throw new Error(error.message)
                }
                if (!course) {
                    throw new Error("Course not found")
                }
            }

            const { data: announcement, error } = await supabase.from("announcements")
                .insert({
                    faculty_id: facultyId,
                    title: data.title,
                    content: data.content,
                    course_id: data.audience === "all" ? null : data.audience,
                    image_url: data.image_url ?? null,
                    time_period: data.timePeriod ?? null,
                    is_draft: data.isDraft ?? true,
                    published: !data.isDraft ? new Date() : null,
                })
                .select()
                .single();

            if (error) {
                throw new Error(error.message)
            }

            return announcement;

        } catch (error: any) {

            throw new Error(error.message)
        }



    },

    getAllAnnouncements: async (facultyId: string, filter: string, page: number, limit: number, search: string) => {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        console.log("filter", filter);
        console.log("page", page);
        console.log("limit", limit);
        console.log("search", search);


        let query = supabase
            .from("announcements")
            .select("*, courses(id, title)", { count: "exact" })
            .eq("faculty_id", facultyId)
            .eq("is_deleted", false);

        if (filter !== "all") {
            query = query.eq("is_draft", filter);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }

        const { data, error, count } = await query
            .range(from, to)
            .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        return { data, total: count ?? 0 };
    },
    getAnnouncementById: async (announcementId: string) => {

        try {

            console.log("announcementId", announcementId);
            const { data, error } = await supabase.from("announcements")
                .select("*, courses(id, title)")
                .eq("id", announcementId)
                .single();

            if (error) {
                throw new Error(error.message)
            }

            return data;

        } catch (error: any) {

            throw new Error(error.message)
        }

    },

    deleteAnnouncement: async (announcementId: string, facultyId: string) => {

        try {

            const { error } = await supabase.from("announcements")
                .delete()
                .eq("id", announcementId)
                .eq("faculty_id", facultyId);

            if (error) {
                throw new Error(error.message)
            }

            return { message: "Announcement deleted successfully" };

        } catch (error: any) {

            throw new Error(error.message)
        }

    },

    updateAnnouncement: async (data: AnnouncementData, announcementId: string) => {

        try {

            const { data: announcement, error } = await supabase.from("announcements")
                .update({

                    title: data.title,
                    content: data.content,
                    course_id: data.audience === "all" ? null : data.audience,
                    image_url: data.image_url ?? null,
                    time_period: data.timePeriod ?? null,
                    is_draft: data.isDraft ?? true,
                    published: !data.isDraft ? new Date() : null,

                })
                .eq("id", announcementId)
                .select()
                .single();

            if (error) {
                throw new Error(error.message)
            }

            return announcement;

        } catch (error: any) {

            throw new Error(error.message)
        }



    },



}
