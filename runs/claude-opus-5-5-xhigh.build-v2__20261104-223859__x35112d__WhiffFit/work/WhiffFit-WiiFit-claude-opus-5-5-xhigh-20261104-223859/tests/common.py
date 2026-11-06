"""Shared helpers for the browser tests: one browser, the pad stub, status reads, a count."""
import json, os, pathlib, sys, time
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
DEV = HERE.parent
PAGE = DEV.parent / (DEV.name + ".html")
FLAGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-angle=swiftshader"]
PAD = """
const btn = () => ({ pressed: false, touched: false, value: 0 });
const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 1,
              axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) };
navigator.getGamepads = () => [pad, null, null, null];
window.__setPad = (axes, pressed) => { pad.axes = axes; pad.timestamp++; pad.buttons.forEach((b, i) => { const on = pressed.includes(i); b.pressed = on; b.touched = on; b.value = on ? 1 : 0; }); };
"""
SOUND = """
window.__snd = { rms: 0, n: 0, peak: 0 };
const start = AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start = function (...a) {
  try { const d = this.buffer.getChannelData(0); let s = 0; for (let i = 0; i < d.length; i += 4) { s += d[i] * d[i]; __snd.peak = Math.max(__snd.peak, Math.abs(d[i])); }
        __snd.rms += s; __snd.n += Math.ceil(d.length / 4); } catch (e) {}
  return start.apply(this, a);
};
"""

class Count:
    def __init__(self):
        self.passed = 0
        self.failed = 0
    def check(self, name, ok, detail=""):
        if ok:
            self.passed += 1
        else:
            self.failed += 1
            print(f"FAIL {name}: {detail}"[:600], flush=True)
        return ok

def status(page):
    s = page.evaluate("window.__gameStatus || 'null'")
    return json.loads(s) if s else None

def ui(page):
    s = page.evaluate("window.__gameUi || 'null'")
    return json.loads(s) if s else None

def wait(page, cond, timeout=30.0, step=0.05):
    end = time.time() + timeout
    while time.time() < end:
        try:
            v = cond()
            if v:
                return v
        except Exception:
            pass
        page.wait_for_timeout(int(step * 1000))
    return None

def open_page(browser, url=None, init=(), viewport=(320, 180), storage=None, errors=None, **ctx):
    c = browser.new_context(viewport={"width": viewport[0], "height": viewport[1]}, **ctx)
    if storage is not None:
        c.add_init_script(f"try {{ localStorage.setItem('whiff-fit-save-v1', {json.dumps(storage)}); }} catch (e) {{}}")
    for i in init:
        c.add_init_script(i)
    p = c.new_page()
    if errors is not None:
        p.on("pageerror", lambda e: errors.append(str(e)))
        p.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    p.goto(url or (PAGE.as_uri() + "?fast=1"))
    return c, p
