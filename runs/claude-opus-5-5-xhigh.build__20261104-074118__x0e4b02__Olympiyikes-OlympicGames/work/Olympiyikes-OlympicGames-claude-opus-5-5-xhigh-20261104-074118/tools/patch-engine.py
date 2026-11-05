# Applies Olympiyikes' engine changes (each marked // OLY:) to engine/my-3d2dge.js, from the handoff's pristine copy.
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'vendor/my-3d2dge/dist/handoff/my-3d2dge.js').read_text()
out = src
def rep(old, new, count=1):
    global out
    n = out.count(old)
    if n < 1: sys.exit('patch: not found: ' + old[:80])
    out = out.replace(old, new, count)
# 1. export the hooks; 2. a cosmetic random stream
rep("const HOOKS = { input: [], step: [], enter: [], draw: [], rot: null, frame: null, pose: null, pause: null }, FADES = {};",
    "const HOOKS = { input: [], step: [], enter: [], draw: [], rot: null, frame: null, pose: null, pause: null }, FADES = {};\n"
    "E.HOOKS = HOOKS;   // OLY: exported so a game can run code at the start of every step, paused too (hub Create+Options guard, idle detection)\n"
    "const cosmetic = rng(0xC05E7);   // OLY: cosmetic randomness (rig blinks and idle phase, particles, hit numbers) never draws on Math.random\n"
    "E.cosmetic = cosmetic;")
# particles: Math.random -> cosmetic inside the Particles class
a = out.index('class Particles {'); b = out.index('E.Particles = Particles;')
out = out[:a] + out[a:b].replace('Math.random()', 'cosmetic()') + out[b:]
rep("if (o.damage !== undefined) P.text(x + (Math.random() - .5) * 10,", "if (o.damage !== undefined) P.text(x + (cosmetic() - .5) * 10,   /* OLY: cosmetic */")
rep("this.t = Math.random() * 10; this.phase = 0;", "this.t = cosmetic() * 10; this.phase = 0;   /* OLY: cosmetic */")
rep("this.blink -= dt; if (this.blink < -.12) this.blink = 2 + Math.random() * 3;", "this.blink -= dt; if (this.blink < -.12) this.blink = 2 + cosmetic() * 3;   // OLY: cosmetic")
# 3. font glyphs for the PlayStation face buttons
rep("\"♪\": '..##.|..#.#|..#..|..#..|.##..|###..|.#...'\n};",
    "\"♪\": '..##.|..#.#|..#..|..#..|.##..|###..|.#...',\n"
    "  \"✕\": '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....', \"○\": '.....|.###.|#...#|#...#|#...#|.###.|.....', \"□\": '.....|#####|#...#|#...#|#...#|#####|.....', \"△\": '.....|..#..|.#.#.|.#.#.|#...#|#####|.....',   // OLY: PlayStation symbols\n"
    "  \"·\": '.|.|.|#|.|.|.', \"—\": '.......|.......|.......|#######|.......|.......|.......', \"–\": '....|....|....|####|....|....|....', \"°\": '###|#.#|###|...|...|...|...', \"✓\": '.....|....#|...#.|#.#..|.#...|.....|.....', \"²\": '##.|..#|.#.|###|...|...|...'   // OLY: punctuation the game's text uses\n};")
rep("GLYPHS['←'] = '000100111100000'; GLYPHS['→'] = '000001111001000';",
    "GLYPHS['←'] = '000100111100000'; GLYPHS['→'] = '000001111001000';\n"
    "Object.assign(GLYPHS, { '✕': '101010101000000', '○': '010101010000000', '□': '111101111000000', '△': '010101111000000', '·': '000000010000000', '—': '000000111000000', '–': '000000111000000', '°': '111101111000000', '✓': '001001101010000' });   // OLY: PlayStation symbols")
# 4. PlayStation symbols by default
rep("glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto',",
    "glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation' /* OLY: PlayStation by default */,")
# 5. the pose hook and whole-body rotation (flips, dives, swims, tumbles, V-style flight)
rep("    this.solvePose();\n    if (o.cape) this._cape(dt);",
    "    this.solvePose();\n"
    "    if (this.post) this.post(this, this.J, dt, s);   // OLY: a game's pose layer edits the joints after the solver\n"
    "    if (this.bodyPitch || this.bodyRoll) this._bodyRot();   // OLY: whole-body rotation about the pivot\n"
    "    if (o.cape) this._cape(dt);")
rep("  /** world position of a hand ('R' holds the weapon): spawn bullets, sparks or thrown things here */",
    "  /** OLY: turn every joint about this.pivot (default: the hip centre) by bodyPitch (forward-up plane, + pitches the head\n"
    "   *  forward and down) and bodyRoll (right-up plane), with no floor lift: flips, dives, swimming, tumbles */\n"
    "  _bodyRot() {\n"
    "    const J = this.J, pv = this.pivot || J.hipC || [0, 0, this.o.hipZ], p = this.bodyPitch || 0, q = this.bodyRoll || 0, cp = Math.cos(p), sp = Math.sin(p), cq = Math.cos(q), sq = Math.sin(q);\n"
    "    const T = v => { let f = v[0] - pv[0], r = v[1] - pv[1], z = v[2] - pv[2]; const f2 = f * cp + z * sp, z2 = -f * sp + z * cp; f = f2; z = z2; const r2 = r * cq + z * sq, z3 = -r * sq + z * cq; return [f + pv[0], r2 + pv[1], z3 + pv[2]]; };\n"
    "    for (const k in J) { const v = J[k]; if (!v || k === 'bladeDir') continue; J[k] = T(v); }\n"
    "    const b = J.bladeDir; if (b) { const t = T([b[0] + pv[0], b[1] + pv[1], b[2] + pv[2]]); J.bladeDir = [t[0] - pv[0], t[1] - pv[1], t[2] - pv[2]]; }\n"
    "  }\n"
    "  /** world position of a hand ('R' holds the weapon): spawn bullets, sparks or thrown things here */")
# 6. a voice bus under the master
rep("this.sfxVolume = 1; this.musicVolume = .5; this.muted = false;", "this.sfxVolume = 1; this.musicVolume = .5; this.voiceVolume = .8; this.muted = false;   /* OLY: voiceVolume */")
rep("      this._musBus = c.createGain(); this._musBus.connect(this._master);\n",
    "      this._musBus = c.createGain(); this._musBus.connect(this._master);\n"
    "      this._voiceBus = c.createGain(); this._voiceBus.connect(this._master);   // OLY: the voices' bus (gibberish speech)\n")
rep("this._musBus.gain.value = this.musicVolume * (this._ducked || this.ducked ? .35 : 1); }",
    "this._musBus.gain.value = this.musicVolume * (this._ducked || this.ducked ? .35 : 1) * (this.talkDuck || 1); if (this._voiceBus) this._voiceBus.gain.value = this.voiceVolume * (this._ducked ? .5 : 1); }   // OLY: voices, and the music ducked under speech")
rep("  effects: { group: 'Sound', label: 'Effects', type: 'slider', value: 1, apply: (g, v) => { g.audio.sfxVolume = v; g.audio.applyVolume(); } },",
    "  effects: { group: 'Sound', label: 'Effects', type: 'slider', value: 1, apply: (g, v) => { g.audio.sfxVolume = v; g.audio.applyVolume(); } },\n"
    "  voices: { group: 'Sound', label: 'Voices', type: 'slider', value: .8, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } },   // OLY: the voice bus")
(root / 'engine/my-3d2dge.js').write_text(out)
print('engine patched:', out.count('OLY:'), 'marks')
