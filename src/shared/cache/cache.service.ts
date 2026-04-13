

// src/services/cache.service.ts
import { redis } from "../../config/redis";

export const cacheService = {

    // Store any data with expiry (seconds)
    set: async (key: string, value: any, expirySeconds = 3600) => {
        await redis.set(key, JSON.stringify(value), { ex: expirySeconds });
    },

    // Get data
    get: async <T>(key: string): Promise<T | null> => {
        const data = await redis.get<string>(key);
        if (!data) return null;
        return JSON.parse(data) as T;
    },

    // Delete a key
    delete: async (key: string) => {
        await redis.del(key);
    },

    // Check if key exists
    exists: async (key: string): Promise<boolean> => {
        const result = await redis.exists(key);
        return result === 1;
    },
};