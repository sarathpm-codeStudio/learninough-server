

import { supabase } from "../../../shared/supabase/supabase";
import { prisma } from "../../../shared/DB/prisma";
import { AnnouncementData } from "../../../shared/constants/types";




export const announcementRepository = {


    createAnnouncement: async (data: AnnouncementData, facultyId: string) => {

        try {

            //  if select a course check this course is owned by the faculty
            if (data.course_id) {
                const { data: course, error } = await supabase.from("courses")
                    .select("*")
                    .eq("id", data.course_id)
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
                    course_id: data.course_id ?? null,  // null = all students
                    image_url: data.image_url ?? null,
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

    getAllAnnouncements: async (facultyId: string) => {

        try {

            const { data: announcements, error } = await supabase.from("announcements")
                .select("*")
                .eq("faculty_id", facultyId)
                .order("created_at", { ascending: false });

            if (error) {
                throw new Error(error.message)
            }

            return announcements;

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
                    course_id: data.course_id ?? null,  // null = all students
                    image_url: data.image_url ?? null,
                    time_period: data?.time_period ?? null,
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