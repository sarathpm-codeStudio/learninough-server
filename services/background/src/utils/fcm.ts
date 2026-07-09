
import * as admin from "firebase-admin";

// Firebase Cloud Messaging (FCM) — direct, via the Firebase Admin SDK.
//
// Credentials come from the service-account env vars already provisioned in the
// server's .env / SSM: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
// FIREBASE_PRIVATE_KEY. The private key is stored with escaped "\n" sequences
// (single-line env var), so we unescape them back into real newlines.

let app: admin.app.App | null = null;

const getApp = (): admin.app.App => {
    if (app) return app;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Missing FCM configuration: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must be set"
        );
    }

    // Reuse an already-initialized app across warm Lambda invocations.
    app = admin.apps.length
        ? admin.app()
        : admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    return app;
};

export interface PushPayload {
    title: string;
    body: string;
    // Arbitrary string map delivered to the app (deep-link data, ids, etc.).
    data?: Record<string, string>;
}

// Send one notification to many device tokens. Returns the tokens FCM reported
// as permanently invalid (unregistered / bad) so the caller can prune them.
export const sendPushToTokens = async (
    tokens: string[],
    payload: PushPayload
): Promise<{ successCount: number; invalidTokens: string[] }> => {
    if (tokens.length === 0) return { successCount: 0, invalidTokens: [] };

    const messaging = getApp().messaging();
    const response = await messaging.sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
    });

    const invalidTokens: any[] = [];
    response.responses.forEach((res: any, i: any) => {
        if (res.success) return;
        const code = res.error?.code ?? "";
        // These codes mean the token will never work again → safe to delete.
        if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token" ||
            code === "messaging/invalid-argument"
        ) {
            invalidTokens.push(tokens[i]);
        }
    });

    return { successCount: response.successCount, invalidTokens };
};
