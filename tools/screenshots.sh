#!/bin/sh
# Regenerates the README screenshots (assets/screenshots/) and the share card
# (assets/social-preview.png) from the demo, in English, with headless Chrome.
# macOS (uses sips to crop); the app must be served first:  node serve.mjs
#   sh tools/screenshots.sh            (default: http://localhost:4173)
#   sh tools/screenshots.sh http://localhost:4174
set -e
BASE="${1:-http://localhost:4173}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="assets/screenshots"
TMP="$(mktemp -d)"
mkdir -p "$OUT"

# One capture: name, CSS window size, address, extra flags. 2× pixels, fresh profile.
shot() {
  "$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
    --user-data-dir="$TMP/profile-$1" --hide-scrollbars --force-device-scale-factor=2 \
    --window-size="$2" --virtual-time-budget=7000 $4 --screenshot="$TMP/$1.png" "$3" >/dev/null 2>&1
}
# Keep a band from the top (sips needs an offset of at least 1), then 1800 px wide.
crop() { sips -c "$2" 2560 --cropOffset "$3" 1 "$TMP/$1.png" --out "$TMP/c.png" >/dev/null; sips --resampleWidth 1800 "$TMP/c.png" --out "$OUT/$4.png" >/dev/null; }

shot tall 1280,2100 "$BASE/?lang=en#/demo"
shot dark 1280,1000 "$BASE/?lang=en#/demo" --force-dark-mode
shot compare 1280,1200 "$BASE/?lang=en#/demo/compare/lcp"
crop tall 1540 1 home
crop dark 1540 1 home-dark
crop tall 1180 1560 quick-wins
crop compare 2320 1 compare

# The share card, at its exact size.
"$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$TMP/profile-og" --hide-scrollbars \
  --window-size=1280,640 --virtual-time-budget=3000 --screenshot=assets/social-preview.png "$BASE/tools/social-preview.html" >/dev/null 2>&1

rm -rf "$TMP"
echo "Done: $OUT/{home,home-dark,quick-wins,compare}.png and assets/social-preview.png"
