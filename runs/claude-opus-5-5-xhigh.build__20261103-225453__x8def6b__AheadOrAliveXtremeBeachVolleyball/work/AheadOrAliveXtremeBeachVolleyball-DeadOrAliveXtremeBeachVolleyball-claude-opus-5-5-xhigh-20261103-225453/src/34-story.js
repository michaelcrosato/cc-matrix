/* 34-story: the story. The Invitation and character select; cutscenes (game.script generators over a place: walk-ons,
 * camera moves, emotes, dialogue with portraits and voices); the Welcome Match with Pepper's coaching; the daily events
 * (the casino's opening, a villa visit, the rain shower, the overheard call, Pepper's letter, the semifinal, the Fortuna
 * Cup final against The House); the farewell party; two endings; then the credits and the vacation's results. */
G.newVacationFlow = () => G.game.go('invitation', null, { fade: 'white', seconds: .4 });
G.storyBusy = () => !!(G.cut && G.cut.busy);
/* ---- the invitation: a parchment letter with Sonny's gold seal ---- */
G.scenes.invitation = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); this.t = 0; G.music('sunrise'); this.shown = 0; },
  update(dt) {
    this.t += dt; const prev = Math.floor(this.shown); this.shown = Math.min(G.INVITATION.length, this.shown + dt * 38);
    for (let i = prev; i < Math.floor(this.shown); i++) if (/[a-z]/i.test(G.INVITATION[i])) G.voice.letter('sonny', G.INVITATION[i], i, G.INVITATION);
    const I = G.game.input;
    if ((I.pressed('confirm') || I.clicked()) && this.t > .5) { if (this.shown < G.INVITATION.length) this.shown = G.INVITATION.length; else { G.sfx('ui_select'); G.game.go('charselect'); } }
    if (I.pressed('cancel') || I.pressed('esc')) { G.sfx('ui_back'); G.game.go('menu'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 2, E.mix('#2a1240', '#ff9e5e', y / H));
      const w = Math.min(300, W - 40), h = Math.round(H * .72), x = Math.round((W - w) / 2), y = Math.round(H * .12) + Math.round((1 - clamp(this.t / .6, 0, 1)) * 40);
      E.ui.box(g, x, y, w, h, { bg: ['#f8ecd0', '#e8d4a8'], border: '#a88a62', alpha: 1 });
      for (let i = 0; i < 12; i++) px.dot(g, x + 6 + (i * 37) % (w - 12), y + 6 + (i * 53) % (h - 12), '#d8c498');
      E.font.title(g, 'AHEAD OR ALIVE', W / 2, y + 12, { scale: 2, align: 'center', colors: ['#c8902a', '#8a5a20'], depth: 1 });
      E.font.text(g, 'INVITATIONAL', W / 2, y + 32, '#8a3a2a', { align: 'center', outline: false });
      const lines = E.font.wrap(G.INVITATION, w - 40); let left = Math.floor(this.shown);
      lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; E.font.text(g, s, x + 20, y + 52 + i * 11, '#3a2a1a', { outline: false }); });
      const sx = x + w - 40, sy = y + h - 40; px.disc(g, sx, sy, 15, '#a87a10'); px.disc(g, sx, sy, 13, '#ffd36a'); px.disc(g, sx - 2, sy - 2, 8, '#ffe9a0'); E.font.text(g, 'S', sx, sy - 4, '#8a5a10', { align: 'center', outline: false, scale: 1 });
      if (this.shown >= G.INVITATION.length) { E.font.text(g, 'Who opened it?', W / 2, y + h - 20, '#8a3a2a', { align: 'center', outline: false }); }
      G.promptBar(g, r, [['confirm', this.shown >= G.INVITATION.length ? 'Choose your fighter' : 'Read'], ['cancel', 'Back']]);
    });
  }
};
/* ---- character select: six cards (portrait, epithet, style, stats as bars, tastes) ---- */
G.scenes.charselect = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); this.nav = new G.Nav({ focus: 'rin' }); this.rigs = {}; for (const id of G.FIGHTERS) this.rigs[id] = G.makeRig(id); this.t = 0; },
  items() { const W = G.game.W, H = G.game.H, cw = Math.round(W * .135), gap = 5, x0 = Math.round(W / 2 - (cw * 6 + gap * 5) / 2), y = Math.round(H * .17); return G.FIGHTERS.map((id, i) => ({ id, x: x0 + i * (cw + gap), y, w: cw, h: Math.round(H * .4), onPress: () => this.pick(id) })); },
  pick(id) {
    const plus = G.unlocks.plusFrom ? G.unlocks.plusFrom : null;
    G.state = G.newState(id, (G.hashStr(id) ^ Math.floor((G.game.real || 1) * 1000)) >>> 0, plus);
    G.unlocks.plusFrom = null;
    G.voice.say(G.pickLine(id, 'bark') || 'Yes!', id, 'happy');
    G.dayStart();
    G.state.slot = 0;
    G.runCutscene('arrival');
  },
  update(dt) { this.t += dt; const ev = this.nav.update(this.items(), G.game.input); if (ev.back) { G.sfx('ui_back'); G.game.go('menu'); } for (const id of G.FIGHTERS) G.Anim.idle(this.rigs[id], dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + (this.nav.focus === id ? Math.sin(this.t * 1.5) * .6 : 0), pose: this.nav.focus === id ? 'hips' : null, expr: this.nav.focus === id ? 'smile' : null }); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 2, E.mix('#0f4c5c', '#2a1240', y / H));
      G.ui.title(g, 'WHO OPENED IT?', W / 2, Math.round(H * .04), { scale: 2 });
      const its = this.items();
      for (const it of its) {
        const c = G.CAST[it.id], on = this.nav.focus === it.id;
        E.ui.box(g, it.x, it.y - (on ? 2 : 0), it.w, it.h, { bg: on ? [E.shade(c.color, -.2), E.shade(c.color, -.55)] : ['#174a5a', '#0c2e3a'], border: on ? '#ffd36a' : '#5a8a92', alpha: .96 });
        const py = it.y + it.h - 12; px.ell(g, it.x + it.w / 2, py + 1, 14, 4, '#0a2d3d');
        this.rigs[it.id].draw(g, it.x + it.w / 2, py, E.VIEWS.court);
        E.font.text(g, c.name, it.x + it.w / 2, it.y + 4, '#fff8e8', { align: 'center', outline: false, shadow: '#000' });
        if (on) G.ui.focus(g, it.x, it.y, it.w, it.h);
      }
      const c = G.CAST[this.nav.focus || 'rin'], y = Math.round(H * .6), x = Math.round(W * .12), w = Math.round(W * .76);
      G.ui.panel(g, x, y, w, Math.round(H * .3));
      E.font.text(g, c.full + ',  "' + c.epithet + '"', x + 10, y + 8, '#ffd36a', { outline: false });
      E.font.text(g, c.from + ' · ' + c.style + ' · ' + c.age, x + 10, y + 19, '#9fd3d6', { outline: false });
      E.font.text(g, c.personality, x + 10, y + 31, '#fff8e8', { outline: false, wrap: w * .55 });
      const bx = x + Math.round(w * .62); ['POW', 'TEC', 'SPD', 'JMP'].forEach((k, i) => { E.font.text(g, k, bx, y + 8 + i * 11, '#fff8e8', { outline: false }); G.ui.bar(g, bx + 26, y + 10 + i * 11, 80, 4, c.stats[k] / 10, ['#ff5f7a', '#5ff0ff', '#ffd36a', '#9ff3a8'][i]); });
      E.font.text(g, 'Loves ' + c.tastes.join(' & ') + ' styles', bx, y + 54, '#ff9ac8', { outline: false });
      G.promptBar(g, r, [['move', 'Choose'], ['confirm', 'This is me'], ['cancel', 'Back']]);
    });
  }
};

/* ---- cutscenes ---- */
G.runCutscene = (id, data) => G.game.go('cutscene', Object.assign({ id }, data || {}), { fade: .4 });
G.scenes.cutscene = {
  view: 'threequarter', input: G.PRESETS.EXPLORE, camera: false,
  enter(d) {
    G.useInput('EXPLORE'); const C = G.CUTSCENES[d.id]; this.d = d; this.C = C; this.loc = C.loc; this.L = G.LOCS[C.loc]; this.map = G.getLocMap(C.loc);
    this.actors = {}; this.t = 0; this.tod = C.tod || (G.state ? G.todFor(G.state.slot, G.weatherNow(), G.state.day) : 'afternoon'); G.applyLight(this.tod);
    G.game.follow(null); G.game.cam.bounds = v => this.map.bounds(v); this.camAt = C.cam ? C.cam.slice() : this.L.start.slice(); G.game.focus(this.camAt[0], this.camAt[1], 10); G.game.cam.snap = true; G.game.cam.smooth = .4;
    G.music(C.music || this.L.music); G.ambience(this.tod === 'night' ? 'night' : this.L.amb);
    G.cut = { busy: true }; this.fx = []; this.choice = -1; this.finished = false; this.skipTutorial = false; this.ff = 0; this.fwT = 0; this.flam = null; this.wheel = null;
    if (C.setup) C.setup(this);
    this.job = G.game.script(C.run.call(this, this));
  },
  exit() { G.cut = null; if (G.talk) G.talk.close(); },
  actor(id, x, y, facing = Math.PI / 2, o = {}) { const a = { id, x, y, z: 0, vx: 0, vy: 0, facing, rig: G.makeRig(id, o.wear || (G.state && G.wearOf(id)) || {}), pose: null, clip: o.clip || null, poseW: null, expr: null, down: 0 }; this.actors[id] = a; return a; },
  walk(id, x, y, speed = 60) { const a = this.actors[id], d = Math.hypot(x - a.x, y - a.y), T = Math.max(.05, d / speed); a.vx = (x - a.x) / T; a.vy = (y - a.y) / T; a.facing = Math.atan2(y - a.y, x - a.x); return G.game.tween(a, { x, y }, T, { ease: 'linear', onDone: () => { a.vx = a.vy = 0; } }); },
  cam(x, y, T = .8) { return G.game.tween(this.camAt, { 0: x, 1: y }, T, { ease: 'inOutSine' }); },
  say(who, lines, o) { G.say(who, lines, o); return E.until(() => !G.talk.open); },
  ask(who, line, choices) { this.choice = -1; G.say(who, line, { choices, onChoice: i => { this.choice = i; } }); return E.until(() => !G.talk.open && this.choice >= 0); },
  emote(id, kind) { const a = this.actors[id]; if (a) this.fx.push({ a, kind, t: 0 }); if (kind === 'heart' && a) G.fx.hearts(a.x, a.y, 40, 4); },
  update(dt) {
    this.t += dt; G.tickAmbience(dt);
    if (G.talk) G.talk.update(dt);
    G.game.focus(this.camAt[0], this.camAt[1], 10);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < 1.5);
    for (const k in this.actors) { const a = this.actors[k]; G.Anim.idle(a.rig, dt, { x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.facing, pose: a.pose, poseW: a.poseW || undefined, expr: a.expr, down: a.down }, { clip: a.clip, t: this.t + a.x * .01 }); }
    if (this.C.tick) this.C.tick(this, dt);
    const I = G.game.input;
    if (G.talk && G.talk.open && I.down('cancel')) { this.ff = (this.ff || 0) + dt; if (this.ff > .12) { this.ff = 0; I.tap('confirm'); } }   // hold Back to fast-forward
    if ((I.pressed('pause') || I.pressed('start')) && !G.overlay.has('confirm')) { I.consumeAll(); G.confirm('Skip scene?', () => { if (this.job) this.job.cancel(); if (G.talk) G.talk.close(); this.C.done(this, true); }); }
    if (this.job && this.job.done && !this.finished) { this.finished = true; this.C.done(this, false); }
  },
  draw(r) {
    if (this.L.sky) G.drawSky(r, this.tod, r.w(this.camAt[0], 0, 0)[1]);
    this.map.drawFloor(r); this.map.queueWalls(r);
    if (this.loc === 'beach') { G.drawShore(r, G.now()); G.drawCourtProps(r, { tod: this.tod, final: this.C.final }); G.drawNet(r); }
    else G.scenes.location.drawDressing.call({ L: this.L, loc: this.loc, tod: this.tod }, r);
    if (this.loc === 'dock') G.drawShore(r, G.now(), 0, 400, 60);
    for (const k in this.actors) { const a = this.actors[k]; r.shadow(a.x, a.y, 6, .3); r.actor(a.x, a.y, a.z, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view)); }
    for (const f of this.fx) r.queue(f.a.x, f.a.y, 50, g => { const q = r.w(f.a.x, f.a.y, 50 + f.t * 8); G.ui.tag(g, { heart: '♥', '!': '!', '?': '?', note: '♪', dots: '...' }[f.kind] || '!', q[0], q[1], f.kind === 'heart' ? '#ff5f7a' : '#2a1a10', '#fff8e8'); }, { bias: 3 });
    if (this.C.draw) this.C.draw(this, r);
    r.overlay(g => { px.rect(g, 0, 0, r.W, 10, '#000'); px.rect(g, 0, r.H - 6, r.W, 6, '#000'); if (this.C.caption) E.font.text(g, this.C.caption, Math.round(r.W * .05), 1, '#ffd36a', { outline: false }); });
    if (G.talk) G.talk.draw(r);
  }
};
const FIVE_LINES = { rin: 'Hm. A tournament with umbrellas.', lola: '¡Hola! Who is ready to RUMBLE?', ingrid: 'It is very hot. Nobody said it would be hot.', amara: 'Okay, this island is GORGEOUS.', tess: "G'day! I can smell the surf from here.", mei: 'Hehe. I already found three secret passages.' };
G.CUTSCENES = {
  arrival: {
    loc: 'dock', cam: [192, 150], caption: 'DAY 1 · ISLA FORTUNA', tod: 'morning',
    setup(S) {
      const st = G.state, others = G.npcs(st), spots = [[140, 188], [168, 196], [216, 196], [244, 188], [192, 206]];
      others.forEach((id, i) => S.actor(id, spots[i][0], spots[i][1], -Math.PI / 2));
      S.actor(st.me, 300, 100, Math.PI); S.actor('sonny', 192, 120, Math.PI / 2); S.actor('pepper', 222, 122, Math.PI / 2);
    },
    *run(S) {
      const st = G.state, me = st.me;
      yield .6; yield S.walk(me, 192, 168, 55); S.actors[me].facing = -Math.PI / 2;
      for (const id of G.npcs(st)) { S.actors[id].facing = Math.atan2(168 - S.actors[id].y, 192 - S.actors[id].x); yield S.say(id, FIVE_LINES[id]); }
      S.actors.sonny.pose = 'cheer'; S.actors.sonny.expr = 'shout';
      yield S.say('sonny', G.LINES.sonny.welcome);
      S.actors.sonny.pose = null; for (const id of G.npcs(st)) S.emote(id, '?');
      yield S.say('pepper', G.LINES.pepper.arrival.concat(G.LINES.pepper.rules));
      if (st.flags.plus) { yield S.ask('pepper', 'You have done this before. Skip the Welcome Match?', ['Skip it', 'Play it']); if (S.choice === 0) { S.skipTutorial = true; return; } }
      S.actors.sonny.pose = 'cheer'; yield S.say('sonny', ['Allow me to demonstrate! Pepper and I versus a lucky new team! Five percent effort!']);
      S.actors.sonny.pose = null;
      const pick = G.bestFriend(); yield S.say('pepper', [G.CAST[pick].name + ', you are with ' + G.CAST[me].name + '. Try not to embarrass the resort.']);
    },
    done(S, skipped) {
      const st = G.state, pick = G.bestFriend(); if (!st.partner) G.setPartner(pick);
      if (S.skipTutorial || (skipped && st.flags.plus)) { G.earn(10000, 'tutorial'); st.flags.tutorialDone = true; G.endSlot(); G.game.go('map'); return; }
      G.startVacationMatch({ kind: 'tutorial', pair: ['sonny', 'pepper'] });
    }
  },
  tutorialDone: {
    loc: 'beach', cam: [352, 240], caption: 'THE WELCOME MATCH',
    setup(S) { const st = G.state; S.actor('sonny', 400, 230, Math.PI); S.actor('pepper', 430, 250, Math.PI); S.actor(st.me, 300, 240, 0); if (st.partner) S.actor(st.partner, 300, 260, 0); },
    *run(S) {
      const won = S.d.won;
      if (won) { S.actors.sonny.pose = 'cheer'; yield S.say('sonny', ['A DEMONSTRATION OF... GENEROSITY!']); S.actors.sonny.pose = null; S.actors.sonny.down = 1; G.sfx('dive'); yield .8; yield S.say('pepper', ['He fell on his face. It happens most days.']); }
      else yield S.say('sonny', ['FIVE PERCENT EFFORT, CHAMPS! Imagine TEN!']);
      S.actors.sonny.down = 0;
      yield S.say('pepper', [G.TUTORIAL_TIPS.chemistry(), 'Matches pay. Friends help. The Fortuna Cup final is on Day 5. Do not be late.']);
    },
    done(S) { const st = G.state; st.flags.tutorialDone = true; G.endSlot(); G.game.go('map'); }
  },
  party: {
    loc: 'beach', cam: [352, 220], caption: 'DAY 5 · THE FAREWELL PARTY', tod: 'night', music: 'farewell',
    setup(S) { const st = G.state, all = [st.me].concat(G.npcs(st)); all.forEach((id, i) => { const a = S.actor(id, 290 + (i % 3) * 60, 210 + Math.floor(i / 3) * 40, Math.PI / 2); a.clip = ['Dance_Loop', 'Dance Body Roll', 'Dance Reach Hip', 'Dance Charleston'][i % 4]; }); S.actor('sonny', 352, 150, Math.PI / 2).clip = 'Dance_Loop'; S.actor('pepper', 420, 170, Math.PI / 2); S.fwT = 0; },
    tick(S, dt) { S.fwT -= dt; if (S.fwT <= 0) { S.fwT = G.rand('cosmetic', .5, 1.2); G.fx.firework(G.rand('cosmetic', 220, 480), G.rand('cosmetic', 60, 110), G.rand('cosmetic', 70, 110)); } for (const [x, y] of [[200, 160], [500, 160], [220, 320], [480, 320]]) G.game.lights.add(x, y, 20, 110, 1, { color: '#ffb060' }); },
    draw(S, r) { for (const [x, y] of [[200, 160], [500, 160], [220, 320], [480, 320]]) r.prop('torch', x, y, 0, { size: 1.5, light: true }); },
    *run(S) {
      const st = G.state;
      yield S.say('sonny', G.LINES.sonny.party);
      for (const id of G.npcs(st)) { const a = S.actors[id], hi = G.aff(id) >= 60; a.clip = null; a.facing = Math.atan2(S.actors[st.me].y - a.y, S.actors[st.me].x - a.x); a.expr = 'smile'; yield S.say(id, G.LINES[id][hi ? 'farewellHigh' : 'farewellLow']); if (hi) S.emote(id, 'heart'); a.clip = 'Dance_Loop'; }
      yield S.say('pepper', ['Group photo. Everyone smile. That is not optional.']);
      for (const k in S.actors) { const a = S.actors[k]; a.clip = null; a.pose = 'cheer'; a.facing = Math.PI / 2; a.expr = 'smile'; }
      yield .5; G.sfx('shutter'); G.game.flash('#ffffff', .2); if (G.photo) G.photo.autoGroup(S); yield 1.2;
    },
    done(S) { const st = G.state; G.runCutscene(st.flags.finalWon ? 'endingA' : 'endingB'); }
  },
  endingA: {
    loc: 'beach', cam: [352, 200], caption: 'ENDING · THE HOUSE FOLDS', tod: 'night', music: 'farewell',
    setup(S) { const st = G.state; S.actor('sonny', 352, 180, Math.PI / 2); S.actor('pepper', 392, 190, Math.PI); S.actor(st.me, 330, 230, -Math.PI / 2); if (st.partner) S.actor(st.partner, 370, 236, -Math.PI / 2); S.flam = { x: 352, y: 90 }; },
    draw(S, r) { r.shape('flamingo', S.flam.x, S.flam.y, 1 + Math.sin(G.now() * 2)); },
    *run(S) {
      yield S.say('sonny', ['A DEAL IS A DEAL. The island is... yours. Somehow. Paperwork is HARD.']);
      S.actors.pepper.facing = Math.PI / 2;
      yield S.say('pepper', ['About that. Mr. Fortuna owes me eleven years of wages, four boats and a llama.', 'I own the island. I have owned it since Tuesday.']);
      S.emote('sonny', '!'); S.actors.sonny.expr = 'shout';
      yield S.say('sonny', G.LINES.sonny.endingA);
      yield S.walk('sonny', 352, 100, 70); S.actors.sonny.down = .3; yield G.game.tween(S.flam, { y: -40 }, 2.4); yield G.game.tween(S.actors.sonny, { y: -40 }, .01);
      yield S.say('pepper', G.LINES.pepper.endingA);
      yield S.say(G.state.me, [G.LINES[G.state.me].ending[0]]);
    },
    done() { G.game.go('credits'); }
  },
  endingB: {
    loc: 'beach', cam: [352, 200], caption: 'ENDING · THE HOUSE ALWAYS WINS', tod: 'night', music: 'farewell',
    setup(S) { const st = G.state; S.actor('sonny', 352, 180, Math.PI / 2); S.actor('pepper', 392, 190, Math.PI); S.actor(st.me, 330, 230, -Math.PI / 2); if (st.partner) S.actor(st.partner, 370, 236, -Math.PI / 2); S.wheel = { a: 0, spin: 0 }; S.flam = { x: 352, y: 90 }; },
    tick(S, dt) { S.wheel.a += S.wheel.spin * dt; S.wheel.spin *= Math.pow(.6, dt); },
    draw(S, r) {
      r.shape('flamingo', S.flam.x, S.flam.y, 1 + Math.sin(G.now() * 2));
      r.queue(300, 150, 40, g => { const q = r.w(300, 150, 46), R = 16; for (let i = 0; i < 18; i++) { const a0 = S.wheel.a + i / 18 * TAU, a1 = a0 + TAU / 18; px.poly(g, [[q[0], q[1]], [q[0] + Math.cos(a0) * R, q[1] + Math.sin(a0) * R], [q[0] + Math.cos(a1) * R, q[1] + Math.sin(a1) * R]], i % 2 ? '#e8283a' : '#141018'); } px.disc(g, q[0], q[1], 3, '#ffd36a'); px.poly(g, [[q[0] - 3, q[1] - R - 5], [q[0] + 3, q[1] - R - 5], [q[0], q[1] - R + 1]], '#ffffff'); });
    },
    *run(S) {
      S.actors.sonny.pose = 'cheer'; yield S.say('sonny', ['HA! The House wins! As ALWAYS!', ...G.LINES.sonny.endingB, 'Red or black, Pepper? For the ISLAND!']);
      S.actors.sonny.pose = null; yield S.say('pepper', ['Red.']);
      S.wheel.spin = 14; G.sfx('wheel_spin'); yield 2.4; S.wheel.spin = 0; G.sfx('ball_rattle'); yield .5;
      yield S.say('sonny', ['It is... RED. Of COURSE it is red.']);
      yield S.walk('sonny', 352, 100, 70); S.actors.sonny.down = .3; yield G.game.tween(S.flam, { y: -40 }, 2.4); yield G.game.tween(S.actors.sonny, { y: -40 }, .01);
      yield S.say('sonny', G.LINES.sonny.endingA);
      yield S.say('pepper', G.LINES.pepper.endingB);
      yield S.say(G.state.me, [G.LINES[G.state.me].ending[0]]);
    },
    done() { G.game.go('credits'); }
  }
};

/* ---- vacation matches: the Match Board's, the tutorial, the semifinal and the final ---- */
G.specialMatch = () => {
  const st = G.state; if (!st) return null;
  if (st.day === 4 && st.slot === 1 && !st.flags.semiDone && st.teams.length) {
    const best = st.teams.slice().sort((a, b) => { const ra = st.record[G.teamKey(...a)] || [0, 0], rb = st.record[G.teamKey(...b)] || [0, 0]; return (rb[0] - rb[1]) - (ra[0] - ra[1]); })[0];
    return { kind: 'semi', pair: best, rec: st.record[G.teamKey(...best)], label: 'SEMIFINAL: ' + best.map(G.castName).join(' & '), tag: 'SEMIFINAL', special: true };
  }
  if (st.day === 5 && st.slot === 1 && !st.flags.finalDone) return { kind: 'final', pair: ['sonny', 'pepper'], label: 'THE HOUSE: Sonny & Pepper', tag: 'FINAL', special: true, stars: 5 };
  return null;
};
G.matchSkill = e => { const st = G.state; return e.kind === 'semi' ? G.DAY_SKILL.semi : e.kind === 'final' ? G.DAY_SKILL.final : G.DAY_SKILL[st ? st.day : 1] || .5; };
G.startVacationMatch = (e) => {
  const st = G.state, kind = e.kind || 'normal', partner = st.partner;
  if (!partner) return;
  const base = kind === 'tutorial' ? null : G.matchSkill(e), w = G.weatherNow(), tod = kind === 'final' ? 'sunset' : G.todFor(st.slot, w, st.day);
  const opp = e.pair.map((id, i) => {
    if (kind === 'tutorial') return { cast: id, skill: id === 'sonny' ? .08 : .18 };   // five percent effort
    if (kind === 'final') return { cast: id, kit: 'final', skill: id === 'sonny' ? .7 : .85 };
    const wr = G.wearOf(id) || {}; return { cast: id, suit: wr.suit, acc: wr.acc, skill: base + (i ? .02 : 0) };
  });
  const me = G.wearOf(st.me), pw = G.wearOf(partner);
  const cfg = {
    mode: kind === 'tutorial' ? 'tutorial' : 'vacation', kind, final: kind === 'final', tutorial: kind === 'tutorial',
    pointsToWin: kind === 'tutorial' ? 5 : kind === 'final' ? 11 : G.T.pointsToWin, tod, weather: w === 'rain' ? 'rain' : 'sunny', seed: G.hashStr(st.seed + ':' + st.day + ':' + st.slot + ':' + st.stats.matches),
    firstServe: kind === 'final' ? (st.flags.seeded ? 0 : 1) : 0, music: kind === 'final' ? 'house' : 'spike',
    title: kind === 'tutorial' ? 'WELCOME MATCH' : kind === 'semi' ? 'SEMIFINAL' : kind === 'final' ? 'THE FORTUNA CUP' : 'BEACH MATCH',
    specials: kind === 'final' ? { glare: true, houseEdge: true, luckySeven: true } : {},
    teams: [[{ cast: st.me, suit: me.suit, acc: me.acc, ctl: { kind: 'human', input: G.game.input } }, { cast: partner, suit: pw.suit, acc: pw.acc, skill: (base || .45) + .05, affinity: G.aff(partner), partnerOfHuman: true }], opp],
    teamNames: ['You & ' + G.CAST[partner].name, kind === 'final' ? 'The House' : e.pair.map(G.castName).join(' & ')],
    introLine: kind === 'final' ? G.pickLine('sonny', 'finalIntro') : kind === 'tutorial' ? 'Five percent effort, SUNSHINE! Watch and LEARN!' : null,
    clock: (g, r) => { const sf = G.safe(r); G.clockBadge(g, r.W - sf.x, sf.y, st.day, st.slot, w, { right: true }); },
    onResults: (M, res) => {
      const pay = G.matchPayout(res, { kind, opponents: e.pair.filter(id => G.FIGHTERS.includes(id)), pair: kind === 'normal' ? e.pair : null });
      const rows = [['Continue', () => G.afterVacationMatch(kind, res)]];
      if (!G.hub) rows.push(['Take a Postcard', () => G.photo && G.photo.open('match')]);
      return G.resultsUI(M, res, { prize: pay.prize, partner: pay.partner, affBefore: pay.before, affAfter: pay.after, buttons: rows });
    }
  };
  if (kind === 'semi') st.flags.semiDone = true;
  if (kind === 'final') st.flags.finalDone = true;
  G.startMatch(cfg);
};
G.afterVacationMatch = (kind, res) => {
  const st = G.state, won = !!res.humanWon;
  if (kind === 'tutorial') { G.runCutscene('tutorialDone', { won }); return; }
  if (kind === 'semi') { st.flags.seeded = won; if (won) G.toast('Seeded for the Final', 'You serve first on Day 5', 'star'); }
  if (kind === 'final') { st.flags.finalWon = won; if (won && !st.wardrobe.suits.includes('fortunagold')) { st.wardrobe.suits.push('fortunagold'); G.toast('Fortuna Gold', 'A swimsuit fit for a champion', 'star'); } G.endSlot(); G.runCutscene('party'); return; }
  const r = G.endSlot(); G.game.go(r === 'dayEnd' ? 'dayend' : 'map');
};

/* ---- the daily events ---- */
G.storyOverrides = () => {
  const st = G.state;
  if (st.day === 5 && st.slot === 1) for (const id of G.npcs(st)) if (st.where[id] !== 'withyou') st.where[id] = 'beach';
  if (st.day === 1 && st.slot === 2) { /* the casino opens tonight: the schedule already sends some there */ }
};
G.storyOnMap = (S) => {
  const st = G.state; if (!st) return;
  const key = 'pa' + st.day + st.slot;
  if (!st.flags[key]) {
    st.flags[key] = true;
    if (st.slot === 0) { G.sting('daystart'); G.toast('Day ' + st.day + ' · ' + (st.weather[st.day - 1] === 'golden' ? 'Golden skies' : G.upper(G.weatherNow()).slice(0, 1) + G.weatherNow().slice(1)), G.pickLine('sonny', 'dayStart'), 'sunny'); if (st.mail.length) G.toast('You have mail', 'Check the mailbox at your villa', 'letter'); }
    if (st.day === 3 && st.slot === 1) G.say('sonny', G.LINES.sonny.rainPA, { modal: false, auto: 3 });
    else if (st.slot === 1 && st.day === 4) G.say('pepper', ['The Semifinal is on the Match Board this afternoon. Win it and you serve first in the Final.'], { modal: false, auto: 3.5 });
    else if (st.slot < 2 && G.chance('cosmetic', .4)) G.say('sonny', G.pickLine('sonny', 'pa'), { modal: false, auto: 3 });
  }
  if (st.day === 5 && st.slot === 1 && !st.flags.finalDone && !S.finalAsked) {
    S.finalAsked = true;
    G.say('pepper', ['The Fortuna Cup Final. Sunset Courts. Now.', 'Mr. Fortuna has bet the island on it. No pressure.'], { onDone: () => { if (!st.partner) G.setPartner(G.bestFriend()); G.startVacationMatch(G.specialMatch()); } });
  }
  if (st.day === 5 && st.slot === 2 && !st.flags.partyDone) { st.flags.partyDone = true; G.runCutscene('party'); }
};
G.storyBeforeTravel = id => false;
G.storyOnEnter = (loc, S) => {
  const st = G.state;
  if (loc === 'casino') {
    st.flags.visitedCasino = true;
    if (!st.flags.casinoOpened) { st.flags.casinoOpened = true; st.chips += 20; G.say('sonny', G.LINES.sonny.casinoHello.concat(['Here are twenty FREE chips! Lose them wisely!']), { onDone: () => G.toast('+20 chips', 'A welcome gift from Sonny', 'chip') }); }
    if (st.day === 3 && !st.flags.overheard) {
      st.flags.overheard = true;
      G.say('sonny', G.LINES.sonny.phone, { onDone: () => G.say('pepper', G.LINES.pepper.seen, { onDone: () => G.say('pepper', 'Well? What will you do with that?', { choices: ['"Your secret\'s safe."', '"Everyone\'s going to hear about this."'], onChoice: i => { st.flags.kind = i === 0; G.say('pepper', i === 0 ? G.LINES.pepper.kind : G.LINES.pepper.cheeky); } }) }) });
    }
  }
  if (loc === 'villa' && st.mail.length) G.toast('You have mail', 'The mailbox is by the balcony', 'letter');
};
G.storyNPCs = S => {
  const st = G.state;
  if (S.loc === 'casino' && st.day === 3 && !st.flags.overheardSeen) { st.flags.overheardSeen = true; }
  if (S.loc === 'casino') { S.npcs.push(Object.assign(S.mkNpc('sonny', { x: 420, y: 64, kind: 'stand' }), { staff: true, facing: Math.PI / 2 })); }
};
G.storyOnRest = () => false;
G.storyOnSleep = () => {
  const st = G.state, sc = G.game.scene;
  // Day 2 night: a friend knocks with a snack
  if (st.day === 2 && st.slot === 2 && !st.flags.visit) {
    const who = G.npcs(st).filter(id => st.affinity[id] >= 50).sort((a, b) => st.affinity[b] - st.affinity[a])[0];
    if (who) {
      st.flags.visit = who; const L = G.LINES[who].visit;
      if (sc && sc.npcs) sc.npcs.push(sc.mkNpc(who, { x: 160, y: 130, kind: 'stand' }));
      G.sfx('door');
      G.say(who, [L[0]], { onDone: () => G.say(who, L[1], { choices: [L[2], L[3]], onChoice: i => { const good = who === 'ingrid' ? 1 : 0; G.addAff(who, i === good ? 4 : -4, 'visit'); G.say(who, i === good ? G.pickLine(who, 'chatHigh') : G.pickLine(who, 'chatMid'), { onDone: () => G.game.go('dayend', null, { fade: 'dissolve', seconds: .6 }) }); } }) });
      return true;
    }
  }
  return false;
};
G.onLetter = k => {
  const st = G.state;
  if (k === 'warning' && st.flags.kind && st.flags.visitedCasino && !st.wardrobe.suits.includes('pinstripe')) { st.wardrobe.suits.push('pinstripe'); G.toast("Pepper's Pinstripe", 'Enclosed with the letter: a swimsuit', 'hanger'); }
};
/* the Day 3 night: if you skipped the casino, a rumor arrives on Day 4 */
G.bus.on('dayEnd', s => { const st = G.state; if (st && s.day === 3 && !st.flags.overheard) { st.flags.missedD3Casino = true; } });
