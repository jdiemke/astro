#!/usr/bin/env bash
set -euo pipefail

URLS=(
  "http://localhost:8080/astro-angular-slider"
  "http://localhost:8080/astro-slider"
  "http://localhost:8080/thymeleaf-slider"
  "http://localhost:8080/angular-slider"
)

# Anzahl der Wiederholungen pro URL (überschreibbar via env, z.B. RUNS=20 ./performance.sh)
RUNS="${RUNS:-10}"

# Nutzung: update_stats <value>
# Aktualisiert: sum, min, max (als globale Variablen: SUM MIN MAX)
update_stats() {
  local v="$1"
  # Summe
  SUM=$(awk -v s="$SUM" -v x="$v" 'BEGIN{printf("%.6f", s + x)}')
  # Min
  MIN=$(awk -v m="$MIN" -v x="$v" 'BEGIN{ if (m=="" || x < m) printf("%.6f", x); else printf("%.6f", m)}')
  # Max
  MAX=$(awk -v m="$MAX" -v x="$v" 'BEGIN{ if (m=="" || x > m) printf("%.6f", x); else printf("%.6f", m)}')
}

avg_from_sum() {
  local sum="$1"
  local n="$2"
  awk -v s="$sum" -v n="$n" 'BEGIN{ if (n>0) printf("%.6f", s/n); else print "nan" }'
}

# Konvertiert Sekunden (curl time_*) zu Millisekunden (3 Nachkommastellen)
sec_to_ms() {
  local sec="$1"
  awk -v s="$sec" 'BEGIN{printf("%.3f", s*1000)}'
}

echo "== Mehrfach-Messung (RUNS=${RUNS}) =="
for url in "${URLS[@]}"; do
  echo "--- $url"

  # Stats für TTFB
  SUM="0"; MIN=""; MAX=""
  ttfb_sum=""; ttfb_min=""; ttfb_max=""

  # Stats für total
  SUM="0"; MIN=""; MAX=""
  total_sum=""; total_min=""; total_max=""

  ok_runs=0
  last_status=""
  last_size=""

  for ((i=1; i<=RUNS; i++)); do
    # Ausgabeformat: status ttfb total size
    # -s: silent
    # -o /dev/null: Body verwerfen
    # -m: Max runtime (Sicherheitsnetz)
    out=$(curl -s -o /dev/null -m 30 \
      -w "%{http_code} %{time_starttransfer} %{time_total} %{size_download}" \
      "$url" || true)

    status=$(awk '{print $1}' <<< "$out")
    ttfb=$(awk '{print $2}' <<< "$out")
    total=$(awk '{print $3}' <<< "$out")
    size=$(awk '{print $4}' <<< "$out")

    last_status="$status"
    last_size="$size"

    # Nur erfolgreiche HTTP-Responses berücksichtigen (2xx/3xx)
    if [[ "$status" =~ ^[23][0-9][0-9]$ ]] && [[ -n "$ttfb" ]] && [[ -n "$total" ]]; then
      ok_runs=$((ok_runs + 1))

      # TTFB stats
      SUM="${ttfb_sum:-0}"; MIN="$ttfb_min"; MAX="$ttfb_max"
      update_stats "$ttfb"
      ttfb_sum="$SUM"; ttfb_min="$MIN"; ttfb_max="$MAX"

      # Total stats
      SUM="${total_sum:-0}"; MIN="$total_min"; MAX="$total_max"
      update_stats "$total"
      total_sum="$SUM"; total_min="$MIN"; total_max="$MAX"
    fi
  done

  echo "status(last)=$last_status"
  echo "SIZE(last)=$last_size bytes"

  if [[ "$ok_runs" -eq 0 ]]; then
    echo "Keine erfolgreichen Läufe (2xx/3xx) – Durchschnitt/Min/Max nicht berechenbar."
    echo
    continue
  fi

  ttfb_avg=$(avg_from_sum "$ttfb_sum" "$ok_runs")
  total_avg=$(avg_from_sum "$total_sum" "$ok_runs")

  echo "OK-Runs=$ok_runs/$RUNS"
  echo "TimeToFirstByte: avg=$(sec_to_ms "$ttfb_avg")ms min=$(sec_to_ms "$ttfb_min")ms max=$(sec_to_ms "$ttfb_max")ms"
  echo "TOTAL:           avg=$(sec_to_ms "$total_avg")ms min=$(sec_to_ms "$total_min")ms max=$(sec_to_ms "$total_max")ms"
  echo

done

echo "== HTML size (uncompressed) =="
for url in "${URLS[@]}"; do
  bytes=$(curl -s "$url" | wc -c | tr -d ' ')
  echo "$url => $bytes bytes"
done

