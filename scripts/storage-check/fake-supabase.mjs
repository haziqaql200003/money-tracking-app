// Stand-in for src/services/supabase.ts. Cloud mode is off unless a test turns it on with a fake cloud.
export let CLOUD_ENABLED = false;
export let supabase = null;

/** docs: Map<key, { value, updated_at }>. Only what the sync adapter's pull/insert/update chains need. */
export function setFakeCloud(docs) {
  CLOUD_ENABLED = !!docs;
  supabase = !docs
    ? null
    : {
        from() {
          let key = null;
          const q = {
            select: () => q,
            eq: (col, v) => {
              if (col === 'key') key = v;
              return q;
            },
            maybeSingle: async () => ({ data: docs.get(key) ?? null, error: null }),
            single: async () => ({ data: null, error: new Error('fake cloud: writes are not expected in this test') }),
            insert: () => q,
            update: () => q,
            upsert: () => q,
            // awaiting the query itself = "every row of this user" (the first sign-in download)
            then: (ok) => ok({ data: [...docs].map(([k, d]) => ({ key: k, ...d })), error: null }),
          };
          return q;
        },
      };
}
