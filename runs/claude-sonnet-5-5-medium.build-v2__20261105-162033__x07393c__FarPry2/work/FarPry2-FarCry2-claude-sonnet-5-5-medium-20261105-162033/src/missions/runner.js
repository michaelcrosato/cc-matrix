// The mission runner: reads src/content/missions.js, runs one step at a time, pays, saves, chains the story.
import { MISSIONS } from '../content/missions.js';
import { SEQ, NPCS } from '../content/dialogue.js';
import { TUNING } from '../core/tuning.js';
import { writeSave } from '../core/save.js';
import { hasDone } from '../core/story.js';
import { FN, ST } from '../world/fire.js';
import { HALF } from '../world/terrain.js';
import { THREE } from '../../pixel-engine.js';

export class MissionSystem {
  name = 'missions';
  cur = null; stepT = 0; curText = ''; report = null;
  setup(g) {
    this.g = g; g.missions = this; g.mission = {}; g.TUN = TUNING;
    g.talk = (npc) => this.talk(npc); g.begin = (id) => this.begin(id);
    g.noFire = () => { if (g.story.flags.truceOver) return false; const mf = g.sitesSys.find('mile-forty'); if (!mf) return false; const f = g.player.feet; return Math.hypot(f.x - mf.x, f.z - mf.z) < 70; };
    g.passFor = (faction, s) => { if (g.vehSys.seat?.tag === 'tanker' && g.mission.altOn) return true; if (g.story.contract !== faction) return false; if (g.hostileUntil?.[faction] > g.ctx.time) return false; const hq = g.sitesSys.find(faction === 'concord' ? 'fort-clement' : 'granary'); const f = g.player.feet; return Math.hypot(f.x - hq.x, f.z - hq.z) > 28; };
    g.hostileNote = (s, dist) => { if (dist < 60) { g.hostileUntil = g.hostileUntil || {}; g.hostileUntil[s.faction] = g.ctx.time + 60; } };
    g.endBuddies = () => this.endBuddies(); g.finishGame = () => this.finishGame();
    g.events.on('destroyed', (tag) => { this.cnt[tag] = (this.cnt[tag] || 0) + 1; });
    const down = (v) => { if (v.tag && !v.counted) { v.counted = true; this.cnt[v.tag] = (this.cnt[v.tag] || 0) + 1; } };
    g.events.on('vehiclewreck', down); g.events.on('stalled', down);
    g.events.on('case', (c) => { c.taken = true; });
    g.events.on('use', (kind) => { this.lastUse = kind; this.useSeen[kind] = true; });
    g.events.on('enter', (v) => { if (v.tag) this.entered[v.tag] = true; });
    g.events.on('ignite', (x, z) => { this.ignites.push([x, z]); });
    g.events.on('kill', (a) => { if (a.kind === 'soldier') this.kills[a.faction] = (this.kills[a.faction] || 0) + 1; });
    this.cnt = {}; this.useSeen = {}; this.entered = {}; this.ignites = []; this.kills = {};
  }
  available() {
    const st = this.g.story;
    return Object.values(MISSIONS).filter((m) => m.giver && !m.auto && !hasDone(st, m.id) && (!m.requires || m.requires.every((r) => hasDone(st, r))) && !(this.cur && this.cur.def.id === m.id));
  }
  restore() { this.cur = null; this.g.mission = {}; }
  abort() { this.cur = null; this.g.mission = {}; this.g.story.current = null; this.g.story.contract = null; }
  stepText() { return this.cur ? this.curText : ''; }
  hasUse(kind) { return !!this.cur && this.cur.step?.do === 'use' && this.cur.step.kind === kind; }
  // ---- talking ----
  talk(npc) {
    const g = this.g, st = g.story;
    if (this.cur && this.cur.step?.do === 'report' && this.cur.step.to === npc) { const s = this.cur.step; g.dialogue.play(s.seq, { focus: npc, cb: () => this.advance() }); return; }
    const offers = this.available().filter((m) => m.giver === npc).sort((a, b) => (a.optional ? 1 : 0) - (b.optional ? 1 : 0));
    if (npc === 'tibor') { g.ui.open('upgrades'); if (offers.length) { g.ui.closeAll(); this.offer(offers[0], npc); } return; }
    if (npc === 'bar') {
      if (hasDone(st, 'm2') && !st.met.dov) { g.dialogue.play('bar.dov', { focus: null, cb: () => { st.met.dov = true; g.say('DOV HALPERN WILL CARRY CHARGES FOR YOU.', 'player', 3); } }); }
      else g.dialogue.play('bar.none'); return;
    }
    if (npc === 'bakr') { g.dialogue.play([['bakr', ['The station at West Cutting used to be Saint Anne.', 'East Siding was Marguerite Halt. Then Harvest Yard.', 'Mile Forty was always Mile Forty. Nobody has the nerve.'][g.ctx.random.int(0, 2)]]], { focus: 'bakr' }); return; }
    if (offers.length) { this.offer(offers[0], npc); return; }
    const idle = { vance: 'The matter is closed, for the moment. Invoices are open.', ansa: 'Come back when you have learned something about grammar.', odile: 'I have forty blankets and no patience. Come back with a crate.', tibor: 'It fires. That is all.' }[npc];
    if (idle) g.dialogue.play([[npc, idle]], { focus: npc });
  }
  offer(m, npc) {
    const g = this.g;
    g.dialogue.play(m.brief || [[npc, 'Interested?']], { focus: npc, choices: { title: `${m.title.toUpperCase()}: ${m.pay} STONES`, options: [{ label: 'Accept' }, { label: 'Not Yet' }] }, cb: (o) => { if (o && o.label === 'Accept') this.accept(m.id); } });
  }
  accept(id) { if (this.cur) { this.g.say('FINISH WHAT YOU STARTED.', 'player', 2); return false; } const m = MISSIONS[id]; if (!m) return false; this.begin(id); return true; }
  // ---- running ----
  begin(id) {
    const g = this.g, def = MISSIONS[id]; if (!def) return;
    g.mission = {}; this.cnt = {}; this.useSeen = {}; this.entered = {}; this.ignites = []; this.kills = {}; this.report = null;
    const steps = def.steps.slice();
    this.cur = { def, i: -1, steps, step: null, t: 0, alt: false }; g.story.current = id; g.story.contract = def.faction || null;
    if (def.hour !== undefined && !g.story.flags['hourSet_' + id]) { g.world.hour = def.hour; }
    if (def.wind) { g.world.wind.pin = true; g.world.wind.dir = [...def.wind.dir]; g.world.wind.speed = def.wind.speed; } else g.world.wind.pin = null;
    if (def.storm) g.setWeather?.('storm');
    def.onStart?.(g);
    g.showStep?.(def.title.toUpperCase());
    // a buddy offers a better way
    if (def.alt) {
      const want = def.alt.buddy; const id2 = want === 'any' ? g.buddies.best() : (g.buddies.available(want) ? want : null);
      if (id2) g.ctx.tweens.call(4, () => { if (this.cur && this.cur.def === def && this.cur.i <= 1) { g.sfx('squelch'); g.dialogue.play(def.alt.call, { focus: null, choices: { title: 'THE BETTER WAY', options: [{ label: 'Accept' }, { label: 'Ignore' }] }, cb: (o) => { if (o && o.label === 'Accept') this.takeAlt(id2); } }); } });
    }
    this.advance();
  }
  takeAlt(buddyId) {
    const g = this.g, c = this.cur, a = c.def.alt; if (!c) return;
    c.alt = true; g.mission.altOn = true; g.story.choices[c.def.id + 'alt'] = true; g.buddies.join(buddyId); g.story.trust[buddyId] = (g.story.trust[buddyId] || 0) + 1; a.setup?.(g);
    // alt steps run before the next step
    c.steps.splice(Math.max(0, c.i), 0, ...a.steps);
    c.i = Math.max(-1, c.i - 1); this.advance();
  }
  advance() {
    const g = this.g, c = this.cur; if (!c) return;
    if (c.step) { c.step.onDone?.(g); }
    c.i++; let step = c.steps[c.i];
    while (step && step.when && !step.when(g)) { c.i++; step = c.steps[c.i]; }
    if (!step) return this.complete();
    c.step = step; c.t = 0; c.count = 0; this.curText = step.text || this.curText;
    if (step.text) g.showStep?.(step.text);
    step.onStart?.(g);
    switch (step.do) {
      case 'scene': g.dialogue.play(step.seq, { focus: step.focus ?? null, cb: () => this.advance() }); break;
      case 'script': step.run(g); this.advance(); break;
      case 'choice': g.ui.open('choice', { title: step.title, top: 170, options: step.options.map((o) => ({ label: o.label, run: () => { g.story.choices[step.key || c.def.id] = o.flag; this.advance(); } })) }); break;
      case 'steal': case 'use': case 'destroy': case 'report': case 'wait': case 'goto': case 'leave': case 'hold': case 'burn': case 'ignite': case 'timer': case 'deliver': break;
      default: break;
    }
  }
  fixed(g, dt) {
    if (!g.canMove() && g.mode !== 'scene') return;
    this.autoTriggers(g);
    const m = g.mission;
    if (m.waves) { m.waveT -= dt; if (m.waveT <= 0) { m.waveT = 22; const mf = g.sitesSys.find('mile-forty'); for (let i = 0; i < 3; i++) { const a = g.ctx.random.range(0, 6.28); g.spawnSoldier({ faction: i % 2 ? 'concord' : 'harvest', role: 'rifle', at: [mf.x + Math.cos(a) * 80, mf.z + Math.sin(a) * 80], yaw: a + 3.14 }); } g.noise?.(g.player.feet, 60, 'enemy'); g.ctx.engine.shake.add(0.3); g.sfx('explosion', { volume: 0.5 }); } }
    if (m.rideDeck) { const p = new THREE.Vector3(); g.train.deck(p); g.player.ctrl.teleport([p.x, p.y - 0.6, p.z]); if (m.railV) g.vehSys.mgLogic(g, dt, m.railV); }
    const c = this.cur; if (!c || !c.step) return;
    const s = c.step, f = g.player.feet; c.t += dt;
    const near = (st) => { const at = st.site ? g.sitesSys.find(st.site) : { x: st.at[0], z: st.at[1] }; return Math.hypot(f.x - (at.x), f.z - (at.z)); };
    switch (s.do) {
      case 'goto': { const d = near(s); if (!s.warned && d < (s.r || 40) * 1.6) { s.warned = true; s.onNear?.(g); } if (d < (s.r || 40)) this.advance(); break; }
      case 'leave': if (near(s) > (s.r || 100)) this.advance(); break;
      case 'timer': if (c.t >= s.secs) this.advance(); break;
      case 'wait': if (s.until(g)) this.advance(); break;
      case 'use': if (this.useSeen[s.kind]) { this.useSeen[s.kind] = false; this.advance(); } break;
      case 'destroy': if ((this.cnt[s.tag] || 0) >= (s.n || 1)) this.advance(); break;
      case 'steal': if (this.entered[s.tag]) this.advance(); break;
      case 'ignite': if (this.ignites.some(([x, z]) => Math.hypot(x - (g.sitesSys.find(s.site)?.x ?? 0), z - (g.sitesSys.find(s.site)?.z ?? 0)) < s.r)) this.advance(); break;
      case 'hold': if (near(s) < s.r) { c.count += dt; g.story.flags.column = Math.min(1, c.count / s.secs); if (c.count >= s.secs) this.advance(); } break;
      case 'burn': { if (this.burnFraction(g, s.site) >= s.pct) this.advance(); break; }
      case 'deliver': { s.left = (s.left ?? s.secs) - dt; const d = Math.hypot(f.x - s.at[0], f.z - s.at[1]); if (d < s.r) { s.left = undefined; this.advance(); } else if (s.left <= 0) this.fail(); break; }
      default: break;
    }
  }
  burnFraction(g, siteId) {
    const s = g.sitesSys.find(siteId), gr = g.fireSys.grid; let fuel = 0, burnt = 0;
    const cx = Math.floor((s.x + HALF) / 5), cz = Math.floor((s.z + HALF) / 5), r = Math.floor(s.r / 5);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const i = gr.idx(cx + dx, cz + dz); if (i < 0 || !gr.baseFuel[i]) continue; fuel++; if (gr.state[i] === ST.BURNT || gr.state[i] === ST.BURNING) burnt++; }
    return fuel ? burnt / fuel : 0;
  }
  fail() { const g = this.g; g.mission = {}; this.cur = null; g.story.current = null; g.story.contract = null; g.events.emit('missionfail'); }
  autoTriggers(g) {
    if (this.cur || g.ui.screen || g.dialogueOn || g.mode !== 'play') return;
    const st = g.story; const f = g.player.feet;
    if (hasDone(st, 'm6') && !hasDone(st, 'm7') && !st.flags.m7started) {
      for (const s of g.sitesSys.sites) if (s.safe && Math.hypot(s.x - f.x, s.z - f.z) < 14) { st.flags.m7started = true; this.begin('m7'); return; }
    }
    if (hasDone(st, 'm7') && !hasDone(st, 'm8') && !st.flags.m8started) { st.flags.m8started = true; this.begin('m8'); return; }
    if (hasDone(st, 'm8') && !hasDone(st, 'm9') && !st.flags.m9started && !g.ui.screen) { st.flags.m9started = true; this.begin('m9'); }
    if (hasDone(st, 'm9') && !hasDone(st, 'end') && !st.flags.endstarted) { st.flags.endstarted = true; this.begin('end'); }
  }
  complete() {
    const g = this.g, c = this.cur, def = c.def, st = g.story;
    let pay = def.pay + (c.alt && def.alt ? def.alt.bonus : 0); if (def.id === 'm5' && c.alt) pay = 10;
    const got = pay ? Math.round(pay * TUNING.stonesReward) : 0; st.stones += got; st.earned += got;
    st.done.push(def.id); st.current = null; st.contract = null; this.cur = null; this.curText = '';
    def.onDone?.(g);
    g.world.wind.pin = def.id === 'm9' ? g.world.wind.pin : null; g.waypoint = null; g.buddies.dismissAll();
    if (def.id !== 'm0' && def.id !== 'end') { g.say(`${def.title.toUpperCase()} COMPLETE. ${got ? '+' + got + ' STONES.' : ''}`, 'player', 3.5); g.sfx('win_chime'); writeSave(g); }
    g.events.emit('missiondone', def.id);
  }
  endBuddies() {
    const g = this.g, st = g.story; const alive = ['ines', 'dov', 'mags'].filter((i) => st.met[i] && !st.dead.includes(i));
    if (!alive.length) return;
    const pass = g.sitesSys.find('the-pass'); const trusty = alive.filter((i) => st.trust[i] >= 3);
    g.dialogue.play('end.buddies', { cb: () => {
      for (const id of alive) { const a = g.ctx.random.range(0, 6.283); g.spawnSoldier({ faction: 'concord', role: 'rifle', model: id, hp: 200, at: [pass.x + Math.cos(a) * 28, pass.z + Math.sin(a) * 28], yaw: a + Math.PI, site: pass }); }
      g.say(trusty.length ? 'THEY OFFER TO SPLIT IT. YOU REFUSE.' : 'THEY CAME FOR THE STONES.', 'player', 4);
    } });
  }
  finishGame() {
    const g = this.g, st = g.story; st.ending = st.choices.sheet === 'give' ? 'give' : 'walk'; g.endingNow = true; g.playMusic?.('end', true); g.mode = 'scene'; g.cutscene = true; g.ctx.engine.screen.cover('fade').catch?.(() => {});
    g.ctx.tweens.call(1.2, () => { g.ui.open('ending', st.ending); });
    this.complete(); g.events.emit('ending', st.ending);
  }
  state() { const c = this.cur; return { mission: c ? { id: c.def.id, step: c.i, text: this.curText } : null, done: this.g.story.done.slice(), stones: this.g.story.stones, ledger: { ...this.g.story.ledger } }; }
}
