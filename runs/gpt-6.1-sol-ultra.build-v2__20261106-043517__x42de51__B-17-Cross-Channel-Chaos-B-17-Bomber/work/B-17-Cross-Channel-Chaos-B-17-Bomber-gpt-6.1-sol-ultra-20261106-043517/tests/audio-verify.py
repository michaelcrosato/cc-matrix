import json
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_content("<!doctype html><title>Procedural audio verification</title>")
    page.add_script_tag(path=str(root / "tests/audio-bundle.js"))
    result = page.evaluate("runBomberAudioTests()")
    browser.close()
(root / "docs/audio-results.json").write_text(json.dumps(result, indent=2))
for error in result["failures"]:
    print("FAIL audio: " + error)
print(f"{result['count']} audio checks, {len(result['failures'])} failures")
raise SystemExit(bool(result["failures"]))
