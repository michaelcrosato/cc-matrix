#!/usr/bin/env python3
"""Writes the nine set files (crates/pav_core/src/games/fit/sets/*.toml) from compact descriptions.
Run once to lay the sets out; afterwards edit the TOML by hand (they hot-reload from disk)."""
import os, math
OUT = os.path.join(os.path.dirname(__file__), "..", "engine", "crates", "pav_core", "src", "games", "fit", "sets")
os.makedirs(OUT, exist_ok=True)

SEA="#8fdde0"; DECK="#fbfaf6"; SAND="#f6e7c8"; GRASS="#bfe6b0"; INK="#263e54"; TEAL="#46bec8"; MINT="#78dcaa"; CORAL="#ff786e"; SUN="#ffd166"

def header(name, cam, sky, sun_el, sun_az, sun_int, amb, extra=""):
    return f'''# Set: {name}. Local space; the game moves it 200 m apart from the others.
name = "fit-{name}"
about = "A set of Tippy Cay."
entrance = {{ at = [0, 0], facing = "south" }}

[camera]
tilt = {cam[0]}
yaw = {cam[1]}
distance = {cam[2]}
fov = {cam[3]}

[view]
sky = "{sky}"
exposure = 1.0
saturation = 0.95
bloom = 0.15
bloom_threshold = 1.3
outlines_on = "objects"
outline_px = 1.0
outline_darken = 0.55
rim = 0.3
fog = true
fog_start = 25.0
fog_end = 110.0
wind = 0.5
"light.sun_elevation" = {sun_el}
"light.sun_azimuth" = {sun_az}
"light.sun_intensity" = {sun_int}
"light.ambient" = {amb}
"cutaway.height_cut" = false
"cutaway.front_cut" = false
"cutaway.fade" = false
{extra}
[layout]
origin = [0.0, 0.0, 0.0]

[[layout.layer]]
y = 0
map = \'\'\'
.
\'\'\'

[layout.legend.'.']
blocks = [{{ y0 = -3.0, y1 = -2.9, color = "{SEA}" }}]

[[object]]
name = "far_sea"
shape = {{ type = "cylinder", half_height = 0.05, radius = 600.0 }}
pos = [0.0, -0.12, 0.0]
color = "{SEA}"
look = "flat"
body = "fixed"
'''

def obj(name, shape, pos, color, body="fixed", extra=""):
    s = ", ".join(f"{k} = {v}" for k, v in shape.items())
    return f'''
[[object]]
name = "{name}"
shape = {{ {s} }}
pos = [{pos[0]}, {pos[1]}, {pos[2]}]
color = "{color}"
body = "{body}"
{extra}'''

def cyl(name, r, top, thick, pos_xz, color, extra=""):
    return obj(name, {"type": '"cylinder"', "half_height": thick/2, "radius": r}, (pos_xz[0], top-thick/2, pos_xz[1]), color, extra=extra)

def box(name, hx, hy, hz, pos, color, extra=""):
    return obj(name, {"type": '"rounded_box"', "half": f"[{hx}, {hy}, {hz}]", "radius": 0.08}, pos, color, extra=extra)

def ball(name, r, pos, color):
    return obj(name, {"type": '"sphere"', "radius": r}, pos, color)

def water(name, x0, z0, x1, z1):
    return f'''
[layout.legend.'~{name}']
'''

def palm(i, x, z, h=3.2, lean=0.5):
    return f"""
[[object]]
name = "palm_{i}"
asset = "LIB/core/palm"
pos = [{x}, 0.0, {z}]
yaw = {(i*47)%360}
body = "fixed"
"""

def fig(name, pos, color):
    return ball(name, 0.0, pos, color)

def crowd(prefix, n, rad, cy=0.0, colors=("#ffd166","#ff786e","#78dcaa","#46bec8","#f7a8c8")):
    s = ""
    for i in range(n):
        a = i/n*2*math.pi
        s += ball(f"{prefix}_{i}", 0.35, (round(math.cos(a)*rad,2), cy+0.35, round(math.sin(a)*rad,2)), colors[i%len(colors)])
    return s

def write(name, text):
    open(os.path.join(OUT, name + ".toml"), "w").write(text)

# ---- hub: the island ----
t = header("hub", (52, 0, 22, 40), "#d6eef6", 52, 160, 0.62, 1.15)
t += cyl("island_sand", 32, 0.0, 1.0, (0, 0), SAND)
t += cyl("island_grass", 26, 0.04, 1.0, (0, -2), GRASS)
t += cyl("plaza", 9, 0.08, 1.0, (0, 0), DECK)
t += box("reception_desk", 2.0, 0.55, 0.7, (0, 0.55, -3.5), "#ffd9a0")
t += box("calendar_wall", 2.2, 1.6, 0.12, (-6, 1.6, -9), "#fbfaf6")
t += ball("clam_shell", 1.1, (6.5, 0.9, -5.5), "#ffb8c8")
t += ball("clam_pearl", 0.35, (6.5, 1.6, -5.5), "#ffffff")
# pavilions: four, around the ring
for i, (px, pz, col) in enumerate([(-18, -4, "#d8b184"), (18, -4, "#3a3f4a"), (0, 19, "#ff9fc4"), (-20, 14, "#8fdde0")]):
    t += box(f"pavilion_{i}", 4.0, 0.15, 3.0, (px, 0.2, pz), col)
    t += box(f"pavilion_roof_{i}", 4.4, 0.15, 3.4, (px, 3.6, pz), col)
    for k in range(4):
        t += box(f"pavilion_post_{i}_{k}", 0.15, 1.7, 0.15, (px + (-3.6 if k%2 else 3.6), 1.8, pz + (-2.6 if k//2 else 2.6)), "#fbfaf6")
    t += cyl(f"mat_{i}", 1.1, 0.26, 0.2, (px, pz + 3.8), [MINT, CORAL, SUN, TEAL][i])
# cabanas
for i in range(5):
    cx = -24 + i*5.2
    t += box(f"cabana_{i}", 1.6, 1.0, 1.6, (cx, 1.0, 24), ["#ff786e","#ffd166","#78dcaa","#46bec8","#f7a8c8"][i])
for i in range(14):
    a = i/14*2*math.pi
    t += palm(i, round(math.cos(a)*28,2), round(math.sin(a)*28,2), 3.0+0.2*(i%3), 0.5)
t += box("pier_hub", 1.4, 0.15, 7, (0, -0.05, 38), "#c79f6e")
t += box("flipflop_a", 0.18, 0.04, 0.32, (-14, 0.1, 8), "#ffd166")
t += '''
[[object]]
name = "lounge"
asset = "LIB/core/lounge_chair"
pos = [8, 0.05, -9]
yaw = 200
body = "fixed"

[[object]]
name = "umb"
asset = "LIB/core/umbrella"
pos = [12, 0.05, -9]
yaw = 0
body = "fixed"

[[object]]
name = "ff"
asset = "LIB/core/flip_flop"
pos = [-14, 0.1, 8]
yaw = 30
body = "fixed"

[[object]]
name = "mat"
asset = "LIB/core/exercise_mat"
pos = [-18, 0.28, -0.2]
yaw = 0
body = "fixed"

[[object]]
name = "lot"
asset = "LIB/core/lotus"
pos = [4, 0.05, 3]
yaw = 0
body = "fixed"
'''
write("hub", t)

# ---- studio: white deck on a dawn lagoon ----
t = header("studio", (12, 0, 8.5, 36), "#f7d9d0", 14, 100, 0.55, 1.2)
t += cyl("studio_deck", 5.5, 0.0, 0.5, (0, 0), DECK)
t += cyl("studio_inlay", 3.0, 0.02, 0.5, (0, 0), "#e8f4f1")
t += f'''
[[object]]
name = "lagoon"
shape = {{ type = "cylinder", half_height = 0.05, radius = 40.0 }}
pos = [0.0, -0.3, 0.0]
color = "{SEA}"
look = "flat"
body = "fixed"
'''
for i in range(5):
    t += cyl(f"lotus_pad_{i}", 0.5, 0.03, 0.06, (-2.6+i*1.3, 1.8), "#8fcf9a")
t += box("dawn_arch", 0.15, 2.2, 0.15, (-4.5, 2.2, -4.5), "#fbfaf6") + box("dawn_arch2", 0.15, 2.2, 0.15, (4.5, 2.2, -4.5), "#fbfaf6") + box("dawn_beam", 4.8, 0.15, 0.15, (0, 4.3, -4.5), "#fbfaf6")
t += '''
[[object]]
name = "lot1"
asset = "LIB/core/lotus"
pos = [-2.6, 0.0, 1.8]
yaw = 0
body = "fixed"

[[object]]
name = "lot2"
asset = "LIB/core/lotus"
pos = [2.6, 0.0, 1.8]
yaw = 0
body = "fixed"
'''
write("studio", t)

# ---- gazebo: golden hour ----
t = header("gazebo", (14, 25, 8.5, 36), "#ffe3b8", 18, 250, 0.75, 1.0)
t += cyl("gazebo_floor", 5.0, 0.0, 0.5, (0, 0), "#f2ecd9")
for k in range(8):
    a = k/8*2*math.pi
    t += box(f"gz_post_{k}", 0.1, 2.0, 0.1, (round(math.cos(a)*4.6,2), 2.0, round(math.sin(a)*4.6,2)), "#fbfaf6")
t += cyl("gz_roof", 5.6, 4.3, 0.2, (0,0), "#e8dfc8")
t += cyl("gz_roof_top", 2.0, 4.8, 0.3, (0,0), "#f3e9d0")
t += ball("kettle_hang", 0.0, (0, 0, 0), "#3a3f4a")
t += cyl("gz_lawn", 18, -0.1, 0.5, (0, 0), GRASS)
for i in range(5):
    t += palm(i, -9 + i*4.5, -9, 3.2, 0.4)
t += '''
[[object]]
name = "kb"
asset = "LIB/core/kettlebell"
pos = [4.2, 0.0, 1.0]
yaw = 0
body = "fixed"
'''
write("gazebo", t)

# ---- boardwalk: bright midday ----
t = header("boardwalk", (18, 0, 8, 38), "#cfeaf6", 62, 150, 0.7, 1.15)
t += box("boardwalk_deck", 9, 0.15, 5, (0, -0.15, 0), "#d2b48c")
t += box("step_box", 1.0, 0.15, 0.6, (0, 0.15, 0.5), MINT)
t += ball("footprint_l", 0.0, (-0.4, 0.31, 0.5), CORAL)
t += cyl("fp_l", 0.28, 0.32, 0.02, (-0.45, 0.5), CORAL) + cyl("fp_r", 0.28, 0.32, 0.02, (0.45, 0.5), TEAL)
t += cyl("beach", 40, -0.25, 0.5, (0, -24), SAND)
for i in range(6):
    t += box(f"bw_rail_{i}", 0.08, 0.5, 0.08, (-7.5 + i*3, 0.5, -4.8), "#fbfaf6")
    t += palm(i, -12 + i*5, -12, 3.0, 0.5)
t += box("umbrella_pole", 0.05, 1.2, 0.05, (6, 1.2, -3), "#fbfaf6") + cyl("umbrella", 1.5, 2.5, 0.08, (6, -3), CORAL)
t += '''
[[object]]
name = "step"
asset = "LIB/core/step_box"
pos = [0, 0.02, 0.5]
yaw = 0
body = "fixed"

[[object]]
name = "umb"
asset = "LIB/core/umbrella"
pos = [-6, 0.0, -3]
yaw = 0
body = "fixed"

[[object]]
name = "lounge"
asset = "LIB/core/lounge_chair"
pos = [7, 0.0, -2.5]
yaw = 90
body = "fixed"
'''
write("boardwalk", t)

# ---- tide: raft on a lagoon ----
t = header("tide", (62, 0, 12, 36), "#d6eef6", 58, 160, 0.65, 1.15)
t += box("tide_raft", 3.1, 0.12, 3.1, (0, -0.12, 0), "#e6c28f")
for i, (x, z) in enumerate([(1.4, -1.2), (-1.4, 1.0), (0, 0)]):
    t += cyl(f"tide_pool_{i}", 0.5, -0.0, 0.04, (x, z), TEAL)
t += box("raft_wall_n", 3.1, 0.2, 0.08, (0, 0.2, -3.0), "#c79f6e") + box("raft_wall_s", 3.1, 0.2, 0.08, (0, 0.2, 3.0), "#c79f6e")
t += box("raft_wall_w", 0.08, 0.2, 3.1, (-3.0, 0.2, 0), "#c79f6e") + box("raft_wall_e", 0.08, 0.2, 3.1, (3.0, 0.2, 0), "#c79f6e")
t += '''
[[object]]
name = "shell_ring"
asset = "LIB/core/floatie_ring"
pos = [4.0, 0.0, 0.0]
yaw = 0
body = "fixed"
'''
write("tide", t)

# ---- channel: long water channel ----
t = header("channel", (22, 0, 10, 40), "#cfeaf6", 56, 150, 0.65, 1.15)
t += box("paddle_board", 0.55, 0.06, 1.3, (0, -0.06, 0), "#fbfaf6")
for i in range(10):
    gz = 14.0 + i*11.0
    gx = [0.0, 2.6, -2.6, 1.2, -3.2, 3.2, 0.0, -1.8, 2.2, -0.6][i]
    t += ball(f"buoy_l_{i}", 0.35, (gx-1.6, 0.3, gz), CORAL) + ball(f"buoy_r_{i}", 0.35, (gx+1.6, 0.3, gz), SUN)
t += box("bank_l", 0.5, 0.4, 70, (-8, 0.0, 70), SAND) + box("bank_r", 0.5, 0.4, 70, (8, 0.0, 70), SAND)
t += '''
[[object]]
name = "buoy_a"
asset = "LIB/core/buoy"
pos = [-4.5, 0.0, 6]
yaw = 0
body = "fixed"

[[object]]
name = "buoy_b"
asset = "LIB/core/buoy"
pos = [4.5, 0.0, 6]
yaw = 0
body = "fixed"
'''
write("channel", t)

# ---- pier ----
t = header("pier", (20, 0, 9, 40), "#cfeaf6", 50, 140, 0.65, 1.15)
t += box("pier_deck", 1.2, 0.15, 90, (0, -0.15, 90), "#c79f6e")
for i in range(20):
    t += box(f"pier_post_{i}", 0.12, 0.5, 0.12, (-1.25 if i%2 else 1.25, 0.2, 5+i*9), "#8a6f4f")
t += box("marjorie_chair", 0.5, 0.3, 0.5, (0, 0.2, 178), "#ffd166")
t += '''
[[object]]
name = "glass"
asset = "LIB/core/smoothie_glass"
pos = [0.6, 0.0, 178]
yaw = 0
body = "fixed"
'''
write("pier", t)

# ---- tower ----
t = header("tower", (6, 0, 14, 40), "#cfeaf6", 56, 190, 0.7, 1.15)
t += box("tower_base", 2.5, 4.0, 2.5, (-5, 4.0, 0), "#fbfaf6")
t += box("diving_board", 2.2, 0.08, 0.45, (-1.8, 8.1, 0), TEAL)
t += cyl("dive_pool", 14, -0.15, 0.3, (6, 0), "#8fdde0")
t += '''
[[object]]
name = "ring"
asset = "LIB/core/floatie_ring"
pos = [5, 0.0, 0.0]
yaw = 0
body = "fixed"
'''
write("tower", t)

# ---- bay: sunset ----
t = header("bay", (8, 0, 9, 36), "#ffc9a8", 8, 270, 0.6, 1.1)
t += cyl("bay_post", 2.0, 0.0, 0.5, (0, 0), "#fbfaf6")
for i in range(14):
    a = i/14*2*math.pi
    t += box(f"bay_raft_{i}", 1.1, 0.1, 0.8, (round(math.cos(a)*9,2), -0.1, round(math.sin(a)*9,2)), ["#ffd166","#ff786e","#78dcaa","#f7a8c8"][i%4])
t += f'''
[[object]]
name = "sunset_ball"
shape = {{ type = "sphere", radius = 6.0 }}
pos = [0.0, 8.0, -80.0]
color = "#ffb27a"
look = "flat"
body = "fixed"
emissive = 1.0
'''
t += '''
[[object]]
name = "buoy"
asset = "LIB/core/buoy"
pos = [3, 0.0, 3]
yaw = 0
body = "fixed"

[[object]]
name = "ring"
asset = "LIB/core/floatie_ring"
pos = [-3, 0.0, 3]
yaw = 0
body = "fixed"
'''
write("bay", t)
print("sets written")
