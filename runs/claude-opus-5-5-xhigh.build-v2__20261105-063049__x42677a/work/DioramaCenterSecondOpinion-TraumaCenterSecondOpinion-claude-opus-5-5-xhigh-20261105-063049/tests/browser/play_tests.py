"""The whole campaign, New Game to the last line, through the real input path in the real page.

Each frame reads what the bot would do (`wish`), then does it with the stub pad or with real mouse and
key events, so everything between gilrs or winit and the sim gets played: menus, story, flicks, the
stick's curve and assist, the trigger, gifts, bones, Codes, results, deaths and retries. The bot's wish
isn't a person, and frames here are slow, so this proves the controls can finish the game, not that the
game feels right. Prints only failures; progress goes to tests/out/play_<device>.log.

usage: python3 play_tests.py [pad] [mouse] [case=<n>]
"""
import math
import sys
import time

from common import ARGS, CRASHED, OUT, frames, open_game, status, sync_playwright, wait_for_memory

# pav_core::input::hands
USE, GIFT, PRECISION, DEFIB = 1, 4, 8, 16
VIEW = (480, 270)
LIMIT = 3 * 3600


class Pad:
    """A DualSense in the standard mapping."""

    name = "pad"
    pad = True

    def __init__(self, page):
        self.page = page
        self.sent = {}

    def _set(self, js_key, js):
        if self.sent.get(js_key) != js:
            self.sent[js_key] = js
            self.page.evaluate(js)

    def confirm(self):
        self.page.evaluate("__padHit(0,1)")
        frames(self.page, 2)
        self.page.evaluate("__padHit(0,0)")
        frames(self.page, 2)

    def aim(self, s, w):
        cur, want = s["cursor"], w["aim"]
        dx, dz = want[0] - cur[0], want[1] - cur[1]
        d = math.hypot(dx, dz)
        dt = min(0.25, 1.0 / max(s["fps"], 1.0))
        mag = 0.0 if d < 0.04 else min(1.0, max(0.25, (d / (15.0 * dt)) ** (1 / 2.2)))
        ax = dx / d * mag if d > 0 else 0.0
        az = dz / d * mag if d > 0 else 0.0
        self._set("rs", f"__padAxis(2,{ax:.3f});__padAxis(3,{az:.3f})")

    def tool(self, w):
        if w["tool"] >= 0 and w["tool"] != w["place"]:
            a = w["tool"] * math.pi / 4
            self._set("ls", f"__padAxis(0,{math.sin(a) * 0.95:.3f});__padAxis(1,{-math.cos(a) * 0.95:.3f})")
        else:
            self._set("ls", "__padAxis(0,0);__padAxis(1,0)")

    def hands(self, held, rotate):
        defib = held & DEFIB
        self._set("r2", f"__padHit(7,{1 if held & USE or defib else 0})")
        self._set("l2", f"__padHit(6,{1 if held & PRECISION or defib else 0})")
        self._set("tri", f"__padHit(3,{1 if held & GIFT else 0})")
        self._set("l1", f"__padHit(4,{1 if rotate < 0 else 0})")
        self._set("r1", f"__padHit(5,{1 if rotate > 0 else 0})")


class Mouse:
    """A mouse, and the keys a PC player expects."""

    name = "mouse"
    pad = False

    def __init__(self, page):
        self.page = page
        self.left = self.right = self.space = False

    def confirm(self):
        self.page.mouse.move(VIEW[0] * 0.5, VIEW[1] * 0.5)
        self.page.mouse.down()
        frames(self.page, 2)
        self.page.mouse.up()
        frames(self.page, 2)

    def menu(self):
        self.page.keyboard.press("Enter", delay=250)
        frames(self.page, 2)

    def aim(self, s, w):
        px = s.get("wish_px")
        if px:
            self.page.mouse.move(px[0] * VIEW[0], px[1] * VIEW[1])

    def tool(self, w):
        if w["tool"] >= 0 and w["tool"] != w["place"]:
            self.page.keyboard.press(str(w["tool"] + 1), delay=120)

    def hands(self, held, rotate):
        defib = held & DEFIB
        left, right = bool(held & USE or defib), bool(defib)
        if left != self.left:
            (self.page.mouse.down if left else self.page.mouse.up)()
            self.left = left
        if right != self.right:
            (self.page.mouse.down if right else self.page.mouse.up)(button="right")
            self.right = right
        space = bool(held & GIFT)
        if space != self.space:
            (self.page.keyboard.down if space else self.page.keyboard.up)("Space")
            self.space = space
        if rotate:
            self.page.mouse.wheel(0, -40 if rotate > 0 else 40)


def code_hands(s, w):
    """A Code by eye: charge, then let go so the release lands as the ghost crosses the line."""
    ghost, charge = w["ghost"], w["charge"]
    if ghost is None:
        return 0
    if charge < 1.0:
        return DEFIB
    ticks = 60.0 / max(s["fps"], 7.5)
    lead = 2.0 * ticks / 60.0
    until = ((0.5 - ghost) % 1.0) * 1.1
    return 0 if until <= lead + 0.04 else DEFIB


def play(b, device, case=None, saved=None):
    """Plays until the campaign is won. Returns (done, why, saved progress for a retry)."""
    ctx, page, errs = open_game(b, VIEW[0], VIEW[1], pad=device.pad, storage=saved)
    d = device(page)
    log = open(OUT / f"play_{d.name}.log", "a")
    # Drawing is what the screenshots test. Here it would only make an hour into a day.
    for _ in range(600):
        if status(page):
            break
        time.sleep(0.5)
    page.evaluate("__game.do(JSON.stringify({nodraw:true}))")
    started, last_log, deaths, last_stage, won = time.time(), 0.0, 0, None, 0
    menu_mouse = d.name == "mouse"
    try:
        while time.time() - started < LIMIT:
            s = status(page)
            if not s or "stage" not in s:
                time.sleep(0.2)
                continue
            sim, stage, screen = s.get("sim") or {}, s["stage"], s["screen"]
            now = time.time()
            if now - last_log > 20:
                last_log = now
                saved = page.evaluate("localStorage.getItem('surgery-save')") or saved
                print(f"{int(now - started):5}s {screen} {s.get('scene')} {stage} case {sim.get('case')} phase {sim.get('phase')} "
                      f"vitals {s.get('vitals')} won {sim.get('cases_won')} deaths {deaths} fps {s.get('fps')}", file=log, flush=True)
            won = max(won, sim.get("cases_won") or 0)
            if sim.get("outcome") == "won" or (case is not None and stage == "Results"):
                assert not errs, errs[:3]
                print(f"{int(now - started):5}s DONE won {won} deaths {deaths}", file=log, flush=True)
                return True, "", saved
            if stage != last_stage and stage == "Dead":
                deaths += 1
            last_stage = stage
            if screen in ("Title", "Menu", "Difficulty"):
                if case is not None and screen == "Menu":
                    page.evaluate(f"__game.do(JSON.stringify({{load:'surgery/case/{case}'}}));__game.do(JSON.stringify({{screen:'Playing'}}))")
                    frames(page, 2)
                elif menu_mouse:
                    d.menu()
                else:
                    d.confirm()
                continue
            if screen == "Pause":
                page.keyboard.press("Escape", delay=200)
                continue
            if stage in ("Story", "Chart", "Results"):
                d.hands(0, 0)
                d.confirm()
                continue
            if stage == "Dead":
                d.hands(0, 0)
                if menu_mouse:
                    d.menu()
                else:
                    d.confirm()
                continue
            w = sim.get("wish")
            if not w:
                continue
            if stage == "Code":
                d.hands(code_hands(s, w), 0)
                continue
            d.tool(w)
            d.aim(s, w)
            d.hands(w["held"], w["rotate"])
        return False, f"out of time: {status(page)}", saved
    except Exception as e:
        return False, str(e), saved
    finally:
        log.close()
        ctx.close()


def main():
    args = sys.argv[1:] if __name__ == "__main__" else []
    case = next((int(a[5:]) for a in args if a.startswith("case=")), None)
    devices = [c for c, n in ((Pad, "pad"), (Mouse, "mouse")) if n in args or not any(x in args for x in ("pad", "mouse"))]
    passed = failed = 0
    with sync_playwright() as p:
        for device in devices:
            saved, ok, why = None, False, ""
            for attempt in range(12):
                wait_for_memory(3.0)
                b = p.chromium.launch(args=ARGS)
                try:
                    ok, why, saved = play(b, device, case, saved)
                finally:
                    try:
                        b.close()
                    except Exception:
                        pass
                # Out of memory ends the browser: that's the machine. Pick up from the save.
                if ok or not any(c in why for c in CRASHED):
                    break
                time.sleep(20)
            if ok:
                passed += 1
            else:
                failed += 1
                print(f"FAIL the campaign with the {device.name}: {why[:800]}")
    return passed, failed


if __name__ == "__main__":
    print(main())
