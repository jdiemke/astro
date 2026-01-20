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

# Ob JS/CSS Assets zusätzlich geladen und vermessen werden sollen.
# Default: 1 (an). Deaktivieren: LOAD_ASSETS=0 ./performance.sh
LOAD_ASSETS="${LOAD_ASSETS:-1}"

# Welche Perzentile ausgegeben werden sollen (leer = deaktiviert).
# Beispiele:
#   PCTS="90" RUNS=50 ./performance.sh
#   PCTS="90 95 99" RUNS=200 ./performance.sh
# Default: 90
PCTS="${PCTS:-90}"

# Liest stdin zeilenweise in ein Array (Bash-3 kompatibler Ersatz für mapfile/readarray)
# usage: read_lines_into_array myArrayName < <(command)
read_lines_into_array() {
  local __arr_name="$1"
  # shellcheck disable=SC2178
  local -a __tmp=()
  local line
  while IFS= read -r line; do
    __tmp+=("$line")
  done
  # indirekte Zuweisung (Bash 3 kompatibel)
  eval "$__arr_name=()"
  local i
  for ((i=0; i<${#__tmp[@]}; i++)); do
    eval "$__arr_name+=(\"${__tmp[$i]//\\/\\\\}\")"
  done
}

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

# Extrahiert die Origin (scheme://host:port) aus einer URL.
url_origin() {
  local url="$1"
  # shellcheck disable=SC2001
  echo "$url" | sed -E 's#^(https?://[^/]+).*$#\1#'
}

# Baut eine absolute URL aus (baseUrl, origin, maybeRelative).
# Unterstützt:
# - absolute URLs (http/https)
# - protocol-relative (//host/path)
# - absolute Pfade (/assets/app.js)
# - relative Pfade (assets/app.js)
make_absolute_url() {
  local base_url="$1"
  local origin="$2"
  local ref="$3"

  # trim spaces
  ref="${ref## }"
  ref="${ref%% }"

  if [[ -z "$ref" ]]; then
    return 0
  fi

  if [[ "$ref" =~ ^https?:// ]]; then
    echo "$ref"
    return 0
  fi

  if [[ "$ref" =~ ^// ]]; then
    # protocol-relative: übernimmt Scheme von origin (http/https)
    local scheme
    scheme=$(echo "$origin" | sed -E 's#^(https?)://.*$#\1#')
    echo "${scheme}:${ref}"
    return 0
  fi

  if [[ "$ref" =~ ^/ ]]; then
    echo "${origin}${ref}"
    return 0
  fi

  # relative zu base_url (wir nehmen das Verzeichnis der URL)
  local base_dir
  base_dir=$(echo "$base_url" | sed -E 's#\?.*$##' | sed -E 's#/[^/]*$#/#')
  echo "${base_dir}${ref}"
}

# Liefert die unkomprimierte Body-Größe (bytes) einer URL (respektiert Redirects).
# Gibt bei Fehlern leere Ausgabe zurück.
fetch_size_bytes() {
  local url="$1"
  curl -sSL -o /dev/null -w "%{size_download}" -m 30 "$url" 2>/dev/null || true
}

# Gibt pro Zeile eine Asset-URL aus, die im HTML referenziert wird.
# Wir betrachten JS + CSS + Astro Islands:
# - <script src="...">
# - <link rel="stylesheet" href="...">
# - component-url="..." (Astro Islands)
# - renderer-url="..."  (Astro Islands)
extract_assets_from_html() {
  perl -0777 -ne '
    while (/<script\b[^>]*\bsrc\s*=\s*["\x27]([^"\x27]+)["\x27][^>]*>/ig) { print "$1\n"; }
    while (/<link\b[^>]*\brel\s*=\s*["\x27][^"\x27]*stylesheet[^"\x27]*["\x27][^>]*\bhref\s*=\s*["\x27]([^"\x27]+)["\x27][^>]*>/ig) { print "$1\n"; }

    # Astro Islands: z.B. <astro-island component-url="/_astro/....js" renderer-url="/_astro/....js">
    while (/\bcomponent-url\s*=\s*["\x27]([^"\x27]+)["\x27]/ig) { print "$1\n"; }
    while (/\brenderer-url\s*=\s*["\x27]([^"\x27]+)["\x27]/ig) { print "$1\n"; }
  '
}

# Berechnet die Perzentile via Nearest-Rank-Methode.
# Eingabe: Zahlen (Sekunden) via stdin, ein Perzent (z.B. 90)
# Ausgabe: Wert (Sekunden) oder leer, wenn keine Werte vorhanden.
percentile_nearest_rank() {
  local p="$1"
  local values
  values=$(cat)
  if [[ -z "$values" ]]; then
    return 0
  fi

  # sortiere numerisch
  local sorted
  sorted=$(printf "%s\n" "$values" | awk 'NF' | sort -n)
  local n
  n=$(printf "%s\n" "$sorted" | wc -l | tr -d ' ')
  if [[ "$n" -le 0 ]]; then
    return 0
  fi

  # Nearest Rank: k = ceil(p/100 * n)
  local k
  k=$(awk -v p="$p" -v n="$n" 'BEGIN{ k=int((p/100)*n); if ((p/100)*n > k) k=k+1; if (k<1) k=1; if (k>n) k=n; print k }')
  printf "%s\n" "$sorted" | awk -v k="$k" 'NR==k{print; exit}'
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

  # Für Perzentile
  ttfb_values=""
  total_values=""

  ok_runs=0
  last_status=""
  last_size=""

  for ((i=1; i<=RUNS; i++)); do
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

      # Werte für P90 sammeln
      ttfb_values+="$ttfb\n"
      total_values+="$total\n"

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

  # Dynamische Perzentil-Ausgabe
  ttfb_pct_str=""
  total_pct_str=""
  if [[ -n "${PCTS// }" ]]; then
    for p in $PCTS; do
      # nur numerische Perzentile akzeptieren
      if [[ "$p" =~ ^[0-9]+$ ]]; then
        v_ttfb=$(printf "%b" "$ttfb_values" | percentile_nearest_rank "$p")
        v_total=$(printf "%b" "$total_values" | percentile_nearest_rank "$p")
        ttfb_pct_str+=" p${p}=$(sec_to_ms "$v_ttfb")ms"
        total_pct_str+=" p${p}=$(sec_to_ms "$v_total")ms"
      fi
    done
  fi

  echo "OK-Runs=$ok_runs/$RUNS"
  echo "TimeToFirstByte: avg=$(sec_to_ms "$ttfb_avg")ms min=$(sec_to_ms "$ttfb_min")ms max=$(sec_to_ms "$ttfb_max")ms${ttfb_pct_str}"
  echo "TOTAL:           avg=$(sec_to_ms "$total_avg")ms min=$(sec_to_ms "$total_min")ms max=$(sec_to_ms "$total_max")ms${total_pct_str}"

  if [[ "$LOAD_ASSETS" == "1" ]]; then
    origin=$(url_origin "$url")

    # HTML laden (einmal) und Assets extrahieren
    html=$(curl -sSL -m 30 "$url" || true)

    # HTML-Größe unkomprimiert (wie im Body) – konsistent mit dem unteren Block
    html_bytes=$(printf "%s" "$html" | wc -c | tr -d ' ')

    echo "HTML (uncompressed): ${html_bytes} bytes"

    # Asset-Refs extrahieren, absolut machen, deduplizieren
    asset_refs=()
    read_lines_into_array asset_refs < <(
      printf "%s" "$html" \
        | extract_assets_from_html \
        | sed -E 's/[#?].*$//' \
        | grep -vE '^(data:|javascript:)$' \
        | sed '/^$/d' \
        | sort -u
    )

    if [[ "${#asset_refs[@]}" -eq 0 ]]; then
      echo "Assets: keine JS/CSS Referenzen im HTML gefunden."
    else
      echo "Assets (JS/CSS):"
      assets_total=0
      assets_ok=0
      assets_fail=0

      for ref in "${asset_refs[@]}"; do
        abs=$(make_absolute_url "$url" "$origin" "$ref" || true)
        [[ -z "$abs" ]] && continue

        b=$(fetch_size_bytes "$abs")
        if [[ -n "$b" ]] && [[ "$b" =~ ^[0-9]+$ ]]; then
          echo "  $abs => $b bytes"
          assets_total=$((assets_total + b))
          assets_ok=$((assets_ok + 1))
        else
          echo "  $abs => (failed)"
          assets_fail=$((assets_fail + 1))
        fi
      done

      echo "Assets total: ${assets_total} bytes (ok=${assets_ok}, failed=${assets_fail})"
    fi
  fi

  echo

done

echo "== HTML + Asset sizes (uncompressed) =="
for url in "${URLS[@]}"; do
  origin=$(url_origin "$url")

  html=$(curl -sSL -m 30 "$url" || true)
  html_bytes=$(printf "%s" "$html" | wc -c | tr -d ' ')

  assets_total=0
  assets_count=0
  asset_refs=()

  if [[ "$LOAD_ASSETS" == "1" ]]; then
    read_lines_into_array asset_refs < <(
      printf "%s" "$html" \
        | extract_assets_from_html \
        | sed -E 's/[#?].*$//' \
        | grep -vE '^(data:|javascript:)$' \
        | sed '/^$/d' \
        | sort -u
    )

    for ref in "${asset_refs[@]:-}"; do
      abs=$(make_absolute_url "$url" "$origin" "$ref" || true)
      [[ -z "$abs" ]] && continue
      b=$(fetch_size_bytes "$abs")
      if [[ -n "$b" ]] && [[ "$b" =~ ^[0-9]+$ ]]; then
        assets_total=$((assets_total + b))
        assets_count=$((assets_count + 1))
      fi
    done
  fi

  total=$((html_bytes + assets_total))
  echo "$url => HTML=${html_bytes} bytes, assets=${assets_total} bytes (${assets_count} files), total=${total} bytes"
done

