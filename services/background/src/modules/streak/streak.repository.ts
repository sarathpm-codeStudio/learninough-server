import { supabaseAdmin } from "../../utils/supabaseAdmin";

// ─── Daily student streak settlement (Cron A) ───────────────
// Runs at day-end (00:00 IST) for the day that just ended (`D`). Uses
// `daily_analytics` as the source of truth for "was the student active that
// day" — NOT profiles.last_active, which the app may touch in real time.
//
//   • active on D & active on D-1  → streak_days + 1   (continued)
//   • active on D but not D-1      → streak_days = 1    (restart)
//   • streak_days reaches the goal → award coins + reset to 0   (Model A)
//   • had a streak but missed D    → streak_days = 0    (broken)
//
// Idempotent: daily_analytics.streak_day (boolean) is flipped true once a day is
// settled, so a re-run skips it. The DB work is done NOW, but pushes are NOT
// sent now — earned/broken users are STAGED into scheduled_notifications with
// scheduled_for = the coming 08:00 IST. The dispatch cron (Cron B) delivers them.

// Minimum active_seconds for a day to count toward a streak.
const ACTIVE_SECONDS_THRESHOLD = 60;

// Streaks are day-based; the whole system uses one fixed timezone (IST).
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// YYYY-MM-DD for the given instant, in IST.
const istDate = (d: Date): string =>
    new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

const getSettingInt = async (key: string, fallback: number): Promise<number> => {
    const { data } = await supabaseAdmin
        .from("platform_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
    const n = parseInt(data?.value ?? "", 10);
    return Number.isFinite(n) ? n : fallback;
};

export const streakRepository = {
    runDailyStreaks: async () => {
        const now = new Date();
        // D = yesterday (IST) — the finished day we settle this morning.
        const D = istDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
        const Dm1 = istDate(new Date(now.getTime() - 48 * 60 * 60 * 1000));

        // Admin-tunable goal + reward, read live from platform_settings.
        const goal = await getSettingInt("default_streak_days", 7);
        const reward = await getSettingInt("default_streak_coin_count", 5);

        // 1. Qualifying activity rows for D and D-1 in one query.
        const { data: rows, error } = await supabaseAdmin
            .from("daily_analytics")
            .select("user_id, date, active_seconds, streak_day")
            .in("date", [D, Dm1])
            .gte("active_seconds", ACTIVE_SECONDS_THRESHOLD);
        if (error) throw new Error(error.message);

        const activeD = new Map<string, any>(); // user_id -> D row
        const activeDm1 = new Set<string>();
        for (const r of rows ?? []) {
            if (r.date === D) activeD.set(r.user_id, r);
            else if (r.date === Dm1) activeDm1.add(r.user_id);
        }

        const earned: { user_id: string; coins: number; days: number }[] = [];
        const brokenIds: string[] = [];

        // 2. Load profiles for everyone active on D.
        const activeIds = [...activeD.keys()];
        const profilesById = new Map<string, any>();
        if (activeIds.length) {
            const { data: profs, error: pErr } = await supabaseAdmin
                .from("profiles")
                .select("id, role, streak_days, coin_balance")
                .in("id", activeIds);
            if (pErr) throw new Error(pErr.message);
            for (const p of profs ?? []) profilesById.set(p.id, p);
        }

        // 3. Settle each student who was active on D.
        for (const [uid, dRow] of activeD) {
            const prof = profilesById.get(uid);
            if (!prof || prof.role !== "STUDENT") continue;
            if (dRow.streak_day === true) continue; // already settled for D

            const continued = activeDm1.has(uid);
            const newStreak = continued ? (prof.streak_days ?? 0) + 1 : 1;

            const profileUpdate: any = { last_active: `${D}T12:00:00+05:30` };
            let rewarded = false;

            if (newStreak >= goal) {
                // Goal reached: award coins + reset the cycle IN ONE row update
                // so the balance change and reset commit together.
                rewarded = true;
                const newBalance = (prof.coin_balance ?? 0) + reward;
                profileUpdate.streak_days = 0;
                profileUpdate.coin_balance = newBalance;

                const { error: cErr } = await supabaseAdmin
                    .from("coin_transactions")
                    .insert({
                        user_id: uid,
                        type: "CREDIT",
                        coin_count: reward,
                        balance_after: newBalance,
                    });
                if (cErr) throw new Error(cErr.message);
            } else {
                profileUpdate.streak_days = newStreak;
            }

            const { error: upErr } = await supabaseAdmin
                .from("profiles")
                .update(profileUpdate)
                .eq("id", uid);
            if (upErr) throw new Error(upErr.message);

            // Mark the day settled (idempotency guard for re-runs).
            await supabaseAdmin
                .from("daily_analytics")
                .update({ streak_day: true })
                .eq("user_id", uid)
                .eq("date", D);

            if (rewarded) earned.push({ user_id: uid, coins: reward, days: goal });
        }

        // 4. Broken streaks: a live streak (streak_days > 0) with no activity on D.
        const { data: streakers, error: sErr } = await supabaseAdmin
            .from("profiles")
            .select("id, role, streak_days")
            .eq("role", "STUDENT")
            .gt("streak_days", 0);
        if (sErr) throw new Error(sErr.message);

        for (const s of streakers ?? []) {
            if (activeD.has(s.id)) continue; // active today → handled above
            brokenIds.push(s.id);
        }

        if (brokenIds.length) {
            const { error: rErr } = await supabaseAdmin
                .from("profiles")
                .update({ streak_days: 0 })
                .in("id", brokenIds);
            if (rErr) throw new Error(rErr.message);
        }

        // 5. STAGE push jobs — deliver at the coming 08:00 IST, not now.
        //    (We settled at midnight; the dispatch cron sends these in the morning.)
        const scheduledFor = `${istDate(now)}T08:00:00+05:30`;
        const jobs = [
            ...earned.map((e) => ({
                type: "STREAK_REWARD",
                user_id: e.user_id,
                data: { coins: e.coins, days: e.days },
                scheduled_for: scheduledFor,
                status: "pending",
            })),
            ...brokenIds.map((uid) => ({
                type: "STREAK_BROKEN",
                user_id: uid,
                data: null,
                scheduled_for: scheduledFor,
                status: "pending",
            })),
        ];

        if (jobs.length) {
            const { error: insErr } = await supabaseAdmin
                .from("scheduled_notifications")
                .insert(jobs);
            if (insErr) throw new Error(insErr.message);
        }

        const summary = {
            date: D,
            goal,
            reward,
            active: activeD.size,
            earned: earned.length,
            broken: brokenIds.length,
            scheduledFor,
        };
        console.log("runDailyStreaks summary", summary);
        return summary;
    },
};
