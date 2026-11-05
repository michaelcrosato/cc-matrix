/* ---- CUTSCENES: a scene that stages rigs on a painted backdrop and plays a script (say, pose, exit, caption, wait),
 * E.Dialog with live portraits and gibberish voices; hold Start / Esc to skip a scene, confirm finishes a page. In play:
 * radio lines (non-modal, a portrait at the top), modal dialogs, and barks over an actor's head ---- */
const Cutscene = { queue: [], speaker: null, rigs: {}, holdT: 0 };
const TEXT_SPEED = { normal: 50, slow: 30, fast: 95 };
Cutscene.talk = new E.Dialog(game, { voice: null, bg: ['#2a1414', '#140a0a'], border: '#e8b04a', nameColor: '#e8b04a', lines: 3 });
Cutscene.rig = (id, char) => { const S = Story.speaker(id, char); const key = S.id; if (!Cutscene.rigs[key]) { Cutscene.rigs[key] = Rigs.make(S.rig, S.arg); Cutscene.rigs[key].update(0, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); } return Cutscene.rigs[key]; };
Cutscene.speed = () => TEXT_SPEED[game.settings.textSpeed] || 50;
/** a radio line in play: the speaker's portrait at the top, turning by itself, play goes on */
Cutscene.radio = (speaker, text, auto) => {
  if (!text) return; const char = (B.M && B.M.char) || 'sojiro', S = Story.speaker(speaker, char);
  Cutscene.queue.push({ S, text: Story.text(text, char), auto: auto || clamp(1.8 + String(text).length / 26, 2.5, 6), modal: false, place: 'top' });
};
/** a modal dialog: [[speaker, text], ...]; play waits until it closes */
Cutscene.dialog = (lines, char) => { for (const [sp, tx] of lines) Cutscene.queue.push({ S: Story.speaker(sp, char), text: Story.text(tx, char), modal: true }); };
/** a bark over an actor (a boss's line): a bubble, the voice, and a radio line at the top */
Cutscene.bark = (a, text, voice, dur) => {
  if (!text) return; const say = { text, t: dur || clamp(1.5 + text.length / 24, 2, 5) }; B.Voice.say(text, voice || a.voice || 'guard', { vol: .9 });
  if (a.kind !== 'boss') a.say = say; else a.said = say;
  const S = a.kind === 'boss' ? Story.speaker(a.id === 'kurogane' && a.phase ? 'oni' : a.id, (B.M && B.M.char) || 'sojiro') : null;
  if (S && S.name) { Cutscene.queue = Cutscene.queue.filter(q => q.modal); Cutscene.talk.close(); Cutscene.queue.push({ S, text, auto: say.t, modal: false, place: 'top', silent: true }); }
};
Cutscene.busy = () => Cutscene.talk.open && Cutscene.talk.modal;
/** each step: open the next queued line, voice the one typing; returns true while a modal one holds play */
Cutscene.update = dt => {
  const t = Cutscene.talk;
  if (!t.open && Cutscene.queue.length) {
    const q = Cutscene.queue.shift(); Cutscene.speaker = q;
    t.speed = Cutscene.speed(); t.lines = q.modal ? 3 : 2;
    t.say(q.text, { name: q.S.name, portrait: Cutscene.rig(q.S.id, (B.M && B.M.char) || 'sojiro'), modal: q.modal, auto: q.auto, place: q.place || 'bottom', portraitSize: q.modal ? 40 : 28 });
  }
  if (t.open && Cutscene.speaker && !Cutscene.speaker.silent) B.Voice.dialogStep(t, Cutscene.speaker.S.voice);
  return t.update(dt);
};
Cutscene.clear = () => { Cutscene.queue = []; Cutscene.talk.close(); };
Cutscene.draw = r => { if (Cutscene.talk.open) Cutscene.talk.draw(r); };
/** play a story scene, then call done (or go to a scene) */
Cutscene.play = (id, char, done) => game.go('story', { id, char, done }, { fade: 'dissolve' });

/* ---- the painted rooms behind a story scene ---- */
const BACKDROPS = {
  shop: new E.Backdrop({ sky: ['#1a0e0a', '#2a1810', '#3a2216'], stars: 0, layers: [] }),
  garden: new E.Backdrop({ sky: ['#0a0e24', '#1a2248', '#2a3460'], moon: { x: .78, y: .22, r: 18, color: '#f4ecd0' }, stars: 60, starsY: .6, layers: [{ kind: 'mountains', color: '#141a34', y: .62, height: .2, parallax: 0 }, { kind: 'forest', color: '#0e1424', y: .78, height: .14, parallax: 0 }] }),
  teahouse: new E.Backdrop({ sky: ['#0a0a20', '#1a1a3a', '#2a2448'], moon: { x: .5, y: .2, r: 30, color: '#fff4d8' }, stars: 40, layers: [{ kind: 'castle', color: '#10142a', y: .7, height: .36, parallax: 0 }] }),
  town: new E.Backdrop({ sky: ['#3a2a4a', '#c86a4a', '#f0b070'], sun: { x: .25, y: .7, r: 16, color: '#ffe0a0' }, stars: 0, layers: [{ kind: 'castle', color: '#3a2434', y: .66, height: .4, parallax: 0 }, { kind: 'city', color: '#2a1a24', y: .82, height: .2, parallax: 0 }] }),
  sakehouse: new E.Backdrop({ sky: ['#140608', '#2a0a10', '#3a1018'], stars: 0, layers: [] }),
  roof: new E.Backdrop({ sky: ['#06081a', '#141a3a', '#2a2a50'], moon: { x: .5, y: .25, r: 40, color: '#fff4d8' }, stars: 80, layers: [{ kind: 'mountains', color: '#0e1228', y: .7, height: .2, parallax: 0 }] })
};
/** the room's painted interior (screen pixels): shoji, stacked lunchboxes, a lantern, tatami */
const paintRoom = (r, kind, over, flK = .78) => (over ? r.overlay.bind(r) : f => f(r.ctx))(g => {
  const W = r.W, H = r.H, fl = Math.round(H * flK);
  if (kind === 'shop' || kind === 'sakehouse') {
    const wall = kind === 'shop' ? '#3a2418' : '#2a0e12';
    px.rect(g, 0, 0, W, fl, wall);
    for (let x = 6; x < W; x += 54) { px.rect(g, x, 18, 44, fl - 40, kind === 'shop' ? '#d8c8a0' : '#5a1a1a'); for (let k = 1; k < 4; k++) px.rect(g, x + k * 11, 18, 1, fl - 40, '#4a3020'); for (let y = 30; y < fl - 22; y += 16) px.rect(g, x, y, 44, 1, '#4a3020'); px.rect(g, x - 3, 14, 50, 4, '#2a1810'); }
    px.rect(g, 0, fl - 22, W, 4, '#2a1810');
    if (kind === 'shop') for (let i = 0; i < 4; i++) { const x = W - 70 + (i % 2) * 18, y = fl - 30 - Math.floor(i / 2) * 14; px.rect(g, x, y, 16, 12, i % 2 ? '#8a1c1c' : '#1e1616'); px.rect(g, x, y + 5, 16, 2, '#e8b04a'); }
    const lx = Math.round(W * .5), ly = 16; px.blend(g, .35, 'add', () => px.disc(g, lx, ly + 18, 44, '#ff9a40')); px.rect(g, lx - 1, 0, 2, ly, '#2a1810'); px.disc(g, lx, ly + 10, 8, kind === 'shop' ? '#f4ead5' : '#e83a2a'); px.rect(g, lx - 6, ly + 1, 12, 2, '#1e1616'); px.rect(g, lx - 6, ly + 17, 12, 2, '#1e1616');
    for (let x = 0; x < W; x += 32) { px.rect(g, x, fl, 32, H - fl, '#8a8040'); px.rect(g, x, fl, 1, H - fl, '#4a4020'); } px.rect(g, 0, fl, W, 2, '#4a3a20');
  } else if (kind === 'garden') {
    px.rect(g, 0, fl, W, H - fl, '#1e2a1e'); for (let x = 0; x < W; x += 6) px.dot(g, x + (x * 7) % 5, fl + 4 + (x * 13) % 18, '#2e3e2a');
    for (const x of [30, W - 40]) { px.rect(g, x - 2, fl - 26, 4, 26, '#5a5a62'); px.rect(g, x - 7, fl - 32, 14, 6, '#6a6a72'); px.rect(g, x - 4, fl - 28, 8, 4, '#ffb060'); px.blend(g, .3, 'add', () => px.disc(g, x, fl - 26, 22, '#ff9a40')); }
  } else if (kind === 'teahouse') { px.rect(g, 0, fl, W, H - fl, '#4a3a28'); for (let x = 0; x < W; x += 12) px.rect(g, x, fl, 1, H - fl, '#2a2018'); for (let x = 20; x < W; x += 60) { px.disc(g, x, 30, 6, '#e8603a'); px.blend(g, .3, 'add', () => px.disc(g, x, 30, 16, '#ff9a40')); } }
  else if (kind === 'town') { px.rect(g, 0, fl, W, H - fl, '#5a4a3a'); for (let i = 0; i < 9; i++) { const x = 20 + i * Math.round((W - 40) / 8); px.rect(g, x - 3, fl - 16, 6, 14, '#3a2a20'); px.disc(g, x, fl - 20, 4, '#e8c8a0'); px.rect(g, x - 5, fl - 6, 10, 3, '#1a1414'); } }
  else if (kind === 'roof') { px.rect(g, 0, fl, W, H - fl, '#2a3040'); for (let x = 0; x < W; x += 6) px.rect(g, x, fl, 1, H - fl, '#1a2030'); }
});
/* ---- the story scene: rigs on a floor line in the side view, the script, the dialog ---- */
const storyScene = {
  view: 'side', res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: false },
  enter(d) {
    this.d = d; const S = Story.scenes[d.id]; this.S = S; this.i = 0; this.wait = 0; this.cap = null; this.capT = 0; this.done = false; this.hold = 0; this.exiting = {};
    Cutscene.clear(); game.follow(null); game.cam.bounds = null; Lt.enabled = false; game.lights.enabled = false;
    if (S && S.music !== undefined) B.Music.play(S.music); else if (S && S.music === null) B.Music.play(null);
    this.cast = (S ? S.cast : []).map(([id, x, f]) => { const sp = Story.speaker(id, d.char), rig = Rigs.make(sp.rig, sp.arg); return { id: sp.id, x, f, rig, pose: null, alpha: 1, sp }; });
    this.step();
  },
  step() {
    const S = this.S; if (!S) { this.finish(); return; }
    while (this.i < S.steps.length) {
      const st = S.steps[this.i++], [k, a, b] = st;
      if (k === 'say') { const sp = Story.speaker(a, this.d.char), txt = Story.text(b, this.d.char); if (!txt) continue; Cutscene.queue.push({ S: sp, text: txt, modal: true }); this.talker = sp.id; return; }
      if (k === 'pose') { const c = this.cast.find(c => c.id === (a === 'hero' ? this.d.char : a)); if (c) { c.pose = b; c.poseT = 0; if (b === 'tap') Au.sfx('stepWood', { vol: .6 }); } continue; }
      if (k === 'exit') { const c = this.cast.find(c => c.id === Story.speaker(a, this.d.char).id); if (c) c.leaving = true; continue; }
      if (k === 'caption') { this.cap = a; this.capT = 0; this.wait = 2.6; return; }
      if (k === 'wait') { this.wait = a; return; }
    }
    this.finish();
  },
  finish() { if (this.done) return; this.done = true; Cutscene.clear(); const d = this.d; if (typeof d.done === 'function') d.done(); else if (d.done) game.go(d.done.scene, d.done.data); else game.go('title'); },
  update(dt) {
    B.pollInput();
    const I = game.input;
    if (I.down('start') || I.down('pause')) { this.hold += dt; if (this.hold > .6) { this.finish(); return; } } else this.hold = 0;
    if (this.cap) this.capT += dt;
    if (this.wait > 0) { this.wait -= dt; if (I.pressed('confirm') && this.cap) this.wait = 0; if (this.wait <= 0) { this.cap = null; this.step(); } }
    else if (!Cutscene.update(dt) && !Cutscene.talk.open && !Cutscene.queue.length) this.step();
    for (const c of this.cast) {
      if (c.leaving) { c.x -= dt * 60; c.alpha = Math.max(0, c.alpha - dt); }
      const talking = Cutscene.talk.open && Cutscene.speaker && Cutscene.speaker.S.id === c.id;
      c.poseT = (c.poseT || 0) + dt; c.rig._post = c.pose === 'bow' ? Rigs.bow(Math.min(1, c.poseT * 2)) : c.pose === 'tap' ? Rigs.paddleTap(c.poseT) : c.pose === 'toast' ? Rigs.toast(Math.min(1, c.poseT * 1.5)) : null;
      c.rig.update(dt, { x: c.x, y: 0, z: 0, facing: c.f, vx: c.leaving ? -60 : 0, vy: 0, expr: talking && c.sp.id === 'kurogane' ? 'angry' : undefined, pose: c.pose === 'kneel' ? 'kneel' : undefined });
    }
    game.focus(0, 0, (game.H / 2 - game.H * .34) / -game.view.bz);   // the cast's feet on the room's floor line, above the dialog
  },
  draw(r) {
    const S = this.S, bg = S ? S.bg : 'shop';
    (BACKDROPS[bg] || BACKDROPS.shop).draw(r); paintRoom(r, bg, false, .66);
    for (const c of this.cast) if (c.alpha > .02) r.actor(c.x, 0, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { alpha: c.alpha });
    for (const c of this.cast) if (c.pose === 'toast') { const h = c.rig.hand('R'); r.queue(h[0], 0, h[2] + 1, g => { const p = r.w(h[0], 0, h[2] + 1); px.rect(g, p[0] - 2, p[1] - 3, 4, 3, '#f4ead5'); px.rect(g, p[0] - 2, p[1] - 3, 4, 1, '#c8c0b0'); }, { bias: 2 }); }   // the sake cup
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, 14, '#000'); px.rect(g, 0, r.H - 6, r.W, 6, '#000');
      if (this.cap) { const a = clamp(this.capT * 2, 0, 1); px.blend(g, a, 'normal', () => E.font.text(g, this.cap, r.W / 2, Math.round(r.H * .3), '#f4ead5', { align: 'center', shadow: '#000', outline: false, wrap: r.W - 40 })); }
      Glyph.text(g, 'Hold {a:start} to skip', 6, 4, '#b8a890', {});
      if (this.hold > 0) E.ui.bar(g, 6, 12, 60, 2, this.hold / .6, '#e8b04a');
    });
    Cutscene.draw(r);
  }
};
B.Cutscene = Cutscene; B.storyScene = storyScene; B.BACKDROPS = BACKDROPS; B.paintRoom = paintRoom;
