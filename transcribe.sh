#!/bin/zsh
cd /Users/test/projetos/ingoo-tutoriais/subtitles
for mp3 in *.mp3; do
  slug="${mp3%.mp3}"
  echo "=== TRANSCRIBING $slug ==="
  python3 -m whisper "$mp3" \
    --model small \
    --language pt \
    --output_format vtt \
    --output_dir . \
    --verbose False 2>&1 | tail -3
  if [ -f "${slug}.vtt" ]; then
    mv "${slug}.vtt" "${slug}.pt.vtt"
  fi
done
echo "TRANSCRIBE DONE"
