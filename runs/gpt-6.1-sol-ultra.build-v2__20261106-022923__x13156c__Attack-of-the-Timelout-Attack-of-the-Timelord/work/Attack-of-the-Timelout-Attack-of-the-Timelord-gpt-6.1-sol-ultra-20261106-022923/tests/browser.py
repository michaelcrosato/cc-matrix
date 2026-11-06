"""Final-file browser/input checks. Quiet output; screenshots judge appearance only."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PROJECT = json.loads((ROOT / "project.json").read_text())
DEFAULT_ARTIFACT = ROOT.parent / (PROJECT["slug"] + ".html")
PADS = """
window.__testPad={id:'DualSense standard-mapping test',index:0,connected:true,mapping:'standard',
  axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__testPad]});
window.__padSet=(axes={},buttons={})=>{
 for(const [k,v] of Object.entries(axes))window.__testPad.axes[k]=v;
 for(const [k,v] of Object.entries(buttons))window.__testPad.buttons[k]={pressed:!!v,touched:!!v,value:v?1:0};
 window.__testPad.timestamp=performance.now();
};
"""
SNAPSHOT = """() => {
const t=window.__timelout,a=t.app,w=a.world;
return {mode:a.mode,screen:a.screens.shell.screen,paused:t.game.paused,device:a.device,
 errors:t.game.errors,world:w?{phase:w.phase,tick:w.tick,wave:w.wave,bossPhase:w.bossPhase,
 players:w.players,shots:w.shots,threats:w.threats,charge:w.charge,brake:w.brake,
 modified:w.modified,demo:w.demo,score:w.score,stats:w.stats,tuning:w.tuning,assists:w.assists}:null,
 settings:{music:a.settings.music,effects:a.settings.effects,voice:a.settings.voice,
 autoFire:a.settings.autoFire,glyphs:a.settings.glyphs,devGod:a.settings.devGod,devAI:a.settings.devAI},
 network:a.net.debug};
}"""


class Suite:
    def __init__(self, artifact: Path, groups: set[str]):
        self.artifact = artifact
        self.groups = groups
        self.checks = 0
        self.failures: list[dict] = []
        self.notes: list[str] = []

    def check(self, ok: bool, label: str, detail: str = "") -> None:
        self.checks += 1
        if not ok:
            self.failures.append({"check": label, "detail": str(detail)[:1800]})

    def require(self, ok: bool, label: str, detail: str = "") -> None:
        self.check(ok, label, detail)
        if not ok:
            raise AssertionError(label)

    def run(self, name: str, fn) -> None:
        if "all" not in self.groups and name not in self.groups:
            return
        try:
            fn()
        except AssertionError:
            pass
        except (
            PlaywrightError,
            OSError,
            ValueError,
            RuntimeError,
            KeyError,
            TypeError,
        ) as error:
            self.check(False, name + " flow completed", str(error))

    def open(self, browser, *, pad: bool = False, init: str | None = None, **options):
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080}, **options
        )
        if pad:
            context.add_init_script(PADS)
        if init:
            context.add_init_script(init)
        page = context.new_page()
        page.set_default_timeout(4500)
        page._test_errors = []
        page._test_requests = []
        page.on("pageerror", lambda e: page._test_errors.append(str(e)))
        page.on("request", lambda r: page._test_requests.append(r.url))
        page.goto(self.artifact.as_uri(), wait_until="domcontentloaded")
        page.wait_for_function(
            "window.__timelout && document.body.dataset.ready==='true'"
        )
        page.wait_for_timeout(80)
        self.require(
            not page.evaluate(SNAPSHOT)["errors"],
            "native engine reports no boot errors",
            page.evaluate(SNAPSHOT)["errors"],
        )
        return context, page

    def clean(self, page, label: str) -> None:
        self.check(
            not page._test_errors, label + ": no uncaught errors", page._test_errors
        )
        self.check(
            not page.evaluate(SNAPSHOT)["errors"],
            label + ": no engine errors",
            page.evaluate(SNAPSHOT)["errors"],
        )
        external = [
            u
            for u in page._test_requests
            if u != self.artifact.as_uri() and not u.startswith(("data:", "blob:"))
        ]
        self.check(
            not external,
            label + ": solo needs no external or source resources",
            external,
        )

    @staticmethod
    def step(page, seconds: float) -> None:
        page.evaluate("(seconds)=>window.__timelout.step(seconds)", seconds)
        page.wait_for_timeout(30)

    @staticmethod
    def title(page) -> None:
        page.evaluate("()=>{__timelout.app.screens.title();__timelout.game.resume();}")

    def start(self, page) -> None:
        page.get_by_role("button", name=re.compile("^Play solo")).click()
        self.step(page, 3)
        self.require(
            page.evaluate(SNAPSHOT)["world"]["phase"] == "playing",
            "solo enters first playable wave",
        )

    def screenshot(self, page, name: str) -> None:
        page.screenshot(
            animations="disabled",
            path=str(ROOT / "test-artifacts" / ("browser-" + name + ".png")),
        )

    def boot(self, browser) -> None:
        context, page = self.open(browser)
        try:
            self.check(
                page.title() == PROJECT["title"],
                "artifact title matches selected title",
            )
            self.check(
                page.evaluate(SNAPSHOT)["screen"] == "title", "native shell shows title"
            )
            button = page.get_by_role("button", name=re.compile("^Play solo"))
            self.check(button.is_visible(), "primary action visible")
            size = button.bounding_box()
            font = button.evaluate("(b)=>parseFloat(getComputedStyle(b).fontSize)")
            self.check(
                bool(size) and size["height"] >= 44 and font >= 20,
                "TV action labels and targets are large",
                {"box": size, "fontSize": font},
            )
            canvas = page.locator("#screen").bounding_box()
            self.check(
                bool(canvas) and canvas["width"] >= 1800 and canvas["height"] >= 1000,
                "arena canvas fills television viewport",
                canvas,
            )
            pixels = page.evaluate(
                """()=>{const c=document.getElementById('screen'),g=c.getContext('2d'),a=g.getImageData(0,0,c.width,c.height).data;let max=0,min=255,count=0;for(let i=0;i<a.length;i+=316){max=Math.max(max,a[i],a[i+1],a[i+2]);min=Math.min(min,a[i],a[i+1],a[i+2]);if(a[i]+a[i+1]+a[i+2]>120)count++;}return{max,min,count};}"""
            )
            self.check(
                pixels["max"] - pixels["min"] > 40 and pixels["count"] > 20,
                "procedural arena renders nonempty pixels",
                pixels,
            )
            self.screenshot(page, "title")
            page.get_by_role("button", name="How to play", exact=True).hover()
            self.check(
                page.get_by_role("button", name="How to play", exact=True).evaluate(
                    "(b)=>b===document.activeElement"
                ),
                "pointer hover moves menu focus",
            )
            page.get_by_role("button", name="About & credits", exact=True).click()
            self.screenshot(page, "credits")
            for label in [
                "Source information",
                "Testing feedback",
                "Engine feedback",
                "Prompt feedback",
            ]:
                page.get_by_role("button", name=label, exact=True).click()
                self.check(
                    page.get_by_role("dialog").is_visible(),
                    label + " screen accessible",
                )
                page.get_by_role("button", name="Back", exact=True).first.click()
            self.clean(page, "boot / credits")
        finally:
            context.close()

    def input(self, browser) -> None:
        context, page = self.open(browser, pad=True)
        try:
            page.keyboard.press("Enter")
            self.step(page, 3)
            self.require(
                page.evaluate(SNAPSHOT)["mode"] == "run",
                "keyboard confirms title action",
            )
            start_x = page.evaluate(SNAPSHOT)["world"]["players"][0]["x"]
            page.keyboard.down("KeyD")
            self.step(page, 0.25)
            page.keyboard.up("KeyD")
            x = page.evaluate(SNAPSHOT)["world"]["players"][0]["x"]
            self.check(
                x > start_x + 40,
                "D moves cannon immediately",
                {"before": start_x, "after": x},
            )
            page.keyboard.down("Space")
            self.step(page, 0.02)
            shots = page.evaluate(SNAPSHOT)["world"]["shots"]
            self.check(
                bool(shots) and all(s["owner"] == "p1" for s in shots),
                "Space fires owned vertical shot",
                shots,
            )
            page.keyboard.up("Space")
            canvas = page.locator("#screen").bounding_box()
            px = canvas["x"] + canvas["width"] * 0.82
            py = canvas["y"] + canvas["height"] * 0.84
            page.mouse.move(px, py)
            page.mouse.down()
            self.step(page, 0.2)
            page.mouse.up()
            pointer_x = page.evaluate(SNAPSHOT)["world"]["players"][0]["x"]
            self.check(
                x < pointer_x < 445,
                "pointer targets x at movement speed",
                {"before": x, "after": pointer_x},
            )
            page.keyboard.down("KeyA")
            page.mouse.move(px + 1, py)
            self.step(page, 0.2)
            page.keyboard.up("KeyA")
            self.check(
                page.evaluate(SNAPSHOT)["world"]["players"][0]["x"] < pointer_x - 30,
                "keyboard overrides stale pointer and small jitter",
            )
            self.check(
                page.evaluate(SNAPSHOT)["device"] == "keyboard",
                "idle pad and pointer jitter do not steal keyboard prompts",
            )
            self.step(page, 0.4)
            page.evaluate("()=>__padSet({0:.85})")
            self.step(page, 0.25)
            self.check(
                page.evaluate(SNAPSHOT)["device"] == "gamepad",
                "meaningful standard pad input selects controller prompts",
            )
            page.evaluate("()=>__padSet({0:0},{0:1})")
            self.step(page, 0.03)
            self.check(
                bool(re.search("R2|×|✕|Cross", page.locator("#prompts").inner_text())),
                "PlayStation fire prompt shown",
            )
            self.check(
                page.evaluate(SNAPSHOT)["world"]["shots"] != [],
                "standard pad Cross holds fire",
            )
            page.evaluate("()=>__padSet({0:0},{0:0})")
            page.evaluate("()=>__padSet({}, {9:1})")
            self.step(page, 0.04)
            page.evaluate("()=>__padSet({}, {9:0})")
            self.step(page, 0.04)
            self.check(
                page.evaluate(SNAPSHOT)["paused"],
                "standard pad Options opens native pause menu",
            )
            page.evaluate("()=>__padSet({}, {1:1})")
            self.step(page, 0.04)
            page.evaluate("()=>__padSet({}, {1:0})")
            self.step(page, 0.04)
            self.check(
                not page.evaluate(SNAPSHOT)["paused"],
                "standard pad Circle backs out and resumes",
            )
            page.keyboard.press("Escape")
            self.step(page, 0.02)
            self.require(page.evaluate(SNAPSHOT)["paused"], "Escape pauses solo")
            tick = page.evaluate(SNAPSHOT)["world"]["tick"]
            self.step(page, 0.25)
            self.check(
                page.evaluate(SNAPSHOT)["world"]["tick"] == tick,
                "solo pause freezes authoritative ticks",
            )
            page.keyboard.press("Escape")
            self.step(page, 0.02)
            self.check(
                not page.evaluate(SNAPSHOT)["paused"],
                "Escape resumes native pause screen",
            )
            self.step(page, 1.2)
            self.screenshot(page, "combat")
            page.keyboard.down("KeyD")
            page.evaluate("()=>dispatchEvent(new Event('blur'))")
            self.step(page, 0.02)
            self.check(
                page.evaluate(SNAPSHOT)["paused"], "focus loss pauses standalone solo"
            )
            self.check(
                page.evaluate("()=>__timelout.game.input.held.size") == 0,
                "focus loss clears held movement and fire",
            )
            page.keyboard.up("KeyD")
            page.keyboard.press("Escape")
            self.step(page, 0.02)
            page.evaluate("()=>dispatchEvent(new Event('gamepaddisconnected'))")
            self.check(
                page.evaluate(SNAPSHOT)["paused"],
                "controller disconnect pauses standalone solo",
            )
            self.clean(page, "keyboard / mouse / controller")
        finally:
            context.close()

    def settings(self, browser) -> None:
        context, page = self.open(browser)
        try:
            page.get_by_role("button", name="Settings", exact=True).click()
            music = page.get_by_role(
                "slider", name=re.compile("^Music", re.IGNORECASE)
            ).first
            self.check(
                abs(float(music.input_value()) - 0.1) < 0.00001,
                "actual saved music preference defaults to ten percent",
            )
            music.fill("0.35")
            music.dispatch_event("input")
            self.check(
                abs(page.evaluate(SNAPSHOT)["settings"]["music"] - 0.35) < 0.00001,
                "native music slider applies live",
            )
            glyphs = page.get_by_role(
                "button", name=re.compile("Button symbols", re.IGNORECASE)
            )
            for _ in range(5):
                if page.evaluate(SNAPSHOT)["settings"]["glyphs"] == "xbox":
                    break
                glyphs.click()
            self.check(
                page.evaluate(SNAPSHOT)["settings"]["glyphs"] == "xbox",
                "controller glyph choice switches to Xbox",
            )
            autofire = (
                page.locator(".esh-row")
                .filter(has_text="Automatic fire")
                .get_by_role("switch")
            )
            autofire.click()
            self.check(
                page.evaluate(SNAPSHOT)["settings"]["autoFire"],
                "automatic fire assistance toggles",
            )
            page.get_by_role(
                "button", name="Restore all preferences", exact=True
            ).click()
            state = page.evaluate(SNAPSHOT)
            self.check(
                state["settings"]["music"] == 0.1 and not state["settings"]["autoFire"],
                "preference reset restores known defaults",
            )
            self.clean(page, "settings")
        finally:
            context.close()

    def dev(self, browser) -> None:
        context, page = self.open(browser)
        try:
            self.start(page)
            defaults = page.evaluate(SNAPSHOT)["world"]["tuning"]
            page.keyboard.press("Escape")
            page.get_by_role("button", name="Dev Mode", exact=True).click()
            self.require(
                page.evaluate(SNAPSHOT)["world"]["modified"],
                "opening Dev Mode marks score as modified",
            )
            tick = page.evaluate(SNAPSHOT)["world"]["tick"]
            page.get_by_role("button", name="Step one tick", exact=True).click()
            self.check(
                page.evaluate(SNAPSHOT)["world"]["tick"] == tick + 1,
                "developer single-step advances exactly one canonical tick",
            )
            self.check(
                page.evaluate(SNAPSHOT)["paused"], "developer single-step retains pause"
            )
            page.get_by_role(
                "button", name="Refill integrity + brake", exact=True
            ).click()
            state = page.evaluate(SNAPSHOT)
            self.check(
                state["world"]["charge"] == 100
                and state["world"]["players"][0]["hp"] == 3,
                "developer refill applies integrity and shared charge",
            )
            page.get_by_role("button", name="Live balance sliders", exact=True).click()
            sliders = page.get_by_role("slider")
            self.check(
                sliders.count() >= 10,
                "all required live tuning sliders exposed",
                sliders.count(),
            )
            player_speed = page.get_by_role("slider", name=re.compile("^Machine speed"))
            player_speed.fill("500")
            player_speed.dispatch_event("input")
            self.check(
                page.evaluate(SNAPSHOT)["world"]["tuning"]["playerSpeed"] == 500,
                "live machine speed slider changes simulation tuning",
            )
            page.get_by_role("button", name="Reset balance", exact=True).click()
            self.check(
                page.evaluate(SNAPSHOT)["world"]["tuning"] == defaults,
                "group tuning reset restores immutable defaults",
            )
            page.get_by_role("button", name="Back", exact=True).first.click()
            page.locator(".esh-row").filter(has_text="Show hitboxes").get_by_role(
                "switch"
            ).click()
            self.check(
                page.evaluate("()=>__timelout.game.settings.devHitboxes"),
                "hitbox overlay can be toggled through native settings",
            )
            page.locator(".esh-row").filter(has_text="Invulnerability").get_by_role(
                "switch"
            ).click()
            self.screenshot(page, "dev")
            page.get_by_role("button", name="Jump to encounter", exact=True).click()
            page.get_by_role("button", name=re.compile("^4 ·")).click()
            self.step(page, 0.05)
            self.check(
                page.evaluate(SNAPSHOT)["world"]["wave"] == 3,
                "developer encounter jump enters selected authored wave",
            )
            page.keyboard.down("KeyA")
            self.step(page, 0.75)
            page.keyboard.up("KeyA")
            for index, family in enumerate(["roller", "missile", "mine", "hunter"]):
                if index:
                    page.keyboard.down("KeyD")
                    self.step(page, 0.5)
                    page.keyboard.up("KeyD")
                page.keyboard.press("Escape")
                page.get_by_role("button", name="Dev Mode", exact=True).click()
                page.get_by_role("button", name="Spawn arsenal", exact=True).click()
                page.get_by_role("button", name=family.upper(), exact=True).click()
                if family == "roller":
                    self.step(page, 3)
                    self.screenshot(page, "ground-roller")
                    self.step(page, 3)
            self.step(page, 0.05)
            families = page.evaluate(SNAPSHOT)["world"]["stats"]["threatsSeen"]
            self.check(
                all(t in families for t in ["missile", "mine", "roller", "hunter"]),
                "developer arsenal spawns all four real actors across safe windows",
                families,
            )
            self.screenshot(page, "all-threats")
            page.keyboard.press("Shift")
            self.step(page, 0.05)
            self.check(
                page.evaluate(SNAPSHOT)["world"]["stats"]["brakes"] == 1,
                "charged Shift edge activates one time brake",
            )
            self.screenshot(page, "brake")
            page.keyboard.press("Escape")
            page.get_by_role("button", name="Dev Mode", exact=True).click()
            page.get_by_role("button", name="Jump to encounter", exact=True).click()
            page.get_by_role("button", name=re.compile("^Finale 2")).click()
            self.step(page, 3)
            self.check(
                page.evaluate(SNAPSHOT)["world"]["bossPhase"] == 1,
                "developer finale phase jump enters real boss state",
            )
            self.screenshot(page, "boss")
            page.keyboard.press("Escape")
            page.get_by_role("button", name="Dev Mode", exact=True).click()
            page.locator(".esh-row").filter(has_text="AI pilot").get_by_role(
                "switch"
            ).click()
            page.get_by_role("button", name="Return to play", exact=True).click()
            for _ in range(15):
                if page.evaluate(SNAPSHOT)["mode"] == "results":
                    break
                self.step(page, 30)
            self.require(
                page.evaluate(SNAPSHOT)["mode"] == "results",
                "real AI actions finish remaining boss phases and reach results",
            )
            self.screenshot(page, "results")
            page.get_by_role("button", name="Save score / records", exact=True).click()
            page.mouse.move(0, 0)
            self.check(
                "cannot submit" in page.get_by_role("dialog").inner_text().lower(),
                "developer results cannot submit normal records",
            )
            self.clean(page, "developer tools / brake / boss")
        finally:
            context.close()

    def records(self, browser) -> None:
        context, page = self.open(browser, pad=True)
        try:
            self.start(page)
            for _ in range(12):
                if page.evaluate(SNAPSHOT)["mode"] == "results":
                    break
                self.step(page, 10)
            self.require(
                page.evaluate(SNAPSHOT)["mode"] == "results",
                "ordinary idle failure reaches complete results",
            )
            self.check(
                page.evaluate(SNAPSHOT)["world"]["players"][0]["hp"] == 0,
                "ordinary failure consumes three integrity pips",
            )
            self.screenshot(page, "failure")
            page.get_by_role("button", name="Save score / records", exact=True).click()
            self.require(
                page.evaluate(SNAPSHOT)["screen"] == "initials",
                "standard run offers six-character record picker",
            )

            def pad_button(index):
                page.evaluate("(i)=>__padSet({}, {[i]:1})", index)
                self.step(page, 0.04)
                page.evaluate("(i)=>__padSet({}, {[i]:0})", index)
                self.step(page, 0.04)

            pad_button(13)
            self.check(
                "Next character"
                in page.evaluate("()=>document.activeElement.textContent"),
                "controller D-pad moves picker focus",
            )
            pad_button(0)
            pad_button(13)
            for _ in range(6):
                pad_button(0)
            self.check(
                page.get_by_role("heading", name="BBBBBB", exact=True).is_visible(),
                "controller confirms six selected initials",
            )
            page.get_by_role("button", name="Save record", exact=True).click()
            table = page.evaluate("()=>My3D2dge.store.get('timelout-records-v1',[])")
            self.check(
                len(table) == 1
                and table[0]["name"] == "BBBBBB"
                and table[0]["category"] == "solo",
                "six-character solo record persists through native storage",
                table,
            )
            page.get_by_role("button", name="Back", exact=True).first.click()
            page.get_by_role("button", name="Retry campaign", exact=True).click()
            self.step(page, 0.05)
            state = page.evaluate(SNAPSHOT)
            self.check(
                state["world"]["players"][0]["hp"] == 3
                and state["world"]["tick"] < 100,
                "retry creates a fresh complete run",
            )
            self.clean(page, "loss / six-character records / retry")
        finally:
            context.close()

    def attract(self, browser) -> None:
        context, page = self.open(browser, pad=True)
        try:
            before = page.evaluate("()=>JSON.stringify({...localStorage})")
            self.step(page, 9)
            self.check(
                page.evaluate(SNAPSHOT)["mode"] == "title",
                "attract never launches before ten idle seconds",
            )
            self.step(page, 1.2)
            self.require(
                page.evaluate(SNAPSHOT)["mode"] == "attract",
                "ten idle seconds launch native-simulation attract",
            )
            self.check(
                page.evaluate(SNAPSHOT)["world"]["demo"],
                "attract uses private marked simulation",
            )
            self.step(page, 60)
            seen = page.evaluate(SNAPSHOT)["world"]["stats"]["threatsSeen"]
            self.check(
                all(t in seen for t in ["missile", "mine", "roller", "hunter"]),
                "attract shows all four weapon families",
                seen,
            )
            self.screenshot(page, "attract")
            page.keyboard.press("Enter")
            self.check(
                page.evaluate(SNAPSHOT)["mode"] == "title",
                "keyboard wakes attract without starting a run",
            )
            self.check(
                page.evaluate("()=>JSON.stringify({...localStorage})") == before,
                "attract leaves preferences and scores unchanged",
            )
            play = page.get_by_role(
                "button", name=re.compile("^Play solo")
            ).bounding_box()
            click_x, click_y = (
                play["x"] + play["width"] / 2,
                play["y"] + play["height"] / 2,
            )
            page.mouse.move(click_x, click_y)
            self.step(page, 10.2)
            page.mouse.click(click_x, click_y)
            self.step(page, 0.03)
            self.require(
                page.evaluate(SNAPSHOT)["mode"] == "title",
                "mouse click wakes attract without clicking through to solo",
            )
            self.step(page, 10.2)
            page.mouse.move(1000, 500)
            page.mouse.move(1010, 500)
            self.check(
                page.evaluate(SNAPSHOT)["mode"] == "title",
                "deliberate pointer movement wakes attract",
            )
            self.step(page, 10.2)
            page.evaluate("()=>__padSet({0:.8})")
            self.step(page, 0.03)
            self.check(
                page.evaluate(SNAPSHOT)["mode"] == "title",
                "controller activity wakes attract and is consumed",
            )
            self.clean(page, "attract")
        finally:
            context.close()

    def storage(self, browser) -> None:
        context, page = self.open(
            browser,
            init="Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage intentionally unavailable in test');}});",
        )
        try:
            self.start(page)
            self.check(
                page.evaluate(SNAPSHOT)["world"]["players"][0]["hp"] == 3,
                "unavailable storage still permits standard solo",
            )
            self.clean(page, "storage unavailable")
        finally:
            context.close()

    def touch(self, playwright) -> None:
        browser = playwright.chromium.launch(headless=True)
        device = {**playwright.devices["iPhone 13"]}
        device.pop("default_browser_type", None)
        viewport = device.pop("viewport")
        context = browser.new_context(**device, viewport=viewport)
        page = context.new_page()
        page.set_default_timeout(4500)
        cdp = context.new_cdp_session(page)

        def touches(kind, points):
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": kind,
                    "touchPoints": [
                        {"x": x, "y": y, "id": identity} for identity, x, y in points
                    ],
                },
            )

        try:
            page.goto(self.artifact.as_uri(), wait_until="domcontentloaded")
            page.wait_for_function(
                "window.__timelout && document.body.dataset.ready==='true'"
            )
            self.require(
                not page.evaluate(SNAPSHOT)["errors"],
                "touch profile boots without engine errors",
            )
            page.get_by_role("button", name=re.compile("^Play solo")).tap()
            self.step(page, 3)
            self.check(
                page.evaluate(SNAPSHOT)["device"] == "touch",
                "real touch gesture selects touch prompts",
            )
            self.check(
                page.evaluate(SNAPSHOT)["settings"]["autoFire"],
                "touch enables declared automatic-fire assist",
            )
            geometry = page.evaluate(
                """()=>{const g=__timelout.game,s=g.screen;return{W:s.W,H:s.H,S:s.S,px:s.OX+(s.W/2)*s.S,py:s.OY+(s.H/2+240)*s.S,cw:s.canvas.width,ch:s.canvas.height};}"""
            )
            self.check(
                geometry["W"] == 1066 and geometry["H"] == 600,
                "touch keeps canonical collision bounds",
                geometry,
            )
            self.check(
                0 <= geometry["px"] <= geometry["cw"]
                and 0 <= geometry["py"] <= geometry["ch"],
                "touch defense lane is visible, never cropped",
                geometry,
            )
            x = page.evaluate(SNAPSHOT)["world"]["players"][0]["x"]
            touches("touchStart", [(1, 120, 650)])
            touches("touchMove", [(1, 220, 650)])
            self.step(page, 0.2)
            self.check(
                page.evaluate(SNAPSHOT)["world"]["players"][0]["x"] > x + 40,
                "invisible relative drag moves cannon",
            )
            touches("touchCancel", [])
            self.step(page, 0.1)
            stopped = page.evaluate(SNAPSHOT)["world"]["players"][0]["x"]
            self.step(page, 0.2)
            self.check(
                abs(page.evaluate(SNAPSHOT)["world"]["players"][0]["x"] - stopped) < 1,
                "pointercancel releases touch movement",
            )
            self.screenshot(page, "touch-portrait")
            page.get_by_role("button", name="Menu", exact=True).tap()
            self.check(
                page.evaluate(SNAPSHOT)["paused"],
                "small persistent touch menu pauses solo",
            )
            page.get_by_role("button", name="Dev Mode", exact=True).tap()
            page.get_by_role(
                "button", name="Refill integrity + brake", exact=True
            ).tap()
            page.get_by_role("button", name="Return to play", exact=True).tap()
            self.step(page, 0.03)
            self.require(
                page.locator("#touch-brake").is_visible(),
                "touch brake button appears only when charged",
            )
            touches("touchStart", [(1, 110, 650)])
            touches("touchMove", [(1, 150, 650)])
            brake = page.locator("#touch-brake").bounding_box()
            brake_x, brake_y = (
                brake["x"] + brake["width"] / 2,
                brake["y"] + brake["height"] / 2,
            )
            touches("touchStart", [(1, 150, 650), (2, brake_x, brake_y)])
            self.step(page, 0.03)
            self.check(
                page.evaluate(SNAPSHOT)["world"]["stats"]["brakes"] == 1,
                "multitouch drag plus context brake activates slowdown",
            )
            touches("touchCancel", [])
            page.set_viewport_size({"width": 844, "height": 390})
            self.step(page, 0.1)
            self.screenshot(page, "touch-landscape")
            self.check(
                not page.evaluate(SNAPSHOT)["errors"],
                "landscape touch resize retains working renderer",
            )
            self.title(page)
            play = page.get_by_role(
                "button", name=re.compile("^Play solo")
            ).bounding_box()
            self.step(page, 10.2)
            self.require(
                page.evaluate(SNAPSHOT)["mode"] == "attract",
                "touch front end enters private attract after idle",
            )
            page.touchscreen.tap(
                play["x"] + play["width"] / 2, play["y"] + play["height"] / 2
            )
            self.step(page, 0.03)
            self.check(
                page.evaluate(SNAPSHOT)["mode"] == "title",
                "touch wakes attract and consumes the would-be start tap",
                page.evaluate(SNAPSHOT)["mode"],
            )
        finally:
            context.close()
            browser.close()

    def other_browsers(self, playwright) -> None:
        for name in ["webkit", "firefox"]:
            browser = getattr(playwright, name).launch(headless=True)
            context = None
            try:
                context, page = self.open(browser)
                self.start(page)
                x = page.evaluate(SNAPSHOT)["world"]["players"][0]["x"]
                page.keyboard.down("ArrowRight")
                self.step(page, 0.2)
                page.keyboard.up("ArrowRight")
                self.check(
                    page.evaluate(SNAPSHOT)["world"]["players"][0]["x"] > x + 20,
                    name + ": boot, menu, and movement work",
                )
                self.clean(page, name)
            finally:
                if context:
                    context.close()
                browser.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", type=Path, default=DEFAULT_ARTIFACT)
    parser.add_argument("--groups", default="all")
    args = parser.parse_args()
    suite = Suite(args.artifact.resolve(), set(args.groups.split(",")))
    source = suite.artifact.read_text()
    first_script = re.search(
        r'<meta charset="utf-8">\s*<script>(.*?)</script>',
        source,
        re.DOTALL | re.IGNORECASE,
    )
    suite.check(
        bool(first_script) and "AIHub" in first_script.group(1),
        "unmodified Hub script is first after charset",
    )
    suite.check(
        not re.search(r'<script[^>]+src=["\']\.?\.?/', source),
        "final HTML has no sibling script dependencies",
    )
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for name in [
                "boot",
                "input",
                "settings",
                "dev",
                "records",
                "attract",
                "storage",
            ]:
                suite.run(name, lambda n=name: getattr(suite, n)(browser))
        finally:
            browser.close()
        suite.run("touch", lambda: suite.touch(playwright))
        suite.run("browsers", lambda: suite.other_browsers(playwright))
    result = {"checks": suite.checks, "failures": suite.failures, "notes": suite.notes}
    (ROOT / "test-artifacts/browser-report.json").write_text(
        json.dumps(result, indent=2)
    )
    for failure in suite.failures:
        print(
            "FAIL browser: "
            + failure["check"]
            + (": " + failure["detail"] if failure["detail"] else "")
        )
    print(f"{suite.checks} browser checks, {len(suite.failures)} failures")
    return 1 if suite.failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
