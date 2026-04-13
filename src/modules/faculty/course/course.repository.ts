
import { supabase } from "../../../shared/supabase/supabase";
import { prisma } from "../../../shared/DB/prisma";
import { MaterialData, MaterialType, MaterialStatus, CourseBundleData } from "../../../shared/constants/types";
import { pushToQueue } from "../../../shared/utils/queue";




export const facultyCourseRepository = {


    createCourseWithBasicDetails: async (data: any, facultyId: string) => {


        try {

            console.log("data", data);

            const course = await prisma.courses.create({
                data: {
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    level: data.level,
                    language: data.language,
                    faculty_id: facultyId,
                }
            })

            return course;

        } catch (error: any) {

            throw new Error(error.message)
        }



    },

    // getMyCourses: async (facultyId: string, filter: boolean) => {

    //     try {

    //         const courses = await prisma.courses.findMany({
    //             where: {
    //                 faculty_id: facultyId,
    //                 is_draft: filter
    //             },
    //             include: {
    //                 _count: {
    //                     select: {
    //                         enrollments: true
    //                     }
    //                 }
    //             }

    //         })



    //         return courses;

    //     } catch (error: any) {

    //         throw new Error(error.message)
    //     }



    // },


    getMyCourses: async (facultyId: string, filter: boolean) => {
        try {
            const { data: courses, error } = await supabase
                .from("courses")
                .select(`
        *,
        enrollments (count)
      `)
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

            const course = await prisma.courses.findUnique({
                where: {
                    id: courseId,
                }
            })

            if (!course) {
                throw new Error("Course not found")
            }

            if (!course) {

                throw new Error("Course not found")

            }

            const materials = await prisma.course_materials.groupBy({
                by: ['type'],
                where: {
                    course_id: courseId,
                    is_deleted: false
                },
                _count: {
                    type: true
                },
                _sum: {
                    duration_sec: true
                }
            });

            const testCount = await prisma.tests.count({
                where: {
                    course_id: courseId,

                }
            });

            let videoCount = 0;
            let pdfCount = 0;
            let imageCount = 0;
            let totalDuration = 0;

            materials.forEach((item) => {
                if (item.type === "VIDEO") {
                    videoCount = item._count.type;
                    totalDuration = item._sum.duration_sec || 0;
                }
                if (item.type === "PDF") {
                    pdfCount = item._count.type;
                }
                if (item.type === "IMAGE") {
                    imageCount = item._count.type;
                }
            });


            const hours = Math.floor(totalDuration / 3600);
            const minutes = Math.floor((totalDuration % 3600) / 60);

            return {
                ...course,

                content_inventory: {
                    video_lessons: videoCount,
                    pdf_resources: pdfCount,
                    images: imageCount,
                    tests: testCount,
                    total_contents: videoCount + pdfCount + imageCount + testCount
                },

                video_duration: {
                    total_seconds: totalDuration,
                    formatted: `${hours} Hours ${minutes} Minutes`
                }
            };

        } catch (error: any) {

            throw new Error(error.message)
        }

    },

    getCourseById: async (courseId: string) => {

        try {

            const course = await prisma.courses.findUnique({
                where: {
                    id: courseId,
                }
            })

            if (!course) {
                throw new Error("Course not found")
            }

            return course;

        } catch (error: any) {

            throw new Error(error.message)
        }



    },

    updateCourseDetails: async (data: any, courseId: string, facultyId: string) => {

        try {

            console.log("data", data);

            const course = await prisma.courses.update({
                where: {
                    id: courseId,
                    faculty_id: facultyId
                },
                data: {
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    level: data.level,
                    price: data.price,
                    discount_type: data.discount_type,
                    discount: data.discount_value,
                    duration: data.duration,
                    language: data.language,
                }
            })

            if (!course) {
                throw new Error("Course not found")
            }

            return course;



        } catch (error: any) {

            throw new Error(error.message)
        }



    },

    publishCourse: async (courseId: string, facultyId: string) => {

        try {

            const course = await prisma.courses.update({
                where: {
                    id: courseId,
                    faculty_id: facultyId
                },
                data: {
                    is_draft: false,
                }
            })

            if (!course) {
                throw new Error("Course not found")
            }

            return course;

        } catch (error: any) {

            throw new Error(error.message)
        }

    },

    createFolder: async (data: any, courseId: string, facultyId: string) => {

        try {

            // check this course is owned by this faculty
            const course = await prisma.courses.findUnique({
                where: {
                    id: courseId,
                    faculty_id: facultyId
                }
            })

            if (!course) {
                throw new Error("Course not found")
            }


            // When faculty adds a new  folder 
            // Auto-calculate the next sort_order at that level

            async function getNextSortOrder(courseId: string, parentId: string | null) {

                // Get highest sort_order at this level from BOTH tables
                const [lastFolder, lastMaterial] = await Promise.all([

                    prisma.course_folders.findFirst({
                        where: {
                            course_id: courseId,
                            parent_id: parentId   // same level
                        },
                        orderBy: { sort_order: 'desc' },
                        select: { sort_order: true }
                    }),

                    prisma.course_materials.findFirst({
                        where: {
                            course_id: courseId,
                            folder_id: parentId   // same level
                        },
                        orderBy: { sort_order: 'desc' },
                        select: { sort_order: true }
                    })

                ])

                // Get highest sort_order from either table
                const lastFolderOrder = lastFolder?.sort_order || 0
                const lastMaterialOrder = lastMaterial?.sort_order || 0
                const highest = Math.max(lastFolderOrder, lastMaterialOrder)

                // Next sort_order = highest + 1
                return highest + 1
            }

            const nextSortOrder = await getNextSortOrder(courseId, data.parent_id || null);

            const folder = await prisma.course_folders.create({
                data: {
                    course_id: courseId,
                    parent_id: data.parent_id || null,
                    sort_order: nextSortOrder,
                    title: data.title || "Untitled Folder",
                }
            })

            if (!folder) {
                throw new Error("Folder not created")
            }

            return folder;

        } catch (error: any) {

            throw new Error(error.message)

        }


    },

    updateFolder: async (data: any, folderId: string) => {

        try {

            const folder = await prisma.course_folders.update({
                where: {
                    id: folderId,

                },
                data: {
                    title: data.title,
                }
            })

            if (!folder) {
                throw new Error("Folder not found")
            }

            return folder;

        } catch (error: any) {

            throw new Error(error.message)
        }


    },

    deleteFolder: async (folderId: string) => {

        try {

            const folder = await prisma.course_folders.delete({
                where: {
                    id: folderId,
                }
            })

            if (!folder) {
                throw new Error("Folder not found")
            }

            return folder;

        } catch (error: any) {

            throw new Error(error.message)
        }


    },

    addMaterialToFolder: async (data: MaterialData, courseId: string, facultyId: string) => {

        try {


            // check if course is owned by this faculty
            const course = await prisma.courses.findUnique({
                where: {
                    id: courseId,
                    faculty_id: facultyId
                }
            })

            if (!course) {
                throw new Error("Course not found")

            }

            if (data.parent_id) {

                // check folder exists and is in same course
                const folder = await prisma.course_folders.findUnique({
                    where: {
                        id: data.parent_id,
                        course_id: courseId
                    }
                })

                if (!folder) {
                    throw new Error("Folder not found")
                }
            }


            //  find sort order

            async function getNextSortOrder(courseId: string, parentId: string | null) {

                // Get highest sort_order at this level from BOTH tables
                const [lastFolder, lastMaterial] = await Promise.all([

                    prisma.course_folders.findFirst({
                        where: {
                            course_id: courseId,
                            parent_id: parentId   // same level
                        },
                        orderBy: { sort_order: 'desc' },
                        select: { sort_order: true }
                    }),

                    prisma.course_materials.findFirst({
                        where: {
                            course_id: courseId,
                            folder_id: parentId   // same level
                        },
                        orderBy: { sort_order: 'desc' },
                        select: { sort_order: true }
                    })

                ])

                // Get highest sort_order from either table
                const lastFolderOrder = lastFolder?.sort_order || 0
                const lastMaterialOrder = lastMaterial?.sort_order || 0
                const highest = Math.max(lastFolderOrder, lastMaterialOrder)

                // Next sort_order = highest + 1
                return highest + 1
            }

            const nextSortOrder = await getNextSortOrder(courseId, data.parent_id || null);

            const material = await prisma.course_materials.create({
                data: {
                    course_id: courseId,
                    folder_id: data.parent_id ?? null,
                    sort_order: nextSortOrder,
                    material_status: MaterialStatus.PENDING,
                    title: data.title,
                    type: data.type,

                    file_url: data.file_url ?? null,
                    external_url: data.external_url ?? null,
                    file_size: data.file_size ?? null,
                }
            });

            if (!material) {
                throw new Error("Material not created")
            }

            // If video → push to SQS background queue

            if (material?.type === MaterialType.VIDEO) {

                await pushToQueue(process.env.VIDEO_UPLOAD_QUEUE_URL!, {
                    material_id: material.id,
                    course_id: courseId,
                    video_data: data.video_data,
                    file_name: data.file_name,
                });
            }

            return material;


        } catch (error: any) {

            throw new Error(error.message)
        }


    },

    // getAllProcessingMaterial: async (facultyId: string) => {

    //     try {

    //         const material = await prisma.course_materials.findMany({
    //             where: {

    //                 courses: {
    //                     faculty_id: facultyId
    //                 },
    //                 material_status: { in: [MaterialStatus.PENDING, MaterialStatus.PROCESSING] },
    //                 type: MaterialType.VIDEO
    //             },
    //             select: {
    //                 id: true,
    //                 title: true,
    //                 material_status: true,
    //                 transcoding_progress: true,
    //                 created_at: true,
    //                 courses: {
    //                     select: {
    //                         id: true,
    //                         title: true,                  // show which course
    //                     }
    //                 },
    //                 course_folders: {
    //                     select: {
    //                         id: true,
    //                         title: true,                  // show which folder
    //                     }
    //                 }
    //             },
    //             orderBy: {
    //                 created_at: 'desc'               // latest first
    //             }

    //         })

    //         if (!material) {
    //             throw new Error("Material not found")
    //         }

    //         return material;

    //     } catch (error: any) {

    //         throw new Error(error.message)
    //     }


    // },


    getAllProcessingMaterial: async (facultyId: string) => {
        try {
            const { data: materials, error } = await supabase
                .from("course_materials")
                .select(`
        id,
        title,
        material_status,
        transcoding_progress,
        created_at,
        courses (
          id,
          title
        ),
        course_folders (
          id,
          name
        )
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

            const material = await prisma.course_materials.delete({
                where: {
                    id: materialId,
                }
            })

            if (!material) {
                throw new Error("Material not found")
            }

            return material;

        } catch (error: any) {

            throw new Error(error.message)
        }


    },

    getCourseContent: async (courseId: string, parentId: string | null) => {
        try {

            // 1. Fetch both in parallel
            const [folders, materials] = await Promise.all([

                prisma.course_folders.findMany({
                    where: { course_id: courseId, parent_id: parentId },
                    orderBy: { sort_order: 'asc' }
                }),



                prisma.course_materials.findMany({
                    where: { course_id: courseId, folder_id: parentId },
                    orderBy: { sort_order: 'asc' }
                })
            ]);


            // 2. Tag each item with its type
            const taggedFolders = folders.map(f => ({ ...f, item_type: 'folder' }));
            const taggedMaterials = materials.map(m => ({ ...m, item_type: 'material' }));

            // 3. Merge and sort by sort_order
            const finalData = [...taggedFolders, ...taggedMaterials]
                .sort((a, b) => a.sort_order - b.sort_order);

            return finalData;

        } catch (error: any) {


            throw new Error(error.message)

        }
    },






}