#!/usr/bin/env bash
set -euo pipefail

URLS=(
  "http://localhost:8080/astro-angular-slider"
  "http://localhost:8080/astro-slider"
  "http://localhost:8080/thymeleaf-slider"
  "http://localhost:8080/angular-slider"
)

echo "== Cold run (optional: restart servers + hard refresh cache) =="
for url in "${URLS[@]}"; do
  echo "--- $url"
  curl -s -o /dev/null \
    -w "status=%{http_code}\nTimeToFirstByte=%{time_starttransfer}s\nTOTAL=%{time_total}s\nSIZE=%{size_download} bytes\n\n" \
    "$url"
done

echo "== HTML size (uncompressed) =="
for url in "${URLS[@]}"; do
  bytes=$(curl -s "$url" | wc -c | tr -d ' ')
  echo "$url => $bytes bytes"
done