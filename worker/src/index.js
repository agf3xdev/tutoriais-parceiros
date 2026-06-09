// Ingoo Tutoriais — Admin API (Cloudflare Worker)
// Faz proxy autenticado entre o admin.html e o GitHub Contents API.
//
// Secrets esperados (defina via `wrangler secret put <NOME>`):
//   GITHUB_PAT     — Personal Access Token (classic) com escopo `repo`
//   AUTH_USERS     — JSON: { "usuario": "sha256_da_senha_em_hex", ... }
//   TOKEN_SECRET   — string aleatória usada como chave HMAC para os tokens de sessão
//
// vars (em wrangler.toml):
//   REPO           — "agf3xdev/ingoo-tutoriais"
//   BRANCH         — "main"
//   ALLOWED_ORIGIN — "https://tutoriais.ingoobrasil.com.br"

const TOKEN_TTL_MS = 12 * 3600 * 1000; // 12 horas

function corsHeaders(env, extra = {}) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    ...extra,
  };
}

function json(body, status = 200, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(str) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)));
}

async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}

async function issueToken(user, env) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${user}|${exp}`;
  const sig = await hmacSign(payload, env.TOKEN_SECRET);
  return btoa(`${payload}|${sig}`);
}

async function verifyToken(token, env) {
  try {
    const dec = atob(token);
    const parts = dec.split('|');
    if (parts.length !== 3) return null;
    const [user, exp, sig] = parts;
    if (Number(exp) < Date.now()) return null;
    const expected = await hmacSign(`${user}|${exp}`, env.TOKEN_SECRET);
    if (expected !== sig) return null;
    return user;
  } catch {
    return null;
  }
}

async function requireAuth(req, env) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  return verifyToken(token, env);
}

// ---------- GitHub helpers ----------
async function gh(env, path, opts = {}) {
  const url = `https://api.github.com${path}`;
  const headers = {
    'Authorization': `token ${env.GITHUB_PAT}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'ingoo-tutoriais-admin-worker',
    ...(opts.headers || {}),
  };
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { res, data };
}

async function getFile(env, path) {
  const { res, data } = await gh(env, `/repos/${env.REPO}/contents/${path}?ref=${env.BRANCH}`);
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

async function putFile(env, path, contentB64, sha, message, user) {
  const { res, data } = await gh(env, `/repos/${env.REPO}/contents/${path}`, {
    method: 'PUT',
    body: {
      message: `${message} (admin: ${user})`,
      content: contentB64,
      branch: env.BRANCH,
      sha: sha || undefined,
    },
  });
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

// ---------- routes ----------
async function handleLogin(req, env) {
  const { user, pass } = await req.json().catch(() => ({}));
  if (!user || !pass) return json({ error: 'user e pass são obrigatórios' }, 400, env);

  let users;
  try { users = JSON.parse(env.AUTH_USERS || '{}'); }
  catch { return json({ error: 'AUTH_USERS mal configurado no Worker' }, 500, env); }

  const expectedHash = users[user];
  if (!expectedHash) return json({ error: 'Usuário ou senha inválidos' }, 401, env);
  const actualHash = await sha256(pass);
  if (actualHash !== expectedHash) return json({ error: 'Usuário ou senha inválidos' }, 401, env);

  const token = await issueToken(user, env);
  return json({ token, user, expires_in: TOKEN_TTL_MS / 1000 }, 200, env);
}

async function handleGetContent(req, env) {
  const user = await requireAuth(req, env);
  if (!user) return json({ error: 'unauthorized' }, 401, env);
  try {
    const f = await getFile(env, 'docs/data/content.json');
    return json({ sha: f.sha, content: f.content }, 200, env);
  } catch (e) {
    return json({ error: e.message }, 500, env);
  }
}

async function handlePutContent(req, env) {
  const user = await requireAuth(req, env);
  if (!user) return json({ error: 'unauthorized' }, 401, env);

  const { sha, content } = await req.json().catch(() => ({}));
  if (!content) return json({ error: 'content obrigatório' }, 400, env);

  try {
    const out = await putFile(env, 'docs/data/content.json', content, sha, 'admin: update content', user);
    return json({ sha: out.content.sha }, 200, env);
  } catch (e) {
    return json({ error: e.message }, 500, env);
  }
}

async function handleUpload(req, env) {
  const user = await requireAuth(req, env);
  if (!user) return json({ error: 'unauthorized' }, 401, env);

  const { path, content } = await req.json().catch(() => ({}));
  if (!path || !content) return json({ error: 'path e content obrigatórios' }, 400, env);
  if (!/^docs\/(videos|subtitles)\/[a-z0-9._-]+$/i.test(path)) {
    return json({ error: 'path inválido (apenas docs/videos/* ou docs/subtitles/*)' }, 400, env);
  }

  try {
    const out = await putFile(env, path, content, undefined, `admin: upload ${path}`, user);
    return json({ sha: out.content.sha }, 200, env);
  } catch (e) {
    return json({ error: e.message }, 500, env);
  }
}

async function handleMe(req, env) {
  const user = await requireAuth(req, env);
  if (!user) return json({ error: 'unauthorized' }, 401, env);
  return json({ user }, 200, env);
}

// ---------- dispatcher ----------
export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }
    const url = new URL(req.url);
    const route = `${req.method} ${url.pathname}`;
    try {
      switch (route) {
        case 'POST /login':         return await handleLogin(req, env);
        case 'GET /me':             return await handleMe(req, env);
        case 'GET /content':        return await handleGetContent(req, env);
        case 'PUT /content':        return await handlePutContent(req, env);
        case 'POST /upload':        return await handleUpload(req, env);
        case 'GET /':               return json({ ok: true, service: 'ingoo-tutoriais-admin' }, 200, env);
      }
      return json({ error: 'not found' }, 404, env);
    } catch (e) {
      return json({ error: e.message || String(e) }, 500, env);
    }
  },
};
