#!/bin/bash
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p scripts/out/v2
files=(scripts/urls.txt scripts/urls-*.txt)
total=${#files[@]}
i=0
for f in "${files[@]}"; do
  i=$((i+1))
  name=$(basename "$f" .txt)
  echo "═══ [$i/$total] $name ($(wc -l < "$f") urls) ═══"
  npx tsx scripts/estudio.ts "$f" 2>&1 | tail -30
  # el propio estudio.ts ya escribe en scripts/out/<name>.{csv,json}; copiamos a v2/ para no pisar el baseline si algo falla a medio camino
  cp "scripts/out/$name.json" "scripts/out/v2/$name.json" 2>/dev/null
  cp "scripts/out/$name.csv" "scripts/out/v2/$name.csv" 2>/dev/null
done
echo "REVALIDACION_COMPLETA"
