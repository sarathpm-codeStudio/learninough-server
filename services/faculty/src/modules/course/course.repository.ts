
import { supabase } from "../../../../../shared/config/supabase";
import { MaterialData, MaterialType, MaterialStatus } from "../../../../../shared/constants/types";
import { pushToQueue } from "../../../../../shared/utils/queue";


export const facultyCourseRepository = {

    createCourseWithBasicDetails: async (data: any, facultyId: string) => {
        try {
            const { data: course, error } = await supabase
                .from("courses")
                .insert({
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    level: data.level,
                    language: data.language,
                    faculty_id: facultyId,
                })
                .select()
                .single();

            if (error) throw new Error(error.message);
            return course;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getMyCourses: async (facultyId: string, filter: boolean) => {
        try {
            const { data: courses, error } = await supabase
                .from("courses")
                .select(`*, enrollments (count)`)
                .eq("faculty_id", facultyId)
                .eq("is_draft", filter)
                .order("created_at", { ascending: false });

            if (error) throw new Error(error.message);
            return courses;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getPreviewCourse: async (courseId: string) => {
        try {
            const { data: course, error: courseError } = await supabase
                .from("courses")
                .select("*")
                .eq("id", courseId)
                .single();

            if (courseError) throw new Error(courseError.message);
            if (!course) throw new Error("Course not found");

            // Fetch materials to compute groupBy client-side
            const { data: materials, error: matError } = await supabase
                .from("course_materials")
                .select("type, duration_sec")
                .eq("course_id", courseId)
                .eq("is_deleted", false);

            if (matError) throw new Error(matError.message);

            // Count tests
            const { count: testCount, error: testError } = await supabase
                .from("tests")
                .select("*", { count: "exact", head: true })
                .eq("course_id", courseId);

            if (testError) throw new Error(testError.message);

            // Compute groupBy in JS
            let videoCount = 0;
            let pdfCount = 0;
            let imageCount = 0;
            let totalDuration = 0;

            materials?.forEach((item: any) => {
                if (item.type === "VIDEO") { videoCount++; totalDuration += item.duration_sec || 0; }
                if (item.type === "PDF") pdfCount++;
                if (item.type === "IMAGE") imageCount++;
            });

            const hours = Math.floor(totalDuration / 3600);
            const minutes = Math.floor((totalDuration % 3600) / 60);

            return {
                ...course,
                content_inventory: {
                    video_lessons: videoCount,
                    pdf_resources: pdfCount,
                    images: imageCount,
                    tests: testCount ?? 0,
                    total_contents: videoCount + pdfCount + imageCount + (testCount ?? 0),
                },
                video_duration: {
                    total_seconds: totalDuration,
                    formatted: `${hours} Hours ${minutes} Minutes`,
                },
            };

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getCourseById: async (courseId: string) => {
        try {
            const { data: course, error } = await supabase
                .from("courses")
                .select("*")
                .eq("id", courseId)
                .single();

            if (error) throw new Error(error.message);
            if (!course) throw new Error("Course not found");
            return course;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    updateCourseDetails: async (data: any, courseId: string, facultyId: string) => {
        try {
            const { data: course, error } = await supabase
                .from("courses")
                .update({
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    level: data.level,
                    price: data.price,
                    discount_type: data.discount_type,
                    discount: data.discount_value,
                    duration: data.duration,
                    language: data.language,
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

    publishCourse: async (courseId: string, facultyId: string) => {
        try {
            const { data: course, error } = await supabase
                .from("courses")
                .update({ is_draft: false })
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

    createFolder: async (data: any, courseId: string, facultyId: string) => {
        try {
            // Check course is owned by this faculty
            const { data: course, error: courseError } = await supabase
                .from("courses")
                .select("id")
                .eq("id", courseId)
                .eq("faculty_id", facultyId)
                .single();

            if (courseError) throw new Error(courseError.message);
            if (!course) throw new Error("Course not found");

            const nextSortOrder = await getNextSortOrder(courseId, data.parent_id ?? null);

            const { data: folder, error } = await supabase
                .from("course_folders")
                .insert({
                    course_id: courseId,
                    parent_id: data.parent_id ?? null,
                    sort_order: nextSortOrder,
                    title: data.title || "Untitled Folder",
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

    updateFolder: async (data: any, folderId: string) => {
        try {
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

    deleteFolder: async (folderId: string) => {
        try {
            const { data: folder, error } = await supabase
                .from("course_folders")
                .delete()
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

    addMaterialToFolder: async (data: MaterialData, courseId: string, facultyId: string) => {
        try {
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

            const nextSortOrder = await getNextSortOrder(courseId, data.parent_id ?? null);

            const { data: material, error } = await supabase
                .from("course_materials")
                .insert({
                    course_id: courseId,
                    folder_id: data.parent_id ?? null,
                    sort_order: nextSortOrder,
                    material_status: MaterialStatus.PENDING,
                    title: data.title,
                    type: data.type,
                    file_url: data.file_url ?? null,
                    external_url: data.external_url ?? null,
                    file_size: data.file_size ?? null,
                })
                .select()
                .single();

            if (error) throw new Error(error.message);
            if (!material) throw new Error("Material not created");

            // If video → push to SQS background queue
            if (material.type === MaterialType.VIDEO) {
                await pushToQueue(process.env.VIDEO_UPLOAD_QUEUE_URL!, {
                    material_id: material.id,
                    course_id: courseId,
                    video_data: data.video_data,
                    file_name: data.file_name,
                });
            }

            return material;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getAllProcessingMaterial: async (facultyId: string) => {
        try {
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

    deleteMaterial: async (materialId: string) => {
        try {
            const { data: material, error } = await supabase
                .from("course_materials")
                .delete()
                .eq("id", materialId)
                .select()
                .single();

            if (error) throw new Error(error.message);
            if (!material) throw new Error("Material not found");
            return material;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getCourseContent: async (courseId: string, parentId: string | null) => {
        try {
            let folderQuery = supabase
                .from("course_folders")
                .select("*")
                .eq("course_id", courseId)
                .order("sort_order", { ascending: true });

            let materialQuery = supabase
                .from("course_materials")
                .select("*")
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

    getCourseReviews: async (courseId: string, page: number = 1, limit: number = 10) => {
        try {

            const from = (page - 1) * limit;
            const to = from + limit - 1;

            // 1. Get paginated reviews with student + reply details
            const { data: reviews, error, count } = await supabase
                .from("reviews")
                .select(`
                *,
                student:profiles!reviews_student_id_fkey (
                    id, name, avatar_url
                ),
                review_replies (
                    id,
                    reply,
                    created_at,
                    updated_at,
                    is_deleted,
                    faculty:profiles!review_replies_faculty_id_fkey (
                        id, name, avatar_url
                    )
                )
            `, { count: "exact" })
                .eq("course_id", courseId)
                .eq("is_approved", true)
                .eq("review_replies.is_deleted", false)
                .order("created_at", { ascending: false })
                .range(from, to);

            if (error) throw new Error(error.message);
            if (!reviews) throw new Error("Reviews not found");

            // 2. Get ALL ratings for accurate average
            // (not just current page)
            const { data: allRatings, error: ratingError } = await supabase
                .from("reviews")
                .select("rating")
                .eq("course_id", courseId)
                .eq("is_approved", true);

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
                reviews,
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

    addReviewReply: async (reviewId: string, reply: string, facultyId: string) => {

        try {

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
    }

};

// ── helpers ──────────────────────────────────────────────────────────────────

async function getNextSortOrder(courseId: string, parentId: string | null): Promise<number> {
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
