export type Role = "STUDENT" | "FACULTY" | "ADMIN";

export enum AccountStatus { PENDING = "PENDING", APPROVED = "APPROVED", REJECTED = "REJECTED" }

export enum MaterialStatus { PENDING = "PENDING", PROCESSING = "PROCESSING", READY = "READY", FAILED = "FAILED" }

export enum MaterialType { VIDEO = "VIDEO", PDF = "PDF", LINK = "LINK", NOTES = "NOTES", IMAGE = "IMAGE" }


export enum userRole { FACULTY = "FACULTY", STUDENT = "STUDENT", ADMIN = "ADMIN" }



export type MaterialData = {

    parent_id?: string,
    title: string,
    type: MaterialType,
    file_url?: string,
    file_size?: number,
    external_url?: string,
    video_data?: any,
    file_name?: string,
}

export type CourseBundleData = {

    title: string,
    description: string,
    price: number,
    discount_type: string,
    discount_price: number,
    discount: number,
    course_ids: string[],
    img_url?: string,
    is_new: boolean,
    bundle_id?: string,
    is_draft: boolean,

}

export type AnnouncementData = {

    title: string,
    content: string,
    image_url?: string,
    time_period?: string,
    course_id?: string,

}


export type TestBaseDetailsData = {

    title: string,
    chapter?: string,
    course_id?: string,
    module_id?: string,
    total_marks: number,
    is_draft: boolean,
    is_deleted: boolean,
    instructions: string,
    type: string,
    is_new: boolean,
    test_id?: string,
    duration: number,
    is_random: boolean,
}


export type QuestionData = {

    test_id: string,
    question: string,
    type: string,
    marks: number,
    option?: [
        {
            option_text: string,
            is_correct: boolean,
            label: string,
        }
    ],


}