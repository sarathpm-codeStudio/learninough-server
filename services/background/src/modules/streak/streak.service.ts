import { streakRepository } from "./streak.repository";

export const streakService = {
    // Settles yesterday's streaks and enqueues reward / broken push jobs.
    runDailyStreaks: async () => {
        try {
            return await streakRepository.runDailyStreaks();
        } catch (error: any) {
            throw new Error(error.message);
        }
    },
};
