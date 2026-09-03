#!/usr/bin/env bash
# Five Lighthouse runs, reporting median — a single run is noise.
URL="${1:-http://localhost:3111/}"
OUT="${2:-/tmp/lh}"
N="${3:-5}"
mkdir -p "$OUT"
perfs=(); lcps=()
for i in $(seq 1 "$N"); do
  npx lighthouse "$URL" --only-categories=performance \
    --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate \
    --chrome-flags="--headless=new --disable-gpu --no-sandbox" \
    --output=json --output-path="$OUT/run-$i.json" --quiet >/dev/null 2>&1
  read -r p l < <(node -e '
    const r=require(process.argv[1]);
    console.log(Math.round(r.categories.performance.score*100), r.audits["largest-contentful-paint"].numericValue);
  ' "$OUT/run-$i.json")
  perfs+=("$p"); lcps+=("$l")
  printf "  run %d: perf %s  LCP %.2fs\n" "$i" "$p" "$(echo "$l/1000" | bc -l)"
done
node -e '
const perf=process.argv[1].split(",").map(Number), lcp=process.argv[2].split(",").map(Number);
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
console.log(`  MEDIAN perf ${med(perf)}  |  MEDIAN LCP ${(med(lcp)/1000).toFixed(2)}s  |  LCP range ${(Math.min(...lcp)/1000).toFixed(2)}-${(Math.max(...lcp)/1000).toFixed(2)}s`);
' "$(IFS=,; echo "${perfs[*]}")" "$(IFS=,; echo "${lcps[*]}")"
