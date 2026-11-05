/* ---- STORY STAGES: side-on sets with the cast standing in a row; the speaker steps forward; E.Dialog with live
 * portraits, the realm's colour on the name and a babble voice per speaker; choices; △ backlog; hold ○ to skip ---- */
const STAGES = {
  orchard: { bg: { sky: ['#7ab8e8', '#b8e0f0', '#e8f4e0'], sun: { x: .8, y: .2, r: 12, color: '#fff8d0' }, layers: [{ kind: 'hills', color: '#7ac060', y: .62, height: .2, parallax: .2 }, { kind: 'forest', color: '#4a9a40', y: .75, height: .18, parallax: .4 }] }, ground: '#5aa048', props: [['tree', -70, { color: '#f4b8d0', size: 1.6 }], ['flowers', -30], ['statue', 80, { size: .8 }], ['tree', 120, { color: '#f4b8d0', size: 1.3 }]], weather: { kind: 'leaves', amount: .2 }, music: 'event' },
  sunhall: { bg: 'desert', ground: '#c8a060', props: [['pillar', -110, { size: 1.5 }], ['brazier', -60, { light: true }], ['banner', 0, { color: '#e0a020' }], ['brazier', 60, { light: true }], ['pillar', 110, { size: 1.5 }]], music: 'event' },
  harvesthall: { bg: { sky: ['#5a3020', '#a86a40', '#e8b878'], layers: [{ kind: 'hills', color: '#8a5a2a', y: .65, height: .2, parallax: .2 }, { kind: 'forest', color: '#a85a1e', y: .78, height: .15, parallax: .4 }] }, ground: '#8a6040', props: [['lantern', -90, { light: true }], ['barrel', -50], ['crate', -30], ['statue', 60, { size: .7 }], ['lantern', 100, { light: true }]], weather: { kind: 'leaves', amount: .3 }, music: 'event' },
  icehall: { bg: { sky: ['#1a2a48', '#4a6a98', '#a8c8e8'], moon: { x: .25, y: .2, r: 10, color: '#e8f4ff' }, stars: 30, layers: [{ kind: 'mountains', color: '#c8d8f0', y: .6, height: .3, parallax: .2 }, { kind: 'castle', color: '#5a6a8a', y: .72, height: .25, parallax: .3 }] }, ground: '#d8e8f8', props: [['crystal', -100, { color: '#a8e8ff' }], ['pillar', -60, { size: 1.4 }], ['crystal', 70, { color: '#a8e8ff' }], ['pillar', 110, { size: 1.4 }]], weather: { kind: 'snow', amount: .4 }, music: 'winter' },
  clock: { bg: { sky: ['#0a0812', '#1a1828', '#2a2838'], stars: 10, layers: [{ kind: 'castle', color: '#2a2838', y: .55, height: .45, parallax: .1 }] }, ground: '#3a3846', props: [['candelabra', -100, { light: true }], ['pillar', -60, { size: 1.6 }], ['pillar', 60, { size: 1.6 }], ['candelabra', 100, { light: true }]], clock: true, music: 'hourless' },
  tent: { bg: 'dusk', ground: '#6a5a3a', props: [['banner', -90, {}], ['torch', -50, { light: true }], ['crate', 40], ['torch', 80, { light: true }], ['banner', 110, {}]], music: 'event' },
  road: { bg: 'day', ground: '#7a9a4a', props: [['tree', -110], ['fence', -60], ['sign', 40], ['tree', 110, { size: 1.3 }]], music: 'event' },
  stable: { bg: 'day', ground: '#a08050', props: [['fence', -100], ['crate', -60], ['barrel', -40], ['fence', 90]], music: 'event' }
};
const speakerOf = (id, realm, sim) => {
  if (id === 'RULER') return G.RULERS[realm] || 'gareth';
  if (id === 'KNIGHT') { const ks = sim ? sim.knightsOf(realm).filter(k => !k.ruler && G.has('knight', k.id)) : []; return ks.length ? ks[0].id : (G.SQUIRE[realm] || 'lynette'); }
  return id;
};
G.scenes.event = {
  view: 'side', views: ['side'], res: 'ps1', pausable: true, touch: [], input: G.INPUT,
  enter(d) {
    d = d || {}; this.d = d; this.t = 0; this.skipT = 0; this.log = false; this.done = false;
    const sim = G.run && G.run.sim, realm = d.realm || (sim && sim.state.humans[0]) || 'verdance';
    let lines, stage, ev = null;
    if (d.prologue) { lines = G.PROLOGUE.map(t => ['narrator', t]); stage = 'clock'; this.auto = 5; }
    else if (d.lines) { lines = d.lines; stage = d.stage || 'road'; }
    else { ev = G.get('event', d.id); lines = typeof ev.lines === 'function' ? ev.lines(sim || G.CampaignSim.create({ humans: [realm], seed: 1 }), realm) : ev.lines; stage = ev.stage; }
    this.ev = ev; this.realm = realm; this.id = d.id || (d.prologue ? 'prologue' : 'lines'); G.eventScene = this;
    this.lines = lines.map(([who, text, o]) => [speakerOf(who, realm, sim), text, o || {}]);
    this.set = STAGES[stage] || STAGES.road; this.stageId = stage;
    this.bg = new E.Backdrop(this.set.bg);
    this.ledge = new E.PlatformMap({ rows: ['S'.repeat(50), 'S'.repeat(50)], legend: { S: 1 }, types: { 1: { style: 'ground', side: E.shade(this.set.ground, -.3), top: this.set.ground } }, edges: 'open' });
    // the cast: everyone who speaks, in order of first line
    const ids = []; for (const [w] of this.lines) if (w !== 'narrator' && !ids.includes(w)) ids.push(w);
    this.cast = ids.slice(0, 6).map((id, i) => { const look = G.has('knight', id) ? G.get('knight', id).look : G.has('speaker', id) ? G.get('speaker', id).look : null; return { id, rig: look ? new E.Humanoid(Object.assign({}, look)) : null, x: 400 + (i - (ids.length - 1) / 2) * 44, home: 400 + (i - (ids.length - 1) / 2) * 44, f: i < ids.length / 2 ? 0 : Math.PI, pose: null }; });
    this.i = -1; this.talk = new E.Dialog(G.game, { voice: ch => G.voice.letter(this.voiceP, ch) });
    const sp = { Normal: 40, Slow: 24, Fast: 80, Instant: 9999 }[G.settings.textSpeed] || 40; this.talk.speed = sp;
    G.music(this.set.music); G.game.weather = this.set.weather || null;
    const L = G.game.lights; L.enabled = true; L.ambient = stage === 'clock' ? .45 : stage === 'icehall' ? .7 : .85;
    this.story = new E.Story(G.game, { people: {}, nodes: { x: [] } });
    this.next();
  },
  exit() { G.game.weather = null; G.eventScene = null; },
  next() {
    this.i++;
    if (this.i >= this.lines.length) { this.finish(null); return; }
    const [who, text, o] = this.lines[this.i], last = this.i === this.lines.length - 1, ev = this.ev;
    const c = this.cast.find(c => c.id === who);
    for (const m of this.cast) { m.pose = null; m.speaking = m === c; }
    if (c) { c.pose = o.pose || null; c.expr = o.expr || null; if (o.emote) this.story.emote({ x: c.x, y: 0, z: 40, h: 40 }, o.emote === 'dots' ? 'dots' : o.emote, 2); }
    this.voiceP = G.voice.profile(who);
    const name = who === 'narrator' ? '' : G.has('knight', who) ? G.get('knight', who).short.toUpperCase() : G.has('speaker', who) ? G.get('speaker', who).name.toUpperCase() : who;
    const realm = G.has('knight', who) ? G.get('knight', who).realm : null, nameColor = realm && G.has('realm', realm) ? E.shade(G.get('realm', realm).main, .3) : '#f0e8d8';
    const choices = last && ev && ev.choices && !this.d.applied ? ev.choices.map(ch => ch.text) : null;
    const opts = { name, portrait: c && c.rig ? c.rig : undefined, nameColor, onDone: () => this.next() };
    if (choices) { opts.choices = choices; opts.onChoice = k => { this.finish(k); }; opts.onDone = undefined; }
    if (this.auto) opts.auto = this.auto;
    this.talk.say([text], opts);
    (this.backlog = this.backlog || []).push((name ? name + ': ' : '') + text.replace(/\{[^}]*\}/g, ''));
  },
  finish(choice) {
    if (this.done) return; this.done = true; this.talk.close && this.talk.open && this.talk.close();
    const d = this.d;
    if (this.ev && !d.applied) {
      if (d.onChoice) d.onChoice(choice === null && this.ev.choices ? 0 : choice);
      else if (G.run && G.run.sim) { const r = G.run.sim.apply({ t: 'event', id: this.ev.id, realm: this.realm, choice: choice === null && this.ev.choices ? 0 : choice }); G.scenes.campaign.afterEffects && G.scenes.campaign.afterEffects(r.out || [], this.realm); }
    }
    if (d.onDone) d.onDone(choice); else G.game.go(d.back || 'title');
  },
  back() { if (this.log) { this.log = false; return true; } return false; },
  update(dt) {
    const I = G.game.input; this.t += dt;
    if (G.dev.open) { G.devUpdate(dt); return; }
    if (this.log) { if (I.pressed('info') || I.pressed('cancel') || I.pressed('confirm')) { this.log = false; I.consumeAll(); } return; }
    if (I.pressed('info')) { this.log = true; G.sfx('ui_open'); return; }
    if (I.down('cancel')) { this.skipT += dt; if (this.skipT > .8) { this.skipT = -99; const ev = this.ev; if (ev && ev.choices && !this.d.applied) { this.i = this.lines.length - 2; this.talk.close(); this.next(); } else { this.talk.close(); this.finish(null); } return; } } else this.skipT = Math.max(0, this.skipT);
    if (G.autoplay && this.t > .3) { this.t = 0; if (this.talk.choices) { this.finish(0); return; } this.talk.close(); this.next(); return; }
    this.talk.update(dt); this.story.update(dt);
    for (const m of this.cast) { const target = m.speaking ? m.home + (m.f === 0 ? 10 : -10) : m.home; m.x = lerp(m.x, target, Math.min(1, dt * 6)); if (m.rig) m.rig.update(dt, { x: m.x, y: 0, z: 32, facing: m.speaking ? m.f : m.f, vx: Math.abs(target - m.x) > 1 ? (target - m.x) * 3 : 0, vy: 0, pose: m.pose, expr: m.speaking ? (m.expr || null) : null }); }
    const sp = this.cast.find(m => m.speaking); G.game.focus(sp ? lerp(400, sp.x, .3) : 400, 0, 32 + (G.game.H / 2 - 50) / -G.game.view.bz);
  },
  draw(r) {
    this.bg.draw(r); this.ledge.draw(r);
    for (const [name, dx, o] of this.set.props) r.prop(name, 400 + dx, -10, 32, Object.assign({ size: 1.2 }, o || {}));
    if (this.set.clock) r.overlay(g => { const cx = r.W / 2, cy = r.H * .32, t = G.game.real; px.disc(g, cx, cy, 44, '#140c14'); px.disc(g, cx, cy, 42, '#d8c070'); px.disc(g, cx, cy, 38, '#f0e8d8'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; px.line(g, cx + Math.cos(a) * 32, cy + Math.sin(a) * 32, cx + Math.cos(a) * 36, cy + Math.sin(a) * 36, '#3a3020', 2); } const jit = Math.sin(t * 20) * .02; px.line(g, cx, cy, cx + Math.cos(-1.2 + jit) * 30, cy + Math.sin(-1.2 + jit) * 30, '#2a2010', 2); px.line(g, cx, cy, cx + Math.cos(2 - jit) * 20, cy + Math.sin(2 - jit) * 20, '#2a2010', 3); });
    if (this.stageId === 'clock' && this.ev && /meridian|banner|candle|stillness|ending/.test(this.ev.id)) r.shape('bench', 400, -18, 32, { scale: 1.2 });
    for (const m of this.cast) if (m.rig) { r.shadow(m.x, 0, 7, .4, '#000', 32); r.actor(m.x, 0, 32, (g, ox, oy) => m.rig.draw(g, ox, oy, r.view)); }
    this.story.draw(r);
    this.talk.draw(r);
    if (this.ev && this.ev.title && this.t < 2.5) r.overlay(g => E.font.title(g, this.ev.title.toUpperCase(), r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fff8e0', '#e8c870', '#a07a30'] }));
    if (this.log) r.overlay(g => { px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); G.ui.text(g, 'BACKLOG', 12, 8, '#ffe070'); const l = this.backlog.slice(-14); let y = 22; for (const s of l) { y += G.ui.wrapText(g, s, 12, y, r.W - 24, '#e8e4f0', 10) + 2; } });
    if (this.skipT > 0) r.overlay(g => G.ui.bar(g, r.W - 70, 8, 60, this.skipT, .8, '#ff8a5a', 'SKIP'));
    G.ui.prompts(r, [['confirm', 'Next'], ['info', 'Backlog'], ['cancel', 'Hold: skip']], { y: 4 });
  }
};
