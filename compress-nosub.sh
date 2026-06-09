#!/bin/zsh
FFMPEG="/Users/test/.local/bin/ffmpeg"
SRC="/Users/test/Downloads"
OUT="/Users/test/projetos/ingoo-tutoriais/docs/videos"

slugs=(maquina-online-offline conectar-wifi aluguel-cartao retirada-pix)
files=(
  "Como identificar máquina online e offline sl.mp4"
  "como conectar wifi sl.mp4"
  "Aluguel no cartao de credito sl.mp4"
  "retirada e devolucao via pix sl.mp4"
)

for i in 1 2 3 4; do
  slug=${slugs[$i]}
  input="$SRC/${files[$i]}"
  output="$OUT/${slug}.mp4"
  echo "=== START $slug ==="
  "$FFMPEG" -y -i "$input" \
    -vf "scale='min(1280,iw)':-2" \
    -c:v libx264 -preset fast -crf 26 \
    -c:a aac -b:a 96k -movflags +faststart \
    "$output" 2>&1 | tail -2
  echo "=== DONE $slug ==="
done
echo "ALL DONE"
