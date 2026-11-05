// Applies Olympiyikes' engine changes (each marked // OLY:) to engine/my-3d2dge.js from the pristine handoff copy.
import { readFileSync, writeFileSync } from 'node:fs';
const src = new URL('../vendor/my-3d2dge/dist/handoff/my-3d2dge.js', import.meta.url), out = new URL('../engine/my-3d2dge.js', import.meta.url);
let s = readFileSync(src, 'utf8'); const lines = s.split('\n');
const sub = (from, to, a, b) => { let n = 0; for (let i = from - 1; i < to; i++) { const t = lines[i].split(a).join(b); if (t !== lines[i]) { n++; lines[i] = t; } } if (!n) throw new Error('no change ' + from + ' ' + a); };
// 2. cosmetic randomness: particles, hitFx jitter, the Humanoid's phase and blink draw from their own stream
sub(1641, 1657, 'Math.random()', 'cosmetic()');
sub(2611, 2611, 'Math.random()', 'cosmetic()');
sub(3971, 3971, 'Math.random()', 'cosmetic()');
sub(4070, 4070, 'Math.random()', 'cosmetic()');
s = lines.join('\n');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 60)); s = s.replace(a, b); };
// 1. hooks exported (+ the cosmetic stream defined beside them)
rep("const HOOKS = { input: [], step: [], enter: [], draw: [], rot: null, frame: null, pose: null, pause: null }, FADES = {};",
  "const HOOKS = { input: [], step: [], enter: [], draw: [], rot: null, frame: null, pose: null, pause: null }, FADES = {};\nE.HOOKS = HOOKS;   // OLY: exported so a game can run code at the start of every step, paused or not\nconst cosmetic = (() => { let a = 0xC05E7 >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();   // OLY: cosmetic randomness off Math.random (deterministic tests, hub cards)");
// 3. font glyphs for the PlayStation face buttons
rep("GLYPHS['←'] = '000100111100000';", "GLYPHS['✕'] = '000101010101000'; GLYPHS['·'] = '000000010000000'; GLYPHS['—'] = '000000111000000'; GLYPHS['–'] = '000000111000000'; GLYPHS['✓'] = '000001101010000'; GLYPHS['○'] = '000010101010000'; GLYPHS['□'] = '000111101111000'; GLYPHS['△'] = '000010101111000';   // OLY: ✕ ○ □ △\nGLYPHS['←'] = '000100111100000';");
rep('"×": \'.....|#...#|.#.#.|..#..|.#.#.|#...#|.....\',', '"×": \'.....|#...#|.#.#.|..#..|.#.#.|#...#|.....\', "✕": \'.....|#...#|.#.#.|..#..|.#.#.|#...#|.....\', "○": \'.....|.###.|#...#|#...#|#...#|.###.|.....\', "□": \'.....|#####|#...#|#...#|#...#|#####|.....\', "△": \'.....|..#..|.#.#.|.#.#.|#...#|#####|.....\',   // OLY: ✕ ○ □ △\n ');
rep('"▸": ', `"·": '.|.|.|#|.|.|.', "—": '......|......|......|######|......|......|......', "–": '....|....|....|####|....|....|....', "‹": '...|..#|.#.|#..|.#.|..#|...', "›": '...|#..|.#.|..#|.#.|#..|...', "✓": '.....|....#|...#.|#.#..|.#...|.....|.....', "↻": '.###.|#...#|....#|#..##|#...#|.###.|.....', "↺": '.###.|#...#|#....|##..#|#...#|.###.|.....', "●": '.....|.###.|#####|#####|#####|.###.|.....', "é": '..#..|.#...|.###.|#...#|#####|#....|.###.',   // OLY: punctuation the game's text uses\n  "▸": `);
// 4. PlayStation symbols by default
rep("glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto',", "glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation',   // OLY: PlayStation by default\n   ");
// 5. pose hook + whole-body rotation (pitch / roll about a pivot) after the rig's pose is solved
rep("    if (HOOKS.pose) HOOKS.pose.call(this, dt, s);   // (crawling, swimming, swinging: section 16c)\n",
  "    if (HOOKS.pose) HOOKS.pose.call(this, dt, s);   // (crawling, swimming, swinging: section 16c)\n    if (typeof this.post === 'function') this.post(this, this.J, dt);   // OLY: a game's pose layer edits the solved joints\n    if (this.bodyPitch || this.bodyRoll) this._bodyRot(this.bodyPitch || 0, this.bodyRoll || 0);   // OLY: flips, dives, swims, tumbles\n");
rep("  _roll(u) {", `  /** OLY: turn every joint (and cloth, hair) about this.pivot (default the hips' centre): pitch in the forward-up plane
   *  (+ = nose down / forward), roll in the right-up plane; no floor lift (divers and jumpers are in the air) */
  _bodyRot(pitch, roll) {
    const J = this.J, o = this.o, pv = this.pivot || [0, 0, o.hipZ], cp = Math.cos(-pitch), sp = Math.sin(-pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const T = p => { let f = p[0] - pv[0], r = p[1] - pv[1], z = p[2] - pv[2]; const f1 = f * cp - z * sp, z1 = f * sp + z * cp; const r2 = r * cr - z1 * sr, z2 = r * sr + z1 * cr; return [f1 + pv[0], r2 + pv[1], z2 + pv[2]]; };
    for (const k in J) { const p = J[k]; if (p && k !== 'bladeDir') J[k] = T(p); }
    const b = J.bladeDir; if (b) { const q = T([b[0] + pv[0], b[1] + pv[1], b[2] + pv[2]]); J.bladeDir = [q[0] - pv[0], q[1] - pv[1], q[2] - pv[2]]; }
    const an = this.facing + this.spin + this._cheat, ca = Math.cos(an), sa = Math.sin(an), k = (1 - this.sq * .4) * o.size, kz = (1 + this.sq) * o.size, keep = this._unroll = this._unroll || [];
    for (const ch of [this.capeL, this.capeR, this._hairPts]) if (ch) for (const n of ch) {
      keep.push(n, n.x, n.y, n.z);
      const dx = n.x - this.x, dy = n.y - this.y, q = T([(dx * ca + dy * sa) / k, (-dx * sa + dy * ca) / k, (n.z - this.z) / kz]);
      n.x = this.x + (q[0] * ca - q[1] * sa) * k; n.y = this.y + (q[0] * sa + q[1] * ca) * k; n.z = this.z + q[2] * kz;
    }
  }
  _roll(u) {`);
// 6. a voice bus under the master, with its own volume and setting
rep("      this._musBus = c.createGain(); this._musBus.connect(this._master);\n", "      this._musBus = c.createGain(); this._musBus.connect(this._master);\n      this._voiceBus = c.createGain(); this._voiceBus.connect(this._master);   // OLY: a voice bus (gibberish speech)\n");
rep("this._musBus.gain.value = this.musicVolume * (this._ducked || this.ducked ? .35 : 1); }", "this._musBus.gain.value = this.musicVolume * (this._ducked || this.ducked ? .35 : 1); if (this._voiceBus) this._voiceBus.gain.value = this.voiceVolume === undefined ? .8 : this.voiceVolume; }   // OLY: voiceVolume");
writeFileSync(out, s);
console.log('patched');
