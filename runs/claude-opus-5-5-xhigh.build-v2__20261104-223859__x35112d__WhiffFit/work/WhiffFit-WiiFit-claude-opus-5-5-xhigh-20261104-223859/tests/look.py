#!/usr/bin/env python3
"""The finished page at 1920x1080 from file://: the title as shipped, then every About page.
Software rendering is slow at this size, so the pages are read with ?fast=1 (no shadows or
ripples; the UI is the same). Screenshots go in engine/out/. Usage: tests/look.py"""
from common import *
OUT = DEV / "engine/out"
OUT.mkdir(parents=True, exist_ok=True)

def tap(p, k):
    a = status(p)["tick"]
    p.keyboard.down(k)
    wait(p, lambda: status(p)["tick"] > a + 1, 60)
    p.wait_for_timeout(200)
    p.keyboard.up(k)
    a = status(p)["tick"]
    wait(p, lambda: status(p)["tick"] > a + 1, 60)

with sync_playwright() as pw:
    b = pw.chromium.launch(args=FLAGS)
    errors = []
    c, p = open_page(b, url=PAGE.as_uri(), viewport=(1920, 1080), errors=errors)
    wait(p, lambda: status(p), 180)
    p.wait_for_timeout(4000)
    p.screenshot(path=str(OUT / "look_title.png"), timeout=280000)
    print("title, as shipped: errors", errors[:3], flush=True)
    c.close()
    errors = []
    c, p = open_page(b, url=PAGE.as_uri() + "?fast=1", viewport=(1920, 1080), errors=errors)
    wait(p, lambda: status(p), 180)
    for k in ("s", "s", "s", "Enter"):
        tap(p, k)
    wait(p, lambda: status(p)["screen"] == "about", 60)
    pages = status(p)["about_pages"]
    for n in range(1, pages + 1):
        p.wait_for_timeout(800)
        page = status(p)["about_page"]
        p.screenshot(path=str(OUT / f"look_about{n}.png"), timeout=280000)
        print("about page", page + 1, "of", pages, flush=True)
        if n < pages:
            tap(p, "e")
            wait(p, lambda: status(p)["about_page"] == page + 1, 60)
    print("pages", pages, "screen", status(p)["screen"], "errors", errors[:3], flush=True)
    b.close()
