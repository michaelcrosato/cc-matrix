// MASH TV: scripted scenes: cold open, prize recap, game over, initials, endings, credits.
// speaker portrait
MT.drawSpeaker = function (g, spk, x, y, s, t) {
  const rigOf = { LANCE: 'lance', PENNY: 'penny', ANNC: null };
  E.ui.box(g, x, y, s, s, { bg: ['#3a1a5a', '#14081c'], border: '#ffcc33', alpha: 1 });
  if (spk === 'LANCE' || spk === 'PENNY') { const rig = MT.hostRig(rigOf[spk]); if (rig && !MT.cfg.skipRigs) { rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: MT.lines.cur && Math.floor(t * 8) % 2 ? 'shout' : 'smile', pose: Math.floor(t * .7) % 2 ? 'wave' : 'hips' }); try { rig.drawPortrait(g, x + 2, y + 2, s - 4, { zoom: 3 }); } catch (e) { /* */ } } }
  else if (spk === 'ANNC') { px.disc(g, x + s / 2, y + s / 2, s / 3, '#222'); px.rect(g, x + s / 2 - 3, y + s / 2 - 12, 6, 16, '#aaa'); for (let i = 0; i < 3; i++) px.blend(g, .5, 'add', () => px.disc(g, x + s / 2, y + s / 2, s / 3 + 4 + i * 5 + Math.sin(t * 6) * 2, '#ffcc33')); UI.text(g, 'ON AIR', x + s / 2, y + s - 10, '#ff3344', { align: 'center' }); }
  else if (spk === 'NETWORK') { for (let i = 0; i < 40; i++) px.rect(g, x + 2 + Math.floor(MT.fxr() * (s - 6)), y + 2 + Math.floor(MT.fxr() * (s - 6)), 3, 2, MT.fxr() < .5 ? '#7affb0' : '#0c3a28'); UI.text(g, 'SIGNAL', x + s / 2, y + s / 2 - 3, '#7affb0', { align: 'center' }); }
  else if (spk === 'MASHY') { px.ell(g, x + s / 2, y + s / 2, s * .4, s * .38, '#d8b878'); for (const sd of [-1, 1]) { px.disc(g, x + s / 2 + sd * s * .14, y + s * .4, s * .09, '#fff'); px.disc(g, x + s / 2 + sd * s * .14 + Math.sin(t * 9), y + s * .42, s * .04, '#14081c'); } px.ell(g, x + s / 2, y + s * .62, s * .14, s * .05, '#14081c'); }
  else if (spk === 'SPONSOR') { UI.text(g, 'KRUNCH-O', x + s / 2, y + s / 2 - 4, '#ffcc33', { align: 'center' }); }
};
// a generic cutscene: list of [speaker, text, opts]; done() when finished (skippable: confirm skips the line; hold start skips all)
function Cut(list, done) { this.list = list; this.done = done; this.i = -1; this.t = 0; this.cur = null; this.end = false; this.hold = 0; }
Cut.prototype.update = function (dt) {
  this.t += dt; MT.lines.update(dt); const P = MT.game.players;
  if (P.some(p => p.down('start') || p.down('confirm'))) this.hold += dt; else this.hold = 0;
  if (this.hold > 1.2 && !this.end) { this.end = true; MT.lines.clear(); this.done(); return; }
  if (this.end) return;
  if (P.some(p => p.pressed('confirm') || p.pressed('start'))) MT.lines.skip();
  if (!this.cur || this.cur.done) { this.i++; if (this.i >= this.list.length) { this.end = true; this.done(); return; } const [s, t, o] = this.list[this.i]; this.spk = s; this.opts = o || {}; if (this.opts.onStart) this.opts.onStart(); this.cur = MT.lines.cut(s, t, {}); }
};
MT.Cut = Cut;
const SC2 = MT.scenes;
SC2.coldOpen = {
  input: MT.MENU, camera: { zoom: false },
  enter() {
    const run = MT.run, T = MT.TEXT; this.t = 0; MT.music.play('theme'); MT.lines.clear(); MT.ui.banners.length = 0;
    const list = []; for (const [s, t] of T.coldOpen) { list.push([s, MT.sub(t, { N: run.cs.length }), s === 'ANNC' ? { flash: true } : null]); if (t.startsWith('TONIGHT')) for (const c of run.cs) list.push(['LANCE', MT.PNAMES[c.look] + ': ' + T.looks[MT.PNAMES[c.look]], { who: c }]); }
    this.cut = new Cut(list, () => { MT.flow.startEpisode(1); }); this.who = null;
  },
  update(dt) { this.t += dt; UI.t += dt; this.cut.update(dt); if (this.cut.opts && this.cut.opts.who) this.who = this.cut.opts.who; else if (this.cut.cur && !(this.cut.opts && this.cut.opts.who)) this.who = null; },
  draw(r) {
    MT.backdrop(r, this.t);
    r.overlay(g => {
      const t = this.t; UI.title(g, 'MASH TV', r.W / 2, 14, 4); UI.text(g, MT.TEXT.sub, r.W / 2, 44, '#2ee6ff', { align: 'center' });
      const spk = this.cut.spk || 'ANNC'; MT.drawSpeaker(g, this.who ? 'LANCE' : spk, r.W / 2 - 40, 62, 80, t);
      if (this.who && this.who.rig === undefined) this.who.rig = null; // contestant card
      if (this.who) { const c = this.who; if (!c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); if (c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'smile' }); try { c.rig.drawPortrait(g, r.W / 2 + 50, 70, 56, {}); } catch (e) { /* */ } } UI.text(g, MT.PNAMES[c.look], r.W / 2 + 78, 130, c.color, { align: 'center' }); }
      const run = MT.run; run.cs.forEach((c, i) => { if (!c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); if (c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'hips' }); try { c.rig.drawPortrait(g, 14 + i * 34, r.H - 82, 30, {}); } catch (e) { /* */ } } });
    });
    UI.drawLowerThird(r); MT.glyphHold(r, 'HOLD TO SKIP');
  }
};
MT.glyphHold = (r, text) => r.overlay(g => { MT.glyph.prompt(g, r.W - 6, 6, [['confirm', text]], MT.lastInput(), { align: 'right' }); });
// ---- PRIZE RECAP ----
SC2.recap = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) {
    const run = MT.run, ep = d.ep; this.ep = ep; this.t = 0; this.left = false; MT.music.play('commercial'); MT.lines.clear(); const T = MT.TEXT.recapIntro[ep];
    this.cols = run.cs.map(c => ({ c, prizes: c.prizes.filter(p => p.ep === ep), shown: 0, total: 0, earn: c.cash - (run.epStart[c.slot] || 0), shownEarn: 0 }));
    this.order = []; const mx = Math.max(0, ...this.cols.map(q => q.prizes.length)); for (let i = 0; i < mx; i++) this.cols.forEach((q, k) => { if (q.prizes[i]) this.order.push([k, i]); });
    this.ri = 0; this.nt = 1.4; this.phase = 'prizes'; this.speed = 1; this.mvp = this.cols.reduce((a, b) => (b.earn > (a ? a.earn : -1) ? b : a), null);
    MT.lines.say('PENNY', T[0], { prio: 3, force: true });
  },
  update(dt) {
    this.t += dt; UI.t += dt; MT.lines.update(dt); const P = MT.game.players, fast = P.some(p => p.down('confirm')) ? 3 : 1;
    if (this.phase === 'prizes') { this.nt -= dt * fast; if (this.nt <= 0) { if (this.ri < this.order.length) { const [k, i] = this.order[this.ri++], q = this.cols[k], pz = q.prizes[i]; q.shown = i + 1; q.total += pz.value; MT.sfx('prizeFanfare'); MT.sfx('coin'); MT.lines.say('PENNY', pz.joke, { prio: 3, force: true }); this.nt = 1.5; } else { this.phase = 'count'; this.nt = 0; this.ct = 0; } } }
    else if (this.phase === 'count') { this.ct += dt * fast; for (const q of this.cols) q.shownEarn = Math.min(q.earn, q.earn * Math.min(1, this.ct / 1.2)); if (this.ct > 1.6) { this.phase = 'mvp'; this.nt = 2.5; MT.sfx('tada'); MT.lines.say('LANCE', MT.TEXT.recapIntro[this.ep][1], { prio: 3, force: true }); } }
    else if (this.phase === 'mvp') { this.nt -= dt; if (this.nt <= 0 || (P.some(p => p.pressed('confirm')) && this.nt < 1.9)) { this.phase = 'wait'; } }
    else if (this.phase === 'wait') { if (P.some(p => p.pressed('confirm') || p.pressed('start')) && !this.left) { this.left = true; MT.flow.afterRecap(this.ep); } }
  },
  draw(r) {
    MT.backdrop(r, this.t, { sky: ['#0a1428', '#1a2a50', '#0a1428'] });
    r.overlay(g => {
      UI.title(g, 'PRIZE RECAP', r.W / 2, 8, 3); const pen = MT.hostRig('penny'); UI.text(g, 'EPISODE ' + this.ep + ': ' + MT.EPISODES[this.ep].name, r.W / 2, 32, '#2ee6ff', { align: 'center' });
      const n = this.cols.length, cw = Math.min(100, (r.W - 20) / n - 4);
      this.cols.forEach((q, k) => {
        const x = r.W / 2 - (n * (cw + 4)) / 2 + k * (cw + 4), y = 46, c = q.c; E.ui.box(g, x, y, cw, 150, { bg: ['#2a1446', '#140a24'], border: c.color, alpha: .92 });
        if (!c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); if (c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'smile' }); try { c.rig.drawPortrait(g, x + 3, y + 3, 24, {}); } catch (e) { /* */ } }
        UI.text(g, c.name, x + 30, y + 4, c.color, { scale: 1 }); UI.text(g, MT.fmt$(c.cash - q.earn + q.shownEarn), x + 30, y + 14, '#fff7e8', { font: 'tiny' });
        if (!q.prizes.length) UI.text(g, 'NOTHING BUT FEAR', x + cw / 2, y + 60, '#6a5a80', { align: 'center', font: 'tiny' });
        for (let i = 0; i < Math.min(5, q.shown); i++) { const pz = q.prizes[i], yy = y + 34 + i * 22; px.sprite(g, MT.prizeIcon((pz.name.length + i * 3) % 9), x + 4, yy); const nm = F.wrap(pz.name, cw - 24, { font: 'tiny' }); nm.slice(0, 2).forEach((l, kk) => UI.text(g, l, x + 20, yy + kk * 6, '#fff7e8', { font: 'tiny' })); UI.text(g, MT.fmt$(pz.value), x + cw - 3, yy + 12, '#7affb0', { align: 'right', font: 'tiny' }); }
        if (q.shown > 5) UI.text(g, '+' + (q.shown - 5) + ' MORE', x + cw / 2, y + 144, '#c8c0e0', { align: 'center', font: 'tiny' });
        if (this.phase === 'mvp' || this.phase === 'wait') { if (this.mvp === q) { UI.text(g, 'MVP!', x + cw / 2, y + 126, Math.floor(UI.t * 6) % 2 ? '#ffe068' : '#ff2e88', { align: 'center', scale: 2 }); } }
        UI.text(g, 'WON ' + MT.fmt$(q.total), x + cw / 2, y + 138, '#ffe068', { align: 'center', font: 'tiny' });
      });
      if (this.phase === 'mvp' || this.phase === 'wait') UI.text(g, 'EPISODE MVP: ' + (this.mvp ? this.mvp.c.name : '-'), r.W / 2, r.H - 54, '#ffe068', { align: 'center', scale: 1 });
    });
    UI.drawLowerThird(r); if (this.phase === 'wait') UI.promptBar(r, [['confirm', 'CONTINUE']]); else UI.promptBar(r, [['confirm', 'SPEED UP']]);
  }
};
// ---- GAME OVER ----
SC2.gameover = {
  input: MT.MENU, camera: { zoom: false },
  enter() { this.t = 0; this.step = 0; this.left = false; this.fin = false; MT.music.stop(.3); MT.sfx('bankrupt'); MT.lines.clear(); const T = MT.TEXT.gameOver; const self = this; MT.game.script(function* () { yield .6; for (const s of T) { const h = MT.lines.cut('LANCE', s); yield E.until(() => h.done); } self.fin = true; }); MT.crowd('boo', 1); },
  update(dt) { this.t += dt; UI.t += dt; MT.lines.update(dt); if ((MT.game.players.some(p => p.pressed('confirm') || p.pressed('start')) && this.t > 1) || this.fin) { if (MT.lines.cur) MT.lines.skip(); else if (!this.left && (this.fin || this.t > 1)) { this.left = true; MT.flow.finishRun('over'); } } },
  draw(r) {
    r.sky(['#05020a', '#14081c', '#05020a']);
    r.overlay(g => {
      px.blend(g, .3, 'add', () => px.poly(g, [[r.W / 2 - 14, 0], [r.W / 2 + 14, 0], [r.W / 2 + 90, r.H], [r.W / 2 - 90, r.H]], '#fff7a0'));
      UI.title(g, 'AND THAT\'S A WRAP!', r.W / 2, 18, 3, { colors: ['#ff5a5a', '#8a1020'] });
      const run = MT.run; run.cs.forEach((c, i) => { if (!c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); const x = r.W / 2 - run.cs.length * 22 + i * 44; if (c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'down', down: 1 }); try { c.rig.drawPortrait(g, x, 80, 40, { tint: '#808080' }); } catch (e) { /* */ } } UI.text(g, MT.fmt$(c.cash), x + 20, 124, '#ffe068', { align: 'center' }); });
    });
    UI.drawLowerThird(r); UI.promptBar(r, [['confirm', 'CONTINUE']]);
  }
};
// ---- INITIALS ----
SC2.initials = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.t = 0; this.list = d.list.slice(); this.run = MT.run; this.cur = null; MT.music.play('recap'); this.next(); },
  next() {
    const run = this.run; if (!this.list.length) { MT.game.go('scores', { fresh: true }); return; }
    const slot = this.list.shift(), c = run.cs.find(q => q.slot === slot); this.cur = c; MT.cab.enter(c.cash, 'show', () => { this.cur = null; this.next(); }, c.input || MT.game.input);
  },
  update(dt) { this.t += dt; UI.t += dt; MT.cab.update(dt); },
  draw(r) { MT.backdrop(r, this.t, { sky: ['#2a1a05', '#5a3a0a', '#2a1a05'] }); r.overlay(g => { UI.title(g, 'NEW TOP EARNER!', r.W / 2, 8, 3, { colors: ['#fff7a0', '#e8a818'] }); if (this.cur) UI.text(g, this.cur.name, r.W / 2, 34, this.cur.color, { align: 'center', scale: 2 }); }); MT.cab.draw(r); }
};
// ---- ENDINGS ----
SC2.ending = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) {
    this.which = d.which; this.t = 0; this.left = false; this.fin = false; this.hint = null; this.stinger = false; const T = MT.TEXT; this.card = null; this.lights = 1; this.sw = 0; this.stage = 0; MT.lines.clear(); MT.music.play('ending');
    const self = this, list = d.which === 'A' ? T.endA.map(a => a.slice()) : T.endB.map(a => a.slice());
    this.cut = new Cut(list, () => { self.afterCut(); });
  },
  afterCut() {
    const self = this, T = MT.TEXT; this.stage = 1; this.t2 = 0; MT.game.script(function* () {
      if (self.which === 'A') { self.card = T.endAcard; MT.sfx('tada'); yield 3.5; self.hint = T.endAhint; yield 3; }
      else { for (let i = 1; i <= 8; i++) { self.lights = 1 - i / 8; MT.sfx('beacon'); MT.crowd('cheer', i / 8); yield .5; } self.card = T.endBcard; MT.sfx('tada'); yield 3.5; self.stinger = true; MT.lines.cut('LANCE', T.endBstinger); yield 4; }
      self.fin = true;
    });
  },
  update(dt) { this.t += dt; UI.t += dt; if (this.stage === 0) { if (this.which === 'B' && this.cut.i >= 1) this.sw = Math.min(1, this.sw + dt); this.cut.update(dt); } else { MT.lines.update(dt); if (MT.game.players.some(p => p.pressed('confirm') || p.pressed('start'))) { if (MT.lines.cur) MT.lines.skip(); } if (this.fin && !this.left) { this.left = true; MT.game.go('credits', { which: this.which }); } } },
  draw(r) {
    MT.backdrop(r, this.t, this.which === 'B' ? { sky: ['#06140c', '#0c3a28', '#06140c'] } : {});
    r.overlay(g => {
      const run = MT.run; run.cs.forEach((c, i) => { if (!c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); const x = r.W / 2 - run.cs.length * 25 + i * 50; if (c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'smile' }); try { c.rig.drawPortrait(g, x, 120, 44, {}); } catch (e) { /* */ } } });
      if (this.stage === 0) MT.drawSpeaker(g, this.cut.spk || 'PENNY', r.W / 2 - 34, 24, 68, this.t);
      if (this.which === 'B' && this.stage === 0 && this.cut.i >= 1) { const bx = r.W / 2 - 14, by = 100; px.rect(g, bx - 6, by + 10, 40, 10, '#3a3a50'); px.disc(g, bx + 14, by + 6, 12, '#14081c'); px.disc(g, bx + 14, by + 6 + this.sw * 2, 10, this.sw > .5 ? '#a01020' : '#ff3344'); UI.text(g, 'OFF', bx + 14, by + 3, '#fff', { align: 'center', font: 'tiny' }); }
      if (this.card) { px.rect(g, 0, r.H / 2 - 26, r.W, 52, 'rgba(0,0,0,.7)'); UI.title(g, this.card, r.W / 2, r.H / 2 - 14, this.card.length > 22 ? 2 : 3); }
      if (this.hint) UI.text(g, this.hint, r.W / 2, r.H / 2 + 36, '#7affb0', { align: 'center' });
      if (this.which === 'B' && this.stinger) { E.ui.box(g, r.W / 2 - 80, r.H - 80, 160, 40, { bg: ['#3a2a14', '#1c1408'], border: '#c8a050', alpha: 1 }); UI.text(g, MT.TEXT.endBchan, r.W / 2, r.H - 76, '#ffcc33', { align: 'center', font: 'tiny' }); }
      if (this.lights < 1) px.rect(g, 0, 0, r.W, r.H, 'rgba(0,0,0,' + (1 - this.lights) * .8 + ')');
    });
    UI.drawLowerThird(r);
  }
};
SC2.credits = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.t = 0; this.d = d; this.left = false; MT.music.play('ending'); this.y0 = 0; },
  update(dt) { this.t += dt; UI.t += dt; if ((MT.game.players.some(p => p.pressed('confirm') || p.pressed('cancel')) && this.t > 2) || this.t > 34) { if (!this.left) { this.left = true; MT.flow.afterEnding(); } } },
  draw(r) {
    MT.backdrop(r, this.t, { sky: ['#05020a', '#14081c', '#05020a'] });
    const L = ['MASH TV', 'LIVE FROM STUDIO 9', '', 'STARRING', 'ROCKET · VOLT · MOXIE · GOLDIE', '', 'WITH', 'LANCE LUSTRE AS HIMSELF (A ROBOT)', 'PENNY PRIZE', 'THE ANNOUNCER', 'MASHY, THE NETWORK\'S BELOVED MASCOT', '', 'MADE WITH THE MY-3D2DGE ENGINE', 'ORIGINAL MUSIC, SOUND AND VOICES SYNTHESIZED IN CODE', 'ANTHROPIC CLAUDE-SONNET-5-5', 'PLANNED BY CLAUDE-OPUS-5-5', 'AI HUB SESSION PROTOCOL V1', '', 'INSPIRED BY SMASH TV (1990)', '', this.d.which === 'B' ? 'MASH TV - CANCELLED.' : 'MASH TV WILL RETURN.', 'THANKS FOR WATCHING'];
    r.overlay(g => { L.forEach((l, i) => { const y = r.H - this.t * 14 + i * 14; if (y > -10 && y < r.H) UI.text(g, l, r.W / 2, y, i === 0 ? '#ff2e88' : '#fff7e8', { align: 'center', scale: i === 0 ? 2 : 1 }); }); });
    UI.promptBar(r, [['confirm', 'SKIP']]);
  }
};
