#!/usr/bin/env bash
# Lädt die CC0-Modellpakete von Kenney nach render/illustrationen/.assets (nicht im Repo).
set -e
cd "$(dirname "$0")"; mkdir -p .assets; cd .assets
for k in furniture-kit mini-market city-kit-commercial car-kit food-kit retro-urban-kit; do
  [ -d "$k" ] && continue
  u=$(curl -sL "https://kenney.nl/assets/$k" | grep -oE 'https://kenney.nl/media/pages/assets/[^"]+\.zip' | head -1)
  curl -sL -o "$k.zip" "$u" && mkdir -p "$k" && (cd "$k" && unzip -q -o "../$k.zip") && rm "$k.zip" && echo "$k"
done
