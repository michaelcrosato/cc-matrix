"""Focused native viewport regression; exposed by tools/verify.mjs --suite=split."""

import importlib.util
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "browser_suite", ROOT / "tests/browser-verify.py"
)
suite = importlib.util.module_from_spec(spec)
spec.loader.exec_module(suite)
with sync_playwright() as playwright:
    for name, kind, options in [
        ("Chromium", playwright.chromium, {"args": ["--enable-unsafe-swiftshader"]}),
        ("WebKit", playwright.webkit, {}),
    ]:
        browser = kind.launch(headless=True, **options)
        try:
            suite.run(
                name + " native foreground retention",
                lambda browser=browser: suite.mixed_coop(browser),
            )
        finally:
            browser.close()
(ROOT / "tests/split-result.json").write_text(json.dumps(suite.RESULT, indent=2))
print(
    f"Split verification: {suite.RESULT['assertions']} checks, {len(suite.RESULT['failures'])} failures"
)
raise SystemExit(bool(suite.RESULT["failures"]))
