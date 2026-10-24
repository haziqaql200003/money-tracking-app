// WaKira 3.4.0: log masuk dengan nama pengguna.
// Deploy:  supabase functions deploy login-username
// (tiada secret tambahan; guna SUPABASE_URL, SUPABASE_ANON_KEY dan SUPABASE_SERVICE_ROLE_KEY yang sedia ada)
// Perlu jadual login_attempts daripada supabase/006_username.sql.
// Nama pengguna -> akaun dicari DI SINI, jadi e-mel pengguna tidak pernah dihantar ke app sebelum kata laluan disahkan.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const USERNAME_RE = /^[a-z][a-z0-9_.]{2,19}$/;
const BAD = { error: 'invalid_credentials' }; // jawapan sama untuk "nama tiada" dan "kata laluan salah"

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const username = String(body.username ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!USERNAME_RE.test(username) || !password || password.length > 200) return json(BAD, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Had cubaan: 5 kegagalan dalam 15 minit untuk nama yang sama -> tolak sementara (lindung daripada teka kata laluan).
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await admin.from('login_attempts').select('id', { count: 'exact', head: true }).eq('username', username).gte('created_at', since);
  if ((count ?? 0) >= 5) return json({ error: 'rate_limit' }, 429);
  const fail = async () => {
    await admin.from('login_attempts').insert({ username });
    return json(BAD, 401);
  };

  const { data: row } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
  if (!row) return fail();
  const { data: found } = await admin.auth.admin.getUserById(row.id);
  const email = found?.user?.email;
  if (!email) return fail();

  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === 'email_not_confirmed') {
      // Kata laluan betul tetapi e-mel belum disahkan: hantar semula kod dan beritahu app e-mel mana (selamat, kata laluan sudah terbukti).
      await anon.auth.resend({ type: 'signup', email });
      return json({ needsCode: true, email });
    }
    if (code === 'over_request_rate_limit') return json({ error: 'rate_limit' }, 429);
    return fail();
  }
  await admin.from('login_attempts').delete().eq('username', username);
  return json({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
});
