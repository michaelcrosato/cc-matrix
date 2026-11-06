"""Arrange actual browser captures without inventing or altering game imagery."""

from html import escape
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "test-artifacts"
SCENES = [
    ("Title · television", "title"),
    ("Early combat · keyboard / pad", "combat"),
    ("Grounded roller · bounded escape", "ground-roller"),
    ("Combined arsenal · safe attack windows", "all-threats"),
    ("Time brake · hostile slowdown", "brake"),
    ("Finale · exposed core", "boss"),
    ("Victory results · dev showcase", "results"),
    ("Ordinary failure · three integrity hits", "failure"),
    ("About · source and feedback access", "credits"),
    ("Touch · portrait", "touch-portrait"),
    ("Touch · landscape", "touch-landscape"),
    ("Attract · private simulation", "attract"),
]
cards = []
for label, stem in SCENES:
    filename = "browser-" + stem + ".png"
    if (ARTIFACTS / filename).exists():
        cards.append(
            f'<figure><img src="{filename}" alt="{escape(label)}"><figcaption>{escape(label)}</figcaption></figure>'
        )
html = (
    """<!doctype html><meta charset="utf-8"><title>Attack of the Timelout · visual verification</title>
<style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#070e1a;color:#e8e7d8;font:18px Arial,sans-serif}h1{font-size:27px;margin:0 0 9px}p{font-size:15px;color:#9faec0;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}figure{margin:0;border:1px solid #35445b;background:#0c1425}img{display:block;width:100%;height:335px;object-fit:contain;background:#02050c}figcaption{padding:10px 12px;font-size:17px;font-weight:600;color:#c6e7da}</style>
<h1>Attack of the Timelout · visual verification</h1><p>Actual bundled-game browser screenshots. Developer showcases are marked; gameplay correctness is checked separately.</p><div class="grid">"""
    + "".join(cards)
    + "</div>"
)
page_path = ARTIFACTS / "browser-contact-sheet.html"
page_path.write_text(html)
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        page = browser.new_page(
            viewport={"width": 1920, "height": 1650}, device_scale_factor=1
        )
        page.goto(page_path.as_uri())
        page.screenshot(
            path=str(ARTIFACTS / "browser-contact-sheet.png"), full_page=True
        )
    finally:
        browser.close()
print(f"{len(cards)} original screenshots in browser-contact-sheet.png")
