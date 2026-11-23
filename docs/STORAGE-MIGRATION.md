# Storage migration plan: AsyncStorage to expo-sqlite

Status: **design only, nothing here is implemented.** Written for WaKira 3.8.1 (Expo SDK 58) as part of H2.
Before any code is written, re-read the SDK 58 page: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite.md

## 1. Why move

| Problem today | Where it comes from |
|---|---|
| Android storage is capped at about 6 MB in total | AsyncStorage's Android database size default |
| One value over about 2 MB can no longer be read back on Android | Android's cursor window; `transactions` is one value |
| Every change rewrites the whole list | one JSON document per key |
| A save cut off half-way can leave damaged JSON | no transaction around the write |

3.8.1 (H1 + H2) makes these failures visible and stops them destroying data. It does not remove the limits.
At roughly 250 bytes per record, `transactions` reaches 1.5 MB (the warning level) near 6,000 records.

## 2. What is stored today

All access goes through `src/services/storage.ts` except where noted.

### Per user, prefix `u:<userId>:` (synced, in backups)

Read and written by `usePersistedState` (`src/hooks/use-persisted-state.ts`) through `saveKey` / `loadKey` in
`src/services/cloud-sync.ts`.

| Key | Owner | Shape | Growth |
|---|---|---|---|
| `transactions` | TransactionsContext | record list | **large, unbounded** |
| `transfers` | TransactionsContext | record list | medium |
| `accounts` | TransactionsContext | record list | small |
| `recurring`, `pending` | TransactionsContext | record list | small |
| `categories`, `categoriesSchema` | CategoriesContext | record list, number | small |
| `debts`, `ious` | DebtsContext | record list | small to medium |
| `plan_goals`, `plan_goal_entries` | PlanContext | record list | medium |
| `plan_reminders`, `plan_alerts_sent` | PlanContext | object, string list | small |
| `tax_claims`, `tax_prefs`, `alloc_plans` | ToolsContext | list, object, object | small to medium |
| `settings`, `hideAmounts` | SettingsContext, PrivacyContext | object, boolean | tiny |
| `profile_goals`, `account-custom-types`, `insight_state` | onboarding, account form, Analyse | small | tiny |
| `home-layout`, `home-quick-links`, `starter_on`, `starter_budget`, `story_seen` | Home, stories | small | tiny |

### Per user, not synced through the hook

| Key | Owner | Note |
|---|---|---|
| `ai:chat`, `ai:shortcuts`, `ai:consent` | `more/ai.tsx` | direct `loadJSON`/`saveJSON`; in backups |
| `scan:consent` | scan-receipt | flag |
| `__sync:<key>` | cloud-sync | `{ base, dirty, editedAt }` per key |
| `<key>.base` | sync-core | last copy phone and cloud agreed on (merge base) |
| `<key>.bak` | sync-core, backup | copy kept aside when replaced |
| `__recovery:<key>@<time>` | storage (3.8.1) | damaged text kept aside, raw, not JSON |

### Device-wide (not per user, never synced)

`auth:users`, `auth:session`, `auth:cloudUser`, `auth:profilePending:<id>`, `auth:importDismissed:<id>`,
`auth:importOffered:<id>`, `app:language`, `app:themePreference`, `app:textSize`, `app:introSeen`,
`app:pendingImport`, `app:coachSeen:<id>`, `app:deviceSeen:<id>`, `updates:lastSeenVersion`, `wakira.errorlog`,
`wakira:card-gyro`, the feedback draft key, plus the Supabase session (written by supabase-js itself).
PIN data (`wakira.lock.*`) is in SecureStore and is **out of scope**.

Direct `AsyncStorage` calls outside `storage.ts` (must be routed through the adapter in step 0):
`cloud-sync.ts` (getAllKeys, removeItem), `backup.ts` (getAllKeys), `CloudAuthProvider.tsx` (legacy import:
getAllKeys, multiGet, multiSet), `LocalAuthProvider.tsx`, `UpdatesContext.tsx`, `error-log.ts`, `feedback.ts`,
`intro.ts`, `cards/motion.ts`, `supabase.ts` (auth storage).

## 3. What depends on the current shape

- **Cloud sync**: one row per `(user_id, key)` in Supabase `user_data`, value = the whole JSON document.
  `sync-core.ts` only needs `read / write / readMeta / writeMeta` (`LocalStore`). It does not care what is underneath.
- **Backup file** (`.wakira.json`, format 1): `{ keys: { <key>: <document> } }`. Same documents.
- **Legacy account import**: copies raw strings from `u:<localId>:*` to `u:<cloudId>:*`.

Conclusion: as long as "one key gives one JSON document" stays true at the `storage.ts` boundary, sync, backup and
restore keep working unchanged.

## 4. Recommended approach: two stages

### Stage A (recommended next): same documents, SQLite underneath

Keep the document-per-key model; replace only the engine under `storage.ts`.

- One table: `kv(key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL)`.
- Open with `SQLite.openDatabaseAsync('wakira.db')`, `PRAGMA journal_mode = WAL`, schema version in `PRAGMA user_version`.
- Each `setItem` is a single statement, so it is atomic: no half-written value.
- `markEdited` (value + `__sync` meta) and `agreed` (base + meta) become one transaction each, which closes the
  "data saved but bookkeeping not" gap that 3.8.1 can only report.
- expo-sqlite also ships a ready key-value store (`expo-sqlite/kv-store`) documented as a drop-in for the
  AsyncStorage API. Using it is the smallest change; our own table gives multi-key transactions. Decide in step 0.
- **Web keeps AsyncStorage** (localStorage). SQLite on web needs extra setup and exclusive transactions are not
  available there, so `storage.ts` picks the engine by platform.

Gain: the 6 MB and 2 MB Android limits go away, writes are atomic. Risk: low, because nothing above `storage.ts` changes.

### Stage B (later, only if needed): rows instead of documents

`transactions` and `transfers` as real tables (one row per record, indexed by date and account). Needed for
record-level sync (P2), integer sen (L2) and faster balances (L3). This changes `usePersistedState` consumers,
sync-core's merge and the Supabase schema, so it is a separate project with its own design. **Do not combine with Stage A.**

## 5. Stage A migration, step by step

0. **Adapter first, no behaviour change.** Give `storage.ts` an internal engine interface
   (`getItem, setItem, removeItem, getAllKeys, multiRemove`) and route every direct `AsyncStorage` call listed in
   section 2 through it. Ship this alone. All existing tests must pass unchanged.
1. **Add expo-sqlite** with `npx expo install expo-sqlite` (never plain `npm install`). Confirm on the SDK 58 page
   whether a new build is required for your Android APK / dev client.
2. **Migrate once, at start-up, before any provider reads data** (inside the splash, before `AuthProvider`):
   1. If `kv` has `__migration = done`, use SQLite. Finished.
   2. Read all AsyncStorage keys. For each key read the raw string (no JSON parsing: damaged text is copied as it is).
      A key that cannot be read **aborts** the migration (see 6).
   3. In ONE transaction: insert every key and value.
   4. Verify: same key count, and for every key the stored length and a checksum (SHA-256 via expo-crypto) match.
   5. Only then write `__migration = done` with the app version and date.
   6. **Leave AsyncStorage untouched.** It is the rollback copy.
3. **Run on SQLite.** AsyncStorage is no longer written.
4. **Two releases later**, after no migration errors in the error logs, offer "free old storage" (removes the
   AsyncStorage copy). Never automatic.

Supabase's own session storage can stay on AsyncStorage; it is tiny and independent.

## 6. When migration fails

| Situation | Behaviour |
|---|---|
| A key cannot be read from AsyncStorage | Abort. Stay on AsyncStorage this session. Log it. Retry next launch. |
| SQLite cannot be opened or written (no space) | Abort, roll back the transaction, stay on AsyncStorage. |
| Verification mismatch | Drop the `kv` table contents, stay on AsyncStorage, log it. |
| App killed mid-migration | No `done` marker, so next launch starts again from a clean table. |

After three failed attempts, stop retrying automatically and show one line in More > Data & Privacy with a
"try again" action. The app must stay fully usable on AsyncStorage in every case.

**Rollback after a successful migration** (a bug found in the SQLite path): a remote-configurable or build-time flag
`STORAGE_ENGINE = 'async'` makes the app read AsyncStorage again. Data written to SQLite since the migration would be
missing, so before switching back the app must export SQLite to AsyncStorage (same copy-and-verify routine in
reverse). Cloud users are additionally protected by the cloud copy; local-only users by the backup file. Prompt for
a backup file in the release notes of the migration release.

## 7. Tests required before release

- `scripts/storage-selftest.mjs` runs against **both** engines (the fake engine gains a SQLite-like twin).
- Migration: empty install; 26 keys; damaged value copied byte for byte; read failure aborts and leaves both stores
  intact; kill between insert and marker; second launch is a no-op; 10 MB `transactions`.
- `sync:test`, `ledger:test`, `faham:test` unchanged and passing.
- On devices: Android APK upgrade from 3.8.x with real data, iPhone via Expo Go or dev build, web still on
  localStorage, backup made on 3.8.x restores on the new version and the other way round.

## 8. Open questions for the developer

1. Own `kv` table or `expo-sqlite/kv-store`? (Own table recommended for the two multi-key transactions.)
2. Raise AsyncStorage's Android size as a stop-gap before Stage A? It needs a native build setting and does not
   fix the 2 MB per-value read limit, so it is not recommended on its own.
3. Encryption at rest (SQLCipher) belongs with P1; check the SDK 58 page for the config plugin option before deciding.
4. Is Stage B wanted at all before record-level sync (P2) is scheduled?

## 9. Estimated effort

| Step | Effort | Risk |
|---|---|---|
| 0. Adapter | 0.5 to 1 day | very low |
| 1 to 3. SQLite engine + migration + tests | 2 to 3 days | medium (device testing decides) |
| 4. Clean-up release | 0.5 day | low |
| Stage B | 2+ weeks, separate design | high |
