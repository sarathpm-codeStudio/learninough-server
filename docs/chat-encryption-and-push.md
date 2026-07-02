# Chat message encryption + push notifications

This documents the shared contract the **mobile app** must implement to stay
compatible with the faculty web, admin web, and server. Two independent things:

1. **Message encryption** — client-side, shared symmetric key.
2. **Push notifications** — server-side, FCM, fired on every message.

---

## 1. Message encryption (mobile MUST match this exactly)

Every client encrypts a message before inserting it into `chat_messages.content`
and decrypts after reading. The database only ever stores ciphertext. All
clients share ONE key and this exact wire format.

### Algorithm
- Cipher: **AES-256-GCM**
- Key: a **64-character hex string** (from `openssl rand -hex 32`), **hex-decoded
  to 32 raw bytes** = 256 bits. All clients must hex-decode the same string.
- IV: **16 random bytes** per message
- Auth tag: **16 bytes** (128-bit GCM tag)

### Wire format
The stored value is **base64** of the concatenation, in this order:

```
base64( IV(16 bytes) || AUTH_TAG(16 bytes) || CIPHERTEXT )
```

> Note: many crypto libraries (incl. WebCrypto and most mobile GCM APIs) output
> `CIPHERTEXT || AUTH_TAG` with the tag appended at the END. This format puts the
> tag BEFORE the ciphertext. So on encrypt you must move the last 16 bytes to the
> front (after the IV); on decrypt you split `[0:16]=IV`, `[16:32]=tag`,
> `[32:]=ciphertext` and reassemble as your library expects.

### The shared key
- Env var name in the web apps: `VITE_CHAT_ENCRYPTION_KEY`
- Server (Node) reference implementation uses the same layout
  (`services/*/src/utils/bank.encryption.ts`).
- The mobile app must ship the **same 64-char hex key** and hex-decode it to 32
  bytes. Store it as securely as the platform allows (it is still extractable
  from an app build — see Security note).

### Reference (matches faculty/admin `src/utils/chatEncryption.ts`)
- Encrypt: random 16-byte IV → AES-256-GCM encrypt → take library output
  `ciphertext||tag`, split off the trailing 16-byte tag → build
  `IV || tag || ciphertext` → base64.
- Decrypt: base64-decode → `IV=[0:16]`, `tag=[16:32]`, `ciphertext=[32:]` →
  reassemble to whatever your GCM API needs → decrypt → UTF-8.

### Legacy / mixed data
Decryption should be **best-effort**: if a value fails to decrypt (e.g. an old
plaintext message sent before this shipped), fall back to showing the raw value
rather than crashing. The web apps use a `decryptMessageSafe` wrapper that does
this.

### Security note (accepted tradeoff)
Because the key ships inside the app, this protects against a **database leak**
(rows are unreadable without the key) but NOT against someone who extracts the
key from a shipped app binary. This is not full end-to-end encryption. It was
chosen deliberately so mobile can interoperate without a key-exchange system.

---

## 2. Push notifications (what mobile must do)

Pushes are sent by the server on **every** chat message — there is **no**
online/offline check.

### Pipeline (server-side, already implemented)
```
chat_messages INSERT (any client)
  → Postgres trigger `notify_chat_message` (pg_net)
  → POST /webhooks/chat-message  (background service, x-webhook-secret header)
  → enqueue ChatNotificationQueue (SQS)
  → chatNotificationWorker → Firebase Admin FCM → recipient's devices
```
Recipients are derived from `chat_room_members` (everyone in the room except the
sender), so the sender does not need to set `receiver_id`.

### What the mobile app must implement
1. **Register the device token.** On login / token refresh, upsert into the
   `user_devices` table via Supabase (anon key + the user's JWT):
   ```
   supabase.from('user_devices').upsert(
     { user_id: <auth uid>, fcm_token: <token>, platform: 'android' | 'ios' },
     { onConflict: 'fcm_token' }
   )
   ```
   RLS allows a user to write only their own rows. Remove the row on logout.
2. **Handle the push payload.** The notification carries:
   - `notification.title` = sender's name
   - `notification.body`  = e.g. "<name> sent you a message" (the message text is
     NOT included — it's encrypted)
   - `data` = `{ type: 'CHAT_MESSAGE', room_id, message_id }` for deep-linking.

### Server config required before this works (ops checklist)
Set these SSM params (`/learning-app/...`) consumed by `serverless.yml`:
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
  (private key with escaped `\n`)
- `CHAT_WEBHOOK_SECRET` (must equal the secret in the migration's trigger)

And in the migration `20260702120000_chat_push_notifications.sql`, replace the
two `CHANGE_ME` placeholders (the deployed webhook URL and the shared secret)
before/after applying it. Run `npm install` in `services/background` to pull in
`firebase-admin`.
