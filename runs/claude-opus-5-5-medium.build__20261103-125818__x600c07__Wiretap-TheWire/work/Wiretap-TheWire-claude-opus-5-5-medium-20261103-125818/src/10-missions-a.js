// WIRETAP: field missions, part one. The cold open, Eyes On (faces, reads, Pockets' shoes), the payphones and the foot
// chase (sprint, vault, tackle, cuff, ditch, search), and the van stakeout with the long lens and Sunday's robbery.
const MISSIONS = {};
function npc(person, cx, cy, o = {}) {
  const p = C(cx, cy), a = new Agent(Object.assign({ id: o.id || person, person: CAST[person] ? person : null, x: p.x, y: p.y, seed: o.seed || 5 }, o));
  a.home = { x: p.x, y: p.y }; if (o.face !== undefined) a.facing = o.face; if (o.pose) a.pose = o.pose; FD.npcs.push(a); return a;
}
function finish(result) { if (FD.done) return; FD.done = true; if (FD.attract) return; game.after(.6, () => Director.complete(result)); }
/** a still thing the camera can photograph (a truck's plate, a sign): drawn as a shape, with a screen point */
class Target {
  constructor(o) { Object.assign(this, { z: 10, facing: 0, visible: true, act: null, minds: {}, knows: new Set() }, o); }
  draw(r) { if (!this.visible) return; if (this.shape) r.shape(this.shape, this.x, this.y, 0, { facing: this.facing }); this.scr = r.w(this.x, this.y, this.z + 12); this.head = this.scr; }
  update() {}
}
const lightBar = (x, y, r) => { const on = Math.floor(game.time * 4) % 2; game.lights.add(x, y, 20, 70, .9, { color: on ? '#ff3a3a' : '#3a6aff' }); };

/* ---- 1.1 COLD OPEN: 1407 Gaither, 05:40, rain ---- */
MISSIONS.cold = {
  place: '1407 Gaither St', mood: 'dawn', rain: .7, clock: ['05:40', '06:30'], clockRate: .3, music: 'field', start: [31.5, 29], startFacing: Math.PI / 2, civilians: 3, memorial: false,
  setup(F) {
    F.flags.step = 0;
    const dukes = npc('dukes', 31.4, 38.2, { face: Math.PI }), lou = npc('lou', 31.3, 39.6, { face: Math.PI, pose: 'kneel' }), od = npc('odessa', 33.7, 36.6, { face: Math.PI });
    const pg = npc('pigeon', 35.5, 36.5, { z: 40, face: Math.PI * .8 });
    const cop = npc('cop', 32.6, 42, { id: 'kow', face: -Math.PI / 2 });
    F.interact({ id: 'dukes', at: () => dukes, verb: 'Talk', hint: 'Officer Dukes', when: () => F.flags.step === 0, act: () => Talk.run([
      ['dukes', 'Detective. Neighbor found him at five, going out for the paper. Nobody heard nothing.'], ['dana', 'Nobody heard a man get beat on his own steps.'], ['dukes', "That's what nobody said."]], () => { F.flags.step = 1; }) });
    F.interact({ id: 'lou', at: () => lou, verb: 'Talk', hint: 'Lou Szabo, Homicide', when: () => F.flags.step === 1, act: () => Talk.run([
      ['lou', 'Cornelius Felton. Thirty-one years driving the number 22. Retired in March.'], ['dana', 'He called the corner in. Three times since August. Name and address every time.'],
      ['lou', 'Then somebody read his name out loud to the wrong person.'], ['dana', "You're Homicide. This is yours."], ['lou', "It's mine till Friday. Then it's a file. You know the street?"], ['dana', 'Grew up three blocks off it.']], () => { F.flags.step = 2; }) });
    F.interact({ id: 'od', at: () => od, verb: 'Talk', hint: 'Miss Odessa', when: () => F.flags.step === 2, act: () => Talk.run([
      ['dana', 'Morning, Miss Odessa.'], ['odessa', 'Dana Lynn. Your mama know you\'re out here this early?'],
      { choices: ['Did you see anything last night?', 'I remember your choir, Miss Odessa.'], pick: i => i === 1 ? (FL().odessaRespect = true, [['odessa', "Then you remember I don't say things twice."]]) : [] },
      ['odessa', 'I saw the TV and the inside of my eyelids. I got a grandbaby to raise, Dana Lynn.'],
      () => { F.camAt = { x: pg.x, y: pg.y }; sfx('coo'); sfx('flap'); return { wait: 2.6 }; }, () => { F.camAt = null; },
      ['lou', "This ain't a whodunit, Dana. It's a who-cares."]], () => { F.flags.step = 3; finish(); }) });
    F.interact({ id: 'cards', at: C(30.4, 38.6), verb: 'Read the cards', when: () => !F.flags.cards, act: () => { F.flags.cards = 1; Talk.run([['none', '"Mr. Felton drove me to school 1979-1983. Rest easy." · "He said hello to everybody." · A bus transfer, folded, from 1994.']]); } });
    tip('move', 'Move', 'Move with the left stick or WASD. Hold ' + Prompt.label('sprint') + ' to run. Walk up to someone and press ' + Prompt.label('interact') + ' to talk.');
  },
  drawUnder(F, r) {
    r.shape('patrol', 32.5 * T, 37.5 * T, 0, { facing: -Math.PI / 2 }); r.shape('patrol', 32.6 * T, 41.8 * T, 0, { facing: Math.PI / 2 });
    lightBar(32.5 * T, 37.5 * T); lightBar(32.6 * T, 41.8 * T);
    r.shape('sheetbody', 30.5 * T, 39.6 * T, 3, { facing: 0 });
    for (const y of [37.2, 41.6]) r.shape('sawhorse', 31.2 * T, y * T, 0, { facing: 0 });
    for (let i = 0; i < 6; i++) r.prop('candle', 30.2 * T + (i % 3) * 3, 38.8 * T + Math.floor(i / 3) * 4, 3, { light: true });
  },
  objective(F) { const s = F.flags.step, tg = [F.npcs[0], F.npcs[1], F.npcs[2]][s]; return s < 3 ? { step: 'COLD OPEN', title: ['Talk to the officer on scene', 'Talk to Szabo', 'Talk to Miss Odessa across the street'][s], text: '1407 Gaither Street', at: tg ? { x: tg.x, y: tg.y } : null } : null; },
  counts: () => []
};

/* ---- 1.4 EYES ON: 15:00-17:30, overcast; faces, reads, Pockets, the Chevy ---- */
const CREW4 = ['tee', 'rook', 'corey', 'pigeon'];
const SHOES = [['tee', "Wheat Timbs, laces tucked, not a scuff on 'em. That's a man who thinks he's a businessman."], ['rook', "Black Air Force, red check, size thirteen. Don't let him see you looking."],
  ['corey', 'Nikes with the duct tape on the left toe. He holds for \'em in the vacant. Nervous boy. Nervous boys live longer.'], ['pigeon', 'Little sneakers that light up when he runs. Miss Odessa\'s grandbaby. They call him Pigeon on account of the birds. He\'s fourteen. ...Fourteen.']];
function coverInteracts(F) {
  F.interact({ id: 'bench', at: C(42.5, 30.4), verb: 'Sit at the bus stop', hint: 'Cover', when: () => F.me.cover !== 'sit', act: () => { F.me.cover = 'sit'; F.me.body.x = 42.5 * T; F.me.body.y = 30.4 * T; F.me.facing = -Math.PI / 2; tip('cover', 'Cover', 'Sitting at the bus stop, leaning on a wall, inside a car: they look at you less. Move to get up.'); } });
  F.interact({ id: 'soda', at: C(27.5, 26.2), verb: 'Buy a soda', hint: 'Gaither Market', when: () => !F.me.hidden, act: () => { const p = F.me; p.hidden = true; p.visible = false; Perception.reset(Field.observers(), p.id); sfx('door'); game.after(6, () => { p.hidden = false; p.visible = true; sfx('door'); toast('Grape soda', 'Fifty cents. The cashier didn\'t look up.'); }); } });
  F.interact({ id: 'chevy', at: C(34.5, 29.3), verb: () => F.me.inCar ? 'Get out' : 'Wait in the car', hint: 'Cover: you can shoot from here', when: () => true, act: () => { const p = F.me; p.inCar = !p.inCar; p.cover = p.inCar ? 'car' : null; const at = p.inCar ? { x: 34.5 * T, y: 28.4 * T } : C(34.5, 29.3); p.body.x = at.x; p.body.y = at.y; p.visible = !p.inCar; sfx('door'); if (F.m.onChevy) F.m.onChevy(F); } });
}
function pocketsGame(F, done) {
  const have = CREW4.filter(id => hasFact('face:' + id)); let i = 0, right = 0;
  const order = SHOES.filter(([id]) => have.includes(id));
  const ask = () => {
    if (i >= order.length) { UI.close(); return done(right, order.length); }
    const [ans, line] = order[i];
    UI.open({ id: 'shoes', cls: 'shoes', legend: [['confirm', 'This one'], ['cancel', 'Skip']], cancel: () => { i++; UI.close(); ask(); },
      render(el) { el.append(h('div.panel.manila', h('div.kicker', { text: 'POCKETS · SHOES' }), h('p.quote', { text: '"' + line + '"' }),
        h('div.photos', have.map(id => h('button.polaroid', { 'data-f': '', on: () => { if (id === ans) { right++; addFact('name:' + id, 2, true); toast('Named: ' + CAST[id].name, 'Pockets nods at the shoes.'); sfx('pin'); } else { toast('Pockets: "Naw. Look at the feet."', ''); sfx('cancel'); } i++; UI.close(); ask(); } },
          h('img', { src: PHOTO_IMG[(STATE.photos.find(p => p.subject === id && p.tags.includes('face')) || {}).id] || '', alt: '' }), h('span', { text: hasFact('obs:' + id + ':' + (CAST[id] ? '' : '')) ? '' : 'Photo ' + (have.indexOf(id) + 1) })))))); },
      model(s) { s.confirm = () => { addFact('name:' + ans, 2, true); right++; i++; UI.close(s); ask(); }; } });
  };
  ask();
}
MISSIONS.eyes = {
  place: 'Gaither & Ridley', mood: 'day', clock: ['15:00', '17:30'], clockRate: .35, start: [22, 30.4], civilians: 16, corner: { rate: .12, patrol: false },
  setup(F) {
    F.flags.left = false;
    const pk = npc('pockets', 27.2, 21.2, { face: Math.PI / 2 }); pk.stroller = true;
    coverInteracts(F);
    F.interact({ id: 'pockets', at: () => pk, verb: 'Talk', hint: 'Pockets ($20)', when: () => !FL().pocketsMet, act: () => {
      const n = CREW4.filter(id => hasFact('face:' + id)).length;
      if (!n) return Talk.run([['pockets', 'Pockets don\'t do faces, Detective. Faces get you a funeral. Shoes, though. Shoes don\'t talk back.'], ['pockets', 'Bring me pictures. Whole body. Then we talk.']]);
      if (STATE.meters.fund < 20) return Talk.run([['pockets', "Pockets don't do credit."]]);
      Talk.run([['pockets', "Twenty for the shoes. Pockets don't do credit."], () => { meter('fund', -20, null); }], () => pocketsGame(F, (r, n) => {
        FL().pocketsMet = true; FL().dreLine = true; addFact('stmt:pockets:crew', 2, true); addEvidence({ id: 'stmt:pockets', kind: 'stmt', text: 'Pockets: names to the shoes (' + r + '/' + n + ')' });
        Talk.run([['pockets', "And Dre ain't with 'em no more. Broke his ankle jumping the fence at the old Arundel station, running from y'all."], ['pockets', "They still meet out there. Ain't nobody fixed that fence."], () => { toast('Notebook', 'Dre broke his ankle at the old Arundel station fence.'); }]);
      }));
    } });
  },
  afterIntro() { tip('eyes', 'Eyes on', 'Photograph the crew\'s faces, read what each one does, and find Pockets in the alley behind the market. Don\'t stand around in plain view.'); },
  intro: () => [['lou', "Four faces. Names if we can get 'em. Don't stand on the corner like you're waiting for a bus, unless you're at the bus stop."], ['dana', "I'll find a bus stop."]],
  update(F) {
    // Tee's intel bark now and then, if you're close enough to hear it
    const lt = F.corner.crew.lieutenant;
    if (lt && !lt.bubble && RNG.cos() < .002) lt.say(RNG.cos() < .5 ? 'Pigeon, get your little behind back up on that roof.' : 'Re-up at four. The old gas station.', { intel: RNG.cos() < .5 ? 'intel:pigeon-roof' : 'intel:reup-gas' });
    const g = this.goals(F);
    if (g.faces >= 4 && g.reads >= 2 && FL().pocketsMet && F.me.inCar && !F.done) finish();
  },
  goals() { return { faces: CREW4.filter(id => hasFact('face:' + id)).length, reads: STATE.facts.filter(f => f.startsWith('obs:')).length }; },
  objective(F) {
    const g = this.goals(F);
    if (g.faces < 4) { const nxt = CREW4.find(id => !hasFact('face:' + id)), a = F.corner.agents.find(x => x.person === nxt); return { step: 'EP1 · 1/4', title: 'Photograph the crew (' + g.faces + '/4)', text: 'Faces toward you. Hold still until the ring closes.', at: a ? { x: a.x, y: a.y, z: a.z } : null }; }
    if (g.reads < 2) return { step: 'EP1 · 2/4', title: 'Read their roles (' + g.reads + '/2)', text: 'Hold the camera on someone doing their job for 3 seconds', at: C(30.5, 32.5) };
    if (!FL().pocketsMet) return { step: 'EP1 · 3/4', title: 'Find Pockets', text: 'The alley behind Gaither Market', at: C(27, 21) };
    return { step: 'EP1 · 4/4', title: 'Back to the Chevy', text: 'Wait in the car to wrap up', at: C(34.5, 29.3) };
  },
  bot(F, dt) {   // attract: Dana on the bench photographs the next sale
    const p = F.me; if (!F.flags.sat) { F.flags.sat = 1; p.body.x = 42.5 * T; p.body.y = 30.4 * T; p.cover = 'sit'; }
    const ctl = p.ctl; ctl.watch = true; const sale = F.corner.agents.find(a => a.act === 'sale-money' || a.act === 'sale-product') || F.corner.crew.lieutenant;
    F.botAim = sale ? { x: sale.x, y: sale.y } : null; F.botT = (F.botT || 0) + dt;
    if (F.botT > 3.5 && p.cam.target && p.cam.focusT > .38) { F.botT = 0; ctl.tap('photo'); }
  }
};

/* ---- 2.3 PAYPHONES, then the chase ---- */
const ESC = { A: [30, 33], B: [30, 42], C: [20, 42.5], D: [11, 42.5], E: [9, 43], Q: [9, 26], R: [20, 30], F: [25, 44.5], G: [18, 45.5], H: [18, 50], I: [11, 50], E2: [9, 50], J: [29, 36], K: [26, 36], L: [25, 41], M: [30, 26], N: [27, 20.5], O: [12, 20.5], P: [9, 20] };
const ESC_E = [['A', 'B'], ['A', 'J', 'c'], ['A', 'M'], ['A', 'R'], ['B', 'C'], ['B', 'F'], ['C', 'D'], ['C', 'L'], ['D', 'E'], ['E', 'Q'], ['E', 'E2'], ['F', 'G', 'g'], ['G', 'H'], ['H', 'I'], ['I', 'E2', 'v'], ['J', 'K', 'c'], ['K', 'L'], ['M', 'N'], ['N', 'O'], ['O', 'P'], ['P', 'Q'], ['Q', 'R']];
const escNbr = n => ESC_E.filter(e => e[0] === n || e[1] === n).map(e => ({ to: e[0] === n ? e[1] : e[0], kind: e[2] || 'run' }));
const Chase = {
  start(F) {
    const c = F.corner, co = c.agents.find(a => a.person === 'corey'); if (co) { co.gone = true; }
    const p = C(30, 33), r = npc('corey', 30, 33, { id: 'runner', face: 0 }); r.brain = () => {}; r.speed = 0;
    F.ch = { r, node: 'A', next: null, t: 0, unseen: 0, sprintT: 10, rest: 0, ditched: null, pkg: null, down: false, cuffed: false, blocked: null, lou: false, kidT: 0, kidGone: false, stumble: 0 };
    const me = F.me; me.body.x = 36 * T; me.body.y = 30.5 * T; me.facing = Math.PI; F.pursuit = true; me.stamina = 100;
    c.shutdown('knockers', 120); c.knockers(c.crew.money || co);
    Music.play('chase'); this.pick(F);
    tip('chase', 'Foot chase', 'Hold ' + Prompt.label('sprint') + ' to sprint (stamina). Cut through, vault fences with ' + Prompt.label('interact') + ', and when you\'re on him: ' + Prompt.label('interact') + ' to tackle.');
  },
  pick(F) {
    const ch = F.ch, me = F.me, here = ESC[ch.node], hx = C(...here);
    let best = null, bs = -1e9;
    for (const e of escNbr(ch.node)) {
      if (ch.blocked && ((ch.blocked[0] === ch.node && ch.blocked[1] === e.to) || (ch.blocked[1] === ch.node && ch.blocked[0] === e.to))) continue;
      const q = C(...ESC[e.to]), d = dist(me, q), align = Math.cos(angTo(hx, q) - angTo(hx, me));
      const s = d - .5 * align * 60 + RNG.sim() * 20 + (e.kind !== 'run' ? 30 : 0) - (e.to === ch.prev ? 80 : 0);
      if (s > bs) { bs = s; best = e; }
    }
    ch.prev = ch.node; ch.next = best;
  },
  update(F, dt) {
    const ch = F.ch, r = ch.r, me = F.me; if (!ch || ch.cuffed) return;
    ch.t += dt;
    const seen = World.map.sight({ x: me.x, y: me.y, z: 0 }, { x: r.x, y: r.y, z: 0 }) && dist(me, r) < 300;
    if (!ch.down) {
      ch.unseen = seen ? 0 : ch.unseen + dt; if (ch.unseen > 4) ch.sprintT = Math.max(ch.sprintT, 3);
      if (ch.unseen > 8) { F.ch = null; F.pursuit = false; meter('brass', -5, 'He got away'); STATE.stats.retries++; Talk.run([['lou', "He's gone. Kid knows those alleys better than his own name."]], () => this.retry(F)); return; }
      ch.sprintT -= dt; const sp = ch.sprintT > 0 ? 112 : 92;
      const tgt = C(...ESC[ch.next.to]), d = dist(r, tgt);
      if (ch.next.kind === 'v') { ch.vz = (ch.vz || 0); }
      if (d < 4) { ch.node = ch.next.to; this.pick(F); }
      else { r.body.x += (tgt.x - r.x) / d * sp * dt; r.body.y += (tgt.y - r.y) / d * sp * dt; r.facing = angTo(r, tgt); r.body.vx = (tgt.x - r.x) / d * sp; r.body.vy = (tgt.y - r.y) / d * sp; r.z = ch.next.kind === 'v' ? Math.max(0, Math.sin(clamp(1 - d / 32, 0, 1) * Math.PI) * 12) : 0; if (ch.next.kind === 'v' && d < 30 && !ch.vs) { ch.vs = 1; sfx('fence'); } if (d > 30) ch.vs = 0; }
      // Lou takes the car around at 15 s: his car blocks the next edge
      if (ch.t > 15 && !ch.lou) { ch.lou = true; ch.blocked = [ch.node, ch.next.to]; const a = C(...ESC[ch.node]), b = C(...ESC[ch.next.to]); ch.blockAt = { x: lerp(a.x, b.x, .5), y: lerp(a.y, b.y, .5), f: angTo(a, b) }; sfx('busbrake'); toast('Szabo', 'Took the car around. He\'s cut off.'); this.pick(F); }
      // ditch the package: when you get close, or after 10 s
      if (!ch.ditched && (dist(me, r) < 90 || ch.t > 10)) { const sp2 = DITCH.map(s => ({ s, d: dist(r, C(...s.at)) })).filter(o => o.d < 60).sort((a, b) => a.d - b.d)[0]; if (sp2) { ch.ditched = sp2.s; ch.pkg = C(...sp2.s.at); r.doAct('throw', .4); sfx('blip'); game.particles.glints(ch.pkg.x, ch.pkg.y, 6, 6, '#ffe8a0'); ch.kidT = 45; } }
      // the tackle
      const near = dist(me, r) < 16;
      if (ch.stumble > 0) { ch.stumble -= dt; me.locked = ch.stumble > 0; }
      F.chasePrompt = near && me.sprinting ? 'Tackle' : null;
      if (me.ctl.pressed('interact') && dist(me, r) < 26 && ch.stumble <= 0) {
        if (dist(me, r) < 18) { ch.down = true; r.pose = 'down'; r.body.vx = r.body.vy = 0; sfx('punch'); game.shake(4); game.particles.dust(r.x, r.y, 0, 10); me.ctl.human && game.input.rumble(.6, .25); }
        else { ch.stumble = .8; me.locked = true; sfx('swing'); toast('Missed', ''); }
      }
      // the vault for Dana: a fence cell just ahead
      const ax = me.x + Math.cos(me.facing) * 14, ay = me.y + Math.sin(me.facing) * 14;
      F.vaultable = World.floorAt(ax, ay) === 'fence' && me.moving && me.body.z < 1;
    } else {
      F.chasePrompt = null; F.vaultable = false;
      if (me.ctl.down('interact') && dist(me, r) < 22) { ch.cuffT = (ch.cuffT || 0) + dt; if (ch.cuffT >= 1.2) { ch.cuffed = true; r.pose = 'cuffed'; sfx('cuffs'); game.after(.06, () => sfx('cuffs')); me.ctl.human && game.input.rumble(.4, .2); STATE.stats.chases++; F.pursuit = false; Music.play('field');
        addEvidence({ id: 'pager', kind: 'seizure', text: "Corey's pager, label 555-0110", direct: true }); addFact('seized:pager', 3, true); STATE.numbers.PG.known = true; meter('brass', 10, 'Corey Lyle in custody'); meter('heat', 10, 'They took Corey');
        toast('Cuffed', 'Corey Lyle. His pager is still buzzing.'); } } else ch.cuffT = 0;
    }
    if (ch.ditched && !ch.found && ch.kidT > 0) { ch.kidT -= dt; if (ch.kidT <= 0 && !ch.ditched.lost) { ch.kidGone = true; meter('heat', 5, 'A kid on a bike took the package'); toast('Gone', 'A kid on a bike just rode off with it.'); } }
  },
  retry(F) { Director.restartBeat(); }
};
MISSIONS.phones = {
  place: 'Ridley Avenue', mood: 'day', clock: ['11:00', '13:00'], clockRate: .3, start: [24, 30.4], civilians: 14, corner: { rate: .12 },
  setup(F) {
    coverInteracts(F);
    for (const id of ['P1', 'P2', 'P3']) { const [cx, cy] = POI[id]; F.interact({ id, at: C(cx, cy + (cy === 26 ? .4 : -.4)), verb: 'Read the number', hint: 'Payphone ' + id, hold: 2, when: () => !STATE.numbers[id].known && !F.ch,
      act: () => { STATE.numbers[id].known = true; addFact('num:' + id, 1, true); addEvidence({ id: 'numplate:' + id, kind: 'obs', text: id + ' payphone: ' + STATE.numbers[id].n }); toast(id + ': ' + STATE.numbers[id].n, 'Written in your notebook'); sfx('typekey');
        if (['P1', 'P2', 'P3'].every(k => STATE.numbers[k].known)) game.after(4, () => this.radio(F)); } }); }
    F.interact({ id: 'vault', at: () => ({ x: F.me.x + Math.cos(F.me.facing) * 10, y: F.me.y + Math.sin(F.me.facing) * 10 }), r: 30, verb: 'Vault', when: () => !!F.vaultable, act: () => { const b = F.me.body; F.me.vaulting = true; b.jump(170); b.vx = Math.cos(F.me.facing) * 95; b.vy = Math.sin(F.me.facing) * 95; sfx('fence'); } });
    F.interact({ id: 'cuff', at: () => F.ch ? F.ch.r : { x: -999, y: -999 }, r: 22, verb: 'Cuff (hold)', when: () => F.ch && F.ch.down && !F.ch.cuffed, act: () => {} });
    for (const s of DITCH) F.interact({ id: 'd' + s.id, at: C(...s.at), verb: 'Search ' + s.kind, hold: 2, r: 22, when: () => F.ch && F.ch.cuffed && !F.ch.searched && !F.searchedAll, act: () => {
      const ch = F.ch; F.flags['s' + s.id] = 1; sfx('rustle');
      if (ch.ditched && ch.ditched.id === s.id && !ch.ditched.lost && !ch.kidGone) { ch.found = ch.searched = true; FL().packageFound = true; addEvidence({ id: 'package', kind: 'seizure', text: 'Forty vials, orange tops', direct: true }); addFact('seized:package', 5, true); meter('brass', 5, 'Dope on the table'); toast('Found it', 'Forty vials. Orange tops.'); this.wrap(F); }
      else if (ch.ditched && ch.ditched.id === s.id) { ch.searched = true; toast(ch.ditched.lost ? 'Down the drain' : 'Gone', 'Nothing here now.'); this.wrap(F); }
      else toast('Nothing', 'Cigarette butts and a lottery ticket.');
    } });
  },
  radio(F) { if (F.ch || F.flags.radio) return; F.flags.radio = 1; sfx('radio'); Talk.run([['navarre', 'Whitlock. Knockers are rolling on the corner. They want the stash kid with the pager. Be ready.'], ['dana', "He's going to run."], ['navarre', "That's why you're there."]], () => Chase.start(F), { phone: false }); },
  wrap(F) { Talk.run([['lou', FL().packageFound ? "Nice work. Now he's got a reason to talk." : "No package. He's still got a pager and a mother. That's something."]], () => finish()); },
  update(F, dt) {
    if (F.ch) Chase.update(F, dt);
    if (F.ch && F.ch.cuffed && !F.ch.ditched && !F.flags.wrapped) { F.flags.wrapped = 1; this.wrap(F); }
    if (F.ch && F.ch.cuffed && F.ch.ditched && (F.ch.kidGone || F.ch.ditched.lost) && !F.flags.wrapped) { F.flags.wrapped = 1; this.wrap(F); }
  },
  prompt(F) { return F.chasePrompt ? { act: 'interact', label: F.chasePrompt } : null; },
  drawUnder(F, r) { const ch = F.ch; if (ch && ch.blockAt) r.shape('chevy', ch.blockAt.x, ch.blockAt.y, 0, { facing: ch.blockAt.f + Math.PI / 2 }); if (ch && ch.pkg && !ch.found && !ch.kidGone && !ch.ditched.lost && Math.floor(game.time * 3) % 3 === 0) r.prop('crystal', ch.pkg.x, ch.pkg.y, 0, { size: .4, color: '#ffa040' }); },
  objective(F) {
    const k = ['P1', 'P2', 'P3'].filter(id => STATE.numbers[id].known).length, ch = F.ch;
    if (!ch && k < 3) { const id = ['P1', 'P2', 'P3'].find(i => !STATE.numbers[i].known); return { step: 'EP2 · 1/3', title: 'Read the payphone numbers (' + k + '/3)', text: 'Reading one in a lookout\'s view counts as loitering', at: C(...POI[id]) }; }
    if (!ch) return { step: 'EP2 · 1/3', title: 'Stand by', text: 'Navarre is on the radio' };
    if (!ch.cuffed) return { step: 'EP2 · 2/3', title: ch.down ? 'Cuff him (hold ' + Prompt.label('interact') + ')' : 'Catch Corey', text: 'Don\'t lose sight of him for 8 seconds', at: { x: ch.r.x, y: ch.r.y } };
    return { step: 'EP2 · 3/3', title: 'Find what he threw', text: ch.ditched ? 'Search where he ditched it' : '', at: ch.pkg || null };
  },
  counts: F => F.ch ? [['Chase', Math.floor(F.ch.t) + 's']] : [['Numbers', ['P1', 'P2', 'P3'].filter(id => STATE.numbers[id].known).length + '/3']],
  bot(F, dt) {   // attract: Dana chases and catches Corey
    if (!F.ch) { F.flags.radio = 1; Chase.start(F); F.ch.ditched = DITCH[1]; }
    const ch = F.ch, me = F.me; if (!ch) return; me.ctl.run = true; me.stamina = 100;
    const d = dist(me, ch.r); me.ctl.mv = d > 2 ? [(ch.r.x - me.x) / d, (ch.r.y - me.y) / d] : [0, 0];
    if (d > 60) { me.body.x = lerp(me.body.x, ch.r.x, .02); me.body.y = lerp(me.body.y, ch.r.y, .02); }
    if (d < 16 && !ch.down) me.ctl.tap('interact'); if (ch.down) me.ctl.held.interact = true;
  }
};

/* ---- 3.4 THE VAN: Ren drives, the long lens, the Harstad truck, Dale, and Sunday ---- */
const VAN_SPOTS = { V1: [58, 45, -Math.PI / 2], V2: [62.5, 29.2, Math.PI], V3: [63, 33, Math.PI / 2] };
MISSIONS.van = {
  place: 'Arundel Gas (closed)', mood: 'dusk', clock: ['15:30', '16:45'], clockRate: 1.1, start: [58, 45], civilians: 6, vanWatch: true, cam: { film: 48, range: 360, pan: 14 * T },
  setup(F) {
    F.flags.heat = 0; F.flags.parked = 0;
    const truck = F.truck = new Target({ id: 'truck', x: 64 * T, y: 54 * T, shape: 'boxtruck', facing: -Math.PI / 2, tag: 'plate:harstad', tagText: 'Harstad Auto Parts truck · Dundalk · 555-0174', visible: false });
    const dale = F.dale = npc('dale', 64, 49, { id: 'dale', face: Math.PI }); dale.visible = false; dale.role = 'courier';
    const tav = F.tav = npc('tavon', 57.5, 40, { id: 'tav', face: 0 }); tav.visible = false; tav.role = 'runner';
    const bike = F.bike = npc('pigeon', 58, 42, { id: 'bike' }); bike.visible = false; bike.role = 'lookout'; bike.watcher = true; bike.range = 140; bike.speed = 80;
    F.extras.push(truck); FD.npcs.push(truck);
    F.flags.ev = { truck: hm('15:48'), hand: hm('16:00'), sunday: hm('16:18') };
    const ff = ops1Van();
    if (ff === 'chevy') { F.flags.heatMul = 1.5; }
  },
  intro: () => [['ren', "Long lens, forty-eight shots. Every spot reaches the pumps. The closer, the hotter."], ['lou', "(radio) Pick your spot, Whitlock. You've got about forty minutes before they look twice at you."]],
  afterIntro(F) { this.pickSpot(F); },
  pickSpot(F, burned) {
    const spots = Object.keys(VAN_SPOTS).filter(k => k !== burned);
    UI.cards({ kicker: 'THE VAN', title: burned ? 'Relocate' : 'Where do we park?', cards: spots.map(k => ({ title: { V1: 'Harlow curb', V2: 'Ridley east', V3: 'The lot gap' }[k], body: { V1: 'Close and clear. Hot.', V2: 'Far. Safe. The long lens has to work.', V3: 'Inside the vacant lot, in the middle.' }[k], k })),
      pick: (i, c) => { const [cx, cy, f] = VAN_SPOTS[c.k]; F.van = { x: cx * T, y: cy * T, f, k: c.k }; const me = F.me; me.body.x = cx * T; me.body.y = cy * T; me.inCar = true; me.cover = 'car'; F.flags.heat = 0; F.flags.parked = 0; tip('van', 'The van', 'Hold ' + Prompt.label('watch') + ' for the long lens. Van heat climbs while lookouts are near.'); } });
  },
  update(F, dt) {
    const me = F.me, c = F.clock, ev = F.flags.ev; me.inCar = true; me.locked = true;
    if (!F.van) return;
    // van heat
    F.flags.parked += dt; const near = [F.bike, F.tav].filter(a => a.visible && dist(a, F.van) < 160).length;
    if (near) F.flags.heat += dt / 12 * 4 * (F.flags.heatMul || 1);
    if ([F.bike, F.tav].some(a => a.visible && dist(a, F.van) < 40) && F.flags.parked > 90 && !F.flags.passBump) { F.flags.passBump = 1; F.flags.heat += 25; }
    if (F.flags.heat >= 100 && !F.flags.burnedVan) { F.flags.burnedVan = 1; F.bike.say('That van been there two days.'); meter('heat', 10, 'They made the van'); this.pickSpot(F, F.van.k); }
    // the truck, Dale, Tavon, the handoff windows
    if (c >= ev.truck && !F.flags.truckIn) { F.flags.truckIn = 1; F.truck.visible = true; sfx('engine'); }
    if (F.flags.truckIn && F.truck.y > 48.5 * T) F.truck.y -= 30 * dt;
    if (F.truck.y <= 48.5 * T && !F.flags.daleOut) { F.flags.daleOut = 1; F.dale.visible = true; F.dale.goCell(62, 48.4, 30); F.tav.visible = true; F.tav.goCell(61, 48.6, 46); F.bike.visible = true; }
    if (F.bike.visible && !F.bike.goal) { const pts = [[58, 42], [58, 54], [62, 44], [66, 42]]; F.bikeI = ((F.bikeI || 0) + 1) % 4; F.bike.goCell(...pts[F.bikeI], 80); }
    if (c >= ev.hand && F.flags.daleOut && !F.flags.handN) F.flags.handN = 0;
    if (F.flags.handN !== undefined && F.flags.handN < 3 && !F.dale.act && dist(F.dale, F.tav) < 30) { F.flags.handT = (F.flags.handT || 0) - dt; if (F.flags.handT <= 0) { F.flags.handT = 6; F.flags.handN++; F.dale.facing = angTo(F.dale, F.tav); F.tav.facing = angTo(F.tav, F.dale); F.dale.doAct('reup-handoff', 2.2, 'count'); F.tav.doAct('reup-handoff', 2.2, 'count'); } }
    // Sunday's hearse
    if (c >= ev.sunday && !F.flags.sunday) { F.flags.sunday = 1; F.hearse = { x: 70 * T, y: 47.5 * T }; F.sun = npc('sunday', 67, 47.5, { id: 'sun' }); F.sun.visible = false; sfx('engine'); }
    if (F.hearse && F.hearse.x > 64.5 * T) F.hearse.x -= 50 * dt; else if (F.hearse && !F.flags.rob) { F.flags.rob = 1; F.sun.visible = true; F.sun.body.x = 64 * T; F.sun.body.y = 47.6 * T; F.sun.goTo(F.tav.x + 10, F.tav.y, 50, () => { F.sun.facing = angTo(F.sun, F.tav); F.sun.doAct('robbery', 4, 'guard'); F.tav.pose = 'handsup'; F.tav.say('Aight, aight! Take it!'); game.after(4.5, () => this.dilemma(F)); }); }
  },
  dilemma(F) {
    if (F.flags.dil) return; F.flags.dil = 1;
    Talk.run([['ren', "He's got a gun on that kid. We have to do something."], ['lou', "(radio) We do something, the wire's dead by tonight, and that kid's still a corner kid tomorrow."]], () => UI.cards({ kicker: 'SUNDAY', title: 'A man with a gun on a seventeen-year-old', cards: [
      { title: 'Stay on the eye', body: 'Photograph it. Put Sunday on the Board.', cost: 'Violence follows' },
      { title: 'Call it in anonymously', body: 'A patrol car rolls up. Sunday leaves.', cost: 'Heat +20' },
      { title: 'Go in yourself', body: 'Badge out. Talk him down.', cost: 'Van burned · Heat +30 · Brass +10' }],
      pick: i => {
        FL().dilemma = ['stay', 'call', 'go'][i]; addFact('name:sunday', 2, true);
        if (i === 1) { meter('heat', 20, 'Patrol rolled up on the re-up'); sfx('siren'); }
        if (i === 2) { meter('heat', 30, 'A detective walked out of that van'); meter('brass', 10, 'Recovered the package'); return Talk.run([['dana', 'Police. Put it down.'], ['sunday', "Detective. Ain't Sunday, so it's business. But I don't do police."], ['sunday', 'Police do me.']], () => finish()); }
        game.after(1, () => finish());
      } }));
  },
  drawUnder(F, r) {
    if (F.van) r.shape(ops1Van() === 'chevy' ? 'chevy' : 'van', F.van.x, F.van.y, 0, { facing: F.van.f });
    if (F.hearse) r.shape('hearse', F.hearse.x, F.hearse.y, 0, { facing: Math.PI });
  },
  bars: F => F.van ? [{ label: 'Van heat', value: Math.min(100, F.flags.heat), max: 100, color: '#ff9a40' }] : [],
  objective(F) {
    const plate = hasFact('plate:harstad'), dale = hasFact('act:dale:reup-handoff');
    if (!plate) return { step: 'EP3 · VAN', title: 'Photograph the truck', text: 'Its side and plate, in focus', at: F.truck.visible ? { x: F.truck.x, y: F.truck.y } : C(62, 48) };
    if (!dale) return { step: 'EP3 · VAN', title: 'Catch the driver in the act', text: 'The handoff at the pumps', at: { x: F.dale.x, y: F.dale.y } };
    return { step: 'EP3 · VAN', title: 'Stay on the eye', text: 'Something else is coming down Harlow' };
  },
  onPhoto(F, ph, t) { if (t === F.dale && ph.tags.includes('face')) addFact('face:dale', 2, true); if (t === F.sun && ph.tags.includes('act')) addEvidence({ id: 'act:sunday:robbery', kind: 'photo', ref: ph.id, text: 'Sunday robbing the re-up', who: 'sunday' }); },
  counts: F => [['Film', F.me.cam.film]]
};
const ops1Van = () => FL().ops1 === 'ot' ? 'chevy' : 'van';
