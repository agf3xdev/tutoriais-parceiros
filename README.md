# Ingoo Tutoriais

Página estática multilíngue (PT / EN / ES / ZH) com tutoriais em vídeo para os comerciantes Ingoo.

## Estrutura

- `docs/` — site estático (index.html + assets + videos + subtitles)
- `Dockerfile` + `nginx.conf` — container para deploy (Coolify, Hetzner)
- `compress.sh` — comprime vídeos originais com ffmpeg (H.264 720p)
- `extract_audio.sh` — extrai trilhas de áudio para Whisper
- `transcribe.sh` — gera legendas em PT-BR via OpenAI Whisper

## Dev local

```bash
cd public && python3 -m http.server 8080
```

## Deploy

- **GitHub Pages**: branch `main`, path `/docs` → https://agf3xdev.github.io/ingoo-tutoriais/
- **Coolify (Hetzner)**: build com `Dockerfile`, porta `80`. Domínio sugerido `tutoriais.superappingoo.com.br`.
