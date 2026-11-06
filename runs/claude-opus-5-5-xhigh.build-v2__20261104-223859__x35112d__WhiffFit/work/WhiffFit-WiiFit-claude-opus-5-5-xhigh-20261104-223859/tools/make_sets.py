#!/usr/bin/env python3
"""Writes the game's sets (room files) into engine/crates/pav_core/src/games/fit/sets/.
Maps, objects and people are generated here once for convenience; the TOML it writes is the data
the game reads, and running from engine/ a change to it needs no rebuild."""
import math, pathlib, random
OUT = pathlib.Path(__file__).resolve().parent.parent / "engine/crates/pav_core/src/games/fit/sets"

def toml_val(v):
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return repr(round(v, 3))
    if isinstance(v, str): return '"' + v + '"'
    if isinstance(v, (list, tuple)): return "[" + ", ".join(toml_val(x) for x in v) + "]"
    if isinstance(v, dict): return "{ " + ", ".join(f'"{k}" = {toml_val(x)}' if not k.isidentifier() else f"{k} = {toml_val(x)}" for k, x in v.items()) + " }"
    raise TypeError(v)

class Room:
    def __init__(self, name, w, h, stage, ground="~"):
        self.name, self.w, self.h = name, w, h
        self.stage = stage  # (x, z) cell
        self.grid = [[ground] * w for _ in range(h)]
        self.marks = {}
        self.legend = {}
        self.objects, self.npcs, self.labels = [], [], []
        self.view = {}
        self.water = []  # (z from, z to, colour, level)
        self.mark("stage", stage[0], stage[1])
    def mark(self, name, x, z):
        self.marks[name] = self.marks.get(name, []) + [(int(x), int(z))]
    def obj(self, asset=None, x=0.0, y=0.0, z=0.0, yaw=0.0, scale=1.0, body="none", name="", **k):
        d = {}
        if name: d["name"] = name
        if asset: d["asset"] = asset
        d["pos"] = [self.stage[0] + 0.5 + x, y, self.stage[1] + 0.5 + z]
        if yaw: d["yaw"] = yaw
        if scale != 1.0: d["scale"] = scale
        d["body"] = body
        d.update(k)
        self.objects.append(d)
    def npc(self, name, kind, x, z, yaw=0.0, y=0.0, ai={"type": "idle"}, **k):
        d = {"name": name, "kind": kind, "pos": [self.stage[0] + 0.5 + x, y, self.stage[1] + 0.5 + z], "yaw": yaw, "ai": ai}
        d.update(k)
        self.npcs.append(d)
    def write(self):
        chars = "abcdefghijklmnopqrtuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        lines = [f'name = "{self.name}"', 'entrance = { at = [1, 1], facing = "south" }', ""]
        lines.append("[view]")
        for k, v in self.view.items():
            key = f'"{k}"' if "." in k else k
            lines.append(f"{key} = {toml_val(v)}")
        lines += ["", "[layout]", "origin = [0.0, 0.0, 0.0]", "", "[[layout.layer]]", "y = 0", "map = '''"]
        lines += ["".join(r) for r in self.grid]
        lines += ["'''", ""]
        overlay = [["_"] * self.w for _ in range(self.h)]
        legend = dict(self.legend)
        i = 0
        for name, cells in sorted(self.marks.items()):
            c = chars[i]; i += 1
            while c in legend: c = chars[i]; i += 1
            legend[c] = f'marker = "{name}"'
            for (x, z) in cells:
                overlay[z][x] = c
        lines += ["[[layout.layer]]", "y = 0", "map = '''"] + ["".join(r) for r in overlay] + ["'''", ""]
        # The water: one rectangle per band, under everything (land stands above its surface).
        wl = [["_"] * self.w for _ in range(self.h)]
        for bi, (z0, z1, color, level) in enumerate(self.water):
            c = "@#$%"[bi]
            legend[c] = f'zone = {{ kind = "water", y0 = -3.0, y1 = {level}, color = "{color}" }}'
            for z in range(z0, z1):
                for x in range(self.w):
                    wl[z][x] = c
        if self.water:
            lines += ["[[layout.layer]]", "y = 0", "map = '''"] + ["".join(r) for r in wl] + ["'''", ""]
        legend["_"] = ""
        for c, body in legend.items():
            lines.append(f"[layout.legend.'{c}']")
            if body: lines.append(body)
            lines.append("")
        for o in self.objects:
            lines.append("[[object]]")
            for k, v in o.items():
                lines.append(f"{k} = {toml_val(v)}")
            lines.append("")
        for n in self.npcs:
            lines.append("[[npc]]")
            for k, v in n.items():
                lines.append(f"{k} = {toml_val(v)}")
            lines.append("")
        (OUT / f"{self.name}.toml").write_text("\n".join(lines))

SEA = "#8fdde0"
def base_view(sky="#d6eef6", elev=52.0, az=160.0, sun=0.62, amb=1.15, sea=SEA, fog_start=25.0, fog_end=110.0, exposure=1.0, sat=0.95, fog_color=None):
    v = {"sky": sky, "exposure": exposure, "saturation": sat, "bloom": 0.15, "bloom_threshold": 1.3, "outlines_on": "objects",
         "outline_px": 1.0, "outline_darken": 0.55, "rim": 0.3, "fog": True, "fog_start": fog_start, "fog_end": fog_end, "wind": 0.5,
         "light.sun_elevation": elev, "light.sun_azimuth": az, "light.sun_intensity": sun, "light.ambient": amb,
         "cutaway.height_cut": False, "cutaway.front_cut": False, "cutaway.fade": False,
         "filter.transition": "iris", "filter.transition_time": 0.8}
    return v
WATER_Y = -0.07
def sea(r, color=SEA):
    """One big water zone over the whole map; `~` cells have nothing else in them."""
    r.water.append((0, r.h, color, WATER_Y))
    r.legend["~"] = ""
def far_sea(r, color=SEA):
    r.obj(None, 0, -0.12, 0, name="far_sea", shape={"type": "cylinder", "half_height": 0.05, "radius": 240.0}, color=color, look="flat")

# People.
PIP = dict(skin="#8fd3ff", shirt="#8fd3ff", eyes="#263e54", scale=0.72, squash=2.0, accent="#5fb0e0", parts=[{"kind": "spikes", "size": 0.3, "count": 1, "color": "#5fb0e0"}])
POSEY = dict(skin="#d8b184", shirt="#d8b184", pants="#c79f6e", shoes="#c79f6e", eyes="#d8b184", scale=1.05, leg_length=0.98)
KETTLE = dict(skin="#2b2f36", shirt="#2b2f36", eyes="#ffffff", scale=1.0, squash=0.2, parts=[{"kind": "handle", "size": 1.2, "color": "#2b2f36"}])
BOUNCE = dict(skin="#ffa8c0", shirt="#ffa8c0", eyes="#263e54", scale=1.25, squash=2.0)
def guest(shirt="#fbfaf6", pants="#fbfaf6", skin="#eebd94", helm="hood", helm_color="#f5f2ec", belt="", **k):
    d = dict(shirt=shirt, pants=pants, skin=skin, shoes="#d9d4c5", **k)
    d["gear"] = {"helm": helm, "helm_color": helm_color, "belt": belt}
    return d

def islet(r, x, z, size=7.0, palms=2, rng=None):
    r.obj(None, x, -0.25, z, shape={"type": "cylinder", "half_height": 0.3, "radius": size}, color="#f6e7c8", look="flat", body="fixed")
    rng = rng or random
    for i in range(palms):
        a = rng.uniform(0, 6.28)
        r.obj("LIB/core/palm", x + math.cos(a) * size * 0.4, 0.0, z + math.sin(a) * size * 0.4, yaw=rng.uniform(0, 360), scale=rng.uniform(0.8, 1.2))

# ------------------------------------------------------------------ the hub: Tippy Cay itself
def hub():
    W, H, cx, cz = 76, 60, 38, 30
    r = Room("hub", W, H, (cx, cz))
    rng = random.Random(7)
    for z in range(H):
        for x in range(W):
            dx, dz = x + 0.5 - (cx + 0.5), z + 0.5 - (cz + 0.5)
            land = (abs(dx) / 29) ** 4 + (abs(dz) / 21) ** 4
            ring = ((abs(dx) / 22) ** 3 + (abs(dz) / 15) ** 3) ** (1 / 3)
            plaza = (dx / 8.5) ** 2 + (dz / 6.5) ** 2
            if land > 1.0: c = "~"
            elif abs(ring - 1) < 0.075: c = "p"
            elif plaza < 1: c = "d"
            elif land > 0.62 or ring > 1.09: c = "s"
            else: c = "g" if (x * 7 + z * 13) % 11 > 2 else "h"
            r.grid[z][x] = c
    r.legend = {
        "s": 'blocks = [{ y0 = -0.5, y1 = 0, color = "#f6e7c8", look = "flat" }]',
        "g": 'blocks = [{ y0 = -0.5, y1 = 0, color = "#bfe6b0", look = "flat" }]\ngrass = { density = 2, height = 0.32, color = "#a8dc98" }',
        "h": 'blocks = [{ y0 = -0.5, y1 = 0, color = "#b8e2a8", look = "flat" }]',
        "p": 'blocks = [{ y0 = -0.5, y1 = 0, color = "#efe7d6", look = "flat" }]',
        "d": 'blocks = [{ y0 = -0.5, y1 = 0, color = "#fbfaf6", look = "flat" }]',
    }
    r.view = base_view(fog_start=45.0, fog_end=150.0)
    far_sea(r)
    sea(r)
    # Reception.
    r.obj("LIB/core/reception_desk", 0, 0, -3, body="fixed", name="desk")
    r.npc("pip", "blob", 0, -3, y=1.0, yaw=0, look=PIP)
    r.obj("LIB/core/calendar_wall", -5.5, 0, -3.5, yaw=20, body="fixed")
    r.obj("LIB/core/minute_clam", 5.5, 0, -3.2, yaw=-20, body="fixed", name="clam")
    r.obj("LIB/core/wardrobe_rack", -7, 0, 1.2, yaw=70, body="fixed")
    r.obj("LIB/core/umbrella", 7.5, 0, 2.2, roles={"$accent": "#ff786e"})
    r.obj("LIB/core/lounge_chair", 8.6, 0, 3.3, yaw=-30, body="none")
    r.mark("int_calendar", cx - 5, cz - 2); r.mark("int_clam", cx + 5, cz - 1); r.mark("int_wardrobe", cx - 6, cz + 2)
    # Pavilions and their mats, inside the ring.
    pav = [("mat_studio", -13, -8, "#c4e8d8", -12), ("mat_gazebo", 13, -8, "#ffe2b0", 12), ("mat_boardwalk", 13, 8, "#ffc4d6", 12), ("mat_lagoon", -13, 8, "#b0e0f0", -12)]
    for name, x, z, col, _ in pav:
        r.obj("LIB/core/pavilion", x, 0, z, roles={"$accent": col}, body="fixed")
        sx, sz = (1 if x < 0 else -1), (1 if z < 0 else -1)
        mx, mz = x + sx * 4.8, z + sz * 3.8
        r.obj("LIB/core/exercise_mat", mx, 0.01, mz, yaw=math.degrees(math.atan2(sx, sz)), roles={"$accent": col})
        r.mark(name, cx + mx, cz + mz)
    # Cabanas on the south beach.
    for i, x in enumerate([-16, -8, 0, 8, 16]):
        cols = ["#46bec8", "#ff786e", "#ffd166", "#78dcaa", "#c4b1e8"]
        r.obj("LIB/core/cabana", x, 0, 19 - abs(x) * 0.05, yaw=180, roles={"$accent": cols[i]}, body="fixed")
    r.mark("int_cabana", cx, cz + 16)
    # The pier, tower and rowboat, to the east.
    r.obj(None, 36, -0.12, 0, shape={"type": "rounded_box", "half": [10.0, 0.14, 1.5], "radius": 0.1}, color="#e0c89a", body="none")
    for i in range(5):
        r.obj("LIB/core/mooring_post", 28 + i * 4, -0.6, 1.7, scale=0.5)
    r.obj("LIB/core/diving_tower", 40, 0, -10, yaw=90)
    r.mark("int_stand", cx + 25, cz + 1)
    r.obj("LIB/core/exercise_mat", 25, 0.01, 1, yaw=90, roles={"$accent": "#ff786e"})
    r.obj("LIB/core/rowboat", 31, -0.2, 7, name="rowboat")
    r.mark("end_dock", cx + 31, cz + 7)
    # Palms, loungers and a smoothie stand.
    placed = 0
    while placed < 38:
        x = rng.uniform(-28, 28); z = rng.uniform(-20, 20)
        land = (abs(x) / 28) ** 4 + (abs(z) / 20) ** 4
        if land > 0.97 or land < 0.42:
            continue
        ring = ((abs(x) / 22) ** 3 + (abs(z) / 15) ** 3) ** (1 / 3)
        if abs(ring - 1) < 0.16 or (z > 15 and abs(x) < 20) or (x > 20 and abs(z) < 4):
            continue
        r.obj("LIB/core/palm", x, 0, z, yaw=rng.uniform(0, 360), scale=rng.uniform(0.75, 1.25), sway="leaves")
        placed += 1
    for (x, z, y) in [(-22, -3, 90), (-22, 0, 90), (-22, 3, 90), (22, 8, -90), (19, 12, -60)]:
        r.obj("LIB/core/lounge_chair", x, 0, z, yaw=y)
        r.obj("LIB/core/umbrella", x + 1.2, 0, z - 1, roles={"$accent": rng.choice(["#46bec8", "#ffd166", "#ff786e"])})
    r.obj("LIB/core/market_stall", -3.5, 0, 12.2, yaw=180, body="fixed")
    # The library's generic furniture: somewhere to sit, signs to the pavilions, a fence behind the huts.
    r.obj("LIB/core/round_table", -8.0, 0, 11.0, body="fixed")
    r.obj("LIB/core/chair", -9.3, 0, 11.0, yaw=90)
    r.obj("LIB/core/chair", -6.7, 0, 11.0, yaw=-90)
    r.obj("LIB/core/park_bench", 5.5, 0, 8.4, body="fixed")
    r.obj("LIB/core/park_bench", -7.5, 0, 7.4, yaw=30, body="fixed")
    for (x, z) in [(-10.2, -1.8), (10.2, -1.8), (10.2, 1.8), (-10.2, 1.8)]:
        r.obj("LIB/core/signpost", x, 0, z, yaw=rng.uniform(-30, 30))
    for x in (-12, 0, 12):
        r.obj("LIB/core/fence", x, 0, 20.4)
    # A water channel in the distance, between two long sandbars.
    for z in (-31, -39):
        r.obj(None, 0, -0.14, z, shape={"type": "rounded_box", "half": [46.0, 0.12, 2.4], "radius": 0.1}, color="#f6e7c8", look="flat", body="none")
    for i in range(9):
        r.obj("LIB/core/buoy", -36 + i * 9, -0.05, -35, scale=0.9)
    r.obj("LIB/core/island_ground", 0, 0, 0)
    # People.
    r.npc("posey_hub", "biped", -9.5, -3.2, yaw=120, look=POSEY)
    r.npc("kettle_hub", "blob", 9.5, -4.0, yaw=-120, look=KETTLE)
    r.npc("bounce_hub", "blob", 10.5, 6.5, yaw=-140, hop=0.7, look=BOUNCE)
    r.obj("LIB/core/gull_captain", -10.5, 0, 6.3, yaw=130, body="fixed", name="commodore")
    r.mark("int_gull", cx - 10, cz + 6)
    r.npc("marjorie", "biped", -3.5, 4.5, yaw=30, look=guest())
    r.npc("tom", "biped", -5, 15, yaw=10, look=guest(shirt="#46bec8", pants="#fbfaf6", skin="#d9a074", belt="#fbfaf6"))
    r.npc("twin_a", "biped", 5, 5, yaw=-20, look=guest(shirt="#ffd166", pants="#ff786e", helm="cap", helm_color="#ffd166"))
    r.npc("twin_b", "biped", 6, 5, yaw=-20, look=guest(shirt="#ffd166", pants="#ff786e", helm="cap", helm_color="#ffd166"))
    for i, (x, z) in enumerate([(-20, 8), (20, -7), (-3, -12), (16, 14), (-14, 14)]):
        cols = ["#fbfaf6", "#c4b1e8", "#78dcaa", "#ffb88a", "#f4f1e8"]
        skins = ["#f6d7b8", "#8c5a3a", "#d9a074", "#5f3d29", "#eebd94"]
        r.npc(f"guest{i}", "biped", x, z, ai={"type": "wander", "radius": 5.0}, speed=0.35, look=guest(shirt=cols[i], skin=skins[i], helm="none"))
    r.npc("stretcher", "biped", 3.5, 15.6, yaw=180, look=guest(shirt="#c4b1e8", helm="none"), clips=["CMU/Stretch_Yawn"])
    # Lost flip-flops.
    for (x, z) in [(10, 20), (17, -13), (-26, 4), (27, -5), (-17, -13)]:
        r.mark("flipflop", cx + x, cz + z)
    r.write()

# ------------------------------------------------------------------ one-event sets
def bubbles(r, spots, color="#ffffff"):
    # Visual only: an invisible emitter under the surface.
    for (x, z) in spots:
        r.obj(None, x, -0.1, z, shape={"type": "sphere", "radius": 0.01}, color=color, body="none",
              particles={"preset": "bubbles", "rate": 2.5, "area": [1.4, 0.0, 1.4], "offset": [0.0, 0.0, 0.0]})

def water_room(name, size=60, color=SEA):
    r = Room(name, size, size, (size // 2, size // 2))
    sea(r, color)
    return r

def studio():
    r = water_room("studio", color="#a8e4e6")
    r.view = base_view(sky="#fbe6dc", elev=14.0, az=95.0, sun=0.5, amb=1.25, fog_start=20.0, fog_end=95.0)
    far_sea(r, "#a8e4e6")
    r.obj(None, 0, -0.14, 0, name="deck", shape={"type": "cylinder", "half_height": 0.14, "radius": 5.8}, color="#fbfaf6", body="fixed")
    r.obj(None, 0, -0.1, 0, shape={"type": "cylinder", "half_height": 0.12, "radius": 6.1}, color="#e8e2d4", body="none")
    r.obj("LIB/core/exercise_mat", 0, 0.01, 0, roles={"$accent": "#c4e8d8"})
    r.obj("LIB/core/exercise_mat", 2.4, 0.01, 0.2, roles={"$accent": "#ffd9c4"})
    r.npc("posey", "biped", 2.4, 0.2, yaw=0, look=POSEY)
    r.npc("pip_check", "blob", 0.8, -4.2, yaw=0, look=PIP)
    rng = random.Random(3)
    for (x, z, s, p) in [(-20, -16, 7, 3), (16, -22, 6, 2), (-9, -30, 5, 2), (26, -8, 5, 2), (-30, 2, 6, 2)]:
        islet(r, x, z, s, p, rng)
    for (x, z) in [(-7, -5), (7, -6)]:
        r.obj("LIB/core/lamp_post", x, -0.0, z)
    bubbles(r, [(-7.5, 3.5), (8.0, 2.5), (-3.5, -8.0), (5.0, -8.5)])
    r.write()

def gazebo():
    r = Room("gazebo", 60, 60, (30, 30))
    for z in range(60):
        for x in range(60):
            d = math.hypot(x - 30, z - 30)
            r.grid[z][x] = "~" if d > 22 else ("s" if d > 16 else "g")
    sea(r, "#a6d8d0")
    r.legend.update({"s": 'blocks = [{ y0 = -0.5, y1 = 0, color = "#f6dfb4", look = "flat" }]',
                "g": 'blocks = [{ y0 = -0.5, y1 = 0, color = "#cfe6a0", look = "flat" }]\ngrass = { density = 3, height = 0.34, color = "#bcdc88" }'})
    r.view = base_view(sky="#ffe6c2", elev=18.0, az=250.0, sun=0.85, amb=1.0, sat=1.0, fog_start=25.0, fog_end=100.0)
    far_sea(r, "#a6d8d0")
    r.obj("LIB/core/islet_ground", 0, 0, 0)
    r.obj("LIB/core/iron_gazebo", 0, 0.01, 0)
    r.obj("LIB/core/exercise_mat", 0, 0.11, 0, roles={"$accent": "#ffe2b0"})
    r.npc("kettle", "blob", 2.8, -0.2, yaw=-30, look=KETTLE)
    r.obj("LIB/core/kettle_rack", -3.6, 0.1, -2.2, yaw=30)
    rng = random.Random(5)
    for i in range(11):
        a = i * 0.57 + 0.3
        r.obj("LIB/core/palm", math.cos(a * 2.1) * rng.uniform(10, 18), 0, -abs(math.sin(a * 2.1)) * rng.uniform(9, 17) - 2, yaw=rng.uniform(0, 360), scale=rng.uniform(0.8, 1.3), sway="leaves")
    for (x, z, n) in [(-4.5, -7.5, "g1"), (5.2, -8.2, "g2")]:
        r.npc(n, "biped", x, z, yaw=10, look=guest(helm="none"), clips=["MESH2MOTION/Jumping Jacks" if n == "g1" else "CMU/Hop_One_Foot_Loop"])
    r.write()

def boardwalk():
    r = Room("boardwalk", 70, 60, (35, 30))
    for z in range(60):
        for x in range(70):
            r.grid[z][x] = "~" if z > 42 else "s"
    sea(r, "#8fe0e8")
    r.legend["s"] = 'blocks = [{ y0 = -0.5, y1 = 0, color = "#f6e7c8", look = "flat" }]'
    r.view = base_view(sky="#cdeefc", elev=66.0, az=170.0, sun=0.75, amb=1.1, sat=1.0, fog_start=30.0, fog_end=120.0)
    far_sea(r, "#8fe0e8")
    r.obj(None, 0, -0.05, -1, name="planks", shape={"type": "rounded_box", "half": [18.0, 0.1, 6.0], "radius": 0.05}, color="#e0c89a", body="none")
    for i in range(18):
        r.obj(None, -17 + i * 2, 0.056, -1, shape={"type": "box", "half": [0.02, 0.005, 6.0]}, color="#c8ae80", body="none")
    r.obj("LIB/core/step_box", 0, 0.05, 0, scale=1.2, body="fixed")
    r.npc("bounce", "blob", -4.2, -1.2, yaw=40, hop=0.62, look=BOUNCE)
    for i, x in enumerate([-8, -6, -3, 3, 6, 8]):
        cols = ["#ffd166", "#78dcaa", "#c4b1e8", "#ff786e", "#46bec8", "#fbfaf6"]
        skins = ["#f6d7b8", "#d9a074", "#8c5a3a", "#eebd94", "#5f3d29", "#b97f54"]
        r.npc(f"clapper{i}", "biped", x, -4.4 - (i % 2) * 0.8, yaw=0, look=guest(shirt=cols[i], pants="#f4f1e8", skin=skins[i], helm="none"))
    r.obj("LIB/core/market_stall", 11, 0, -5, yaw=-20, body="none")
    for i, (x, z) in enumerate([(-12.5, -6.5), (14.5, -8.5)]):
        r.npc(f"dancer{i}", "biped", x, z, yaw=15, look=guest(shirt="#ffa8c0", pants="#f4f1e8", helm="none"), clips=["QUATERNIUS/Dance_Loop"])
    for (x, z, c) in [(-12, 3, "#ff786e"), (-15, -3, "#ffd166"), (14, 3, "#46bec8"), (-20, 8, "#78dcaa"), (20, 9, "#ff786e")]:
        r.obj("LIB/core/umbrella", x, 0, z, roles={"$accent": c})
        r.obj("LIB/core/lounge_chair", x + 1.3, 0, z + 0.4, yaw=20)
    rng = random.Random(9)
    for i in range(16):
        r.obj("LIB/core/palm", -30 + i * 4 + rng.uniform(-1, 1), 0, -13 - rng.uniform(0, 8), yaw=rng.uniform(0, 360), scale=rng.uniform(0.8, 1.3), sway="leaves")
    r.write()

def tide():
    r = water_room("tide")
    r.view = base_view(sky="#d6eef6", elev=58.0, az=150.0, sun=0.7, amb=1.1)
    far_sea(r)
    for x in [-11, 11, 22, -22]:
        r.obj("LIB/core/tide_raft", x, 0.2, 0, body="fixed")
    r.npc("raft_guest0", "biped", 12.5, -2.5, y=0.6, yaw=-60, look=guest(shirt="#ffd166", helm="none"), clips=["CMU/Wave_Hello"])
    r.npc("raft_guest1", "biped", -12.5, -2.0, y=0.6, yaw=60, look=guest(shirt="#78dcaa", helm="cap", helm_color="#78dcaa"), clips=["QUATERNIUS/Dance_Loop"])
    r.obj("LIB/core/gull_captain", 6.5, -0.6, -6.5, yaw=-30, name="commodore")
    bubbles(r, [(-6.5, 5.5), (6.5, 5.5), (-7.0, -5.5)])
    rng = random.Random(11)
    for (x, z, s, p) in [(-26, -20, 6, 2), (24, -24, 7, 3), (0, -30, 5, 2)]:
        islet(r, x, z, s, p, rng)
    r.write()

def channel():
    W, H = 56, 240
    r = Room("channel", W, H, (28, 225))
    for z in range(H):
        for x in range(W):
            r.grid[z][x] = "~" if abs(x - 28) <= 12 else "s"
    # Three bands, so each ripples at a fine grid (the sea's level differs by a hair).
    for i in range(3):
        r.water.append((i * 80, (i + 1) * 80, "#7fd8dc", WATER_Y - i * 0.015))
    r.legend["~"] = ""
    r.legend["s"] = 'blocks = [{ y0 = -0.5, y1 = 0, color = "#f6e7c8", look = "flat" }]'
    r.view = base_view(sky="#d0ecf8", elev=55.0, az=140.0, sun=0.7, amb=1.1, fog_start=40.0, fog_end=120.0)
    far_sea(r, "#7fd8dc")
    rng = random.Random(13)
    for i in range(44):
        side = -1 if i % 2 else 1
        r.obj("LIB/core/palm", side * rng.uniform(14, 22), 0, 12 - i * 5.0, yaw=rng.uniform(0, 360), scale=rng.uniform(0.8, 1.3), sway="leaves")
    for i in range(10):
        side = 1 if i % 2 else -1
        r.obj("LIB/core/umbrella", side * 14, 0, -i * 21.0, roles={"$accent": rng.choice(["#46bec8", "#ffd166", "#ff786e"])})
    r.npc("cheer0", "biped", -14, 4, yaw=60, look=guest(helm="none"), clips=["MESH2MOTION/Cheering_Two_Hands"])
    r.npc("cheer1", "biped", 14, -200, yaw=-120, look=guest(shirt="#ffd166", helm="none"), clips=["MESH2MOTION/Cheering_Two_Hands"])
    r.obj("LIB/core/gull_captain", -10.8, -0.6, -6, yaw=50, name="commodore")
    r.write()

def pier():
    r = Room("pier", 60, 150, (30, 125))
    sea(r, "#93dce0")
    r.view = base_view(sky="#d9eef4", elev=46.0, az=120.0, sun=0.65, amb=1.15, fog_start=35.0, fog_end=120.0)
    far_sea(r, "#93dce0")
    r.obj(None, 0, -0.14, -52, name="pierdeck", shape={"type": "rounded_box", "half": [2.8, 0.14, 60.0], "radius": 0.05}, color="#e0c89a", body="fixed")
    for i in range(26):
        z = 6 - i * 4.4
        for s in (-1, 1):
            r.obj("LIB/core/mooring_post", s * 2.9, -0.5, z, scale=0.55)
        if i % 3 == 0:
            r.obj("LIB/core/lamp_post", 2.5 * (1 if i % 2 else -1), 0, z)
    r.npc("marjorie_pier", "biped", 1.2, -103.2, yaw=0, look=guest())
    r.obj("LIB/core/lounge_chair", -1.4, 0, -105, yaw=180)
    r.obj("LIB/core/gull_captain", 3.7, -0.6, -7, yaw=-60, name="commodore")
    r.write()

def tower():
    r = water_room("tower", color="#8ad8e4")
    r.view = base_view(sky="#d0ecf8", elev=60.0, az=120.0, sun=0.8, amb=1.1, sat=1.0, fog_start=30.0, fog_end=110.0)
    far_sea(r, "#8ad8e4")
    r.obj("LIB/core/diving_tower", 0, 0, -3.4)
    for x in (2.2, 4.4, -2.2):
        r.obj("LIB/core/diving_board", x, 6.0, 0)
    r.obj("LIB/core/small_raft", 9, 0.1, 11)
    r.obj("LIB/core/gull", 8.2, 0.4, 10.2, yaw=-90, scale=2.2, name="judge1")
    r.obj("LIB/core/gull", 9.0, 0.4, 11.0, yaw=-90, scale=2.2, name="judge2")
    r.obj("LIB/core/gull", 9.8, 0.4, 11.8, yaw=-90, scale=2.2, name="judge3")
    for (x, z) in [(7.7, 10.2), (8.5, 11.0), (9.3, 11.8)]:
        r.obj("LIB/core/scorecard", x, 0.4, z, yaw=-90, scale=1.3)
    r.obj("LIB/core/gull_captain", 7.2, -0.6, 7.6, yaw=-90, name="commodore")
    # A raft of guests, there for the splash.
    r.obj("LIB/core/small_raft", 13.5, 0.05, 7.0, body="fixed")
    for i, (x, z, c) in enumerate([(13.0, 6.2, "#ffd166"), (13.9, 7.0, "#78dcaa"), (13.2, 7.9, "#ff786e")]):
        r.npc(f"fan{i}", "biped", x, z, y=0.25, yaw=-90, look=guest(shirt=c, helm="none"), clips=["MESH2MOTION/Cheering_Two_Hands"])
    rng = random.Random(17)
    for (x, z, s, p) in [(24, -2, 7, 3), (28, 14, 6, 2), (20, 24, 5, 2)]:
        islet(r, x, z, s, p, rng)
    r.write()

def bay():
    r = water_room("bay", color="#d8b0b8")
    r.view = base_view(sky="#ffb9a0", elev=8.0, az=215.0, sun=0.95, amb=0.85, sat=1.05, fog_start=20.0, fog_end=95.0, exposure=1.0)
    r.view["bloom"] = 0.4
    far_sea(r, "#e8a8a0")
    r.obj("LIB/core/mooring_post", 0, 0, 0, name="post", body="fixed")
    rafts = [(-5, -6), (0, -7.5), (5, -6), (-9, -3), (9, -3), (-3, -12), (3, -12), (-9, -10), (9, -10)]
    for (x, z) in rafts:
        r.obj("LIB/core/small_raft", x, 0.05, z, scale=1.0, body="fixed", light={"color": "#ffc080", "radius": 7.0, "intensity": 2.0, "offset": [0.0, 1.6, 0.0]})
    cast = [("crowd_pip", "blob", PIP, -5, -6), ("crowd_posey", "biped", POSEY, 0, -7.5), ("crowd_kettle", "blob", KETTLE, 5, -6),
            ("crowd_bounce", "blob", BOUNCE, -9, -3), ("crowd_marjorie", "biped", guest(), 9, -3),
            ("crowd_tom", "biped", guest(shirt="#46bec8", belt="#fbfaf6"), -3, -12), ("crowd_twin_a", "biped", guest(shirt="#ffd166", pants="#ff786e", helm="cap", helm_color="#ffd166"), 3, -12),
            ("crowd_twin_b", "biped", guest(shirt="#ffd166", pants="#ff786e", helm="cap", helm_color="#ffd166"), 3.9, -12)]
    for (name, kind, look, x, z) in cast:
        extra = {"hop": 0.7} if name == "crowd_bounce" else {}
        r.npc(name, kind, x, z, y=0.25, yaw=math.degrees(math.atan2(-x, -z)), look=look, **extra)
    for i, (x, z) in enumerate([(-9.6, -10.2), (-8.4, -9.6), (8.6, -10), (9.6, -10.4)]):
        r.npc(f"crowd_band{i}", "biped", x, z, y=0.25, yaw=0, look=guest(shirt="#ff786e", helm="cap", helm_color="#ff786e"), clips=["MESH2MOTION/Cheering_Two_Hands"])
    rng = random.Random(19)
    for (x, z, s, p) in [(-28, -26, 8, 3), (30, -30, 7, 3)]:
        islet(r, x, z, s, p, rng)
    r.write()

for f in (hub, studio, gazebo, boardwalk, tide, channel, pier, tower, bay):
    f()
print("sets written")
