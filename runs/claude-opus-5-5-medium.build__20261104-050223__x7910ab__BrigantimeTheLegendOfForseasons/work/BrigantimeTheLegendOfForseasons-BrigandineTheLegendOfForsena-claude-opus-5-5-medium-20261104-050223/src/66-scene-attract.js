/* ---- ATTRACT MODE: a ~90 s reel that loops and cheats freely: the Wheel turning on the world map (an AI-only
 * campaign), a summoning, a showcase battle at 2× (three canned battles in rotation), the Gray Knight, the logo.
 * Any input returns to the title ---- */
const REEL = [['wheel', 12], ['summon', 8], ['battle', 45], ['graynight', 15], ['logo', 10]];
const CANNED = [
  { map: 'lakeside', season: 'winter', a: 'solmark', b: 'hoarfast', caption: 'WINTER FREEZES THE LAKE' },
  { map: 'river_ford', season: 'spring', a: 'verdance', b: 'amberlyn', caption: 'SPRING FLOODS THE FORDS' },
  { map: 'clockwork_sanctum', season: 'autumn', a: 'hoarfast', b: 'dominion', caption: 'LIGHT THE SEASON DIALS' }];
G.attractLoop = 0;
G.scenes.attract = {
  view: 'threequarter', views: ['threequarter', 'board', 'side'], res: 'ps1', input: G.INPUT, touch: [],
  enter() { this.t = 0; this.bt = 0; this.beatI = -1; this.loop = G.attractLoop++; G.attract = { beat: null }; G.idle = 0; this.grace = .4; this.startBeat(0); },
  exit() { G.attract = null; G.game.weather = null; G.game.cam.free = null; },
  startBeat(i) {
    this.beatI = i; this.bt = 0; const [beat] = REEL[i]; G.attract.beat = beat;
    if (beat === 'wheel' || beat === 'summon') {
      if (!this.camp) { this.camp = G.CampaignSim.create({ humans: [], seed: 31 + this.loop }); this.wm = new G.WorldMap(this.camp); }
      G.game.setView('threequarter'); G.music('title'); this.look = beat === 'summon' ? G.get('castle', 'rimeholt').pos.slice() : [512, 512]; this.cardT = 0;
      if (beat === 'summon') { this.wyrm = G.art.visual({ kind: 'monster', sp: 'frostwyrm', tier: 1 }); G.sting('summon'); }
    }
    if (beat === 'battle') {
      const c = CANNED[this.loop % CANNED.length], army = (realm, side) => G.armyFor(realm, realm === 'dominion' ? 14 : 12, 3);
      let spec;
      if (c.map === 'clockwork_sanctum') { const s = G.CampaignSim.create({ humans: ['hoarfast'], seed: 9 }); spec = s.battleSpec({ march: { realm: 'hoarfast', target: 'sanctum', knights: ['mordrain', 'ragnell', 'nimue'], from: {} }, kind: 'sanctum' }, 77 + this.loop); spec.sides[0].human = false; spec.sides[0].boost = .8; }
      else spec = { map: c.map, season: c.season, seed: 900 + this.loop, mode: 'siege', region: c.season, sides: [{ realm: c.a, ai: 'normal', boost: .3, troops: army(c.a) }, { realm: c.b, ai: 'normal', troops: army(c.b) }] };
      for (const s of spec.sides) s.ai = 'showcase';
      this.bsim = G.BattleSim.create(spec); if (c.map === 'clockwork_sanctum') { const S = this.bsim.state; S.base.forEach((code, i) => { if (code === 'D') S.dials[i] = i % 3 !== 0; }); }
      this.bview = new G.BattleView(this.bsim); this.bview.play([{ type: 'season', season: spec.season }]); this.caption = c.caption; this.inserts = { level: false, promo: false };
      G.game.setView('board'); G.game.weather = { winter: { kind: 'snow', amount: .5 }, spring: { kind: 'rain', amount: .3 }, autumn: { kind: 'leaves', amount: .4 } }[spec.season] || null;
      G.music(spec.mode === 'sanctum' ? 'boss' : 'battle_attack');
    }
    if (beat === 'graynight') {
      G.game.setView('side'); G.game.weather = null; G.music('hourless');
      this.bg = new E.Backdrop({ sky: ['#0a0812', '#1a1828', '#2a2838'], stars: 10, layers: [{ kind: 'castle', color: '#2a2838', y: .55, height: .45, parallax: .1 }] });
      this.stage = new E.PlatformMap({ rows: ['S'.repeat(50), 'S'.repeat(50)], legend: { S: 1 }, types: { 1: { style: 'stone', side: '#2a2838', top: '#3a3846' } }, edges: 'open' });
      this.gk = new E.Humanoid(Object.assign({}, G.get('knight', 'graynight').look)); this.me = new E.Humanoid(Object.assign({}, G.get('knight', 'meliant').look));
      this.lines = [['graynight', 'Twelve bells, little crown. Then nothing, ever again.'], ['meliant', 'Every tick is a funeral bell.'], ['graynight', 'Time is the only army I need.']];
      this.talk = new E.Dialog(G.game, { voice: ch => G.voice.letter(G.voice.profile(this.cur), ch) }); this.li = 0; this.say();
    }
    if (beat === 'logo') { G.game.setView('side'); G.game.weather = { kind: 'snow', amount: .2 }; this.bg = new E.Backdrop('castle-night'); }
  },
  say() { const [who, l] = this.lines[this.li]; this.cur = who; this.talk.say([l], { name: G.get('knight', who).short.toUpperCase(), portrait: who === 'graynight' ? this.gk : this.me, auto: 3.2, modal: false, onDone: () => { this.li++; if (this.li < this.lines.length) this.say(); } }); },
  update(dt) {
    this.grace -= dt;
    if (this.grace <= 0 && G.trackIdle(dt)) { G.game.input.consumeAll(); G.game.go('title', {}, { fade: 0 }); return; }
    if (this.grace > 0) G.trackIdle(dt);
    this.t += dt; this.bt += dt; const [beat, len] = REEL[this.beatI];
    if (this.bt >= len) { if (this.beatI + 1 >= REEL.length) { this.camp = null; this.loop = G.attractLoop++; this.startBeat(0); } else this.startBeat(this.beatI + 1); return; }
    if (beat === 'wheel') { this.cardT += dt; if (this.cardT > 3) { this.cardT = 0; this.camp.autoSeason(); if (this.camp.state.over) { this.camp = G.CampaignSim.create({ humans: [], seed: 31 + this.t | 0 }); this.wm = new G.WorldMap(this.camp); } } this.wm.refresh(); const a = this.bt * .5; this.look = [512 + Math.cos(a) * 260, 512 + Math.sin(a) * 260]; G.game.focus(this.look[0], this.look[1], 0); }
    if (beat === 'summon') { this.wyrm.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI * .6 }); G.game.focus(this.look[0], this.look[1] + 30, 0); }
    if (beat === 'battle') {
      const V = this.bview, S = this.bsim.state; V.speed = 2; V.update(dt);
      if (!V.busy && !S.over) V.play(G.BattleAI.step(this.bsim, { diff: 'normal' }));
      if (S.over && !V.busy && this.bt < len - 2) this.bt = len - 2;
      if (!this.inserts.level && this.bt > 14) { this.inserts.level = true; const u = S.units.find(x => !x.out && x.side === 0); if (u) V.play([{ type: 'levelup', u: u.id, lvl: u.lvl + 1, gains: { atk: 2, def: 1, int: 1 } }]); }
      if (!this.inserts.promo && this.bt > 28) { this.inserts.promo = true; V.banner = { s: 'A NEW FORM!', t: 0, life: 1.4, c: '#fff0a0' }; G.game.flash('#ffffff', .15, .4); }
      G.game.focus(V.look[0], V.look[1], 0);
    }
    if (beat === 'graynight') { this.talk.update(dt); this.gk.update(dt, { x: 420, y: 0, z: 32, facing: Math.PI, vx: 0, vy: 0, pose: this.bt > 10 ? 'cheer' : null }); this.me.update(dt, { x: 380, y: 0, z: 32, facing: 0, vx: 0, vy: 0, pose: 'kneel' }); G.game.focus(400, 0, 32 + (G.game.H / 2 - 50) / -G.game.view.bz); }
    if (beat === 'logo') G.game.focus(400, 0, 60);
  },
  draw(r) {
    const [beat] = REEL[this.beatI];
    if (beat === 'wheel' || beat === 'summon') {
      r.sky(['#0a1830', '#1a3a68']); const L = G.game.lights; L.enabled = true; L.ambient = .9;
      this.wm.map.drawFloor(r); this.wm.drawProps(r);
      for (const c of G.all('castle')) { r.shape(this.wm.shapeFor(c.id), c.pos[0], c.pos[1], 0, { scale: .9, facing: Math.PI / 2 }); }
      r.overlay(g => { for (const c of G.all('castle')) { const [sx, sy] = r.w(c.pos[0], c.pos[1], 46); G.art.banner(g, this.camp.owner(c.id), Math.round(sx) + 8, Math.round(sy) - 6, 1); } });
      if (beat === 'summon') { const p = G.get('castle', 'rimeholt').pos, k = Math.min(1, this.bt / 3); r.decal(g => { const [cx, cy] = r.w(p[0], p[1] + 34, 0); for (let i = 0; i < 30; i++) { const a = this.bt + i / 30 * Math.PI * 2; px.dot(g, cx + Math.cos(a) * 30, cy + Math.sin(a) * 12, i % 2 ? '#a8e8ff' : '#ffffff'); } }); r.actor(p[0], p[1] + 34, -20 + k * 20, (g, ox, oy) => this.wyrm.draw(g, ox, oy, r.view)); if (this.bt < 3) r.queue(p[0], p[1] + 34, 10, g => { const [cx, cy] = r.w(p[0], p[1] + 34, 0); px.blend(g, .5, 'add', () => px.rect(g, cx - 8, cy - 80, 16, 80, '#c8f0ff')); }, { emissive: true }); }
      this.caption2(r, beat === 'wheel' ? 'FOUR SEASONS. FOUR CROWNS. ONE STOPPED CLOCK.' : 'BIND MONSTERS TO YOUR BANNER.');
    }
    if (beat === 'battle') { this.bview.draw(r, {}); const S = this.bsim.state; this.caption2(r, this.bt < 8 ? this.caption : this.bt < 18 ? 'TWELVE BELLS TO TAKE THE KEEP' : this.bt < 30 ? 'THE SEASON SHAPES THE FIELD' : 'FELL THE KNIGHT, CAPTURE ITS BEASTS'); r.overlay(g => G.ui.text(g, 'BELL ' + S.bell + '/' + S.bells, 6, 6, '#ffe8a8')); }
    if (beat === 'graynight') { this.bg.draw(r); this.stage.draw(r); r.overlay(g => { const cx = r.W / 2, cy = r.H * .3; px.disc(g, cx, cy, 40, '#d8c070'); px.disc(g, cx, cy, 36, '#f0e8d8'); px.line(g, cx, cy, cx, cy - 30, '#2a2010', 2); px.line(g, cx, cy, cx + 14, cy + 14, '#2a2010', 3); }); for (const [x, rg] of [[420, this.gk], [380, this.me]]) r.actor(x, 0, 32, (g, ox, oy) => rg.draw(g, ox, oy, r.view)); this.talk.draw(r); }
    if (beat === 'logo') { this.bg.draw(r); r.overlay(g => { E.font.title(g, 'BRIGANTIME', r.W / 2, r.H / 2 - 40, { align: 'center', scale: 3, colors: ['#fff8e0', '#f0d070', '#c08a30', '#7a4a1a'], depth: 3 }); G.ui.text(g, 'THE LEGEND OF FORSEASONS', r.W / 2, r.H / 2 - 8, '#f0e8d8', { align: 'center' }); }); }
    r.overlay(g => { if (Math.floor(this.t * 2) % 2 === 0) G.ui.text(g, G.touchOnly() ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON', r.W / 2, r.H - 16, '#ffffff', { align: 'center' }); if (beat !== 'logo') G.ui.text(g, 'BRIGANTIME', r.W - 6, 6, '#f0d070', { align: 'right' }); });
  },
  caption2(r, s) { r.overlay(g => { px.blend(g, .6, 'normal', () => px.rect(g, 0, r.H - 40, r.W, 16, '#05040a')); G.ui.text(g, s, r.W / 2, r.H - 36, '#ffe8a8', { align: 'center' }); }); }
};
