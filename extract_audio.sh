#!/bin/zsh
FFMPEG="/Users/test/.local/bin/ffmpeg"
SRC="/Users/test/Downloads"
OUT="/Users/test/projetos/ingoo-tutoriais/subtitles"

slugs=(maquina-online-offline conectar-wifi configurar-chip aluguel-cartao retirada-pix)
files=(
  "Como identificar máquina online e offline.mp4"
  "como conectar wifi.mp4"
  "como configurar o chip.mp4"
  "Aluguel no cartao de credito.mp4"
  "retirada e devolucao via pix.mp4"
)

for i in 1 2 3 4 5; do
  slug=${slugs[$i]}
  input="$SRC/${files[$i]}"
  output="$OUT/${slug}.mp3"
  echo "Extraindo $slug..."
  "$FFMPEG" -y -i "$input" -vn -ac 1 -ar 16000 -b:a 64k "$output" 2>&1 | tail -2
done
echo "AUDIO DONE"
