#!/usr/bin/env bash
# Inject unmodified session.js, bindgen the existing wasm, pack one HTML, restore the template.
set -euo pipefail
DEV="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE="$DEV/engine"
WORK="$(cd "$DEV/.." && pwd)"
NAME="Jam Cry-Far Cry 2-grok-4.7-xhigh-20261105-013503"
HTML="$WORK/$NAME.html"
PAGE="$ENGINE/web/index.html"
SESSION="$DEV/hub/session.js"
WASM="$ENGINE/target/wasm32-unknown-unknown/dist/shardfall.wasm"
[[ -f "$WASM" ]] || { echo "FAIL: wasm missing: $WASM" >&2; exit 1; }
cp "$PAGE" "$PAGE.template"
restore() { mv -f "$PAGE.template" "$PAGE"; }
trap restore EXIT
python3 - "$PAGE" "$SESSION" <<'PY'
import pathlib, sys
page, session = map(pathlib.Path, sys.argv[1:])
text = page.read_text()
js = session.read_bytes()
marker = b"/*__SESSION_JS__*/"
raw = text.encode()
if raw.count(marker) != 1:
    raise SystemExit("marker missing")
if b"</script" in js.lower() or b"<!--" in js or b"<script" in js.lower():
    raise SystemExit("session.js cannot sit in a script element")
page.write_bytes(raw.replace(marker, js, 1))
PY
BINDGEN="$(mktemp -d)"
wasm-bindgen --target web --no-typescript --out-dir "$BINDGEN" --out-name shardfall "$WASM"
(
  cd "$ENGINE"
  python3 -I scripts/pack_single_html.py "$BINDGEN" \
    --title "Jam Cry" \
    --description "A first-person contract in the last dry season. Keep the rifle working, burn a path, and choose how the ledger ends." \
    --theme-color "#2a2420" \
    --scene merc \
    --out "$HTML"
)
rm -rf "$BINDGEN"
python3 - "$HTML" "$SESSION" <<'PY'
import pathlib, sys
html, session = map(pathlib.Path, sys.argv[1:])
text = html.read_text(errors="replace")
js = session.read_text()
start = text.find("<script>")
end = text.find("</script>", start)
body = text[start + len("<script>"):end]
if body != js:
    raise SystemExit(f"first script is not session.js ({len(body)} vs {len(js)})")
if text.count("<title>") != 1 or "<title>Jam Cry</title>" not in text:
    raise SystemExit("title")
if text.count('name="theme-color"') != 1 or 'content="#2a2420"' not in text:
    raise SystemExit("theme")
print("packed", html.name, "bytes", html.stat().st_size)
PY
restore
trap - EXIT
grep -q '/\*__SESSION_JS__\*/' "$PAGE"
