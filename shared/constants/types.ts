export type Role = "STUDENT" | "FACULTY" | "ADMIN";

export enum AccountStatus { PENDING = "PENDING", APPROVED = "APPROVED", REJECTED = "REJECTED" }

export enum MaterialStatus { PENDING = "PENDING", TRANSCODING = "TRANSCODING", COMPLETED = "COMPLETED", FAILED = "FAILED" ,READY = "READY" , PROCESSING = "PROCESSING"}

export enum MaterialType { VIDEO = "VIDEO", PDF = "PDF", LINK = "LINK", NOTES = "NOTES", IMAGE = "IMAGE", TEST = "TEST" }


export enum userRole { FACULTY = "FACULTY", STUDENT = "STUDENT", ADMIN = "ADMIN" }



export type MaterialData = {

    unique_id?: string,
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
    finalPrice: number,
    discount: string,
    courses: string[],
    coverImage: string,
    enableCoupons?: boolean | undefined,
    isDraft?: boolean | undefined,
}

export type AnnouncementData = {

    title: string,
    content: string,
    image_url?: string,
    timePeriod?: string,
    audience?: string,
    isDraft?: boolean,

}


export type TestBaseDetailsData = {

    unique_id: string,
    title: string,
    chapter?: string,
    course: string,
    module?: string,
    totalMarks: number,
    isDraft: boolean,
    isDeleted: boolean,
    instructions: string,
    testType: string,
    isNew: boolean,
    testId?: string,
    duration: number,
    isRandom: boolean,
}


export type QuestionData = {

    test_id: string,
    question: string,
    type: string,
    marks: number,
    options?: [
        {
            option_text: string,
            is_correct: boolean,
            label: string,
        }
    ],
    material_id: string,
    material_title: string,
}


export type CouponData = {

    code: string,
    discountType: string,
    discountValue: number,
    courses: string[],
    expiryDate: string,
    maxUsage: number,
    usagePerPerson: number,


}
