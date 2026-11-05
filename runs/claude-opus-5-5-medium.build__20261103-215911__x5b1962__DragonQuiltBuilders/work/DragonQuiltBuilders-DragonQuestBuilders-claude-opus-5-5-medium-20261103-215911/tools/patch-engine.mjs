// Applies the game's engine changes to engine/my-3d2dge.js (idempotent; each change is marked // DQB:).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const f = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../engine/my-3d2dge.js');
let s = readFileSync(f, 'utf8');
const rep = (name, from, to) => { if (s.includes('DQB: ' + name)) return; if (!s.includes(from)) { console.error('patch anchor missing: ' + name); process.exit(1); } s = s.replace(from, to); };
// 1. input: wheel steps that work while the camera wheel is off, and a right-stick flick
rep('wheelSteps',
  "    el.addEventListener('wheel', e => {\n      if (!this._wheelOn) return; e.preventDefault();",
  "    el.addEventListener('wheel', e => { if (this.wheelGame) { e.preventDefault(); this._wheelAcc = (this._wheelAcc || 0) + e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 100 : 1); this.mouse.t = this.clock; } }, { signal, passive: false });   // DQB: wheelSteps (the game's own wheel: the hotbar)\n    el.addEventListener('wheel', e => {\n      if (!this._wheelOn) return; e.preventDefault();");
rep('wheelTick',
  "  tick(dt) {\n    this._suppressed.clear();\n    this.clock += dt;",
  "  tick(dt) {\n    this._suppressed.clear();\n    this.clock += dt;\n    { const a = this._wheelAcc || 0, n = Math.trunc(a / 60); this._wheelNow = n; this._wheelAcc = a - n * 60; if (Math.abs(this._wheelAcc) > 0 && !n) this._wheelAcc *= .9; }   // DQB: wheelTick\n    if (this.padAim && Math.abs(this.padAim[0]) > .6) { if (!this._flickArm && this.clock - (this._flickT || -9) > .25) { this._flickNow = Math.sign(this.padAim[0]); this._flickArm = true; this._flickT = this.clock; } else this._flickNow = 0; } else { this._flickNow = 0; if (!this.padAim || Math.abs(this.padAim[0]) < .3) this._flickArm = false; }");
rep('wheelApi',
  "  /** is the action held right now? */",
  "  /** DQB: wheelApi: whole wheel notches this step (+ down), with input.wheelGame on; flick('x'): -1 / 0 / 1 once per right-stick push past .6 */\n  wheelSteps() { return this._wheelNow || 0; }\n  flick(axis) { return axis === 'x' ? (this._flickNow || 0) : 0; }\n  /** is the action held right now? */");
// 2. dialog: an onLetter hook for each newly shown letter (a voice synth per speaker)
rep('onLetter',
  "    if (this.voice && Math.floor(this.shown) > prev && (this._blip++ % 2 === 0)) this.game.audio.sfx(this.voice);",
  "    if (this.onLetter && Math.floor(this.shown) > prev) { const flat = this._page.join(''); for (let q = prev; q < Math.floor(this.shown); q++) this.onLetter(flat[q] || ' ', q, this.i, this); }   // DQB: onLetter\n    else if (this.voice && Math.floor(this.shown) > prev && (this._blip++ % 2 === 0)) this.game.audio.sfx(this.voice);");
// 3. audio: a voice bus (master -> voice) with its own volume
rep('voiceBus',
  "      this._musBus = c.createGain(); this._musBus.connect(this._master);",
  "      this._musBus = c.createGain(); this._musBus.connect(this._master);\n      this._voiceBus = c.createGain(); this._voiceBus.connect(this._master); this._voiceBus.gain.value = this.voiceVolume === undefined ? .8 : this.voiceVolume;   // DQB: voiceBus");
rep('voiceVol',
  "  applyVolume() { if (!this.ctx) return; this._master.gain.value = this.muted ? 0 : this.volume;",
  "  applyVolume() { if (!this.ctx) return; if (this._voiceBus) this._voiceBus.gain.value = this.voiceVolume === undefined ? .8 : this.voiceVolume; /* DQB: voiceVol */ this._master.gain.value = this.muted ? 0 : this.volume;");
// 4. humanoid tools: o.tool = 'stick' | 'club' | 'ripper' draws a darning stick, a cobble club or the Seam Ripper on the sword's joints
rep('tools',
  "    if (o.weapon === 'sword') {\n      const hd = J.handR, bd = J.bladeDir, Lb = o.bladeLen, Hn = Q.handR, sl = Math.hypot(bd[0], bd[1]) || 1, gx = -bd[1] / sl * 1.8, gy = bd[0] / sl * 1.8;",
  "    if (o.weapon === 'sword' && o.tool) {   // DQB: tools\n      const hd = J.handR, bd = J.bladeDir, Hn = Q.handR, Lb = o.tool === 'club' ? 9 : o.tool === 'ripper' ? 10 : 8, tip = Sp(hd, bd[0] * Lb, bd[1] * Lb, bd[2] * Lb), pom = Sp(hd, -bd[0] * 1.6, -bd[1] * 1.6, -bd[2] * 1.6);\n      const wt = tones(o.tool === 'ripper' ? '#d8b040' : '#a07040'), st = tones('#9a96a0');\n      ops.push({ d: (Hn[2] + tip[2]) / 2, f: () => {\n        px.line(g, pom[0], pom[1], tip[0], tip[1], wt.deep, Math.max(1, Math.round(u * .9))); px.line(g, pom[0] - .4, pom[1] - .4, tip[0] - .4, tip[1] - .4, wt.lt);\n        if (o.tool === 'club') { px.disc(g, tip[0], tip[1], Math.max(1.5, u * 1.6), st.sh); px.disc(g, tip[0] - .6, tip[1] - .6, Math.max(1, u * 1.1), st.base); px.dot(g, tip[0] - 1, tip[1] - 1, st.hi); }\n        else if (o.tool === 'ripper') { const f1 = Sp(hd, bd[0] * (Lb + 3), bd[1] * (Lb + 3), bd[2] * (Lb + 3) + 1.2), f2 = Sp(hd, bd[0] * (Lb + 2.5), bd[1] * (Lb + 2.5), bd[2] * (Lb + 2.5) - .8); px.line(g, tip[0], tip[1], f1[0], f1[1], '#e8e8f0'); px.line(g, tip[0], tip[1], f2[0], f2[1], '#b8b8c8'); px.disc(g, tip[0], tip[1], Math.max(.8, u * .7), '#ff5a8a'); px.dot(g, f1[0], f1[1], '#ffffff'); }\n        else { px.dot(g, tip[0], tip[1], wt.hi); px.disc(g, Hn[0], Hn[1], Math.max(.6, u * .5), '#e8dcc0'); }\n      } });\n    } else if (o.weapon === 'sword') {\n      const hd = J.handR, bd = J.bladeDir, Lb = o.bladeLen, Hn = Q.handR, sl = Math.hypot(bd[0], bd[1]) || 1, gx = -bd[1] / sl * 1.8, gy = bd[0] / sl * 1.8;");
// 5. the mouse moving over the canvas counts as using it: menus answer to hover and prompts switch to mouse icons
rep('mouseMove',
  "on(el, 'pointermove', e => { if (e.pointerType === 'mouse') { this.mouse.cx = e.clientX; this.mouse.cy = e.clientY; this.mouse.active = true;",
  "on(el, 'pointermove', e => { if (e.pointerType === 'mouse') { /* DQB: mouseMove */ if (Math.hypot(e.clientX - this.mouse.cx, e.clientY - this.mouse.cy) > 2) this.lastDevice = 'mouse'; this.mouse.cx = e.clientX; this.mouse.cy = e.clientY; this.mouse.active = true;");
writeFileSync(f, s);
console.log('engine patched');
