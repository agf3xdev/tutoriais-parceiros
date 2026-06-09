# Ingoo Tutoriais Parceiros

Página estática multilíngue (PT / EN / ES / ZH) com vídeos SOP para parceiros Ingoo.

## Estrutura

- `docs/` — site estático (index.html + assets + videos + subtitles + admin)
- `worker/` — Cloudflare Worker que faz proxy admin → GitHub Contents API

## Dev local

```bash
cd docs && python3 -m http.server 8080
```

## Deploy

- **GitHub Pages**: branch `main`, path `/docs` → https://tutoriaisparceiros.ingoobrasil.com.br
- **DNS Cloudflare** (zone `ingoobrasil.com.br`): CNAME `tutoriaisparceiros` → `agf3xdev.github.io` (Proxy OFF, só DNS).
- **Worker admin**: `cd worker && npx wrangler deploy` (requer secrets GITHUB_PAT, AUTH_USERS, TOKEN_SECRET).
