
import { adminEnrollmentCsvRepository } from "./enrollment.repository";
import { toXlsxBuffer } from "../../../utils/xlsx";


export const adminEnrollmentCsvService = {

    /**
     * Build the enrollment .xlsx workbook for a single course.
     * Returns the file buffer plus a suggested download filename.
     */
    exportCourseEnrollments: async (event: any) => {
        try {

            const courseId = event.pathParameters?.courseId;

            if (!courseId) throw new Error("courseId is required");

            const client = event.supabase;

            const [course, enrollments] = await Promise.all([
                adminEnrollmentCsvRepository.getCourse(courseId, client),
                adminEnrollmentCsvRepository.getCourseEnrollments(courseId, client),
            ]);

            const rows = enrollments.map((e: any, index: number) => ({
                sno: index + 1,
                student_name: `${e.student?.first_name ?? ""} ${e.student?.last_name ?? ""}`.trim(),
                email: e.student?.email ?? "",
                amount_paid: e.amount_paid ?? 0,
                course_price: e.course_price ?? 0,
                gst_amount: e.gst_amount ?? 0,
                payment_method: e.payment_method ?? "",
                payment_id: e.payment_id ?? "",
                is_bundle: e.is_bundle_enrollment ? "Yes" : "No",
                enrolled_at: e.enrolled_at ?? e.created_at ?? "",
            }));

            const buffer = await toXlsxBuffer(rows, [
                { key: "sno", header: "S.No", width: 6 },
                { key: "student_name", header: "Student Name", width: 28 },
                { key: "email", header: "Email", width: 32 },
                { key: "amount_paid", header: "Amount Paid", width: 14 },
                { key: "course_price", header: "Course Price", width: 14 },
                { key: "gst_amount", header: "GST Amount", width: 12 },
                { key: "payment_method", header: "Payment Method", width: 18 },
                { key: "payment_id", header: "Payment ID", width: 26 },
                { key: "is_bundle", header: "Bundle Enrollment", width: 16 },
                { key: "enrolled_at", header: "Enrolled At", width: 24 },
            ], "Enrollments");

            // Slug the course title for a friendly filename.
            const slug = (course?.title ?? "course")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

            const filename = `enrollments-${slug || courseId}.xlsx`;

            return { buffer, filename, total: rows.length };

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error);
        }
    },

}
