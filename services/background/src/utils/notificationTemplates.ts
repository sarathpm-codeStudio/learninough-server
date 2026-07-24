// ─── Notification templates ─────────────────────────────────
// One entry per push scenario. The worker (notificationWorker.repository.ts)
// switches on the job's `type` to pick the builder here, which turns the job's
// `data` into the copy + in-app row.
//
// Adding a new scenario = add one entry to `templates` and enqueue with that
// type — no new queue, no new worker, no new FCM code.

export interface NotificationTemplate {
    // notifications.type is the `notification_type` enum — must be a valid label.
    notifType:
        | "COINS_EARNED"
        | "STREAK_REMINDER"
        | "BADGE_UNLOCKED"
        | "COURSE_UPDATE"
        | "EXAM_REMINDER";
    title: string;
    body: string;
    // Extra string map delivered to the app for deep-linking.
    pushData?: Record<string, string>;
}

export const templates: Record<string, (data: any) => NotificationTemplate> = {
    // Student completed the streak goal and earned coins.
    STREAK_REWARD: (d) => ({
        notifType: "COINS_EARNED",
        title: `🔥 ${d?.days ?? ""}-day streak!`.replace(/\s+/g, " ").trim(),
        body: `You earned ${d?.coins ?? 0} coins — keep it going!`,
        pushData: {
            type: "STREAK_REWARD",
            coins: String(d?.coins ?? 0),
            days: String(d?.days ?? 0),
        },
    }),

    // Student missed a day and lost their streak — re-engagement nudge.
    STREAK_BROKEN: () => ({
        notifType: "STREAK_REMINDER",
        title: "💔 You lost your streak",
        body: "Start a new one today!",
        pushData: { type: "STREAK_BROKEN" },
    }),

    // Faculty uploaded / updated a course — fan out to enrolled students.
    // Enqueue with `user_ids` (all students) + shared data { courseName, facultyName,
    // courseId }. Add a per-recipient { name } if you want to greet each student.
    COURSE_UPDATE: (d) => ({
        notifType: "COURSE_UPDATE",
        title: d?.name ? `Hi ${d.name}! New course material 📚` : "New course material 📚",
        body: `${d?.facultyName ?? "Your faculty"} added "${d?.courseName ?? "a course"}".`,
        pushData: {
            type: "COURSE_UPDATE",
            ...(d?.courseId ? { courseId: String(d.courseId) } : {}),
        },
    }),

    // Faculty added a new video to an ALREADY published course — notify every
    // enrolled student. Enqueue with `user_ids` (all enrolled students) + shared
    // data { courseName, courseId, videoTitle? } and `isPush: false` (in-app only).
    COURSE_NEW_VIDEO: (d) => ({
        notifType: "COURSE_UPDATE",
        title: "New video added 📹",
        body: `A new video${d?.videoTitle ? ` "${d.videoTitle}"` : ""} was added to "${d?.courseName ?? "your course"}".`,
        pushData: {
            type: "COURSE_NEW_VIDEO",
            ...(d?.courseId ? { courseId: String(d.courseId) } : {}),
        },
    }),

    // Faculty published a BRAND-NEW course — notify students who already purchased
    // any of this faculty's OTHER courses, so they know their faculty has a new
    // course out. In-app only (no push). Shared data { facultyName, courseName,
    // courseId }.
    FACULTY_NEW_COURSE: (d) => ({
        notifType: "COURSE_UPDATE",
        title: "New course from your faculty 🎓",
        body: `${d?.facultyName ?? "A faculty you follow"} just published a new course "${d?.courseName ?? "a course"}".`,
        pushData: {
            type: "FACULTY_NEW_COURSE",
            ...(d?.courseId ? { courseId: String(d.courseId) } : {}),
        },
    }),

    // Faculty posted a note / announcement on a published course — notify enrolled
    // students. Triggered from the frontend via the notification-trigger API.
    // Shared data { courseName, courseId, note? }; typically enqueued with isPush:false.
    COURSE_NOTE: (d) => ({
        notifType: "COURSE_UPDATE",
        title: `📝 Update in "${d?.courseName ?? "your course"}"`,
        body: d?.note ? String(d.note) : `${d?.courseName ?? "Your course"} has a new note from the faculty.`,
        pushData: {
            type: "COURSE_NOTE",
            ...(d?.courseId ? { courseId: String(d.courseId) } : {}),
        },
    }),

    // Faculty added a new test to a course — notify enrolled students. Triggered
    // from the frontend via the notification-trigger API.
    // Shared data { courseName, courseId, testId, testTitle }.
    TEST_ADDED: (d) => ({
        notifType: "EXAM_REMINDER",
        title: "📝 New test added",
        body: `${d?.testTitle ? `"${d.testTitle}"` : "A new test"} was added to "${d?.courseName ?? "your course"}".`,
        pushData: {
            type: "TEST_ADDED",
            ...(d?.courseId ? { courseId: String(d.courseId) } : {}),
            ...(d?.testId ? { testId: String(d.testId) } : {}),
        },
    }),
};
