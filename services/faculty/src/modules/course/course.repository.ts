
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../shared/config/supabase";
import { MaterialData, MaterialType, MaterialStatus } from "../../../../../shared/constants/types";
import { pushToQueue } from "../../../../../shared/utils/queue";
import {
    buildChartPeriodSlots,
    endOfLocalDay,
    getChartPeriodBounds,
    groupTimestampForChartPeriod,
    type ChartPeriod,
} from "../../utils/chartPeriod";


export const facultyCourseRepository = {

    createCourseWithBasicDetails: async (data: any, facultyId: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;

            console.log("data>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>####", data);

            // check this course have intro video
            const { data: videoUploadProgress, error: videoUploadProgressError } = await supabase
                .from("video_upload_progress")
                .select("*")
                .eq("unique_id", data.unique_id)
                .eq("type", "intro")
                .single();




            const { data: course, error } = await supabase
                .from("courses")
                .insert({
                    title: data.title,
                    unique_id: data.unique_id,
                    description: data.description,
                    category: data.category,
                    level: data.level,
                    languages: data.languages,
                    faculty_id: facultyId,
                    cover_image: data.cover_image,
                    video_asset_id: videoUploadProgress?.asset_id,
                    video_uploading_status: videoUploadProgress?.uploading_status,
                    video_upload_progress: videoUploadProgress?.upload_progress,
                    video_transcoding_progress: videoUploadProgress?.transcoding_progress,


                })
                .select()
                .single();

            if (error) throw new Error(error.message);
            return course;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    uploadCourseIntroVideo: async (data: any, courseId: string, facultyId: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
            // Check course ownership
            // const { data: course, error: courseError } = await supabase
            //     .from("courses")
            //     .select("id")
            //     .eq("id", courseId)
            //     .eq("faculty_id", facultyId)
            //     .single();

            // if (courseError) throw new Error(courseError.message);
            // if (!course) throw new Error("Course not found");

            // Call TPStreams API to get signed upload URL
            // const tpResponse = await fetch(
            //     `https://app.tpstreams.com/api/v1/${process.env.TPSTREAMS_ORG_ID}/assets/videos/`,
            //     {
            //         method: 'POST',
            //         headers: {
            //             Authorization: `Token ${process.env.TPSTREAMS_API_KEY}`,
            //             'Content-Type': 'application/json',
            //         },
            //         body: JSON.stringify({
            //             title: data.title,


            //         }),
            //     }
            // );

            // const tpData = await tpResponse.json();
            // console.log('TPStreams response:', tpData);

            // if (!tpData.upload_url) {
            //     throw new Error('Failed to get TPStreams upload URL');
            // }

            // await supabase
            //     .from("courses")
            //     .update({
            //         video_asset_id: tpData.asset_id,
            //         video_upload_id: tpData.id,
            //     })
            //     .eq("id", courseId);

            await supabase
                .from("video_upload_progress")
                .insert({
                    faculty_id: facultyId,
                    // asset_id: tpData.asset_id,
                    uploading_status: 'uploading',
                    upload_progress: 0,
                    transcoding_progress: 0,
                });

            return true;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    // getMyCourses: async (facultyId: string, filter: string, search: string, client?: SupabaseClient) => {
    //     try {
    //         const supabase = client ?? anonSupabase;

    //         let query = supabase
    //             .from("courses")
    //             .select(`*`)
    //             .eq("faculty_id", facultyId);

    //         if (filter !== "all") {
    //             const isDraft = filter === "true";
    //             query = query.eq("is_draft", isDraft);
    //         }

    //         if (search?.trim()) {
    //             query = query.ilike("title", `%${search.trim()}%`);
    //         }

    //         const { data: courses, error } = await query.order("created_at", { ascending: false });

    //         if (error) throw new Error(error.message);
    //         return courses;

    //     } catch (error: any) {
    //         throw new Error(error.message);
    //     }
    // },

    getMyCourses: async (facultyId: string, filter: string, search: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;

            let query = supabase
                .from("courses")
                .select(`
                    id,
                    title,
                    category,
                    price,
                    final_price,
                    validity,
                    languages,
                    cover_image,
                  enrollments(count)
                `)
                .eq("faculty_id", facultyId)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false });

            if (filter !== "all") {
                const isDraft = filter === "true";
                query = query.eq("is_draft", isDraft);
            }

            if (search?.trim()) {
                query = query.ilike("title", `%${search.trim()}%`);
            }

            const { data: courses, error } = await query.order("created_at", { ascending: false });

            if (error) throw new Error(error.message);

            // ✅ Flatten enrollment count into each course
            return courses?.map(course => ({
                ...course,
                total_enrolled: course.enrollments[0]?.count ?? 0
            }));

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    addCoursePricing: async (data: any, courseId: string, facultyId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;

            // ← add this to debug
            console.log("pricing data", data)

            const { data: course, error } = await supabase
                .from("courses")
                .update({
                    validity: data.validity,
                    price: data.price,
                    discount: data.discount,
                    discount_type: data.discount_type === "" ? null : data.discount_type,
                    final_price: data.final_price,
                    enableCoupons: data.enableCoupons,
                })
                .eq("id", courseId)
                .select()


            if (error) throw new Error(error.message);
            if (!course) throw new Error(`Course not found for id: ${courseId}`);

            return course;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },


    getPreviewCourse: async (courseId: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
            // ─── Parallel fetch ───────────────────────────────────
            const [
                { data: course, error: courseError },
                { data: materials, error: matError },
                { count: testCount, error: testError },
            ] = await Promise.all([

                supabase
                    .from("courses")
                    .select("*")
                    .eq("id", courseId)
                    .single(),

                supabase
                    .from("course_materials")
                    .select("type, duration_sec, material_status")
                    .eq("course_id", courseId)
                    .eq("is_deleted", false)
                    .or("type.neq.VIDEO,material_status.neq.FAILED"), // ✅ exclude FAILED videos

                supabase
                    .from("tests")
                    .select("*", { count: "exact", head: true })
                    .eq("course_id", courseId)
                    .eq("is_deleted", false),
            ])

            // ─── Error checks ─────────────────────────────────────
            if (courseError) throw new Error(courseError.message)
            if (!course) throw new Error("Course not found")
            if (matError) throw new Error(matError.message)
            if (testError) throw new Error(testError.message)

            // ─── Compute stats ─────────────────────────────────────
            let videoCount = 0
            let pdfCount = 0
            let imageCount = 0
            let totalDuration = 0

            materials?.forEach((item: any) => {
                switch (item.type) {
                    case "VIDEO":
                        videoCount++
                        totalDuration += item.duration_sec || 0
                        break
                    case "PDF":
                        pdfCount++
                        break
                    case "IMAGE":
                        imageCount++
                        break
                }
            })

            // ─── Format duration ───────────────────────────────────
            const hours = Math.floor(totalDuration / 3600)
            const minutes = Math.floor((totalDuration % 3600) / 60)
            const seconds = totalDuration % 60

            const formatted = hours > 0
                ? `${hours}h ${minutes}m`
                : minutes > 0
                    ? `${minutes}m ${seconds}s`
                    : `${seconds}s`

            return {
                ...course,
                content_inventory: {
                    video_lessons: videoCount,
                    pdf_resources: pdfCount,
                    images: imageCount,
                    tests: testCount ?? 0,
                    total_contents: videoCount + pdfCount +
                        imageCount + (testCount ?? 0),
                },
                video_duration: {
                    total_seconds: totalDuration,
                    formatted,
                },
            }

        } catch (error: any) {
            throw new Error(error.message)
        }
    },


    // getCourseById: async (courseId: string, client?: SupabaseClient) => {
    //     try {
    //         const supabase = client ?? anonSupabase;
    //         const { data: course, error } = await supabase
    //             .from("courses")
    //             .select("*")
    //             .eq("id", courseId)
    //             .single();

    //         if (error) throw new Error(error.message);
    //         if (!course) throw new Error("Course not found");
    //         return course;

    //     } catch (error: any) {
    //         throw new Error(error.message);
    //     }
    // },


    getCourseById: async (courseId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;

            const [
                { data: course, error },
                { data: enrollments },
            ] = await Promise.all([
                supabase
                    .from("courses")
                    .select(`
                        *,
                        enrollments(count),
                        course_folders(count),
                        course_materials(count)
                    `)
                    .eq("id", courseId)
                    .single(),

                // ✅ Separate query only for revenue calculation
                supabase
                    .from("enrollments")
                    .select("amount_paid")
                    .eq("course_id", courseId),
            ]);

            if (error) throw new Error(error.message);
            if (!course) throw new Error("Course not found");

            // ✅ Calculate total revenue from separate query
            const totalRevenue = enrollments?.reduce(
                (sum, e: any) => sum + (e.amount_paid ?? 0), 0
            ) ?? 0;

            return {
                ...course,
                total_enrolled: course.enrollments[0]?.count ?? 0,
                total_revenue: totalRevenue,
                total_folders: course.course_folders[0]?.count ?? 0,
                total_materials: course.course_materials[0]?.count ?? 0,

                // cleanup raw nested data
                enrollments: undefined,
                course_folders: undefined,
                course_materials: undefined,
            };

        } catch (error: any) {
            throw new Error(error.message);
        }
    },


    updateCourseDetails: async (data: any, courseId: string, facultyId: string, client?: SupabaseClient) => {
        try {

            console.log("course id", courseId);
            console.log("faculty id", facultyId);
            console.log("data", data);

            const supabase = client ?? anonSupabase;
            // check this course have intro video
            const { data: videoUploadProgress, error: videoUploadProgressError } = await supabase
                .from("video_upload_progress")
                .select("*")
                .eq("unique_id", data.unique_id)
                .eq("type", "intro")
                .maybeSingle();

            console.log("videoUploadProgress", videoUploadProgress);

            const { data: course, error } = await supabase
                .from("courses")
                .update({
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    level: data.level,
                    languages: data.languages,
                    cover_image: data.cover_image,
                    video_asset_id: videoUploadProgress?.asset_id,
                    video_uploading_status: videoUploadProgress?.uploading_status,
                    video_upload_progress: videoUploadProgress?.upload_progress,
                    video_transcoding_progress: videoUploadProgress?.transcoding_progress,
                })
                .eq("id", courseId)
                .eq("faculty_id", facultyId)
                .select()
                .single();

            if (error) throw new Error(error.message);
            if (!course) throw new Error("Course not found");
            return course;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },


    // publishCourse: async (courseId: string, facultyId: string) => {
    //     try {

    //         // 1. Check course ownership
    //         const { data: course, error: courseError } = await supabase
    //             .from("courses")
    //             .select("id, faculty_id")
    //             .eq("id", courseId)
    //             .eq("faculty_id", facultyId)
    //             .single()

    //         if (courseError) throw new Error(courseError.message)
    //         if (!course) throw new Error("Course not found")

    //         // 2. Get all videos
    //         const { data: materials, error: matError } = await supabase
    //             .from("course_materials")
    //             .select("id, title, video_uploading_status")
    //             .eq("course_id", courseId)
    //             .eq("is_deleted", false)
    //             .eq("type", "VIDEO")

    //         if (matError) throw new Error(matError.message)

    //         // 3. Check FAILED first — highest priority ❌
    //         const failedVideos = materials?.filter(
    //             (m: any) => m.video_uploading_status === "FAILED"
    //         ) ?? []

    //         // ❌ ANY failed → abort everything
    //         // No pending_publish, no auto publish
    //         // User must fix failed videos first
    //         if (failedVideos.length > 0) {

    //             return {
    //                 course: null,
    //                 status: 'failed',
    //                 message: "Failed to publish course. Please check the course materials. Some videos failed to process.",

    //             }
    //         }

    //         // 4. Check processing — only if NO failures
    //         const processingVideos = materials?.filter(
    //             (m: any) => m.video_uploading_status !== "COMPLETED"
    //         ) ?? []

    //         // ⏳ Still processing → set pending_publish
    //         if (processingVideos.length > 0) {
    //             const { data: updated, error: updateError } = await supabase
    //                 .from("courses")
    //                 .update({ pending_publish: true })
    //                 .eq("id", courseId)
    //                 .select()
    //                 .single()

    //             if (updateError) throw new Error(updateError.message)

    //             return {
    //                 course: updated,
    //                 status: 'pending',
    //                 message: `Course will publish automatically when all videos are ready.`,
    //             }
    //         }

    //         // 5. All COMPLETED → publish now ✅
    //         const { data: updated, error: updateError } = await supabase
    //             .from("courses")
    //             .update({
    //                 is_draft: false,
    //                 pending_publish: false,
    //             })
    //             .eq("id", courseId)
    //             .select()
    //             .single()

    //         if (updateError) throw new Error(updateError.message)

    //         return {
    //             course: updated,
    //             status: 'published',
    //             message: 'Course published successfully! 🎉',
    //         }

    //     } catch (error: any) {
    //         throw new Error(error.message)
    //     }
    // },


    publishCourse: async (courseId: string, facultyId: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
            // 1. Check course ownership
            const { data: course, error: courseError } = await supabase
                .from("courses")
                .select("id, faculty_id, title, video_uploading_status")
                .eq("id", courseId)
                .eq("faculty_id", facultyId)
                .single()

            if (courseError) throw new Error(courseError.message)
            if (!course) throw new Error("Course not found")

            // 2. Get all material videos
            const { data: materials, error: matError } = await supabase
                .from("course_materials")
                .select("id, title, video_uploading_status")
                .eq("course_id", courseId)
                .eq("is_deleted", false)
                .eq("type", "VIDEO")

            if (matError) throw new Error(matError.message)

            // 3. Check intro video status from courses table ✅
            const introFailed = course.video_uploading_status === MaterialStatus.FAILED
            const introProcessing = course.video_uploading_status !== MaterialStatus.COMPLETED
                && course.video_uploading_status !== MaterialStatus.FAILED
                && course.video_uploading_status !== null
            // null = no intro video uploaded → skip check ✅

            // 4. Combine intro + material failed videos
            const failedVideos = [
                // Failed material videos
                ...(materials?.filter(
                    (m: any) => m.video_uploading_status === MaterialStatus.FAILED
                ) ?? []),
                // Failed intro video ✅
                ...(introFailed ? [{
                    id: courseId,
                    title: 'Intro Video',
                }] : []),
            ]

            // 5. Combine intro + material processing videos
            const processingVideos = [
                // Processing material videos
                ...(materials?.filter(
                    (m: any) =>
                        m.video_uploading_status !== MaterialStatus.COMPLETED &&
                        m.video_uploading_status !== MaterialStatus.FAILED
                ) ?? []),
                // Processing intro video ✅
                ...(introProcessing ? [{
                    id: courseId,
                    title: 'Intro Video',
                }] : []),
            ]

            // 6. Has FAILED videos → abort ❌
            if (failedVideos.length > 0) {
                return {
                    course: null,
                    status: 'failed',
                    message: "Course cannot be published because some videos failed to process. Please re-upload them and try again.",

                }
            }


            console.log("processingVideos", processingVideos)

            // 7. Still processing → pending_publish ⏳
            if (processingVideos.length > 0) {
                const { data: updated, error: updateError } = await supabase
                    .from("courses")
                    .update({ pending_publish: true })
                    .eq("id", courseId)
                    .select()
                    .single()

                if (updateError) throw new Error(updateError.message)

                return {
                    // course: updated,
                    status: 'pending',
                    message: "Course will publish automatically when all videos are ready.",
                }
            }

            // 8. All COMPLETED → publish now ✅
            const { data: updated, error: updateError } = await supabase
                .from("courses")
                .update({
                    is_draft: false,
                    pending_publish: false,
                })
                .eq("id", courseId)
                .select()
                .single()

            if (updateError) throw new Error(updateError.message)

            return {
                // course: updated,
                status: 'published',
                message: 'Course published successfully! 🎉',
            }

        } catch (error: any) {
            throw new Error(error.message)
        }
    },

    createFolder: async (data: any, courseId: string, facultyId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
            // Check course is owned by this faculty
            console.log("folder data #######################################################################", data);
            const { data: course, error: courseError } = await supabase
                .from("courses")
                .select("id")
                .eq("id", courseId)
                .eq("faculty_id", facultyId)
                .single();

            if (courseError) throw new Error(courseError.message);
            if (!course) throw new Error("Course not found");

            const nextSortOrder = await getNextSortOrder(courseId, data.parent_id ?? null, supabase);

            const { data: folder, error } = await supabase
                .from("course_folders")
                .insert({
                    course_id: courseId,
                    parent_id: data.parent_id ?? null,
                    sort_order: nextSortOrder,
                    title: data.title || "Untitled Folder",
                    description: data.description ?? "",
                })
                .select()
                .single();

            if (error) throw new Error(error.message);
            if (!folder) throw new Error("Folder not created");
            return folder;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    updateFolder: async (data: any, folderId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
            const { data: folder, error } = await supabase
                .from("course_folders")
                .update({ title: data.title })
                .eq("id", folderId)
                .select()
                .single();

            if (error) throw new Error(error.message);
            if (!folder) throw new Error("Folder not found");
            return folder;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    deleteFolder: async (folderId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
            const { data: folder, error } = await supabase
                .from("course_folders")
                .update({ is_deleted: true })
                .eq("id", folderId)
                .select()
                .single();

            if (error) throw new Error(error.message);
            if (!folder) throw new Error("Folder not found");
            return folder;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    addMaterialToFolder: async (data: MaterialData, courseId: string, facultyId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
            // Check course ownership
            const { data: course, error: courseError } = await supabase
                .from("courses")
                .select("id")
                .eq("id", courseId)
                .eq("faculty_id", facultyId)
                .single();

            if (courseError) throw new Error(courseError.message);
            if (!course) throw new Error("Course not found");

            // Check folder exists in this course
            if (data.parent_id) {
                const { data: folder, error: folderError } = await supabase
                    .from("course_folders")
                    .select("id")
                    .eq("id", data.parent_id)
                    .eq("course_id", courseId)
                    .single();

                if (folderError) throw new Error(folderError.message);
                if (!folder) throw new Error("Folder not found");
            }

            const nextSortOrder = await getNextSortOrder(courseId, data.parent_id ?? null, supabase);

            // check this material have video upload progress or not
            const { data: videoUploadProgress, error: videoUploadProgressError } = await supabase
                .from("video_upload_progress")
                .select("*")
                .eq("unique_id", data.unique_id)
                .eq("type", "module")
                .single();

            let materialStatus = "";
            if (data?.type === "VIDEO" || data?.type === "TEST") {
                materialStatus = MaterialStatus.PENDING;
            } else {
                materialStatus = MaterialStatus.READY;
            }

            const { data: material, error } = await supabase
                .from("course_materials")
                .insert({
                    unique_id: data.unique_id,
                    course_id: courseId,
                    folder_id: data.parent_id ?? null,
                    sort_order: nextSortOrder,
                    material_status: materialStatus,
                    title: data.title,
                    type: data.type,
                    file_url: data.file_url ?? null,
                    external_url: data.external_url ?? null,
                    file_size: data.file_size ?? null,
                    video_asset_id: videoUploadProgress?.asset_id,
                    video_uploading_status: videoUploadProgress?.uploading_status,
                    video_upload_progress: videoUploadProgress?.upload_progress,
                    video_transcoding_progress: videoUploadProgress?.transcoding_progress,
                    video_cover_img: data.video_cover_img ?? null,

                })
                .select()
                .single();

            if (error) throw new Error(error.message);
            if (!material) throw new Error("Material not created");

            // update folder content counts
            if (data.parent_id) {
                const folderCountField =
                    data.type === MaterialType.VIDEO ? "total_video" :
                        data.type === MaterialType.TEST ? "total_test" :
                            data.type === MaterialType.PDF ? "total_notes" :
                                null;

                if (folderCountField) {
                    const { data: existingFolder, error: fetchError } = await supabase
                        .from("course_folders")
                        .select("total_video, total_test, total_notes")
                        .eq("id", data.parent_id)
                        .single();

                    if (fetchError) throw new Error(fetchError.message);

                    const currentCount = Number(existingFolder[folderCountField] ?? 0);
                    const { error: folderError } = await supabase
                        .from("course_folders")
                        .update({ [folderCountField]: currentCount + 1 })
                        .eq("id", data.parent_id);

                    if (folderError) throw new Error(folderError.message);
                }
            }

            return material;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    updateMaterial: async (data: MaterialData, materialId: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
            // check this material have video upload progress or not
            const { data: videoUploadProgress, error: videoUploadProgressError } = await supabase
                .from("video_upload_progress")
                .select("*")
                .eq("unique_id", data.unique_id)
                .eq("type", "module")
                .single();


            const { data: material, error } = await supabase
                .from("course_materials")
                .update({

                    title: data.title,
                    type: data.type,
                    file_url: data.file_url ?? null,
                    external_url: data.external_url ?? null,
                    file_size: data.file_size ?? null,
                    video_asset_id: videoUploadProgress?.asset_id,
                    video_uploading_status: videoUploadProgress?.uploading_status,
                    video_upload_progress: videoUploadProgress?.upload_progress,
                    video_transcoding_progress: videoUploadProgress?.transcoding_progress,
                    video_cover_img: data.video_cover_img ?? null,

                })
                .eq("id", materialId)
                .select()
                .single();

            if (error) throw new Error(error.message);
            if (!material) throw new Error("Material not created");

            return material;





        } catch (error: any) {
            throw new Error(error.message);
        }
    },


    getAllProcessingMaterial: async (facultyId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
            const { data: materials, error } = await supabase
                .from("course_materials")
                .select(`
                    id, title, material_status, transcoding_progress, created_at,
                    courses ( id, title ),
                    course_folders ( id, name )
                `)
                .in("material_status", ["PENDING", "PROCESSING"])
                .eq("type", "VIDEO")
                .eq("is_deleted", false)
                .eq("courses.faculty_id", facultyId)
                .order("created_at", { ascending: false });

            if (error) throw new Error(error.message);
            if (!materials) throw new Error("Material not found");
            return materials;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    deleteMaterial: async (materialId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
            const { data: material, error } = await supabase
                .from("course_materials")
                .update({ is_deleted: true })
                .eq("id", materialId)
                .select()
                .single();

            if (error) throw new Error(error.message);
            if (!material) throw new Error("Material not found");

            if (material?.type === "TEST") {

                const { error: testError } = await supabase
                    .from("tests")
                    .update({ is_deleted: true })
                    .eq("unique_id", material.unique_id)
                    .select()
                    .single();

                if (testError) throw new Error(testError.message);
            }

            if (material?.folder_id) {
                const folderCountField =
                    material.type === MaterialType.VIDEO ? "total_video" :
                        material.type === MaterialType.TEST ? "total_test" :
                            material.type === MaterialType.PDF ? "total_notes" :
                                null;

                if (folderCountField) {
                    const { data: existingFolder, error: folderFetchError } = await supabase
                        .from("course_folders")
                        .select("total_video, total_test, total_notes")
                        .eq("id", material.folder_id)
                        .single();

                    if (folderFetchError) throw new Error(folderFetchError.message);

                    const currentCount = Number(existingFolder[folderCountField] ?? 0);
                    const { error: folderUpdateError } = await supabase
                        .from("course_folders")
                        .update({ [folderCountField]: Math.max(0, currentCount - 1) })
                        .eq("id", material.folder_id);

                    if (folderUpdateError) throw new Error(folderUpdateError.message);
                }
            }

            return material;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getCourseContent: async (courseId: string, parentId: string | null, client?: SupabaseClient) => {

        console.log("content data $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$", courseId, parentId)
        try {
            const supabase = client ?? anonSupabase;
            let folderQuery = supabase
                .from("course_folders")
                .select("*")
                .eq("course_id", courseId)
                .eq("is_deleted", false)
                .order("sort_order", { ascending: true });

            let materialQuery = supabase
                .from("course_materials")
                .select("*")
                .eq("is_deleted", false)
                .eq("course_id", courseId)
                .order("sort_order", { ascending: true });

            if (parentId === null) {
                folderQuery = folderQuery.is("parent_id", null);
                materialQuery = materialQuery.is("folder_id", null);
            } else {
                folderQuery = folderQuery.eq("parent_id", parentId);
                materialQuery = materialQuery.eq("folder_id", parentId);
            }

            const [{ data: folders, error: folderError }, { data: materials, error: matError }] =
                await Promise.all([folderQuery, materialQuery]);

            if (folderError) throw new Error(folderError.message);
            if (matError) throw new Error(matError.message);

            const taggedFolders = (folders ?? []).map(f => ({ ...f, item_type: "folder" }));
            const taggedMaterials = (materials ?? []).map(m => ({ ...m, item_type: "material" }));

            return [...taggedFolders, ...taggedMaterials].sort((a, b) => a.sort_order - b.sort_order);

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getCourseReviews: async (courseId: string, page: number = 1, limit: number = 10, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            // 1. Get paginated reviews with student + reply details
            const { data: reviews, error, count } = await supabase
                .from("reviews")
                .select(`
                *,
                student:profiles!reviews_student_id_fkey (
                    id, first_name, last_name, avatar_url
                )
                )
            `, { count: "exact" })
                .eq("course_id", courseId)
                .order("created_at", { ascending: false })
                .range(from, to);

            if (error) throw new Error(error.message);

            // 2. Get ALL ratings for accurate average
            // (not just current page)
            const { data: allRatings, error: ratingError } = await supabase
                .from("reviews")
                .select("rating")
                .eq("course_id", courseId)


            if (ratingError) throw new Error(ratingError.message);

            // 3. Calculate average rating from ALL reviews
            const averageRating = allRatings && allRatings.length > 0
                ? Math.round(
                    (allRatings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / allRatings.length) * 10
                ) / 10
                : 0;

            // 4. Calculate rating breakdown (1-5 stars count)
            const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            (allRatings ?? []).forEach(r => {
                if (r.rating >= 1 && r.rating <= 5) {
                    ratingBreakdown[r.rating as 1 | 2 | 3 | 4 | 5]++;
                }
            });

            // 5. Pagination meta
            const totalPages = Math.ceil((count ?? 0) / limit);

            return {
                reviews: reviews ?? [],
                average_rating: averageRating,
                total_reviews: allRatings?.length ?? 0,
                rating_breakdown: ratingBreakdown,
                pagination: {
                    total: count ?? 0,
                    total_pages: totalPages,
                    current_page: page,
                    limit,
                    has_next: page < totalPages,
                    has_prev: page > 1,
                }
            };

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    addReviewReply: async (reviewId: string, reply: string, facultyId: string, client?: SupabaseClient) => {

        try {

            const supabase = client ?? anonSupabase;
            // Verify review exists and belongs to faculty's course
            const { data: review } = await supabase
                .from('reviews')
                .select("*")
                .eq('id', reviewId)
                .eq('is_approved', true)
                .single();

            if (!review) throw new Error("Review not found");

            // Check faculty owns this course
            const { data: course } = await supabase
                .from('courses')
                .select("*")
                .eq('id', review.course_id)
                .eq('faculty_id', facultyId)
                .single();

            if (!course) throw new Error("Not your course review");

            // Add reply
            const { data: result } = await supabase
                .from('review_replies')
                .insert({
                    review_id: reviewId,
                    reply: reply,
                    faculty_id: facultyId
                })
                .select("*")
                .single();

            if (!result) throw new Error("Failed to add reply");

            return reply;


        } catch (error: any) {

            throw new Error(error.message);
        }
    },

    getFullFoldersInCourse: async (courseId: string, facultyId: string, client?: SupabaseClient) => {
        try {

            const supabase = client ?? anonSupabase;
            const { data: course } = await supabase
                .from('courses')
                .select("*")
                .eq('id', courseId)
                .eq('faculty_id', facultyId)
                .single();

            if (!course) throw new Error("Not your course");

            const { data: folders } = await supabase
                .from('course_folders')
                .select("*")
                .eq('course_id', courseId)
                .eq('is_deleted', false)

            if (!folders) throw new Error("No folders found");

            return folders;

        } catch (error: any) {

            throw new Error(error.message);
        }
    },
    getAllMaterialModule: async (materialId: string, client?: SupabaseClient) => {
        try {
            console.log("materialId>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", materialId);
            const supabase = client ?? anonSupabase;
            const { data: contents, error } = await supabase
                .from("course_materials")
                .select("id,title,type")
                .eq("id", materialId)
                .eq("is_deleted", false)
                .neq("type", "TEST")
                .order("sort_order", { ascending: true });


            if (error) throw new Error(error.message);
            if (!contents) throw new Error("Contents not found");
            return contents;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getCourseAnalytics: async (courseId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;

            // 1. Total Revenue + Active Students count
            const { data: enrollments, error: enrollmentError } = await supabase
                .from("enrollments")
                .select("amount_paid, student_id")
                .eq("course_id", courseId);

            if (enrollmentError) throw new Error(enrollmentError.message);

            const totalRevenue = enrollments?.reduce((sum, e) => sum + (e.amount_paid ?? 0), 0) ?? 0;
            const activeStudents = enrollments?.length ?? 0;

            // 2. Completion Rate — avg completion_pct across all students in this course
            const { data: progressData, error: progressError } = await supabase
                .from("course_progress")
                .select("completion_pct, is_completed")
                .eq("course_id", courseId);

            if (progressError) throw new Error(progressError.message);

            const completionRate =
                progressData && progressData.length > 0
                    ? Math.round(
                        progressData.reduce((sum, p) => sum + Number(p.completion_pct), 0) /
                        progressData.length
                    )
                    : 0;

            // 3. Fully completed students count (optional — useful for future)
            const completedStudents = progressData?.filter((p) => p.is_completed).length ?? 0;

            return {
                totalRevenue,       // sum of amount_paid
                activeStudents,     // total enrolled students
                completionRate,     // average completion % (0-100)
                completedStudents,  // count of fully completed
                testScore: null,    // plug in your rating/quiz table later
            };

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getCourseEnrollmentVsCompletionChart: async (
        courseId: string,
        period: ChartPeriod,
        client?: SupabaseClient
    ): Promise<{ label: string; enrollments: number; completions: number }[]> => {
        try {
            const supabase = client ?? anonSupabase;
            const bounds = getChartPeriodBounds(period);
            const slots = buildChartPeriodSlots(period, bounds);

            const { data: enrollments, error: enrollmentError } = await supabase
                .from('enrollments')
                .select('enrolled_at')
                .eq('course_id', courseId)
                .gte('enrolled_at', bounds.fromDate.toISOString())
                .lte('enrolled_at', bounds.rangeEnd.toISOString());

            if (enrollmentError) throw new Error(enrollmentError.message);

            const { data: completions, error: completionError } = await supabase
                .from('course_progress')
                .select('completed_at')
                .eq('course_id', courseId)
                .eq('is_completed', true)
                .gte('completed_at', bounds.fromDate.toISOString())
                .lte('completed_at', bounds.rangeEnd.toISOString());

            if (completionError) throw new Error(completionError.message);

            const enrollmentMap = new Map<string, { label: string; count: number }>();
            const completionMap = new Map<string, number>();

            for (const e of enrollments ?? []) {
                if (!e.enrolled_at) continue;
                const grouped = groupTimestampForChartPeriod(e.enrolled_at, period, bounds);
                if (!grouped) continue;
                const { label, group } = grouped;
                const existing = enrollmentMap.get(group);
                enrollmentMap.set(group, { label, count: (existing?.count ?? 0) + 1 });
            }

            for (const c of completions ?? []) {
                if (!c.completed_at) continue;
                const grouped = groupTimestampForChartPeriod(c.completed_at, period, bounds);
                if (!grouped) continue;
                const { group } = grouped;
                completionMap.set(group, (completionMap.get(group) ?? 0) + 1);
            }

            return slots.map(({ label, group }) => ({
                label,
                enrollments: enrollmentMap.get(group)?.count ?? 0,
                completions: completionMap.get(group) ?? 0,
            }));
        } catch (error: any) {
            throw new Error(error.message);
        }
    },
    getCourseRevenueTrend: async (
        courseId: string,
        period: ChartPeriod,
        client?: SupabaseClient
    ): Promise<{ data: { label: string; value: number }[]; trend: string }> => {
        try {
            const db = client ?? anonSupabase;

            const bounds = getChartPeriodBounds(period);
            const slots = buildChartPeriodSlots(period, bounds);
            const today = bounds.today;

            let previousStart: Date;
            let previousEnd: Date;

            if (period === "week") {
                previousStart = new Date(
                    bounds.fromDate.getFullYear(),
                    bounds.fromDate.getMonth(),
                    bounds.fromDate.getDate() - 7
                );
                previousEnd = endOfLocalDay(
                    new Date(
                        bounds.fromDate.getFullYear(),
                        bounds.fromDate.getMonth(),
                        bounds.fromDate.getDate() - 1
                    )
                );
            } else if (period === "month") {
                previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                previousEnd = endOfLocalDay(
                    new Date(today.getFullYear(), today.getMonth(), 0)
                );
            } else {
                previousStart = new Date(today.getFullYear() - 1, 0, 1);
                previousEnd = endOfLocalDay(new Date(today.getFullYear() - 1, 11, 31));
            }

            const { data: current, error: currentError } = await db
                .from("enrollments")
                .select("enrolled_at, amount_paid")
                .eq("course_id", courseId)
                .gte("enrolled_at", bounds.fromDate.toISOString())
                .lte("enrolled_at", bounds.rangeEnd.toISOString());

            if (currentError) throw new Error(currentError.message);
            const currentEnrollments = current ?? [];

            const { data: previous, error: previousError } = await db
                .from("enrollments")
                .select("amount_paid")
                .eq("course_id", courseId)
                .gte("enrolled_at", previousStart.toISOString())
                .lte("enrolled_at", previousEnd.toISOString());

            if (previousError) throw new Error(previousError.message);
            const previousEnrollments = previous ?? [];

            const currentTotal = currentEnrollments.reduce((sum, e) => sum + Number(e.amount_paid), 0);
            const previousTotal = previousEnrollments.reduce((sum, e) => sum + Number(e.amount_paid), 0);

            let trendText = "0% no change";
            if (previousTotal > 0) {
                const change = ((currentTotal - previousTotal) / previousTotal) * 100;
                const direction = change >= 0 ? "increase" : "decrease";
                const periodLabel = period === "week" ? "last week" : period === "month" ? "last month" : "last year";
                trendText = `${Math.abs(change).toFixed(1)}% ${direction} from ${periodLabel}`;
            }

            const revenueByGroup = new Map(slots.map((s) => [s.group, 0]));

            for (const e of currentEnrollments) {
                if (!e.enrolled_at) continue;
                const grouped = groupTimestampForChartPeriod(e.enrolled_at, period, bounds);
                if (!grouped) continue;
                revenueByGroup.set(
                    grouped.group,
                    (revenueByGroup.get(grouped.group) ?? 0) + Number(e.amount_paid)
                );
            }

            const chartData = slots.map((s) => ({
                label: s.label,
                value: revenueByGroup.get(s.group) ?? 0,
            }));

            return { data: chartData, trend: trendText };

        } catch (error: any) {
            throw new Error(error.message);
        }
    },
    deleteCourse: async (courseId: string, client?: SupabaseClient) => {
        try {
            const supabase = client ?? anonSupabase;
            const { data: course, error } = await supabase
                .from("courses")
                .update({ is_deleted: true })
                .eq("id", courseId)
                .select()
                .single();

            if (error) throw new Error(error.message);
            if (!course) throw new Error("Course not found");
            return course;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

};

// ── helpers ──────────────────────────────────────────────────────────────────

async function getNextSortOrder(courseId: string, parentId: string | null, client?: SupabaseClient): Promise<number> {
    const supabase = client ?? anonSupabase;
    let folderQuery = supabase
        .from("course_folders")
        .select("sort_order")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: false })
        .limit(1);

    let materialQuery = supabase
        .from("course_materials")
        .select("sort_order")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: false })
        .limit(1);

    if (parentId === null) {
        folderQuery = folderQuery.is("parent_id", null);
        materialQuery = materialQuery.is("folder_id", null);
    } else {
        folderQuery = folderQuery.eq("parent_id", parentId);
        materialQuery = materialQuery.eq("folder_id", parentId);
    }

    const [{ data: lastFolder }, { data: lastMaterial }] = await Promise.all([folderQuery, materialQuery]);

    const lastFolderOrder = lastFolder?.[0]?.sort_order ?? 0;
    const lastMaterialOrder = lastMaterial?.[0]?.sort_order ?? 0;
    return Math.max(lastFolderOrder, lastMaterialOrder) + 1;
}
