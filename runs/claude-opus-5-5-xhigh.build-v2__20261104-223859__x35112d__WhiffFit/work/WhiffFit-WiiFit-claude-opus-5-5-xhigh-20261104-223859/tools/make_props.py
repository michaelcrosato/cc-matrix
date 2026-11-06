#!/usr/bin/env python3
"""Writes the game's props (format-2 JSON, centimetres; docs/ASSET_STUDIO.md) into
engine/assets/props/lib/core/. Each is plain data you can also hand-edit after generating."""
import json, math, pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "engine/assets/props/lib/core"

def mat(**k): return k
def dome(r, h):
    return [[round(r * math.cos(a * math.pi / 16), 1), round(h * math.sin(a * math.pi / 16), 1)] for a in range(0, 8)] + [[0.5, h]]
def prop(name, desc, tags, category, materials, parts, **extra):
    doc = {"format": 2, "name": name, "unit": "cm", "description": desc, "tags": tags, "category": category,
           "materials": materials, "parts": parts}
    doc.update(extra)
    (OUT / f"{name}.json").write_text(json.dumps(doc, indent=0) + "\n")

W = {"color": "#fbfaf6"}
prop("palm", "A leaning palm: cone trunk, six drooping fronds, three coconuts.", ["palm", "tree"], "vegetation",
     {"trunk": {"color": "#c9a26b"}, "leaf": {"color": "#7ccc8c"}, "leaf2": {"color": "#62b878"}, "nut": {"color": "#8a6642"}},
     {"trunk": {"type": "cone", "radius": 24, "radius_end": 12, "from": [0, 0, 0], "to": [46, 430, 0], "mat": "trunk", "solid": False},
      "fronds": {"pos": [46, 432, 0], "parts": {
          "frond": {"type": "ellipsoid", "size": [80, 16, 260], "pitch": 22, "radial": {"count": 6, "radius": 118}, "mat": "leaf", "sway": "leaves", "solid": False},
          "under": {"type": "ellipsoid", "size": [60, 12, 190], "pitch": 42, "yaw": 30, "radial": {"count": 5, "radius": 90}, "pos": [0, -18, 0], "mat": "leaf2", "sway": "leaves", "solid": False},
          "nut": {"type": "sphere", "radius": 13, "pos": [0, -18, 0], "radial": {"count": 3, "radius": 18}, "mat": "nut", "solid": False}}},
      "base": {"type": "cylinder", "radius": 26, "height": 40, "pos": [0, 20, 0], "mat": "trunk", "hidden": True}})
prop("exercise_mat", "A flat rounded exercise mat.", ["mat", "gym"], "furniture",
     {"m": {"color": "$accent"}, "line": W},
     {"mat": {"type": "rounded_box", "size": [180, 5, 240], "radius": 2.4, "pos": [0, 2.5, 0], "color": "$accent", "solid": False},
      "stripe": {"type": "box", "size": [150, 1, 6], "pos": [0, 5.3, 90], "mat": "line", "array": {"count": 2, "step": [0, 0, -180]}, "solid": False}})
prop("step_box", "An aerobic step box with two footprints.", ["step", "gym"], "furniture",
     {"top": {"color": "#46bec8"}, "foot": {"color": "#fbfaf6"}, "riser": {"color": "#d7e2e4"}},
     {"top": {"type": "rounded_box", "size": [170, 10, 90], "radius": 4, "pos": [0, 25, 0], "mat": "top"},
      "riser": {"type": "rounded_box", "size": [24, 20, 70], "radius": 5, "pos": [66, 10, 0], "mat": "riser", "mirror": "x"},
      "print": {"type": "ellipsoid", "size": [28, 2, 50], "pos": [30, 30.4, 0], "mat": "foot", "mirror": "x", "solid": False}})
prop("diving_board", "A springy diving board; its tip is the origin, it runs back along -z.", ["diving", "board"], "furniture",
     {"b": {"color": "#46bec8"}},
     {"board": {"type": "rounded_box", "size": [70, 7, 340], "radius": 3, "pos": [0, -5, -140], "mat": "b", "solid": False},
      "grip": {"type": "box", "size": [60, 1, 90], "pos": [0, -1, -20], "color": "#fbfaf6", "solid": False}})
prop("diving_tower", "A white iron diving tower with a ladder, six metres to its platform.", ["diving", "tower"], "town",
     {"iron": W, "deck": {"color": "#d7e2e4"}, "rail": {"color": "#46bec8"}},
     {"leg": {"type": "cylinder", "radius": 11, "from": [150, 0, -60], "to": [130, 590, -60], "mat": "iron", "mirror": "x"},
      "leg2": {"type": "cylinder", "radius": 11, "from": [150, 0, -420], "to": [130, 590, -420], "mat": "iron", "mirror": "x"},
      "deck": {"type": "rounded_box", "size": [320, 14, 420], "radius": 5, "pos": [0, 592, -240], "mat": "deck"},
      "brace": {"type": "box", "size": [10, 10], "from": [-140, 200, -60], "to": [140, 400, -60], "mat": "iron"},
      "brace2": {"type": "box", "size": [10, 10], "from": [140, 200, -60], "to": [-140, 400, -60], "mat": "iron"},
      "rail": {"type": "cylinder", "radius": 4, "from": [150, 680, -440], "to": [-150, 680, -440], "mat": "rail"},
      "post": {"type": "cylinder", "radius": 4, "from": [150, 592, -440], "to": [150, 680, -440], "mat": "rail", "mirror": "x"},
      "rung": {"type": "cylinder", "radius": 3, "from": [-34, 40, -440], "to": [34, 40, -440], "mat": "rail", "array": {"count": 14, "step": [0, 40, 0]}}})
prop("paddleboard", "A long paddleboard with a stripe, lying flat.", ["board", "water"], "furniture",
     {"b": W, "s": {"color": "#ff786e"}},
     {"deck": {"type": "ellipsoid", "size": [84, 12, 310], "pos": [0, -3, 0], "mat": "b", "solid": False},
      "stripe": {"type": "ellipsoid", "size": [24, 4, 240], "pos": [0, 3, 0], "mat": "s", "solid": False},
      "pad": {"type": "rounded_box", "size": [56, 2, 66], "radius": 1, "pos": [0, 4, 0], "color": "#46bec8", "solid": False}})
prop("buoy", "A red and white channel buoy that floats upright.", ["buoy", "water"], "furniture",
     {"r": {"color": "#ff786e"}, "w": W},
     {"body": {"type": "sphere", "radius": 42, "pos": [0, 14, 0], "mat": "r", "solid": False},
      "mid": {"type": "cylinder", "radius": 40, "height": 18, "pos": [0, 22, 0], "mat": "w", "solid": False},
      "pole": {"type": "cylinder", "radius": 5, "from": [0, 50, 0], "to": [0, 150, 0], "mat": "w", "solid": False},
      "flag": {"type": "sphere", "radius": 16, "pos": [0, 160, 0], "mat": "r", "solid": False}})
prop("tide_raft", "A square floating raft with a raised rim, eight metres across, centred on the origin.", ["raft", "water"], "furniture",
     {"deck": {"color": "#e8d4a8"}, "rim": {"color": "#fbfaf6"}, "line": {"color": "#d8c090"}},
     {"deck": {"type": "rounded_box", "size": [800, 24, 800], "radius": 8, "pos": [0, 4, 0], "mat": "deck"},
      "plank": {"type": "box", "size": [800, 1, 4], "pos": [0, 16.5, 0], "mat": "line", "array": {"count": 7, "step": [0, 0, 110]}, "solid": False},
      "rim": {"type": "rounded_box", "size": [820, 26, 24], "radius": 8, "pos": [0, 22, 400], "mat": "rim", "mirror": "z", "solid": False},
      "rim2": {"type": "rounded_box", "size": [24, 26, 820], "radius": 8, "pos": [400, 22, 0], "mat": "rim", "mirror": "x", "solid": False}})
prop("tide_pool", "A shallow tide pool set into the raft, sixty centimetres in radius.", ["pool", "water"], "furniture",
     {"w": {"color": "#46bec8", "look": "flat"}, "rim": {"color": "#c9b890"}},
     {"rim": {"type": "torus", "radius": 60, "minor_radius": 7, "pos": [0, 2, 0], "mat": "rim", "solid": False},
      "water": {"type": "cylinder", "radius": 58, "height": 1, "pos": [0, 1, 0], "mat": "w", "solid": False}})
prop("bumper", "A round rubber bumper on the raft.", ["bumper"], "furniture",
     {"b": {"color": "#ff786e"}, "t": W},
     {"body": {"type": "cylinder", "radius": 50, "height": 24, "pos": [0, 12, 0], "mat": "b", "solid": False},
      "top": {"type": "cylinder", "radius": 30, "height": 4, "pos": [0, 26, 0], "mat": "t", "solid": False}})
prop("shell", "A hermit crab in a spiral shell, looking nervous.", ["shell", "crab"], "food",
     {"body": {"color": "#ffb08a"}, "eye": {"color": "#263e54"}},
     {"shell": {"type": "sphere", "radius": 26, "pos": [0, 24, -6], "color": "$accent", "solid": False},
      "tip": {"type": "cone", "radius": 16, "radius_end": 2, "from": [0, 38, -18], "to": [0, 62, -30], "color": "$accent", "solid": False},
      "crab": {"type": "ellipsoid", "size": [34, 18, 26], "pos": [0, 10, 16], "mat": "body", "solid": False},
      "eye": {"type": "sphere", "radius": 4.5, "pos": [9, 22, 26], "mat": "eye", "mirror": "x", "solid": False},
      "claw": {"type": "sphere", "radius": 7, "pos": [20, 8, 24], "mat": "body", "mirror": "x", "solid": False}})
prop("tray", "A round waiter's tray.", ["tray"], "food",
     {"t": {"color": "#d8dee0"}, "r": W},
     {"tray": {"type": "cylinder", "radius": 62, "height": 3, "pos": [0, 0, 0], "mat": "t", "solid": False},
      "rim": {"type": "torus", "radius": 62, "minor_radius": 2.2, "pos": [0, 2, 0], "mat": "r", "solid": False}})
prop("smoothie", "A tall smoothie glass with a stripy straw.", ["glass", "drink"], "food",
     {"g": {"color": "#fbfaf6"}, "s": {"color": "#ff786e"}},
     {"glass": {"type": "cone", "radius": 7.5, "radius_end": 11, "from": [0, 0, 0], "to": [0, 26, 0], "color": "$accent", "solid": False},
      "foam": {"type": "ellipsoid", "size": [22, 8, 22], "pos": [0, 27, 0], "mat": "g", "solid": False},
      "straw": {"type": "cylinder", "radius": 1.3, "from": [2, 22, 0], "to": [8, 42, 0], "mat": "s", "solid": False}})
prop("floatie", "An inflatable ring, seventy centimetres across, its origin at its middle.", ["ring", "toy"], "food",
     {},
     {"ring": {"type": "torus", "radius": 38, "minor_radius": 10, "color": "$accent", "solid": False}})
prop("lounge_chair", "A low beach lounger with a towel on it.", ["lounger", "chair"], "furniture",
     {"f": {"color": "#c9a26b"}, "t": {"color": "#46bec8"}},
     {"bed": {"type": "rounded_box", "size": [70, 7, 130], "radius": 3, "pos": [0, 30, -14], "mat": "f"},
      "back": {"type": "rounded_box", "size": [70, 7], "radius": 3, "from": [0, 30, 50], "to": [0, 68, 84], "mat": "f"},
      "leg": {"type": "box", "size": [6, 6], "from": [28, 0, -60], "to": [28, 28, -60], "mat": "f", "mirror": "x", "array": {"count": 2, "step": [0, 0, 90]}},
      "towel": {"type": "rounded_box", "size": [60, 3, 110], "radius": 1.2, "pos": [0, 35, -14], "mat": "t", "solid": False}})
prop("umbrella", "A striped beach umbrella.", ["umbrella", "beach"], "furniture",
     {"p": {"color": "#c9a26b"}},
     {"pole": {"type": "cylinder", "radius": 4, "from": [0, 0, 0], "to": [0, 240, 0], "mat": "p", "solid": False},
      "shade": {"type": "cone", "radius": 150, "radius_end": 6, "from": [0, 200, 0], "to": [0, 262, 0], "color": "$accent", "solid": False},
      "tip": {"type": "sphere", "radius": 7, "pos": [0, 264, 0], "color": "#fbfaf6", "solid": False}})
prop("cabana", "A small beach cabana with a deck and a pitched roof, open at the front.", ["cabana", "hut"], "town",
     {"wall": W, "roof": {"color": "$accent"}, "deck": {"color": "#e0c89a"}, "post": {"color": "#c9a26b"}},
     {"deck": {"type": "rounded_box", "size": [360, 12, 340], "radius": 4, "pos": [0, 6, 20], "mat": "deck", "solid": False},
      "back": {"type": "box", "size": [300, 220, 12], "pos": [0, 122, -110], "mat": "wall"},
      "side": {"type": "box", "size": [12, 220, 170], "pos": [150, 122, -30], "mat": "wall", "mirror": "x"},
      "post": {"type": "cylinder", "radius": 7, "from": [150, 12, 60], "to": [150, 240, 60], "mat": "post", "mirror": "x", "solid": False},
      "roof": {"type": "wedge", "size": [380, 90, 300], "peak": 0, "pos": [0, 234, -20], "yaw": 90, "mat": "roof", "solid": False},
      "bed": {"type": "rounded_box", "size": [200, 22, 80], "radius": 8, "pos": [0, 40, -60], "color": "#fbfaf6", "solid": False}})
prop("reception_desk", "A curved white reception desk with a little bell.", ["desk"], "furniture",
     {"d": W, "top": {"color": "#46bec8"}, "b": {"color": "#ffd166"}},
     {"desk": {"type": "rounded_box", "size": [360, 90, 90], "radius": 16, "pos": [0, 45, 0], "mat": "d"},
      "top": {"type": "rounded_box", "size": [380, 8, 106], "radius": 4, "pos": [0, 94, 0], "mat": "top"},
      "bell": {"type": "sphere", "radius": 9, "pos": [130, 104, 20], "mat": "b", "solid": False},
      "sign": {"type": "rounded_box", "size": [150, 24, 3], "radius": 1, "pos": [0, 60, 46], "mat": "top", "solid": False}})
prop("pavilion", "A round open pavilion with a domed roof; recolour by $accent.", ["pavilion"], "town",
     {"col": W, "floor": {"color": "#e8e2d4"}},
     {"floor": {"type": "cylinder", "radius": 420, "height": 14, "pos": [0, 7, 0], "mat": "floor", "solid": False},
      "col": {"type": "cylinder", "radius": 16, "from": [0, 14, 0], "to": [0, 380, 0], "mat": "col", "radial": {"count": 8, "radius": 380}},
      "ring": {"type": "torus", "radius": 392, "minor_radius": 14, "pos": [0, 382, 0], "mat": "col", "solid": False},
      "dome": {"type": "lathe", "profile": dome(410, 300), "pos": [0, 380, 0], "color": "$accent", "solid": False},
      "finial": {"type": "sphere", "radius": 26, "pos": [0, 690, 0], "color": "#ffd166", "solid": False}})
prop("iron_gazebo", "A white iron gazebo: eight slender columns, a lattice ring and a low dome.", ["gazebo"], "town",
     {"iron": W, "floor": {"color": "#efe6d6"}, "dome": {"color": "#fff3dc"}},
     {"floor": {"type": "cylinder", "radius": 620, "height": 10, "pos": [0, 5, 0], "mat": "floor", "solid": False},
      "col": {"type": "cylinder", "radius": 11, "from": [0, 10, 0], "to": [0, 500, 0], "mat": "iron", "radial": {"count": 8, "radius": 580}, "solid": False},
      "ring": {"type": "torus", "radius": 590, "minor_radius": 10, "pos": [0, 500, 0], "mat": "iron", "solid": False},
      "ring2": {"type": "torus", "radius": 590, "minor_radius": 6, "pos": [0, 460, 0], "mat": "iron", "solid": False},
      "dome": {"type": "lathe", "profile": dome(600, 240), "pos": [0, 500, 0], "mat": "dome", "solid": False},
      "finial": {"type": "cone", "radius": 22, "radius_end": 2, "from": [0, 735, 0], "to": [0, 810, 0], "mat": "iron", "solid": False}})
prop("calendar_wall", "A tall calendar board with five big days.", ["calendar", "sign"], "signage",
     {"b": W, "f": {"color": "#46bec8"}, "d": {"color": "#d6eef6"}},
     {"board": {"type": "rounded_box", "size": [380, 220, 16], "radius": 8, "pos": [0, 150, 0], "mat": "b"},
      "frame": {"type": "rounded_box", "size": [400, 22, 20], "radius": 8, "pos": [0, 268, 0], "mat": "f"},
      "day": {"type": "rounded_box", "size": [60, 110, 3], "radius": 1.2, "pos": [-140, 140, 9], "mat": "d", "array": {"count": 5, "step": [70, 0, 0]}, "solid": False},
      "leg": {"type": "box", "size": [14, 14], "from": [170, 0, 0], "to": [170, 60, 0], "mat": "f", "mirror": "x"}})
prop("minute_clam", "A giant pearly clam, mouth open, a pearl inside. It eats minutes.", ["clam"], "furniture",
     {"s": {"color": "#f7c6d0"}, "i": {"color": "#fff0f2"}, "p": {"color": "#fbfaf6", "emissive": 0.4}, "e": {"color": "#263e54"}},
     {"low": {"type": "ellipsoid", "size": [240, 60, 200], "pos": [0, 32, 0], "mat": "s"},
      "up": {"type": "ellipsoid", "size": [240, 70, 200], "pos": [0, 92, -36], "pitch": -28, "mat": "s", "solid": False},
      "in": {"type": "ellipsoid", "size": [200, 30, 160], "pos": [0, 56, 4], "mat": "i", "solid": False},
      "pearl": {"type": "sphere", "radius": 24, "pos": [0, 74, 16], "mat": "p", "solid": False},
      "eye": {"type": "sphere", "radius": 7, "pos": [46, 118, 10], "mat": "e", "mirror": "x", "solid": False}})
prop("flip_flop", "A single lost flip-flop.", ["flipflop", "shoe"], "food",
     {"s": {"color": "#ffd166"}, "t": {"color": "#ff786e"}},
     {"sole": {"type": "ellipsoid", "size": [30, 4, 64], "pos": [0, 2.5, 0], "mat": "s", "solid": False},
      "strap": {"type": "torus", "radius": 11, "minor_radius": 1.8, "pos": [0, 6, 6], "pitch": 80, "mat": "t", "solid": False},
      "glow": {"type": "cylinder", "radius": 34, "height": 1, "pos": [0, 0.6, 0], "color": "#fff3c0", "solid": False}})
prop("gull", "A small white gull, its origin at its belly, facing +z.", ["gull", "bird"], "food",
     {"w": W, "g": {"color": "#c8d4da"}, "b": {"color": "#ffb24a"}, "e": {"color": "#263e54"}},
     {"body": {"type": "ellipsoid", "size": [24, 24, 42], "pos": [0, 14, 0], "mat": "w", "solid": False},
      "head": {"type": "sphere", "radius": 10, "pos": [0, 28, 15], "mat": "w", "solid": False},
      "beak": {"type": "cone", "radius": 4, "radius_end": 0.5, "from": [0, 27, 23], "to": [0, 26, 34], "mat": "b", "solid": False},
      "eye": {"type": "sphere", "radius": 2, "pos": [7, 31, 20], "mat": "e", "mirror": "x", "solid": False},
      "wing": {"type": "ellipsoid", "size": [6, 16, 32], "pos": [13, 15, -3], "mat": "g", "mirror": "x", "solid": False},
      "tail": {"type": "cone", "radius": 8, "radius_end": 1, "from": [0, 14, -18], "to": [0, 16, -34], "mat": "g", "solid": False},
      "leg": {"type": "cylinder", "radius": 1.2, "from": [5, 0, 0], "to": [5, 6, 0], "mat": "b", "mirror": "x", "solid": False}})
prop("gull_captain", "Commodore Gull: a gull in a captain's cap, on a mooring post.", ["gull", "captain"], "furniture",
     {"post": {"color": "#c9a26b"}, "c": {"color": "#263e54"}, "w": W, "b": {"color": "#ffd166"}},
     {"post": {"type": "cylinder", "radius": 18, "from": [0, 0, 0], "to": [0, 110, 0], "mat": "post"},
      "bird": {"ref": "LIB/core/gull", "pos": [0, 110, 0], "scale": 1.5},
      "cap": {"type": "cylinder", "radius": 15, "height": 6, "pos": [0, 166, 22], "mat": "c", "solid": False},
      "top": {"type": "ellipsoid", "size": [34, 12, 34], "pos": [0, 172, 22], "mat": "w", "solid": False},
      "badge": {"type": "sphere", "radius": 3, "pos": [0, 172, 38], "mat": "b", "solid": False}})
prop("gull_wing", "One gull wing, its root at the origin, reaching along +x.", ["gull", "wing"], "food",
     {"g": {"color": "#e4ecee"}, "t": {"color": "#8a9aa2"}},
     {"wing": {"type": "ellipsoid", "size": [60, 3, 24], "pos": [30, 16, 0], "mat": "g", "solid": False},
      "tip": {"type": "ellipsoid", "size": [20, 2.5, 12], "pos": [58, 16, 0], "mat": "t", "solid": False}})
prop("scorecard", "A judge's scorecard on a stick.", ["sign"], "signage",
     {"c": W, "s": {"color": "#c9a26b"}},
     {"card": {"type": "rounded_box", "size": [50, 36, 2], "radius": 1, "pos": [0, 70, 0], "mat": "c", "solid": False},
      "stick": {"type": "cylinder", "radius": 2, "from": [0, 0, 0], "to": [0, 52, 0], "mat": "s", "solid": False}})
prop("lotus", "A lotus on a lily pad, a metre across when open.", ["lotus", "flower"], "vegetation",
     {"pad": {"color": "#78c88a"}, "p": {"color": "#ffc4d6"}, "p2": {"color": "#ffe0ea"}, "c": {"color": "#ffd166"}},
     {"pad": {"type": "cylinder", "radius": 62, "height": 2, "pos": [0, 1, 0], "mat": "pad", "solid": False},
      "petal": {"type": "ellipsoid", "size": [26, 10, 56], "pos": [0, 16, 0], "pitch": -30, "radial": {"count": 8, "radius": 28}, "mat": "p", "solid": False},
      "petal2": {"type": "ellipsoid", "size": [18, 10, 40], "pos": [0, 26, 0], "pitch": -50, "yaw": 22, "radial": {"count": 6, "radius": 16}, "mat": "p2", "solid": False},
      "heart": {"type": "sphere", "radius": 9, "pos": [0, 28, 0], "mat": "c", "solid": False}})
prop("small_raft", "A small round raft for spectators.", ["raft"], "furniture",
     {"d": {"color": "#e0c89a"}, "f": {"color": "#46bec8"}},
     {"deck": {"type": "cylinder", "radius": 170, "height": 16, "pos": [0, 6, 0], "mat": "d"},
      "float": {"type": "torus", "radius": 176, "minor_radius": 16, "pos": [0, 4, 0], "mat": "f", "solid": False}})
prop("towel_stack", "A neat stack of folded towels on the path.", ["towel"], "food",
     {"a": W, "b": {"color": "#46bec8"}, "c": {"color": "#ffd166"}},
     {"a": {"type": "rounded_box", "size": [70, 12, 50], "radius": 5, "pos": [0, 6, 0], "mat": "a", "solid": False},
      "b": {"type": "rounded_box", "size": [66, 12, 48], "radius": 5, "pos": [0, 18, 0], "mat": "b", "solid": False},
      "c": {"type": "rounded_box", "size": [62, 12, 46], "radius": 5, "pos": [0, 30, 0], "mat": "c", "solid": False}})
prop("crab", "A small red crab, cross about something.", ["crab"], "food",
     {"r": {"color": "#ff786e"}, "e": {"color": "#263e54"}},
     {"body": {"type": "ellipsoid", "size": [56, 22, 40], "pos": [0, 16, 0], "mat": "r", "solid": False},
      "eye": {"type": "sphere", "radius": 5, "pos": [12, 32, 14], "mat": "e", "mirror": "x", "solid": False},
      "claw": {"type": "sphere", "radius": 11, "pos": [38, 18, 16], "mat": "r", "mirror": "x", "solid": False},
      "leg": {"type": "cylinder", "radius": 2, "from": [22, 12, -6], "to": [40, 0, -14], "mat": "r", "mirror": "x", "solid": False}})
prop("ribbon", "A floating ribbon on a pole, worth collecting.", ["ribbon"], "food",
     {"p": W, "r": {"color": "#ffd166", "emissive": 0.25}},
     {"pole": {"type": "cylinder", "radius": 2.5, "from": [0, 0, 0], "to": [0, 150, 0], "mat": "p", "solid": False},
      "bow": {"type": "ellipsoid", "size": [64, 34, 6], "pos": [0, 150, 0], "mat": "r", "solid": False},
      "tail": {"type": "box", "size": [12, 3], "from": [0, 140, 0], "to": [14, 92, 0], "mat": "r", "mirror": "x", "solid": False}})
prop("mooring_post", "A wooden post rising from the sea.", ["post"], "furniture",
     {"w": {"color": "#c9a26b"}, "t": {"color": "#fbfaf6"}},
     {"post": {"type": "cylinder", "radius": 36, "from": [0, -300, 0], "to": [0, 140, 0], "mat": "w"},
      "top": {"type": "cylinder", "radius": 40, "height": 6, "pos": [0, 139, 0], "mat": "t", "solid": False}})
prop("kettle_rack", "A rack of little kettlebells, cousins of Big Kettle.", ["gym", "weights"], "furniture",
     {"r": W, "k": {"color": "#2b2f36"}},
     {"shelf": {"type": "rounded_box", "size": [200, 8, 60], "radius": 3, "pos": [0, 40, 0], "mat": "r"},
      "leg": {"type": "box", "size": [8, 8], "from": [90, 0, 0], "to": [90, 38, 0], "mat": "r", "mirror": "x"},
      "ball": {"type": "sphere", "radius": 18, "pos": [-64, 62, 0], "mat": "k", "array": {"count": 3, "step": [64, 0, 0]}, "solid": False},
      "grip": {"type": "torus", "radius": 12, "minor_radius": 3, "pos": [-64, 84, 0], "pitch": 90, "mat": "k", "array": {"count": 3, "step": [64, 0, 0]}, "solid": False}})
prop("wardrobe_rack", "A rail of robes and sunhats for hire.", ["wardrobe", "rack"], "furniture",
     {"r": {"color": "#c9a26b"}, "a": W, "b": {"color": "#46bec8"}, "c": {"color": "#ff786e"}, "d": {"color": "#ffd166"}},
     {"post": {"type": "cylinder", "radius": 5, "from": [120, 0, 0], "to": [120, 190, 0], "mat": "r", "mirror": "x"},
      "rail": {"type": "cylinder", "radius": 4, "from": [-120, 188, 0], "to": [120, 188, 0], "mat": "r", "solid": False},
      "robe1": {"type": "rounded_box", "size": [50, 120, 16], "radius": 7, "pos": [-80, 122, 0], "mat": "a", "solid": False},
      "robe2": {"type": "rounded_box", "size": [50, 120, 16], "radius": 7, "pos": [-20, 122, 0], "mat": "b", "solid": False},
      "robe3": {"type": "rounded_box", "size": [50, 120, 16], "radius": 7, "pos": [40, 122, 0], "mat": "c", "solid": False},
      "robe4": {"type": "rounded_box", "size": [50, 120, 16], "radius": 7, "pos": [96, 122, 0], "mat": "d", "solid": False}})

def superellipse(rx, rz, p, n=64):
    pts = []
    for i in range(n):
        a = i / n * math.tau
        c, s = math.cos(a), math.sin(a)
        pts.append([round(math.copysign(abs(c) ** (2 / p), c) * rx, 1), round(math.copysign(abs(s) ** (2 / p), s) * rz, 1)])
    return pts
def layer(rx, rz, p, y, color):
    return {"type": "extrude", "points": superellipse(rx * 100, rz * 100, p), "depth": 40, "pitch": 90, "pos": [0, y - 20, 0], "color": color, "look": "flat", "solid": False}
# The island's ground: smooth shapes laid over the walkable tiles, a little above them.
prop("island_ground", "Tippy Cay's ground: sand, grass, the ring path and the plaza, as smooth flat layers.", ["island", "ground"], "town", {},
     {"sand": layer(30.5, 22.5, 4, 0.6, "#f6e7c8"), "wet": layer(31.5, 23.4, 4, 0.1, "#e8e0c0"),
      "grass": layer(26.5, 18.6, 3.2, 1.4, "#bfe6b0"),
      "path": layer(23.8, 16.4, 3, 2.2, "#efe7d6"), "lawn": layer(20.3, 13.6, 3, 3.0, "#c6eab8"),
      "plaza": layer(8.8, 6.8, 2, 3.8, "#fbfaf6"), "rim": layer(9.3, 7.3, 2, 3.4, "#e8e2d4")})
prop("islet_ground", "A round sandy islet with a lawn on it, for the Gazebo.", ["island", "ground"], "town", {},
     {"sand": {"type": "cylinder", "radius": 2300, "height": 40, "pos": [0, -19.4, 0], "color": "#f6dfb4", "look": "flat", "segments": 64, "solid": False},
      "grass": {"type": "cylinder", "radius": 1650, "height": 40, "pos": [0, -18.6, 0], "color": "#cfe6a0", "look": "flat", "segments": 64, "solid": False}})
print("props written")
