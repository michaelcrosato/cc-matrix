#!/usr/bin/env python3
"""Actual exported-document checks. Uses installed Playwright; no browser installs."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parent
CONFIG = json.loads((ROOT / "build-config.json").read_text())
EVIDENCE = HERE / "evidence"
PAD_SCRIPT = r"""
window.__pads = [null, null];
window.__pad = (index, options={}) => {
  let pad = window.__pads[index];
  if (!pad) pad = {id:'Synthetic DualSense Standard ' + index,index,mapping:'standard',connected:true,timestamp:performance.now(),axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0})),vibrationActuator:null};
  if ('connected' in options) pad.connected=options.connected;
  if (options.axes) pad.axes=options.axes.slice();
  if (options.buttons) for (const [key,value] of Object.entries(options.buttons)) pad.buttons[Number(key)]={pressed:value>=.5,touched:value>0,value};
  pad.timestamp=performance.now();
  window.__pads[index]=pad;
};
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__pads});
"""


class BrowserSuite:
    def __init__(self, artifact: Path):
        self.artifact = artifact
        self.checks: list[dict] = []
        self.console: list[dict] = []
        self.page_errors: list[dict] = []
        self.screenshots: list[str] = []
        self.details: dict = {}
        self.versions: dict = {}
        self.group = ""

    def verify(self, name, condition, detail=""):
        record = {"name": name, "pass": bool(condition)}
        if detail:
            record["detail"] = detail
        self.checks.append(record)
        if not condition:
            raise AssertionError(f"{name}: {detail}")

    def run(self, name, fn):
        self.group = name
        before = len(self.checks)
        try:
            fn()
        except Exception as error:  # noqa: BLE001 -- retain failed groups and continue the suite
            if not any(not r["pass"] for r in self.checks[before:]):
                self.checks.append({"name": name, "pass": False, "detail": str(error)})
            self.details.setdefault("exceptions", {})[name] = traceback.format_exc()

    def page(self, context, url=None):
        page = context.new_page()
        page.set_default_timeout(7000)
        page.on(
            "pageerror",
            lambda error: self.page_errors.append(
                {"group": self.group, "error": str(error)}
            ),
        )
        page.on(
            "console",
            lambda msg: (
                self.console.append(
                    {"group": self.group, "type": msg.type, "text": msg.text}
                )
                if msg.type in ("error", "warning")
                else None
            ),
        )
        page.goto(url or self.artifact.as_uri(), wait_until="load")
        page.wait_for_function("window.__OI && window.__OI.ui && window.__OI.game")
        page.wait_for_function("window.__OI.ui.screen === 'title'")
        self.advance(page, 0.3)
        return page

    def screenshot(self, page, name):
        path = EVIDENCE / f"browser-{name}.png"
        page.screenshot(path=str(path), animations="disabled")
        self.screenshots.append(path.name)

    @staticmethod
    def click(page, action):
        locator = page.locator(f'[data-action="{action}"]')
        if page.evaluate("navigator.maxTouchPoints>0"):
            locator.tap()
        else:
            locator.click()

    @staticmethod
    def advance(page, seconds):
        page.evaluate(
            "seconds => window.__OI.game.advance(seconds,{draw:true})", seconds
        )

    @staticmethod
    def screen(page):
        return page.evaluate("window.__OI.ui.screen")

    def launch(self, page, coop=False):
        self.click(page, "launch")
        page.wait_for_function("__OI.ui.screen === 'launch'")
        if coop:
            self.click(page, "players")
        self.click(page, "start")
        page.wait_for_function(
            "__OI.ui.screen === 'play' && __OI.world && __OI.world.status === 'playing'"
        )
        self.advance(page, 0.25)

    def boot_and_menus(self, browser):
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        context.add_init_script(PAD_SCRIPT)
        try:
            isolated = EVIDENCE / "isolated"
            isolated.mkdir(exist_ok=True)
            target = isolated / "game.html"
            shutil.copy2(self.artifact, target)
            page = self.page(context, target.as_uri())
            self.verify(
                "isolated file export title",
                page.title() == "Orbit Invadettes",
                page.title(),
            )
            self.verify(
                "isolated export starts standalone", page.evaluate("!__OI.session")
            )
            self.verify(
                "initial music is ten percent",
                page.evaluate(
                    "__OI.game.settings.music === .1 && __OI.game.audio.musicVolume === .1"
                ),
            )
            self.verify(
                "no pre-gesture audio context", page.evaluate("!__OI.game.audio.ctx")
            )
            self.verify(
                "title focus seeded",
                page.locator('[data-action="launch"]').evaluate(
                    "e=>e.classList.contains('focused')"
                ),
            )
            self.verify(
                "native canvas renders full scene",
                page.evaluate(
                    "(()=>{const c=__OI.game.screen.canvas,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();for(let i=0;i<d.length;i+=1236)colors.add(d[i]+','+d[i+1]+','+d[i+2]);return colors.size>25})()"
                ),
            )
            self.verify(
                "TV title targets fit",
                page.locator('[data-action="launch"]').bounding_box()["height"] >= 50,
            )
            self.screenshot(page, "title-1920")
            page.locator('[data-action="settings"]').hover()
            self.verify(
                "pointer hover moves focus",
                page.locator('[data-action="settings"]').evaluate(
                    "e=>e.classList.contains('focused')"
                ),
            )
            self.click(page, "settings")
            page.wait_for_function("__OI.ui.screen==='settings'")
            self.verify(
                "settings hit targets exist before draw",
                page.evaluate("__OI.ui.rows.length >= 8"),
            )
            music = page.locator('[data-setting="music"]')
            box = music.bounding_box()
            page.mouse.click(
                box["x"] + box["width"] * 0.60, box["y"] + box["height"] * 0.5
            )
            changed = page.evaluate("__OI.game.settings.music")
            self.verify(
                "mouse slider changes music", 0.4 <= changed <= 0.8, str(changed)
            )
            page.reload(wait_until="load")
            page.wait_for_function("window.__OI && __OI.ui.screen==='title'")
            self.verify(
                "preferences survive reload",
                page.evaluate("__OI.game.settings.music") == changed,
            )
            self.click(page, "settings")
            self.click(page, "resetSettings")
            self.verify(
                "reset returns music to ten percent",
                page.evaluate(
                    "__OI.game.settings.music === .1 && __OI.game.audio.musicVolume === .1"
                ),
            )
            self.click(page, "mute")
            self.verify(
                "mute setting reaches master bus",
                page.evaluate("__OI.game.audio.muted"),
            )
            self.click(page, "mute")
            self.click(page, "settingsPage")
            self.click(page, "glyphs")
            self.verify(
                "Xbox labels selectable",
                page.evaluate("__OI.game.settings.glyphs === 'xbox'"),
            )
            self.click(page, "motion")
            self.click(page, "flash")
            self.verify(
                "accessibility settings applied",
                page.evaluate(
                    "__OI.game.settings.motion && __OI.game.settings.flashes===0"
                ),
            )
            self.click(page, "resetSettings")
            self.click(page, "back")
            self.click(page, "controls")
            self.verify(
                "controls describe native pointer and repair",
                "right mouse" in page.locator("#ui").inner_text()
                and "horizontal target" in page.locator("#ui").inner_text(),
            )
            self.click(page, "back")
            self.click(page, "about")
            pages = page.evaluate("__OI.ui.pages.length")
            self.verify("credits and feedback are paginated", pages >= 10, str(pages))
            page_texts = []
            for i in range(pages):
                page_texts.append(page.locator(".report-body").inner_text())
                boxes = page.locator(".page-actions button").evaluate_all(
                    "es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})"
                )
                self.verify(
                    f"About page {i + 1} navigation visible",
                    all(b["y"] >= 0 and b["y"] + b["h"] <= 1080 for b in boxes),
                )
                if i in (0, pages - 1):
                    self.screenshot(page, f"about-{i + 1}-1920")
                self.click(page, "next")
            all_text = "\n".join(page_texts)
            self.verify(
                "all required report groups rendered",
                all(
                    token in all_text.lower()
                    for token in [
                        "usage",
                        "added on import",
                        "testing",
                        "engine",
                        "prompt",
                        "gpt-6.1-sol",
                    ]
                ),
            )
            self.click(page, "back")
            self.click(page, "records")
            self.verify(
                "empty records screen controllable",
                page.locator('[data-action="back"]').is_visible(),
            )
            self.click(page, "back")
            self.verify(
                "isolated export engine reports no errors",
                page.evaluate("__OI.game.errors.length") == 0,
            )
            self.details["isolated"] = {
                "url": target.as_uri(),
                "settingsPersisted": changed,
                "aboutPages": pages,
            }
        finally:
            context.close()

    def native_play(self, browser):
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        context.add_init_script(PAD_SCRIPT)
        try:
            page = self.page(context)
            page.keyboard.press("Enter")
            page.wait_for_function("__OI.ui.screen==='launch'")
            self.advance(page, 0.3)
            page.keyboard.press("ArrowDown")
            self.advance(page, 0.2)
            page.keyboard.press("ArrowDown")
            self.advance(page, 0.2)
            self.verify(
                "keyboard focus reaches launch",
                page.evaluate("__OI.ui.rows[__OI.ui.focus].dataset.action==='start'"),
            )
            page.keyboard.press("Enter")
            page.wait_for_function("__OI.ui.screen==='play'")
            self.advance(page, 0.25)
            self.verify(
                "menu confirm does not fire",
                page.evaluate("__OI.world.stats.shots===0"),
            )
            self.verify(
                "standard solo initial deployments",
                page.evaluate(
                    "__OI.world.players.length===1 && __OI.world.reserve===2 && !__OI.world.assisted"
                ),
            )
            x = page.evaluate("__OI.world.players[0].x")
            page.keyboard.down("d")
            self.advance(page, 0.3)
            page.keyboard.up("d")
            self.verify(
                "keyboard horizontal motion",
                page.evaluate("__OI.world.players[0].x") > x + 15,
            )
            page.keyboard.down("Space")
            self.advance(page, 0.55)
            page.keyboard.up("Space")
            self.verify(
                "held fire uses repeat and two-shot cap",
                page.evaluate(
                    "__OI.world.stats.shots>=1 && __OI.world.bullets.filter(b=>b.owner===0).length<=2"
                ),
            )
            self.screenshot(page, "combat-1920")
            old_tick = page.evaluate("__OI.world.tick")
            page.keyboard.press("Escape")
            page.wait_for_function("__OI.ui.screen==='pause'")
            self.advance(page, 1)
            self.verify(
                "local pause freezes combat",
                page.evaluate("__OI.world.tick") <= old_tick + 5,
            )
            self.screenshot(page, "pause-1920")
            self.click(page, "settings")
            self.click(page, "back")
            self.verify("settings Back returns to pause", self.screen(page) == "pause")
            self.click(page, "resume")
            self.advance(page, 0.2)
            self.verify(
                "resume continues world",
                page.evaluate("__OI.world.tick") > old_tick + 5,
            )
            # Pointer aim is bounded motion rather than instant teleportation.
            page.mouse.move(1700, 700)
            before = page.evaluate("__OI.world.players[0].x")
            self.advance(page, 0.05)
            after = page.evaluate("__OI.world.players[0].x")
            self.verify(
                "mouse target uses bounded cannon speed",
                abs(after - before) < 30,
                f"{before}->{after}",
            )
            page.keyboard.down("a")
            self.advance(page, 0.2)
            page.keyboard.up("a")
            x = page.evaluate("__OI.world.players[0].x")
            self.advance(page, 0.2)
            self.verify(
                "keyboard cancels passive pointer target",
                abs(page.evaluate("__OI.world.players[0].x") - x) < 2,
            )
            # Deliberate ordinary-rules inactivity reaches a real defeat, then replay.
            self.advance(page, 720)
            page.wait_for_function("__OI.ui.screen==='results'")
            self.verify(
                "ordinary loss reaches results",
                page.evaluate("__OI.world.status==='defeat' && !__OI.world.assisted"),
            )
            self.verify(
                "defeat identifies cause",
                any(
                    token in page.locator("#ui").inner_text().lower()
                    for token in ["breach", "deployments"]
                ),
            )
            # Explicit presentation fixtures test both labels; these are not campaign proofs.
            page.evaluate(
                "__OI.world.assisted=true;__OI.world.reason='BREACH — THE SKY CROSSED THE LINE';__OI.ui.render()"
            )
            self.verify(
                "breach result cause is specific",
                "invader crossed the breach"
                in page.locator("#ui").inner_text().lower(),
            )
            page.evaluate("__OI.world.reason='DEPLOYMENTS DEPLETED';__OI.ui.render()")
            self.verify(
                "deployment result cause is specific",
                "deployments were exhausted"
                in page.locator("#ui").inner_text().lower(),
            )
            self.click(page, "restart")
            page.wait_for_function("__OI.ui.screen==='play'")
            self.verify(
                "replay fully resets run ownership",
                page.evaluate(
                    "__OI.world.score===0 && __OI.world.encounter===0 && __OI.world.reserve===2 && !__OI.world.assisted && !__OI.invulnerable && __OI.game.timeScale===1"
                ),
            )
            self.verify(
                "native play engine errors absent",
                page.evaluate("__OI.game.errors.length===0"),
            )
        finally:
            context.close()

    def audio(self, browser):
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        context.add_init_script(PAD_SCRIPT)
        try:
            page = self.page(context)
            self.click(page, "controls")
            page.wait_for_function("__OI.game.audio.ready", timeout=10000)
            probes = page.evaluate("""async () => {
              const out=[];
              for(const bus of ['music','sfx','voice']) for(const muted of [false,true]) out.push(await __OI.audio.renderProbe(window.OfflineAudioContext||window.webkitOfflineAudioContext,{bus,muted}));
              return out;
            }""")
            self.verify(
                "all procedural probes finite",
                all(p["finite"] and p["samples"] == 22050 for p in probes),
            )
            self.verify(
                "all unmuted buses produce nonzero signal",
                all(
                    p["rms"] > 0.00001 and p["peak"] < 1
                    for p in probes
                    if not p["muted"]
                ),
                json.dumps(probes),
            )
            self.verify(
                "all muted probes are silent",
                all(p["rms"] == 0 and p["peak"] == 0 for p in probes if p["muted"]),
            )
            master = page.evaluate("""async () => {
              const a=__OI.game.audio, node=a.ctx.createAnalyser();node.fftSize=1024;a._master.connect(node);
              __OI.audio.effect('repair');
              let peak=0;const d=new Float32Array(1024);
              for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,15));node.getFloatTimeDomainData(d);for(const x of d)peak=Math.max(peak,Math.abs(x));}
              a.mute(true);__OI.audio.effect('repair');await new Promise(r=>setTimeout(r,150));node.getFloatTimeDomainData(d);let muted=0;for(const x of d)muted=Math.max(muted,Math.abs(x));a.mute(false);node.disconnect();
              return {peak,muted,music:a.musicVolume};
            }""")
            self.verify(
                "real Web Audio master has signal",
                master["peak"] > 0.00001,
                str(master),
            )
            self.verify(
                "real master mute is silent", master["muted"] < 0.00001, str(master)
            )
            page.evaluate("__OI.audio.stop()")
            self.verify(
                "audio stop clears authored voices",
                page.evaluate("__OI.audio.diagnostics().active===0"),
            )
            self.details["audio"] = {
                "probes": probes,
                "master": master,
                "humanListening": "unverified",
            }
        finally:
            context.close()

    def pads(self, browser):
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        context.add_init_script(PAD_SCRIPT + "\n__pad(0);__pad(1);")
        try:
            page = self.page(context)
            device = page.evaluate("__OI.primary")
            page.evaluate("__pad(0,{axes:[.04,0,0,0]})")
            self.advance(page, 0.3)
            self.verify(
                "stick drift keeps current glyph family",
                page.evaluate("__OI.primary") == device,
            )
            page.evaluate("__pad(0,{axes:[0,0,0,0],buttons:{0:1}})")
            self.advance(page, 0.6)
            self.verify(
                "held pad confirm activates exactly one menu",
                self.screen(page) == "launch",
                self.screen(page),
            )
            page.evaluate("__pad(0,{buttons:{0:0}})")
            self.advance(page, 0.2)
            self.click(page, "players")
            self.click(page, "start")
            self.verify(
                "two-pad roster locks to two ships",
                page.evaluate(
                    "__OI.world.players.length===2 && __OI.world.reserve===4"
                ),
            )
            old = page.evaluate("__OI.world.players.map(p=>p.x)")
            page.evaluate("__pad(0,{axes:[-.8,0,0,0]});__pad(1,{axes:[.8,0,0,0]})")
            self.advance(page, 0.3)
            new = page.evaluate("__OI.world.players.map(p=>p.x)")
            self.verify(
                "two simultaneous pads move separate seats",
                new[0] < old[0] - 10 and new[1] > old[1] + 10,
                f"{old}->{new}",
            )
            # Observe shot creation; a legitimate cover collision can remove it before inspection.
            page.evaluate(
                """()=>{const app=__OI, original=app.present.bind(app);app.__testShotOwners=[];app.present=function(events){for(const event of events)if(event.type==='shot')app.__testShotOwners.push(event.seat);return original(events)}}"""
            )
            page.evaluate(
                "__pad(0,{axes:[0,0,0,0],buttons:{7:1}});__pad(1,{axes:[0,0,0,0],buttons:{0:1}})"
            )
            self.advance(page, 0.35)
            self.verify(
                "both pads fire independently",
                page.evaluate(
                    "__OI.__testShotOwners.includes(0) && __OI.__testShotOwners.includes(1)"
                ),
                page.evaluate(
                    "JSON.stringify({owners:__OI.__testShotOwners,inputs:__OI.game.players.map(I=>({pad:I.padIndex,fire:I.down('fire')})),players:__OI.world.players.map(p=>({x:p.x,recovery:p.recovery}))})"
                ),
            )
            page.evaluate(
                "__pad(0,{buttons:{7:0}});__pad(1,{buttons:{0:0},connected:false})"
            )
            self.advance(page, 0.2)
            self.verify(
                "pad removal preserves roster identity",
                page.evaluate(
                    "__OI.world.players.length===2 && __OI.world.players[1].id==='p2'"
                ),
            )
            if self.screen(page) == "pause":
                self.click(page, "resume")
            old = page.evaluate("__OI.world.players[1].x")
            page.evaluate("__pad(1,{connected:true,axes:[-.8,0,0,0]})")
            self.advance(page, 0.25)
            self.verify(
                "returning pad reclaims prior seat",
                page.evaluate("__OI.world.players[1].x") < old - 10
                and page.evaluate("__OI.world.players.length===2"),
            )
            page.evaluate("__pad(1,{axes:[0,0,0,0]})")
            self.verify(
                "gamepad activity selects controller prompts",
                page.evaluate("__OI.primary==='gamepad'"),
            )
        finally:
            context.close()

    def solo_and_mixed_pad(self, browser):
        for coop in (False, True):
            context = browser.new_context(viewport={"width": 1280, "height": 720})
            context.add_init_script(PAD_SCRIPT + "\n__pad(0);")
            try:
                page = self.page(context)
                self.launch(page, coop=coop)
                before = page.evaluate("__OI.world.players.map(p=>p.x)")
                page.evaluate("__pad(0,{axes:[-.8,0,0,0],buttons:{7:1}})")
                if coop:
                    page.keyboard.down("d")
                self.advance(page, 0.3)
                if coop:
                    page.keyboard.up("d")
                after = page.evaluate("__OI.world.players.map(p=>p.x)")
                if coop:
                    self.verify(
                        "keyboard plus one pad control distinct seats",
                        after[0] > before[0] + 10 and after[1] < before[1] - 10,
                        f"{before}->{after}",
                    )
                    self.verify(
                        "one-pad co-op pad fires seat two",
                        page.evaluate(
                            "__OI.world.stats.shots>0 && __OI.world.bullets.some(b=>b.owner===1)"
                        ),
                    )
                else:
                    self.verify(
                        "solo gamepad still moves after launch",
                        after[0] < before[0] - 10,
                        f"{before}->{after}",
                    )
                    self.verify(
                        "solo trigger fires", page.evaluate("__OI.world.stats.shots>0")
                    )
            finally:
                context.close()

    def attract(self, browser):
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        context.add_init_script(PAD_SCRIPT + "\n__pad(0);")
        try:
            page = self.page(context)
            before = page.evaluate("JSON.stringify(__OI.records)")
            self.advance(page, 9)
            self.verify(
                "attract does not start before ten seconds",
                self.screen(page) == "title",
            )
            self.advance(page, 1.3)
            page.wait_for_function("__OI.ui.screen==='attract'", timeout=12000)
            self.verify(
                "attract clearly labelled",
                "ATTRACT PLAY" in page.locator("#ui").inner_text(),
            )
            self.advance(page, 90)
            self.verify(
                "attract loops without result navigation",
                self.screen(page) == "attract",
            )
            self.verify(
                "attract does not save local records",
                page.evaluate("JSON.stringify(__OI.records)") == before,
            )
            page.keyboard.press("Enter")
            page.wait_for_function("__OI.ui.screen==='title'")
            self.advance(page, 0.3)
            self.verify("keyboard wake is consumed", self.screen(page) == "title")
            self.advance(page, 10.3)
            page.wait_for_function("__OI.ui.screen==='attract'", timeout=12000)
            page.evaluate("__pad(0,{axes:[.65,0,0,0]})")
            self.advance(page, 0.2)
            self.verify(
                "pad axis wakes attract without navigation",
                self.screen(page) == "title",
            )
            page.evaluate("__pad(0,{axes:[0,0,0,0]})")
            self.advance(page, 0.4)
            self.advance(page, 10.3)
            page.wait_for_function("__OI.ui.screen==='attract'", timeout=12000)
            page.evaluate("__pad(0,{buttons:{7:.4}})")
            self.advance(page, 0.2)
            self.verify(
                "partial trigger motion wakes attract", self.screen(page) == "title"
            )
            page.evaluate("__pad(0,{buttons:{7:0}})")
            self.advance(page, 10.3)
            page.wait_for_function("__OI.ui.screen==='attract'", timeout=12000)
            page.mouse.down()
            page.mouse.up()
            page.wait_for_function("__OI.ui.screen==='title'")
            self.verify("pointer wake is consumed", self.screen(page) == "title")
            self.advance(page, 0.4)
            page.wait_for_function("performance.now()>=__OI.wakeUntil")
            self.launch(page)
            self.verify(
                "real run after attract is clean",
                page.evaluate(
                    "__OI.world.score===0 && !__OI.world.assisted && __OI.world.encounter===0 && __OI.world.reserve===2"
                ),
            )
        finally:
            context.close()

    def developer_screens(self, browser):
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        context.add_init_script(PAD_SCRIPT)
        try:
            page = self.page(context)
            self.launch(page)
            page.keyboard.press("Escape")
            page.wait_for_function("__OI.ui.screen==='pause'")
            self.click(page, "dev")
            self.verify(
                "developer tools reachable from pause", self.screen(page) == "dev"
            )
            self.click(page, "invincible")
            self.verify(
                "world mutations mark assisted",
                page.evaluate("__OI.world.assisted && __OI.invulnerable"),
            )
            self.click(page, "charges")
            self.verify(
                "dev repair resources work",
                page.evaluate("__OI.world.players[0].charges===3"),
            )
            self.screenshot(page, "dev-1920")
            self.click(page, "devPage")
            slider = page.locator('[data-tuning="playerSpeed"]')
            self.verify(
                "live tuning sliders expose bounds and values",
                slider.is_visible()
                and bool(slider.get_attribute("min"))
                and bool(slider.get_attribute("max")),
            )
            before = page.evaluate("__OI.world.tuning.playerSpeed")
            slider.evaluate(
                "e=>{e.value=String(Number(e.value)+Number(e.step)*2);e.dispatchEvent(new Event('input',{bubbles:true}))}"
            )
            self.verify(
                "live slider updates simulation tuning",
                page.evaluate("__OI.world.tuning.playerSpeed") != before,
            )
            self.click(page, "resetTuning")
            self.verify(
                "difficulty tuning reset restores value",
                page.evaluate("__OI.world.tuning.playerSpeed") == before,
            )
            self.click(page, "devPage")
            self.click(page, "devPage")
            for _ in range(6):
                self.click(page, "encounter")
            self.verify(
                "flagship selectable via tools",
                page.evaluate("__OI.world.encounter===6 && __OI.world.boss.phase===1"),
            )
            self.click(page, "resume")
            self.advance(page, 1.8)
            self.screenshot(page, "flagship-phase1-1920")
            page.keyboard.press("Escape")
            page.wait_for_function("__OI.ui.screen==='pause'")
            self.click(page, "dev")
            self.click(page, "phase")
            self.click(page, "resume")
            self.verify(
                "second flagship phase selectable",
                page.evaluate("__OI.world.boss.phase===2"),
            )
            self.advance(page, 3)
            self.screenshot(page, "flagship-phase2-1920")
            page.keyboard.press("Escape")
            page.wait_for_function("__OI.ui.screen==='pause'")
            self.click(page, "restart")
            self.verify(
                "new campaign clears developer state",
                page.evaluate(
                    "!__OI.world.assisted && !__OI.invulnerable && !__OI.overlays && __OI.speed===1 && __OI.game.timeScale===1"
                ),
            )
        finally:
            context.close()

    def touch(self, browser, playwright):
        context = browser.new_context(**playwright.devices["iPhone 13"], locale="en-US")
        context.add_init_script(PAD_SCRIPT)
        try:
            page = self.page(context)
            self.screenshot(page, "phone-title")
            self.verify(
                "phone title button is visible",
                page.locator('[data-action="launch"]').is_visible(),
            )
            self.launch(page)
            self.screenshot(page, "phone-combat")
            self.verify(
                "touch shows one menu control",
                page.locator("#pause-button").is_visible(),
            )
            self.verify(
                "native START overlay is suppressed",
                page.locator('[data-act="menu"]').count() == 0
                or not page.locator('[data-act="menu"]').first.is_visible(),
            )
            self.verify(
                "phone combat retains fixed field",
                page.evaluate(
                    "__OI.world.players[0].y===246 && __OI.world.bunkers.length===4"
                ),
            )
            bounds = page.locator("canvas").first.bounding_box()
            # Browser-generated multitouch creates real pointer capture/cancel transitions.
            cdp = context.new_cdp_session(page)
            x, y = (
                bounds["x"] + bounds["width"] * 0.42,
                bounds["y"] + bounds["height"] * 0.76,
            )
            old_x = page.evaluate("__OI.world.players[0].x")
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [{"x": x, "y": y, "id": 1}]},
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [{"x": x + 60, "y": y, "id": 1}]},
            )
            self.advance(page, 0.35)
            self.verify(
                "relative thumb movement changes cannon x",
                page.evaluate("__OI.world.players[0].x") > old_x + 5,
            )
            before = page.evaluate("__OI.world.stats.shots")
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": x + 60, "y": y, "id": 1},
                        {"x": x - 40, "y": y, "id": 2},
                    ],
                },
            )
            self.advance(page, 0.35)
            self.verify(
                "second touch intentionally fires",
                page.evaluate("__OI.world.stats.shots") > before,
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [
                        {"x": x + 10, "y": y, "id": 1},
                        {"x": x - 40, "y": y, "id": 2},
                    ],
                },
            )
            self.advance(page, 0.25)
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []}
            )
            self.advance(page, 0.15)
            x_stop = page.evaluate("__OI.world.players[0].x")
            self.advance(page, 0.3)
            self.verify(
                "touch cancellation releases movement",
                abs(page.evaluate("__OI.world.players[0].x") - x_stop) < 2,
            )
            self.click(page, "resume") if self.screen(page) == "pause" else None
            page.locator("#pause-button").tap()
            page.wait_for_function("__OI.ui.screen==='pause'")
            self.click(page, "controls")
            self.verify(
                "touch two-finger lane gesture discoverable",
                "second finger" in page.locator("#ui").inner_text().lower(),
            )
            self.click(page, "back")
            self.click(page, "dev")
            self.click(page, "charges")
            self.click(page, "resume")
            self.advance(page, 0.2)
            repair_button = page.locator("#repair-button")
            self.verify("touch repair opportunity appears", repair_button.is_visible())
            before = page.evaluate("__OI.world.players[0].charges")
            repair_button.tap()
            self.advance(page, 0.15)
            self.verify(
                "touch repair spends charge and restores mask",
                page.evaluate("__OI.world.players[0].charges") == before - 1
                and page.evaluate("__OI.world.stats.cellsRepaired>0"),
            )
            page.set_viewport_size({"width": 844, "height": 390})
            self.advance(page, 0.2)
            self.verify(
                "rotation preserves same combat bounds",
                page.evaluate(
                    "__OI.world.players[0].y===246 && __OI.world.bunkers.length===4"
                ),
            )
            self.screenshot(page, "phone-landscape")
            page.locator("#pause-button").tap()
            page.wait_for_function("__OI.ui.screen==='pause'")
            self.click(page, "title")
            self.advance(page, 10.3)
            page.wait_for_function("__OI.ui.screen==='attract'")
            page.touchscreen.tap(200, 180)
            page.wait_for_function("__OI.ui.screen==='title'")
            self.verify(
                "touch wake is consumed and clears captured input",
                page.evaluate(
                    "__OI.ui.screen==='title' && __OI.touchContacts.size===0 && !__OI.activeRun"
                ),
            )
        finally:
            context.close()
        tablet = browser.new_context(
            **playwright.devices["iPad (gen 7)"], locale="en-US"
        )
        tablet.add_init_script(PAD_SCRIPT)
        try:
            page = self.page(tablet)
            self.launch(page)
            self.screenshot(page, "tablet-combat")
            self.verify(
                "tablet retains fixed combat bounds",
                page.evaluate(
                    "__OI.world.players[0].y===246 && __OI.world.bunkers.length===4"
                ),
            )
        finally:
            tablet.close()

    def storage_failures(self, browser):
        for mode, script in [
            (
                "blocked",
                "Storage.prototype.getItem=function(){throw Error('test storage denied')};Storage.prototype.setItem=function(){throw Error('test storage denied')};",
            ),
            (
                "malformed",
                "Storage.prototype.getItem=function(){return '{malformed json'};",
            ),
        ]:
            context = browser.new_context(viewport={"width": 1280, "height": 720})
            context.add_init_script(PAD_SCRIPT + script)
            try:
                page = self.page(context)
                self.verify(
                    f"{mode} storage retains safe defaults",
                    page.evaluate(
                        "__OI.game.settings.music===.1 && Array.isArray(__OI.records)"
                    ),
                )
                self.launch(page)
                self.verify(
                    f"{mode} storage still starts game",
                    page.evaluate("__OI.world.status==='playing'"),
                )
                self.verify(
                    f"{mode} storage causes no engine errors",
                    page.evaluate("__OI.game.errors.length===0"),
                )
            finally:
                context.close()

    def engine_smoke(self, browser, engine):
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        context.add_init_script(PAD_SCRIPT)
        try:
            page = self.page(context)
            self.verify(
                f"{engine} standalone title boots", self.screen(page) == "title"
            )
            self.launch(page)
            before = page.evaluate("__OI.world.players[0].x")
            page.keyboard.down("a")
            self.advance(page, 0.3)
            page.keyboard.up("a")
            self.verify(
                f"{engine} keyboard movement works",
                page.evaluate("__OI.world.players[0].x") < before - 10,
            )
            page.keyboard.down("Space")
            self.advance(page, 0.3)
            page.keyboard.up("Space")
            self.verify(
                f"{engine} native canvas input fires",
                page.evaluate("__OI.world.stats.shots>0"),
            )
            page.keyboard.press("Escape")
            page.wait_for_function("__OI.ui.screen==='pause'")
            self.click(page, "controls")
            self.verify(
                f"{engine} controls layout fits",
                page.locator('[data-action="back"]').is_visible(),
            )
            self.verify(
                f"{engine} engine reports no errors",
                page.evaluate("__OI.game.errors.length===0"),
            )
        finally:
            context.close()

    def save(self):
        failures = [item for item in self.checks if not item["pass"]]
        errors = self.page_errors
        bad_warnings = [
            message
            for message in self.console
            if message["group"] != "blocked and malformed storage"
            and ("my-3D2dge:" in message["text"] or "AIHub" in message["text"])
        ]
        if bad_warnings:
            self.checks.append(
                {
                    "name": "no engine or protocol warnings",
                    "pass": False,
                    "detail": json.dumps(bad_warnings),
                }
            )
            failures = [item for item in self.checks if not item["pass"]]
        if errors:
            self.checks.append(
                {
                    "name": "no browser page errors",
                    "pass": False,
                    "detail": json.dumps(errors),
                }
            )
            failures = [item for item in self.checks if not item["pass"]]
        data = {
            "date": datetime.now(timezone.utc).isoformat(),
            "artifact": self.artifact.name,
            "versions": self.versions,
            "checks": self.checks,
            "console": self.console,
            "pageErrors": errors,
            "screenshots": self.screenshots,
            "details": self.details,
            "limitations": [
                "standard-mapping synthetic gamepads, not physical controller feel",
                "phone/tablet profiles and CDP multitouch, not physical iOS",
                "generated signal and mute checks, not human listening",
                "TV readability judged in screenshots, not real ten-foot viewing",
            ],
            "pass": not failures,
        }
        EVIDENCE.mkdir(exist_ok=True)
        (EVIDENCE / "browser.json").write_text(json.dumps(data, indent=2) + "\n")
        for failure in failures:
            print(f"FAIL {failure['name']}: {failure.get('detail', '')}")
        print(
            f"{len(self.checks) - len(failures)}/{len(self.checks)} browser checks passed"
        )
        return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", type=Path, default=ROOT / CONFIG["html"])
    parser.add_argument(
        "--engine", choices=["all", "chromium", "firefox", "webkit"], default="all"
    )
    args = parser.parse_args()
    suite = BrowserSuite(args.artifact.resolve())
    if not args.artifact.is_file():
        print(f"FAIL export missing: {args.artifact}")
        return 1
    with sync_playwright() as p:
        if args.engine in ("all", "chromium"):
            browser = p.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])
            suite.versions["chromium"] = browser.version
            try:
                for name, fn in [
                    (
                        "isolated export and menus",
                        lambda: suite.boot_and_menus(browser),
                    ),
                    ("native play and replay", lambda: suite.native_play(browser)),
                    ("procedural audio", lambda: suite.audio(browser)),
                    ("standard gamepads", lambda: suite.pads(browser)),
                    (
                        "solo and mixed gamepad",
                        lambda: suite.solo_and_mixed_pad(browser),
                    ),
                    ("attract lifecycle", lambda: suite.attract(browser)),
                    ("developer screens", lambda: suite.developer_screens(browser)),
                    ("phone and tablet touch", lambda: suite.touch(browser, p)),
                    (
                        "blocked and malformed storage",
                        lambda: suite.storage_failures(browser),
                    ),
                ]:
                    suite.run(name, fn)
            finally:
                browser.close()
        for engine in ("firefox", "webkit"):
            if args.engine in ("all", engine):
                browser = getattr(p, engine).launch(headless=True)
                suite.versions[engine] = browser.version
                try:
                    suite.run(
                        engine + " smoke",
                        lambda browser=browser, engine=engine: suite.engine_smoke(
                            browser, engine
                        ),
                    )
                finally:
                    browser.close()
    return suite.save()


if __name__ == "__main__":
    sys.exit(main())
