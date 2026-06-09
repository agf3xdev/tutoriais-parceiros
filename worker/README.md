# Ingoo Tutoriais — Admin Worker

Cloudflare Worker que faz a ponte autenticada entre `admin.html` e o GitHub Contents API.

## Endpoints

- `POST /login` — `{ user, pass }` → `{ token, user, expires_in }`
- `GET  /me` — valida o token, devolve `{ user }`
- `GET  /content` — devolve `{ sha, content }` (base64) do `docs/data/content.json`
- `PUT  /content` — `{ sha, content }` salva o JSON
- `POST /upload` — `{ path, content }` envia arquivo (base64) para `docs/videos/*` ou `docs/subtitles/*`

Tokens emitidos via HMAC-SHA256 (válidos por 12h).

## Deploy

```bash
cd worker
npx wrangler login                  # uma vez, OAuth Cloudflare via browser
npx wrangler deploy                 # publica o Worker

# secrets
npx wrangler secret put GITHUB_PAT      # PAT classic com escopo `repo`
npx wrangler secret put TOKEN_SECRET    # qualquer string aleatória longa
npx wrangler secret put AUTH_USERS      # JSON com usuários (veja abaixo)
```

### Gerar `AUTH_USERS`

Cada senha vira hash **SHA-256 hex** (32 bytes / 64 chars). Use:

```bash
printf 'minhasenha' | shasum -a 256 | awk '{print $1}'
```

Cole no JSON:

```json
{
  "diogo": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
  "ana":   "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"
}
```

Cole esse JSON inteiro quando o `wrangler secret put AUTH_USERS` perguntar.

## Adicionar/remover usuário

```bash
npx wrangler secret put AUTH_USERS    # cola o JSON novo
```
