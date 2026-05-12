

import { Redis } from "@upstash/redis";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const url = process.env.UPSTASH_REDIS_URL;
const token = process.env.UPSTASH_REDIS_TOKEN;

if (!url || !token) {
    throw new Error(
        "Missing Redis configuration: UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be set"
    );
}

export const redis = new Redis({ url, token });
