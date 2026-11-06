"""Drive the built Thumb Yoga page. Prints FAIL lines, or nothing when the checks hold.

Usage: python3 labs/game/tools/browse.py <html> <out-dir>
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright

CHROME = os.path.expanduser(
    "~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"
)
FLAGS = [
    "--no-sandbox",
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-vulkan=swiftshader",
    "--use-angle=swiftshader",
]
PAD = """
window.__buttons = new Array(16).fill(0);
window.__axes = [0, 0, 0, 0];
navigator.getGamepads = () => [{
  id: 'Scripted Pad (STANDARD GAMEPAD)',
  index: 0,
  connected: true,
  mapping: 'standard',
  timestamp: performance.now(),
  axes: window.__axes.slice(),
  buttons: window.__buttons.map((value) => ({ pressed: value > 0.5, touched: value > 0, value })),
}];
"""
WATCH = """
window.__readyTrace = [];
const watch = () => {
  const eng = window.__engine;
  if (eng && eng.ready === true) window.__readyTrace.push((eng.errors && eng.errors.length) || 0);
  requestAnimationFrame(watch);
};
requestAnimationFrame(watch);
"""


def main() -> int:
    html = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]).resolve()
    out.mkdir(parents=True, exist_ok=True)
    shots = out / "shots"
    shots.mkdir(exist_ok=True)
    fails: list[str] = []
    try:
        with sync_playwright() as p:
            try:
                browser = p.chromium.launch(executable_path=CHROME, args=FLAGS)
            except Exception as error:
                (out / "launch-error.txt").write_text(str(error), encoding="utf-8")
                print("LAUNCH_ERROR")
                return 0
            try:
                boot(browser, html, out, fails)
                if not any(item.startswith("boot") for item in fails):
                    shell(browser, html, out, shots, fails)
                    touch(browser, p, html, fails)
                    hub(browser, html, out, fails)
            finally:
                browser.close()
            webkit(p, html, fails)
    except Exception as error:
        if "launch-error" not in str(error):
            fails.append(f"browser crashed: {error}")
    for item in fails:
        print(f"FAIL {item}")
    return 1 if fails else 0


def boot(browser, html: Path, out: Path, fails: list[str]) -> None:
    marks = [once(browser, html, out, 1, fails), once(browser, html, out, 2, fails)]
    if marks[0] and marks[1] and marks[0] != marks[1]:
        fails.append(f"boot paths disagree {marks[0]} vs {marks[1]}")


def once(browser, html: Path, out: Path, n: int, fails: list[str]) -> str:
    page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    page.add_init_script(PAD + WATCH)
    logs: list[str] = []
    page.on("console", lambda msg: logs.append(msg.text))
    page.on("pageerror", lambda err: logs.append(f"pageerror {err}"))
    try:
        page.goto(html.as_uri())
        page.wait_for_function("() => window.__engine && window.__engine.ready === true", timeout=60000)
        page.wait_for_timeout(300)
        state = page.evaluate(
            """() => {
              const canvas = document.querySelector('canvas');
              const game = window.__game || {};
              return {
                ready: window.__engine.ready,
                errors: window.__engine.errors || [],
                game,
                canvas: { width: canvas ? canvas.width : 0, height: canvas ? canvas.height : 0 },
                view: { width: window.innerWidth, height: window.innerHeight },
              };
            }"""
        )
        (out / f"boot-{n}.log").write_text(json.dumps(state, indent=2) + "\n" + "\n".join(logs), encoding="utf-8")
        page.screenshot(path=str(out / f"boot-{n}.png"))
        if n == 1:
            page.screenshot(path=str(out / "shots" / "title.png"))
        errors = state["errors"]
        if state["ready"] is not True:
            fails.append(f"boot {n} ready is false")
        if errors:
            fails.append(f"boot {n} errors {errors}")
        if any("webgl" in json.dumps(errors).lower() or "downgrade" in json.dumps(errors).lower() for _ in [0]):
            fails.append(f"boot {n} downgraded")
        game = state["game"]
        if game.get("title") != "Thumb Yoga" or game.get("screen") != "title":
            fails.append(f"boot {n} title screen {game}")
        if game.get("volumes", {}).get("music") != 0.1:
            fails.append(f"boot {n} music {game.get('volumes')}")
        canvas = state["canvas"]
        view = state["view"]
        if canvas["width"] <= 0 or canvas["height"] <= 0:
            fails.append(f"boot {n} canvas is empty")
        if canvas["width"] != view["width"] or canvas["height"] != view["height"]:
            note = out / "webgpu-readback.txt"
            note.write_text(
                f"drawing {canvas['width']}x{canvas['height']} view {view['width']}x{view['height']}\n",
                encoding="utf-8",
            )
            fails.append(
                f"boot {n} canvas {canvas['width']}x{canvas['height']} is not the view {view['width']}x{view['height']}"
            )
        # A short key tap can be sampled by a catch-up step and never reach the menu. Hold Cross.
        hold(page, 0, "() => window.__game && window.__game.screen === 'play'")
        page.wait_for_timeout(400)
        after = page.evaluate("() => ({ screen: window.__game.screen, event: window.__game.event, title: window.__game.title })")
        if after.get("screen") != "play":
            fails.append(f"boot {n} did not leave the title")
        return json.dumps(after, sort_keys=True)
    except Exception as error:
        fails.append(f"boot {n} {error}")
        return ""
    finally:
        page.close()


def frames(page) -> None:
    page.evaluate("() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))")


def hold(page, index: int, until: str) -> None:
    """Holds one standard-mapping button until `until` is true, then lets it go for a frame."""
    page.evaluate("(index) => { window.__buttons[index] = 1; }", index)
    page.wait_for_function(until, timeout=30000)
    page.evaluate("(index) => { window.__buttons[index] = 0; }", index)
    frames(page)


def pad_down(page) -> str:
    before = page.evaluate("() => window.__game.focus")
    hold(page, 13, f"() => window.__game && window.__game.focus !== {json.dumps(before)}")
    return page.evaluate("() => window.__game.focus")


def shell(browser, html: Path, out: Path, shots: Path, fails: list[str]) -> None:
    page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    page.add_init_script(PAD)
    trace: list[str] = []
    try:
        page.goto(html.as_uri())
        page.wait_for_function("() => window.__engine && window.__engine.ready === true", timeout=60000)
        page.wait_for_timeout(200)
        note = page.locator("[data-ui=note]").inner_text()
        glyph = page.evaluate("() => window.__game.glyphSet")
        trace.append(f"start {glyph} {note}")
        if glyph != "playstation" or "Cross" not in note:
            fails.append(f"glyphs started as {glyph} {note}")
        # Focus starts on Begin. Two downs skip the disabled rows and land on Settings.
        for _ in range(2):
            pad_down(page)
        focus = page.evaluate("() => window.__game.focus")
        trace.append(f"pad focus {focus}")
        if focus != "Settings":
            fails.append(f"pad did not reach Settings {focus}")
        hold(page, 0, "() => window.__game && window.__game.screen === 'settings'")
        for _ in range(3):
            pad_down(page)
        focus = page.evaluate("() => window.__game.focus")
        trace.append(f"icons row {focus}")
        if "Icons" not in focus:
            fails.append(f"pad did not reach Icons {focus}")
        hold(page, 0, "() => window.__game && window.__game.glyphSet === 'xbox'")
        xbox = page.locator("[data-ui=note]").inner_text()
        glyph = page.evaluate("() => window.__game.glyphSet")
        trace.append(f"xbox {glyph} {xbox}")
        for token in ("A ", "B ", "X ", "Y ", "LB", "RB", "LT", "RT"):
            if token not in xbox:
                fails.append(f"xbox prompt missing {token} in {xbox}")
                break
        if glyph != "xbox":
            fails.append(f"glyph set after icons {glyph} {xbox}")
        page.keyboard.press("f")
        keys = page.evaluate("() => ({ set: window.__game.glyphSet, note: document.querySelector('[data-ui=note]').textContent })")
        trace.append(f"keys {keys}")
        if keys["set"] != "keys" or "WASD" not in keys["note"]:
            fails.append(f"keys prompt {keys}")
        page.mouse.click(12, 12)
        mouse = page.evaluate("() => ({ set: window.__game.glyphSet, note: document.querySelector('[data-ui=note]').textContent })")
        trace.append(f"mouse {mouse}")
        if mouse["set"] != "mouse" or "Mouse" not in mouse["note"]:
            fails.append(f"mouse prompt {mouse}")
        page.keyboard.press("Escape")
        page.wait_for_function("() => window.__game && window.__game.screen === 'title'", timeout=5000)
        page.evaluate(
            """() => {
              const row = document.querySelector('[data-ui=item][data-id="settings"]');
              row.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, movementX: 4, movementY: 6 }));
            }"""
        )
        page.wait_for_timeout(200)
        focus = page.evaluate("() => window.__game.focus")
        trace.append(f"hover focus {focus}")
        if focus != "Settings":
            fails.append(f"hover focus {focus}")
        save_before = page.evaluate("() => localStorage.getItem('thumb-yoga:save')")
        page.wait_for_timeout(10500)
        attracted = page.evaluate("() => window.__game.attract === true && window.__game.screen === 'attract'")
        trace.append(f"attract after 10.5s {attracted}")
        if not attracted:
            fails.append(f"attract did not start {page.evaluate('() => window.__game')}")
        page.keyboard.press("f")
        page.wait_for_function("() => window.__game && window.__game.attract === false", timeout=15000)
        trace.append("attract left on a key")
        page.wait_for_timeout(10500)
        page.mouse.click(420, 420)
        page.wait_for_function("() => window.__game && window.__game.attract === false", timeout=15000)
        trace.append("attract left on a click")
        page.wait_for_timeout(10500)
        hold(page, 0, "() => window.__game && window.__game.attract === false")
        if page.evaluate("() => window.__game.attract"):
            fails.append("attract stayed after a pad press")
        else:
            trace.append("attract left on a pad press")
        save_after = page.evaluate("() => localStorage.getItem('thumb-yoga:save')")
        trace.append("save unchanged" if save_before == save_after else "save changed")
        if save_before != save_after:
            fails.append("attract wrote the save")
        hold(page, 0, "() => window.__game && window.__game.screen === 'play'")
        page.wait_for_timeout(500)
        page.screenshot(path=str(shots / "island.png"))
        hold(page, 9, "() => window.__game && window.__game.screen === 'pause'")
        page.screenshot(path=str(shots / "pause.png"))
        page.locator("[data-ui=item][data-id=more]").click()
        page.wait_for_timeout(200)
        page.locator("[data-ui=item][data-id=dev]").click()
        page.wait_for_timeout(300)
        page.screenshot(path=str(shots / "dev.png"))
        changed = page.evaluate(
            """() => {
              const range = document.querySelector('[data-ui=slider-range]');
              const before = window.__engine.state().settings['game.wobble.gain'];
              range.value = '20';
              range.dispatchEvent(new Event('input', { bubbles: true }));
              const after = window.__engine.state().settings['game.wobble.gain'];
              return { before, after, shown: range.value };
            }"""
        )
        trace.append(f"slider {changed}")
        if changed["after"] != 20:
            fails.append(f"slider did not change the gain {changed}")
        page.locator("[data-ui=item][data-id=reset]").click()
        page.wait_for_timeout(200)
        restored = page.evaluate("() => window.__engine.state().settings['game.wobble.gain']")
        trace.append(f"reset gain {restored}")
        if restored not in (None, 14):
            fails.append(f"reset left the gain at {restored}")
        page.locator("[data-ui=item][data-id=back]").click()
        page.wait_for_timeout(200)
        page.locator("[data-ui=item][data-id=about]").click()
        page.wait_for_timeout(300)
        about = page.locator("[data-ui=about]").inner_text()
        page.screenshot(path=str(shots / "about.png"))
        for needle in (
            "Wii Fit",
            "PLAN.md",
            "Sports",
            "third-person",
            "added on import",
            "Testing caught six issues",
            "Four were critical",
            "most helpful",
            "least helpful",
            "Scene actions",
            "playClip",
            "balance step",
            "hardest part",
            "None. The engine files were not changed.",
            "I would let a page add a mesh",
            "acceptance numbers",
            "group score",
            "one HTML file",
            "session client hash",
        ):
            if needle not in about:
                fails.append(f"about missing {needle}")
        rows = page.locator("[data-ui=item]").count()
        if rows > 6:
            fails.append(f"menu has {rows} rows")
        small = page.evaluate(
            """() => {
              const found = [];
              const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
              while (walker.nextNode()) {
                const text = walker.currentNode.textContent.trim();
                if (!text) continue;
                const el = walker.currentNode.parentElement;
                if (!el) continue;
                const style = getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
                const rect = el.getBoundingClientRect();
                if (rect.width < 1 || rect.height < 1) continue;
                const size = parseFloat(style.fontSize);
                if (size < 28) found.push(text.slice(0, 48) + ' ' + size);
              }
              return found.slice(0, 8);
            }"""
        )
        if small:
            fails.append(f"text under 28px {small}")
        trace.append(f"menu rows {rows}")
        trace.append("font ok" if not small else f"font {small}")
        trace.append("about ok" if not any(item.startswith("about missing") for item in fails) else "about incomplete")
    except Exception as error:
        fails.append(f"shell {error}")
        trace.append(f"shell {error}")
    finally:
        (out / "browser.log").write_text("\n".join(trace) + "\n", encoding="utf-8")
        page.close()


def touch(browser, playwright, html: Path, fails: list[str]) -> None:
    for name in ("iPhone 13", "iPad (gen 7)"):
        device = playwright.devices[name]
        context = browser.new_context(**device)
        page = context.new_page()
        try:
            page.goto(html.as_uri())
            page.wait_for_function("() => window.__engine && window.__engine.ready === true", timeout=60000)
            text = page.locator("[data-ui=note]").inner_text()
            if "Controller or keyboard required" not in text:
                fails.append(f"{name} note {text}")
            if page.locator(".touch-stick").count() != 0:
                fails.append(f"{name} drew a touch stick")
            box = page.locator("[data-ui=touch-settings]").bounding_box()
            if not box:
                fails.append(f"{name} has no Settings button")
            else:
                page.touchscreen.tap(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                page.wait_for_function("() => window.__game && window.__game.screen === 'settings'", timeout=15000)
            page.wait_for_timeout(11000)
            if page.evaluate("() => window.__game.attract") is not True:
                fails.append(f"{name} attract did not run")
        except Exception as error:
            fails.append(f"{name} {error}")
        finally:
            context.close()


def webkit(playwright, html: Path, fails: list[str]) -> None:
    try:
        browser = playwright.webkit.launch()
    except Exception as error:
        fails.append(f"webkit did not launch {error}")
        return
    page = browser.new_page()
    try:
        page.goto(html.as_uri())
        page.wait_for_timeout(1500)
        text = page.locator("#msg").inner_text()
        if "Chrome" not in text or "Edge" not in text:
            fails.append(f"webkit message {text}")
    except Exception as error:
        fails.append(f"webkit {error}")
    finally:
        browser.close()


def hub(browser, html: Path, out: Path, fails: list[str]) -> None:
    root = html.parent
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler(root))
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    (out / "hub-port.txt").write_text(str(port), encoding="utf-8")
    game = "/" + quote(html.name)
    base = f"http://127.0.0.1:{port}"
    dev = next(path for path in root.iterdir() if path.is_dir() and (path / "labs/game/hub/harness.html").exists())
    client = (dev / "labs/game/hub/session-client.txt").read_bytes()
    digest = hashlib.sha256(client).hexdigest()
    (out / "hub-client.sha").write_text(digest + "\n", encoding="utf-8")
    if client not in html.read_bytes():
        fails.append("session client bytes are not in the html")
    harness = f"{base}/{quote(dev.name)}/labs/game/hub/harness.html"
    lines: list[str] = []
    try:
        for query in (
            "players=2&latency=150&jitter=50&loss=5&auto=1&play=8000",
            "players=3&latency=150&jitter=50&loss=5&auto=1&play=8000",
            "players=4&latency=150&jitter=50&loss=5&auto=1&play=8000",
            "players=3&scenario=host-leave&latency=150&jitter=50&loss=5&auto=1&play=8000",
        ):
            run_hub(browser, f"{harness}?game={quote(game, safe='/')}&{query}", query, lines, fails)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        try:
            page.goto(html.as_uri())
            page.wait_for_function("() => window.__game && window.__game.screen === 'title'", timeout=60000)
            page.keyboard.press("Enter")
            page.keyboard.press("Space")
            page.keyboard.press("Enter")
            page.keyboard.press("Space")
            page.wait_for_timeout(300)
            client = page.evaluate(
                """() => ({
                  present: typeof window.AIHub === 'object' && window.AIHub !== null,
                  active: window.AIHub && window.AIHub.active,
                  seeded: window.AIHub && window.AIHub.seeded,
                  native: Math.random.toString().includes('[native code]'),
                  errors: (window.__engine && window.__engine.errors) || [],
                  drawn: (() => { const c = document.querySelector('canvas'); return !!(c && c.width > 0); })(),
                })"""
            )
            if not client["present"] or client["active"] or client["seeded"] or not client["native"]:
                fails.append(f"standalone client {client}")
            if client["errors"] or not client["drawn"]:
                fails.append(f"standalone screen {client}")
            lines.append(f"standalone {json.dumps(client)}")
        finally:
            page.close()
    finally:
        server.shutdown()
        (out / "hub.log").write_text("\n".join(lines), encoding="utf-8")


def run_hub(browser, url: str, query: str, lines: list[str], fails: list[str]) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.add_init_script(WATCH)
    bad: list[str] = []
    page.on("console", lambda msg: bad.append(msg.text) if msg.text.startswith("[AIHub]") else None)
    try:
        page.goto(url)
        page.wait_for_function("() => document.body.dataset.complete === 'true'", timeout=120000)
        report = page.evaluate("() => window.__hubCheck")
        ghosts = page.evaluate(
            """() => [...document.querySelectorAll('iframe')].map((frame) => {
              const win = frame.contentWindow;
              const state = win.__engine && win.__engine.state && win.__engine.state();
              const entities = (state && state.entities) || [];
              return {
                ready: !!(win.__engine && win.__engine.ready),
                errors: (win.__engine && win.__engine.errors && win.__engine.errors.length) || 0,
                ghosts: entities.filter((entity) => entity.ghost).length,
                trace: win.__readyTrace || [],
              };
            })"""
        )
        lines.append(query)
        lines.append(json.dumps({"pass": report.get("pass") if report else None, "checks": report.get("checks") if report else None, "ghosts": ghosts, "aihub": bad}))
        if not report or report.get("pass") is not True:
            fails.append(f"hub {query} {report}")
        if "players=2" in query and not any(row["ghosts"] > 0 for row in ghosts):
            fails.append(f"hub {query} has no ghost")
        for row in ghosts:
            if row["ready"] is not True or row["errors"]:
                fails.append(f"hub {query} engine {row}")
            if any(count for count in row["trace"]):
                fails.append(f"hub {query} frame errors {row['trace'][:4]}")
        if bad:
            fails.append(f"hub {query} console {bad[:3]}")
    except Exception as error:
        fails.append(f"hub {query} {error}")
        lines.append(f"{query} error {error}")
    finally:
        page.close()


def handler(root: Path):
    class Quiet(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(root), **kwargs)

        def log_message(self, _format, *_args):
            return

    return Quiet


if __name__ == "__main__":
    sys.exit(main())
