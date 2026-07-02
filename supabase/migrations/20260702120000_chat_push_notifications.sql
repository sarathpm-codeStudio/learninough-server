-- Chat push notifications: device-token storage.
--
-- The message-insert → webhook trigger is configured via the Supabase DASHBOARD
-- (Database → Webhooks): table chat_messages, event INSERT, POST to the
-- background service's /webhooks/chat-message with an x-webhook-secret header.
-- That webhook enqueues onto ChatNotificationQueue → chatNotificationWorker
-- sends FCM. There is intentionally NO online/offline check: every message
-- notifies the recipient(s).
--
-- This migration therefore only creates the device-token table + RLS. Do NOT
-- also add a SQL trigger here, or messages would be pushed twice.

-- ─── Device tokens ──────────────────────────────────────────
-- One row per registered device. The mobile app upserts its own token here
-- directly via Supabase (anon key + user JWT); RLS restricts each user to
-- their own rows. The background worker reads across users via the
-- service-role key (which bypasses RLS).
create table if not exists public.user_devices (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.profiles (id) on delete cascade,
    fcm_token   text not null unique,
    platform    text,                                   -- 'android' | 'ios' | 'web'
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists user_devices_user_id_idx on public.user_devices (user_id);

alter table public.user_devices enable row level security;

-- A user may read/register/update/remove only their OWN device tokens.
create policy "user_devices_select_own"
    on public.user_devices for select
    using (auth.uid() = user_id);

create policy "user_devices_insert_own"
    on public.user_devices for insert
    with check (auth.uid() = user_id);

create policy "user_devices_update_own"
    on public.user_devices for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "user_devices_delete_own"
    on public.user_devices for delete
    using (auth.uid() = user_id);

-- The INSERT → webhook trigger is set up in the Supabase Dashboard, not here.
-- See the header comment above.
