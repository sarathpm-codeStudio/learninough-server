# Student Streak Workflow Reference

> **Project:** LMS Platform
> **Last Updated:** July 2026 (2-cron split — settle at midnight IST, dispatch pushes at 08:00 IST via scheduled_notifications)
> **Purpose:** Full reference for the daily student-streak system — how a streak is counted, when the coin reward is granted, when a streak breaks, and how the reward / come-back push notifications are scheduled and sent.
> **Status:** IMPLEMENTED (background service).

---

## Design at a glance (2-cron split)

The streak math and the push delivery happen at **different times**:

- **Cron A — Settle** (`studentStreakCron`, 00:00 IST): does ALL the DB work for
  the day that just ended — updates `streak_days`, awards coins on the goal,
  resets broken streaks — then **stages** each reward/broken push into the
  `scheduled_notifications` table with `scheduled_for = the coming 08:00 IST`.
  No push is sent at midnight.
- **Cron B — Dispatch** (`notificationDispatchCron`, 08:00 IST): drains every
  due `scheduled_notifications` row onto `NotificationQueue` →
  `notificationWorker` → FCM.

**Why two crons:** FCM has no server-side scheduled delivery and SQS message
delay caps at 15 minutes, so an 8-hour "compute now, notify at 8 AM" gap must be
held on our side — the staging table + dispatch cron is that mechanism.

Streak model: **A — cycle reset** (1→7, reward, back to 0). Reward is delivered
the morning after the day the goal was completed (the 1-morning delay is
accepted).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Schema Overview](#2-database-schema-overview)
3. [Platform Settings (admin-tunable)](#3-platform-settings-admin-tunable)
4. [Flow Overview](#4-flow-overview)
5. [Streak Counting Logic](#5-streak-counting-logic)
6. [Reward & Reset (Model A — cycle reset)](#6-reward--reset-model-a--cycle-reset)
7. [Timing — the 1-morning delay](#7-timing--the-1-morning-delay)
8. [Notifications](#8-notifications)
9. [Serverless Wiring](#9-serverless-wiring)
10. [Streak Math (implementation)](#10-streak-math-implementation)
10. [Postgres RPC](#10-postgres-rpc)
11. [Files to Add](#11-files-to-add)
12. [Key Rules & Gotchas](#12-key-rules--gotchas)
13. [Open Decisions](#13-open-decisions)

---

## 1. Overview

A single **daily cron** wakes a Lambda, which runs **one atomic Postgres function**
(`update_daily_streaks`) that moves every student's streak forward for the day
that just ended. When a student completes the goal (7 consecutive active days)
they earn coins and the cycle resets. When a student misses a day, the streak
resets to 0. The function returns two lists — **earned** and **broken** — which
the Lambda fans out as push + in-app notifications, reusing the existing chat
notification pipeline.

- **Trigger:** EventBridge schedule, once per day at **08:00 IST**.
- **Compute:** set-based SQL in one transaction (scales regardless of student count).
- **Notify:** reuse `sendPushToTokens()` / `notifications` table (same as chat).

---

## 2. Database Schema Overview

### Tables Involved

| Table | Role |
|---|---|
| `profiles` | Holds `streak_days`, `last_active`, `coin_balance` per student |
| `daily_analytics` | Per-user-per-day activity rollup — the **activity signal** (`date`, `active_seconds`, `streak_day`) |
| `platform_settings` | Admin-tunable config — streak goal length & coin reward |
| `coin_transactions` | Audit row inserted on every coin award (`type` enum = `CREDIT`) |
| `scheduled_notifications` | **Staging table** — Cron A stages pushes here; Cron B dispatches when due |
| `notifications` | In-app notification row per event (created by the worker) |
| `notification_devices` | FCM device tokens (`token`, `is_active`) — read for push, dead tokens deactivated |

### Key Columns

**profiles**
```
streak_days    int          -- current streak count (0..7 in Model A)
last_active    timestamptz  -- last day the student was counted active (set to D noon IST)
coin_balance   int          -- running coin total
```

**daily_analytics**
```
user_id        uuid
date           date         -- one row per active day
active_seconds int          -- compared against the 60s activity threshold
streak_day     boolean      -- flipped true once the day is settled (idempotency guard)
```

**scheduled_notifications**
```
type           text         -- STREAK_REWARD | STREAK_BROKEN | ...
user_id        uuid
data           jsonb        -- { coins, days }
scheduled_for  timestamptz  -- the coming 08:00 IST
status         text         -- pending | sent
sent_at        timestamptz
```

---

## 3. Platform Settings (admin-tunable)

The cron reads these live from `platform_settings` — never hard-code them.

| key | value | Meaning |
|---|---|---|
| `default_streak_days` | `7` | Length of one streak cycle (the goal) |
| `default_streak_coin_count` | `5` | Coins awarded when the goal is reached |
| `default_coin_value` | `3` | ₹ value per coin (display/conversion only) |

> If the admin changes `default_streak_days` from 7 to e.g. 10, the new goal
> applies on the next run. See [Gotchas](#12-key-rules--gotchas).

---

## 4. Flow Overview

```
CRON A — SETTLE   00:00 IST  (cron(30 18 * * ? *) = 18:30 UTC)   D = yesterday (IST)
│  updateStreaks.handler → streakRepository.runDailyStreaks()
│  reads platform_settings (7 / 5 / 3)
│  per student active on D? (daily_analytics row, active_seconds ≥ 60)
│    ├─ active D-1 (daily_analytics) → streak + 1
│    ├─ gap / first time             → streak = 1
│    ├─ streak reaches 7             → AWARD coins (coin_transactions CREDIT) + reset 0
│    └─ set last_active = D, daily_analytics.streak_day = true   (idempotency flag)
│  broken: streak_days > 0 AND not active on D → streak = 0
│
▼  STAGE (do NOT send now):
   INSERT scheduled_notifications
     earned → { type:STREAK_REWARD, data:{coins,days} }
     broken → { type:STREAK_BROKEN }
     scheduled_for = the coming 08:00 IST, status = 'pending'

        …students asleep, DB already settled…

CRON B — DISPATCH   08:00 IST  (cron(30 2 * * ? *) = 02:30 UTC)
│  notificationDispatch.handler → notificationSchedulerRepository.dispatchDue()
│  SELECT * FROM scheduled_notifications WHERE status='pending' AND scheduled_for <= now()
│  each → pushToQueue(NotificationQueue, { type, user_id, data })
│  mark status='sent', sent_at=now   (only rows that enqueued OK)
│
▼
NotificationQueue → notificationWorker (switch on type)
   → insert notifications row  (COINS_EARNED / STREAK_REMINDER)
   → sendPushToTokens() from notification_devices (token, is_active)
   → deactivate invalid tokens
▼
📱 student device   🔥 reward  /  💔 come-back
```

---

## 5. Streak Counting Logic

`D` = the day that just ended (yesterday, in IST). For each student:

**Active on D** — has a `daily_analytics` row for `D` with `active_seconds ≥ threshold`:

| Condition | Result |
|---|---|
| `last_active = D - 1` | `streak_days + 1` (continued) |
| `last_active = D` | no change (idempotent — safe re-run) |
| gap / first activity | `streak_days = 1` (restart) |

Then always: `last_active = D`, and stamp `daily_analytics.streak_day` for that row.

**Not active on D** — no qualifying row for `D`:

| Condition | Result |
|---|---|
| `last_active < D` **and** `streak_days > 0` | `streak_days = 0` (broken) |
| otherwise | untouched (no needless writes) |

---

## 6. Reward & Reset (Model A — cycle reset)

**Chosen model: A — the streak counts 1 → 7, then resets to 0 and repeats.**

When `streak_days` reaches `default_streak_days` (7), in the **same transaction**:

1. `profiles.coin_balance += default_streak_coin_count` (5)
2. insert `coin_transactions` row — `type='streak'`, `coin_count=5`, `balance_after=<new>`
3. `profiles.streak_days = 0` — the cycle restarts

Next active day the student begins a fresh cycle at `streak_days = 1`.

> **Why award + reset must be atomic:** if they are split and the run crashes
> between them, the student either gets paid twice (award, no reset) or loses a
> reward (reset, no award). One transaction removes that failure mode.

---

## 7. Timing — the 1-morning delay

A day is not "complete" until it ends at midnight, so the cron confirms the
finished day **the next morning**. There is always a one-morning delay between
the qualifying activity and the notification — this is inherent to any daily
batch and is expected behaviour.

Example — student active every day:

| Day | Date | Activity | Cron next morning (08:00) | Push |
|---|---|---|---|---|
| 6 | Jul 6 | ✅ | Jul 7 → streak = 6 | — |
| **7** | **Jul 7** | ✅ completes 7th day | **Jul 8 → streak hits 7** | **🔥 reward (5 coins)** |
| 8 | Jul 8 | ✅ new cycle | Jul 9 → streak = 1 | — |

So: finish day 7 during **Jul 7** → reward push arrives **Jul 8 at 08:00 IST**.
The same applies to a broken streak — a missed day is confirmed, and the 💔 push
sent, the following morning.

> Instant (in-the-moment) rewards would require the **app/API** to award live
> when it records activity — out of scope for the background cron.

---

## 8. Notifications

Delivery is a **shared, type-based** pipeline (`NotificationQueue` +
`notificationWorker`) that any feature can reuse. Cron B enqueues a job
`{ type, user_id, data }`; the worker switches on `type`:

1. build copy from the `templates` map for that `type`.
2. insert a `notifications` row (in-app bell) — `type` mapped to the
   `notification_type` enum (reward → `COINS_EARNED`, broken → `STREAK_REMINDER`).
3. read tokens from **`notification_devices`** (`token`, `is_active = true`) and
   call `sendPushToTokens()` (`utils/fcm`, reused — not re-created).
4. deactivate invalid tokens (`is_active = false`).

**Copy:**

| Job type | notification_type | Title | Body |
|---|---|---|---|
| `STREAK_REWARD` | `COINS_EARNED` | 🔥 7-day streak! | You earned 5 coins — keep it going! |
| `STREAK_BROKEN` | `STREAK_REMINDER` | 💔 You lost your streak | Start a new one today! |

> **Schema note:** the device table is `notification_devices.token` (NOT
> `user_devices.fcm_token`, which does not exist), and `notifications.type` is
> the `notification_type` enum — arbitrary strings are rejected.

---

## 9. Serverless Wiring

Two scheduled functions + the shared SQS worker in `serverless.yml`:

```yaml
  # Cron A — settle at day-end, stage the pushes.
  studentStreakCron:
    handler: src/functions/streak/updateStreaks.handler
    timeout: 300
    events:
      - schedule:
          rate: cron(30 18 * * ? *)  # 18:30 UTC = 00:00 IST (day end)
          enabled: true

  # Cron B — dispatch staged pushes.
  notificationDispatchCron:
    handler: src/functions/notification/notificationDispatch.handler
    timeout: 300
    events:
      - schedule:
          rate: cron(30 2 * * ? *)   # 02:30 UTC = 08:00 IST daily
          enabled: true

  # Shared push worker — one queue for every scenario.
  notificationWorker:
    handler: src/functions/notification/notificationWorker.handler
    timeout: 60
    events:
      - sqs:
          arn: !GetAtt NotificationQueue.Arn
          batchSize: 1
          functionResponseType: ReportBatchItemFailures
```

Plus `NotificationQueue` + `NotificationDLQ`, `NOTIFICATION_QUEUE_URL`, and IAM
send/receive perms on the queue.

> EventBridge cron is **UTC**. The "day" (`D`) is computed in **IST**
> (`IST_OFFSET_MS`) consistently, so activity near midnight is bucketed correctly.

---

## 10. Streak Math (implementation)

Implemented in **JS** inside `streak.repository.ts` (not a Postgres RPC — kept
self-contained in the background service):

```
D    = yesterday (IST)   Dm1 = day before (IST)
1. daily_analytics rows for [D, Dm1] with active_seconds >= 60  → activeD / activeDm1 sets
2. profiles for activeD users (role, streak_days, coin_balance)
3. per active-on-D student (skip if daily_analytics(D).streak_day already true):
     continued = activeDm1.has(user)
     newStreak = continued ? streak_days + 1 : 1
     newStreak >= goal → award: coin_balance += reward (single row update),
                          insert coin_transactions(CREDIT), streak_days = 0
     else              → streak_days = newStreak
     set last_active = D, daily_analytics(D).streak_day = true
4. broken = profiles(role STUDENT, streak_days > 0) not active on D → streak_days = 0
5. stage earned/broken into scheduled_notifications (scheduled_for = 08:00 IST)
```

Goal & reward are read live from `platform_settings`
(`default_streak_days`, `default_streak_coin_count`).

---

## 11. Files (implemented)

```
services/background/
  serverless.yml                                      (Cron A rate → midnight, + Cron B, + NotificationQueue/DLQ, IAM, env)
  src/functions/streak/updateStreaks.ts               (Cron A handler)
  src/modules/streak/streak.service.ts                (orchestration)
  src/modules/streak/streak.repository.ts             (streak math + stage into scheduled_notifications)
  src/functions/notification/notificationDispatch.ts  (Cron B handler)
  src/functions/notification/notificationWorker.ts    (SQS worker handler)
  src/modules/notification/notification.service.ts    (worker + dispatch orchestration)
  src/modules/notification/notificationWorker.repository.ts     (type→push fan-out, reuses utils/fcm)
  src/modules/notification/notificationScheduler.repository.ts  (dispatchDue — drains staging table)
supabase migration:
  create_scheduled_notifications                      (staging table + due index + RLS)
```

---

## 12. Key Rules & Gotchas

- **Idempotent:** re-running the cron for the same `D` must not double-count or
  double-award. Guaranteed by `last_active = D` skip + award-and-reset in one txn.
- **Atomic award+reset:** never split the coin award from the `streak_days → 0`
  reset (see §6).
- **Timezone:** all day math in **IST**; the AWS schedule is UTC (`02:30`).
- **Notification timing:** 08:00 IST is deliberate — midnight pushes are a bad UX.
- **Broken flagged once:** because a break resets to 0, the next run won't
  re-flag the same student — one 💔 push per broken streak.
- **Reset writes only when needed:** break branch touches only `streak_days > 0`
  rows, avoiding a full-table update every night.
- **Goal change mid-cycle:** if the admin edits `default_streak_days`, students
  mid-cycle are measured against the new goal on the next run. Acceptable; note
  it if UX complains.

---

## 13. Open Decisions

| # | Decision | Recommended default |
|---|---|---|
| 1 | Streak number model | **A — cycle reset** (1→7→0), as designed |
| 2 | Activity signal | `daily_analytics` row with `active_seconds ≥ threshold` |
| 3 | Activity threshold | e.g. `≥ 60s` active (confirm value) |
| 4 | Notification delivery | **A — direct in cron** (switch to B/SQS if scale demands) |
| 5 | In-app + push | both (mirrors chat worker) |
| 6 | Streak-length source | live `platform_settings.default_streak_days` |
```
