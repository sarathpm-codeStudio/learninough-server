// parseBody.ts
// API Gateway is configured with binaryMediaTypes '*/*' (needed for xlsx
// exports), which makes it base64-encode EVERY request body — including JSON
// webhooks. Always decode via this helper instead of JSON.parse(event.body).
export const parseJsonBody = (event: any): any => {
    if (event?.body == null) return null;
    if (typeof event.body !== "string") return event.body;

    const raw = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;

    return JSON.parse(raw);
};
