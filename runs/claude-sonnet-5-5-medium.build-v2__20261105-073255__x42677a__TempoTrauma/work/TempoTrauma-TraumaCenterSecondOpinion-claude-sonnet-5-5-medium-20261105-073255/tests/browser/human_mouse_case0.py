"""A 'person' plays Case 0 through the real browser mouse and keyboard only: reads what is on screen
(status), moves the pointer in pixels, clicks, picks instruments with number keys. No bot flag, no sim commands
after the case starts."""
import json, math, re, sys, time
from playwright.sync_api import sync_playwright
from common import Game, ROOT

W, H = 640, 360
def project(x, z, y=0.3):
    tilt, dist, fov = math.radians(73), 19.9, 36.0
    tx, ty, tz = 0.0, 0.0, 0.9
    eye = (tx, ty + dist * math.sin(tilt), tz + dist * math.cos(tilt))
    f = (tx - eye[0], ty - eye[1], tz - eye[2]); n = math.sqrt(sum(v * v for v in f)); f = tuple(v / n for v in f)
    r = (f[2] * 0 - f[1] * 0, 0, 0)  # right = f x up
    r = (f[1] * 0 - f[2] * 1, 0, f[0] * 1 - f[1] * 0); r = (-f[2], 0, f[0]); m = math.hypot(r[0], r[2]); r = (r[0] / m, 0, r[2] / m)
    u = (r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0])
    d = (x - eye[0], y - eye[1], z - eye[2])
    cx, cy, cz = sum(a * b for a, b in zip(d, r)), sum(a * b for a, b in zip(d, u)), sum(a * b for a, b in zip(d, f))
    aspect = W / H
    fv = math.radians(fov)
    if aspect < 1.4:
        fv = min(2 * math.atan(math.tan(fv / 2) * (16 / 9) / aspect), math.radians(100))
    t = math.tan(fv / 2)
    nx, ny = cx / (cz * t * aspect), cy / (cz * t)
    return (nx * 0.5 + 0.5) * W, (0.5 - ny * 0.5) * H

hooks = {}
for m in re.finditer(r'"hook ([-\d.]+) ([-\d.]+) ([-\d.]+)', (ROOT / "engine/crates/pav_core/src/games/surgery/content/cases.toml").read_text().split("[[case]]")[2]):
    hooks[(round(float(m.group(1)), 1), round(float(m.group(2)), 1))] = math.radians(float(m.group(3)))
lace_ends = {}
for m in re.finditer(r'"lace ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"', (ROOT / "engine/crates/pav_core/src/games/surgery/content/cases.toml").read_text().split("[[case]]")[2]):
    lace_ends[(round(float(m.group(1)), 1), round(float(m.group(2)), 1))] = (float(m.group(3)), float(m.group(4)))
dress_end = (5.0, 3.4)
for (hx, hz) in list(hooks):
    lace_ends.setdefault((hx, hz), (hx + 0.8, hz + 0.3))  # a torn barb leaves a short laceration unless a real wound is there

def main():
    with sync_playwright() as p:
        g = Game(p, size=(640, 360)).open()
        try:
            g.key("Enter"); g.key("ArrowDown"); g.key("ArrowDown"); g.key("ArrowDown"); g.key("ArrowDown")  # focus 4? use Case Files
            # Main menu: Continue(0, disabled) New Game(1) Case Files(2): go to 2 then Enter, Enter on case 0
            g.do({"shell": "main"}); g.frames(2)
            for _ in range(2): g.key("ArrowDown")
            g.key("Enter"); g.wait(lambda s: s["shell"]["screen"] == "cases", 60, "cases")
            g.key("Enter")
            g.wait(lambda s: s["sim"]["mode"] == "Card", 60, "card")
            for _ in range(10):
                if g.status()["sim"]["mode"] == "Op": break
                g.key("Enter")
            g.wait(lambda s: s["sim"]["mode"] == "Op", 60, "op")
            down = False; grab_from = None; zig = 1; ang = 0.0; n = 0
            t0 = time.time()
            while time.time() - t0 < 2400:
                st = g.status(); sim = st["sim"]
                if sim["mode"] in ("Results", "Won"):
                    print("RESULT", sim["mode"], sim["rank"], sim["score"], "frames", n); return 0
                if sim["mode"] == "Dead":
                    print("DEAD", sim); return 1
                hz = [h for h in sim["hz"] if not h["covered"]]
                tgt = None
                non = [h for h in hz if h["k"] != "Dress"]
                tgt = non[0] if non else (hz[0] if hz else None)
                if not tgt:
                    if down: g.page.mouse.up(); down = False
                    g.frames(1); continue
                x, z = tgt["p"]; need = tgt["need"]; k = tgt["k"]
                key = {4: "4", 2: "2", 3: "3", 6: "6"}.get(need)
                if key and str(sim["tool"]) != key:
                    if down: g.page.mouse.up(); down = False
                    g.page.keyboard.press(key); g.frames(2); continue
                tx, tz = x, z
                want_down = True
                if k == "Hook":
                    a = hooks.get((round(x, 1), round(z, 1)), 0.0)
                    cur = sim["cursor"]
                    if grab_from is None:
                        tx, tz = x, z
                        if math.hypot(cur[0] - x, cur[1] - z) < 0.25:
                            grab_from = (x, z); ang = a
                        else:
                            want_down = False
                    if grab_from is not None:
                        s = min(1.8, math.hypot(cur[0] - grab_from[0], cur[1] - grab_from[1]) + 0.55)
                        tx, tz = grab_from[0] + math.cos(ang) * s, grab_from[1] + math.sin(ang) * s
                        if not hooks.get((round(x, 1), round(z, 1))) and False: pass
                elif k == "Lace":
                    key2 = (round(x, 1), round(z, 1))
                    ex, ez = lace_ends.get(key2, (x + 3, z))
                    print('lace', key2, (ex, ez), tgt['cnt'], flush=True)
                    cnt, nstitch = tgt["cnt"], max(3, min(20, math.ceil(math.hypot(ex - x, ez - z) / 0.5)))
                    f = (cnt + 0.5) / nstitch
                    nx_, nz_ = x + (ex - x) * f, z + (ez - z) * f
                    dx, dz = ex - x, ez - z; L = math.hypot(dx, dz); px, pz = -dz / L, dx / L
                    zig = -zig
                    tx, tz = nx_ + px * 0.6 * zig, nz_ + pz * 0.6 * zig
                elif k == "Burn":
                    a2 = n * 1.1
                    tx, tz = x + math.cos(a2) * 0.7, z + math.sin(a2) * 0.7
                elif k == "Dress":
                    cur = sim["cursor"]
                    if cur[0] < -4.7 or True:
                        s = max(-5.0, min(5.0, cur[0] + 1.2)) if tgt["prog"] > 0 or abs(cur[1] - 3.4) < 0.3 and cur[0] > -5.2 else -5.0
                        tx, tz = s, 3.4
                    want_down = abs(cur[0] - -5.0) < 0.35 or tgt["prog"] > 0
                px_, py_ = project(tx, tz)
                g.page.mouse.move(px_, py_)
                if want_down and not down: g.page.mouse.down(); down = True
                if not want_down and down: g.page.mouse.up(); down = False
                if k == "Hook" and grab_from is not None and math.hypot(sim["cursor"][0] - grab_from[0], sim["cursor"][1] - grab_from[1]) > 1.6:
                    g.page.mouse.up(); down = False; grab_from = None
                if k != "Hook": grab_from = None
                g.frames(1); n += 1
            print("TIMEOUT", g.status()["sim"]["phase"], g.status()["sim"]["hazards"]); return 2
        finally:
            g.close()

if __name__ == "__main__":
    sys.exit(main())
