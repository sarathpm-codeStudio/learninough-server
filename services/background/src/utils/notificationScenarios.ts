import { SupabaseClient } from "@supabase/supabase-js";

// ─── Frontend-triggered notification scenarios ──────────────
// The frontend never writes notifications to Supabase directly. Instead it calls
// the notification-trigger API with a `key` (one of the scenarios below) plus a
// small payload (e.g. courseId). Each scenario knows:
//   • templateType — which entry in notificationTemplates.ts builds the copy
//   • isPush        — true → FCM push + in-app row, false → in-app row only
//   • resolve       — turns the payload into { userIds, data } (who + template data)
//
// Adding a new frontend scenario = add ONE entry here (+ its template). No new
// endpoint, no new queue, no new worker.

export interface ScenarioContext {
    // Everything the frontend sent except `key`.
    payload: Record<string, any>;
    // Caller's authed Supabase client (RLS applies) — used to resolve recipients.
    db: SupabaseClient;
    // The authenticated caller (event.user) — use for ownership checks.
    caller: any;
}

export interface ScenarioResult {
    // Recipients to notify.
    userIds: string[];
    // Shared data merged into the template (courseName, note, …).
    data: Record<string, any>;
}

export interface Scenario {
    // Key in notificationTemplates.ts `templates`.
    templateType: string;
    // false → DB-only (no FCM push).
    isPush: boolean;
    resolve: (ctx: ScenarioContext) => Promise<ScenarioResult>;
}

// Distinct, non-empty student ids enrolled in a course.
const enrolledStudentIds = async (
    db: SupabaseClient,
    courseId: string
): Promise<string[]> => {
    const { data, error } = await db
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId);
    if (error) throw new Error(error.message);
    return [
        ...new Set(
            (data ?? []).map((e: any) => e.student_id).filter(Boolean)
        ),
    ] as string[];
};

export const scenarios: Record<string, Scenario> = {
    // Faculty posted a note/announcement on an already-published course →
    // notify every enrolled student. In-app only (no push).
    // Frontend payload: { key: "COURSE_NOTE", courseId, note? }
    COURSE_NOTE: {
        templateType: "COURSE_NOTE",
        isPush: false,
        resolve: async ({ payload, db }) => {
            const courseId = payload?.courseId;
            if (!courseId) throw new Error("courseId is required");

            const { data: course, error } = await db
                .from("courses")
                .select("title")
                .eq("id", courseId)
                .single();
            if (error) throw new Error(error.message);

            const userIds = await enrolledStudentIds(db, courseId);
            return {
                userIds,
                data: {
                    courseId,
                    courseName: course?.title,
                    ...(payload?.note ? { note: payload.note } : {}),
                },
            };
        },
    },

    // Faculty added a new test to a course → notify every enrolled student.
    // In-app only (no push). Frontend payload: { key: "TEST_ADDED", testId }
    TEST_ADDED: {
        templateType: "TEST_ADDED",
        isPush: false,
        resolve: async ({ payload, db }) => {
            const testId = payload?.testId;
            if (!testId) throw new Error("testId is required");

            const { data: test, error } = await db
                .from("tests")
                .select("title, course_id, courses(title)")
                .eq("id", testId)
                .single();
            if (error) throw new Error(error.message);
            if (!test?.course_id) throw new Error("test has no course");

            const userIds = await enrolledStudentIds(db, test.course_id);
            return {
                userIds,
                data: {
                    courseId: test.course_id,
                    courseName: (test as any)?.courses?.title,
                    testId,
                    testTitle: test?.title,
                },
            };
        },
    },
};
