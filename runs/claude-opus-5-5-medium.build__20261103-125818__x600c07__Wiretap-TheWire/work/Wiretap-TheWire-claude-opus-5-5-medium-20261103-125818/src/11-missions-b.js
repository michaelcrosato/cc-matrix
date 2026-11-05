// WIRETAP: field missions, part two. The tail (distance band, counter-surveillance, the partner hand-off), the trash
// search, the raid (plan, breach, reactions, search; the 60-second rescue), the money tail and the long lens, and Tee's
// nights on the corner (the order wheel, the code card and pager, the payphone keypad, the count).
const TEE_DRY = [[30, 32], [30, 26], [28, 26, 'window', 3], [20, 26, 'lookBack'], [9, 26], [9, 21], [15, 20.5, 'doubleBack'], [29, 20.5], [30, 15, 'wait', 4], [44, 15, 'lookBack'], [56, 15], [56, 30],
  [41, 30, 'phone', 4], [34, 30], [33, 31, 'window', 3], [30, 32], [30, 44, 'wait', 3], [18, 45], [18, 49]];
const COUNT_RUN = [[27, 36], [26, 36], [25, 41], [25, 42.5, 'cut'], [30, 43], [33, 31, 'window', 3], [33, 26], [33, 21, 'lookBack'], [46, 21]];
/** a route walker with counter-surveillance acts: the target of a tail */
function routeBrain(route, o = {}) {
  return (a, dt, F) => {
    const st = a.rt = a.rt || { i: 1, act: null, t: 0, back: 0 };
    if (st.i >= route.length) { a.stop(); a.arrived = true; return; }
    if (st.act) { st.t -= dt; a.stop();
      if (st.act === 'lookBack') { a.facing = E.approachAng(a.facing, (a.walkDir || 0) + Math.PI, dt * 6); a.fov = 2.2; }
      else if (st.act === 'window') { a.fov = 1.2; a.facing = E.approachAng(a.facing, (a.walkDir || 0) + Math.PI, dt * 3); }
      else if (st.act === 'phone') a.pose = 'phone';
      if (st.t <= 0) { st.act = null; a.fov = o.fov || 1.5; a.pose = null; }
      return; }
    const w = route[st.i], p = C(w[0], w[1]);
    if (!a.goal) a.goTo(p.x, p.y, w[2] === 'cut' ? 70 : (o.speed || 46), () => {
      const nxt = route[st.i]; st.i++;
      if (o.onWaypoint) o.onWaypoint(st.i - 1, a);
      if (nxt[2] && nxt[2] !== 'cut') { st.act = nxt[2] === 'doubleBack' ? null : nxt[2]; st.t = nxt[3] || 2.5; if (nxt[2] === 'doubleBack') { const b = C(nxt[0] - 3, nxt[1]); a.goTo(b.x, b.y, 46); } }
      if (o.extraLook && o.extraLook.includes(st.i - 1)) { st.act = 'lookBack'; st.t = 2.5; }
    });
    if (a.goal) a.walkDir = Math.atan2(a.goal.y - a.y, a.goal.x - a.x);
  };
}
function tailCheck(F, dt, tgt, o = {}) {
  const me = F.me, d = dist(me, tgt), sight = World.map.sight({ x: me.x, y: me.y, z: 0 }, { x: tgt.x, y: tgt.y, z: 0 });
  me.tooClose = d < 64; F.band = d;
  const lose = DIFF().lose * 1.5 * (o.ease || 1);
  if (d > 240 || !sight) F.losing = (F.losing || 0) + dt; else F.losing = Math.max(0, (F.losing || 0) - dt * 2);
  // mirroring: stopping when he stops
  const ra = tgt.rt && tgt.rt.act; if (ra && ra !== 'phone' && me.still > .5 && me.still < 3 && !me.cover && sight && d < 170) me.still = 2.1;
  if (F.losing > lose) return 'lost';
  return null;
}
MISSIONS.tail = {
  place: 'Penn Row, the long way', mood: 'night', rain: .6, clock: ['20:00', '21:20'], clockRate: .8, start: [30, 27], civilians: 8, stamina: true, music: 'field',
  setup(F) {
    const extra = STATE.meters.heat >= 70 ? [6, 11, 15] : [];
    const tee = F.tee = npc('tee', 30, 32, { id: 'teeT', watcher: true, range: 170, fov: 1.5 }); tee.brain = routeBrain(TEE_DRY, { extraLook: extra, onWaypoint: i => { if ([4, 9, 13].includes(i)) F.cp = i; } });
    F.cp = 0; F.extraCops = [];
    const lou = F.partner = makePlayer('lou', C(26, 27), { id: 'lou', ctl: new BotCtl() }); lou.brain = (a, dt) => this.shadow(F, a, dt);
    F.handT = 0;
    F.interact({ id: 'hand', at: () => F.me, r: 999, verb: 'Hand off to partner', when: () => false, act: () => {} });
  },
  intro: () => [['lou', "He's going to dry clean. Doubles back, stops in windows, looks behind him. When he stops, you keep walking."], ['lou', "If he looks at you twice, give me the eye. I'll be a street over."]],
  afterIntro() { tip('tail', 'The tail', 'Stay in the green band. Too close and he notices; too far or out of sight and you lose him. Press ' + Prompt.label('partner') + ' to hand the eye to your partner.'); },
  shadow(F, a, dt) {   // the AI detective: 120-200 units from the target, outside its cone, a block over if it can
    const t = F.tee; a.ctl.mv = [0, 0];
    const want = { x: t.x - Math.cos(t.walkDir || 0) * 150 + Math.sin(t.walkDir || 0) * 40, y: t.y - Math.sin(t.walkDir || 0) * 150 - Math.cos(t.walkDir || 0) * 40 }, w = nearWalk(want.x, want.y);
    const d = dist(a, w); if (d > 20) { const f = World.flow(...World.map.toCell(w.x, w.y)).next(a.x, a.y), tg = f || w, l = Math.hypot(tg.x - a.x, tg.y - a.y) || 1; a.body.vx = (tg.x - a.x) / l * (d > 120 ? 85 : 52); a.body.vy = (tg.y - a.y) / l * (d > 120 ? 85 : 52); a.facing = Math.atan2(a.body.vy, a.body.vx); a.moving = true; a.still = 0; }
    else { a.body.vx = a.body.vy = 0; a.moving = false; a.still += dt; }
    a.body.update(dt, World.map); a.rig.update(dt, { x: a.x, y: a.y, z: 0, vx: a.body.vx, vy: a.body.vy, facing: a.facing });
  },
  update(F, dt) {
    const me = F.me, lou = F.partner, t = F.tee; F.handT -= dt;
    if (!F.flags.end && t.arrived) { F.flags.end = 1; for (const [id, cx, cy] of [['tavon', 17, 50], ['rook', 19, 50.5], ['pigeon', 18.5, 48.8]]) { const a = npc(id, cx, cy, { face: Math.PI }); a.role = 'crew'; } t.say('Everybody get one. New number Monday.'); t.doAct('handout', 30, 'count'); t.role = 'lieutenant'; toast('The handout', 'Read it: watch Tee hand them out.'); }
    if (F.flags.end) { if (me.cam.watching && me.cam.target === t && me.cam.readT > 2.5 && !F.flags.read) { F.flags.read = 1; addFact('obs:tee:burners', 4, true); addEvidence({ id: 'obs:burners', kind: 'obs', text: 'Tee handing out new phones at the basketball court' }); STATE.stats.tails++; Talk.run([['lou', 'Throwaways. Everybody on that court just got a new number.'], ['dana', 'And the boxes they came in went somewhere.']], () => finish()); } return; }
    // the hand-off: the other detective takes the eye
    if (me.ctl.pressed('partner') && F.handT <= 0) {
      const om = t.minds[lou.id];
      if (dist(lou, t) < 220 && (!om || om.level < .3)) { F.handT = 20; const hc = me.ctl; me.ctl = lou.ctl; lou.ctl = hc; F.me = lou; F.partner = me; me.brain = (a, dt2) => this.shadow(F, a, dt2); lou.brain = null; sfx('radio'); toast('Hand-off', nameOf(F.me.person) + ' has the eye.'); }
      else toast('Not yet', 'Your partner can\'t pick him up from there.');
    }
    const r = tailCheck(F, dt, t);
    if (r === 'lost') this.retry(F, 'You lost him.');
  },
  onMade(F, o, q) { if (o === F.tee) { this.retry(F, 'He made you.'); meter('heat', 10, 'Tee made a tail'); return false; } },
  retry(F, why) {
    STATE.stats.retries++; meter('brass', -5, 'Retry: ' + why);
    const i = F.cp, t = F.tee, w = TEE_DRY[i], p = C(w[0], w[1]); t.body.x = p.x; t.body.y = p.y; t.rt = { i: i + 1, act: null, t: 0 }; t.stop(); Perception.reset([t], F.me.id); Perception.reset([t], F.partner.id);
    const pw = TEE_DRY[Math.max(0, i - 1)], back = C(pw[0], pw[1]); F.me.body.x = back.x; F.me.body.y = back.y; F.losing = 0; toast(why, 'Back to the last checkpoint.');
  },
  bars(F) { const d = F.band || 0, c = d < 64 ? '#ff6040' : d < 160 ? '#7ad06a' : d < 220 ? '#ffc040' : '#ff6040'; return [{ label: d < 64 ? 'Too close' : d > 160 ? 'Losing him' : 'Distance: good', value: clamp(1 - Math.abs(d - 112) / 160, 0, 1), max: 1, color: c }, ...(F.losing > 0 ? [{ label: 'Losing him', value: F.losing, max: DIFF().lose, color: '#ff6040' }] : [])]; },
  objective(F) { return F.flags.end ? { step: 'EP4 · TAIL', title: 'Read the handout', text: 'Hold the camera on Tee', at: { x: F.tee.x, y: F.tee.y } } : { step: 'EP4 · TAIL', title: 'Tail Tee', text: 'Don\'t stop when he stops', at: { x: F.tee.x, y: F.tee.y } }; },
  prompt: F => F.handT <= 0 && !F.flags.end ? { act: 'partner', label: 'Hand off', hint: nameOf(F.partner.person) } : null,
  counts: F => [['Hand-off', F.handT > 0 ? Math.ceil(F.handT) + 's' : 'ready']],
  bot(F, dt) { const me = F.me, t = F.tee, d = dist(me, t); me.ctl.mv = d > 110 ? [(t.x - me.x) / d, (t.y - me.y) / d] : [0, 0]; Perception.reset([t], me.id); if (F.t > 6 && !F.flags.bh) { F.flags.bh = 1; me.ctl.tap('partner'); } }
};

/* ---- 4.4 TRASH: the alley behind Ridley Wireless ---- */
MISSIONS.trash = {
  place: 'Alley behind Ridley Wireless', mood: 'night', rain: .6, clock: ['21:30', '22:15'], clockRate: .5, start: [35, 20.5], civilians: 0,
  setup(F) {
    F.flags.bags = [[39.2, 20.4], [40.4, 21.3], [41.6, 20.5], [42.3, 21.4], [43.4, 20.6]]; F.flags.good = Math.floor(RNG.sim() * 5); F.flags.done = [];
    const nep = F.nep = npc('man', 44.6, 21.4, { id: 'nephew', watcher: true, range: 110, fov: 1.4, face: Math.PI, seed: 902, pose: 'smoke' });
    const moe = F.moe = npc('moe', 30, 20.5, { id: 'moeB', watcher: true, range: 120, fov: 1.6 }); moe.speed = 90; F.moeT = 10;
    F.flags.bags.forEach((b, i) => F.interact({ id: 'bag' + i, at: C(b[0], b[1]), verb: 'Search the bag', hold: 2.5, r: 16, when: () => !F.flags.done.includes(i) && !F.flags.found,
      act: () => { F.flags.done.push(i); sfx('rustle'); const n = E.hears(F.nep, { x: F.me.x, y: F.me.y, z: 0, loud: 60 }, World.map); if (n > 0) F.nep.minds[F.me.id] && F.nep.minds[F.me.id].hear(n, F.me);
        if (i === F.flags.good) { F.flags.found = 1; FL().serials = true; addEvidence({ id: 'serials', kind: 'serials', text: 'Twelve phone boxes, serial numbers intact', direct: true }); addFact('serials:burners', 5, true); Talk.run([['dana', 'Twelve boxes. Serial numbers on every one.'], ['lou', "(radio) Get out of there. We'll let the phone company do the rest."]], () => finish()); }
        else toast('Nothing', ['Chicken bones.', 'Receipts and a wig.', 'A broken radio.', 'Wet cardboard.'][i % 4]); } }));
  },
  intro: () => [['lou', '(radio) Kid on the bike comes through every forty seconds. Nephew smokes at the back door. Stay low and stay dark.']],
  update(F, dt) {
    const n = F.nep; n.facing = Math.PI + Math.sin(F.t * .5) * 1.2;
    F.moeT -= dt; if (F.moeT <= 0 && !F.moe.goal) { F.moeT = 40; F.moeDir = !F.moeDir; F.moe.goCell(F.moeDir ? 48 : 30, F.moeDir ? 20.5 : 21.2, 90); }
    // dark alley cells cut exposure when crouched (handled by perception's light), the crouch helps more here
    F.me.crouchDark = F.me.crouching;
  },
  suspicionMul: .9,
  onMade(F, o, q) { if (q === F.me) { meter('heat', 5, 'Spotted in the alley'); toast('Spotted', 'Back to the alley entrance.'); F.me.body.x = 35 * T; F.me.body.y = 20.5 * T; Perception.reset(Field.observers(), F.me.id); return false; } },
  drawUnder(F, r) { F.flags.bags.forEach((b, i) => { if (!F.flags.done.includes(i)) r.shape('trashbag', b[0] * T, b[1] * T, 0, {}); }); r.prop('lamp', 44 * T, 21.7 * T, 0, { light: true, size: .7 }); },
  objective(F) { return { step: 'EP4 · TRASH', title: 'Find the phone boxes (' + F.flags.done.length + '/5 searched)', text: 'Crouch (' + Prompt.label('crouch') + ') and stay out of their cones', at: C(41, 20.8) }; },
  counts: () => []
};

/* ---- 5.3A THE RAID (and the 60-second rescue) ---- */
MISSIONS.raid = {
  place: 'The garage behind the Courts', mood: 'night', clock: ['21:00', '21:40'], clockRate: .5, start: [44, 46], civilians: 3, music: 'chase', stamina: true,
  setup(F) {
    F.flags.phase = FL().coreyExposed ? 'rescue' : 'plan'; F.flags.spots = [['Car trunk', 51.5, 49.6], ['Ceiling tile', 53.5, 49.6], ['Toolbox', 51.5, 51.5], ['False wall', 54.2, 51.5]];
    F.flags.stash = shuffle([0, 1, 2, 3], RNG.sim).slice(0, 2); F.flags.searched = [];
    if (F.flags.phase === 'rescue') { F.flags.rescueT = 60; F.me.body.x = 36 * T; F.me.body.y = 30.5 * T; F.rk = npc('rook', 27.5, 36, { face: 0 }); F.cy = npc('corey', 28, 35.5, { face: Math.PI, pose: 'kneel' }); }
    F.interact({ id: 'breach', at: () => F.flags.door === 'side' ? C(49.4, 50) : C(55.6, 50.5), verb: 'Breach', when: () => F.flags.phase === 'stack', act: () => this.breach(F) });
    F.interact({ id: 'teeP', at: () => F.tee || { x: -999, y: -999 }, verb: 'Show the paper', when: () => F.flags.phase === 'react' && F.tee && !F.flags.paper, act: () => { F.flags.paper = 1; Talk.run([['tee', 'Let me see the paper.'], ['dana', 'Signed by Halloway this afternoon. Sit down, Terrence.'], ['tee', "You ain't gonna find nothing with my name on it."]]); } });
    F.interact({ id: 'hands', at: () => F.rookG || { x: -999, y: -999 }, verb: 'Hands!', when: () => F.flags.phase === 'react' && F.rookG && !F.flags.rookDone, act: () => { F.flags.rookDone = 1; sfx('confirm'); F.rookG.pose = 'handsup'; F.rookG.say('Aight! Aight.'); } });
    F.interact({ id: 'moeC', at: () => F.moeR || { x: -999, y: -999 }, verb: 'Grab him', when: () => F.flags.phase === 'react' && F.moeR && !F.flags.flushDone, act: () => { F.flags.flushDone = 1; F.flags.flushSaved = 1; F.moeR.pose = 'cuffed'; toast('Stopped the flush', 'The package stays out of the pipes.'); } });
    F.flags.spots.forEach((s, i) => F.interact({ id: 'sp' + i, at: C(s[1], s[2]), verb: 'Search: ' + s[0], hold: 2, r: 22, when: () => F.flags.phase === 'search' && !F.flags.searched.includes(i), act: () => {
      F.flags.searched.push(i); sfx('rustle');
      if (F.flags.stash.includes(i)) { const first = !F.flags.got; F.flags.got = (F.flags.got || 0) + 1; toast(first ? 'The package' : 'The cash and the gun', first ? 'Two kilos, Harstad boxes.' : '$41,000 and a 9mm.'); addEvidence({ id: 'seize:' + i, kind: 'seizure', text: first ? 'Two kilos in Harstad Auto Parts boxes' : '$41,000 and a pistol', direct: true }); addFact('seized:raid' + i, 5, true); if (F.flags.got >= 2) this.results(F); }
      else toast('Nothing', 'Plaster dust and an old calendar.');
    } }));
  },
  intro(F) { return FL().coreyExposed ? [['lou', "(radio) Dana. Corey's not answering. Somebody saw Rook walk him into fourteen-twelve. Sixty seconds, maybe less."]] : [['navarre', "(radio) Friday, nine o'clock. The truck's in. Your call on the door."]]; },
  afterIntro(F) { if (F.flags.phase === 'plan') this.plan(F); },
  plan(F) {
    UI.cards({ kicker: 'THE RAID', title: 'Which door?', cards: [{ title: 'Front: the roll-up', body: 'Dana and Lou on the big door. Ren on the side.', k: 'front' }, { title: 'The side door', body: 'Quieter. The roll-up is open on Harlow.', k: 'side' }, { title: 'Both: split the team', body: 'Everybody covered. Slower breach.', k: 'both' }],
      pick: (i, c) => { F.flags.door = c.k === 'side' ? 'side' : 'front'; F.flags.both = c.k === 'both'; F.flags.phase = 'stack'; const p = F.flags.door === 'side' ? C(48.6, 50) : C(56.6, 50.5); F.me.body.x = p.x; F.me.body.y = p.y;
        F.dl = npc('dale', 52, 50.2, { face: 0 }); F.tee = npc('tee', 53, 51.6, { face: Math.PI, pose: 'kneel' }); F.moeR = npc('moe', 51.5, 52, { face: 0 }); if (FL().rookFree) F.rookG = npc('rook', 54, 49.4, { face: Math.PI }); Music.play('chase'); } });
  },
  breach(F) {
    sfx('doorRam'); game.shake(4); game.particles.dust(F.me.x, F.me.y, 10, 14);
    for (const [cx, cy] of F.flags.door === 'side' ? [[50, 50]] : [[55, 50], [55, 51]]) World.map.set(cx, cy, 0);
    if (F.flags.both) for (const [cx, cy] of [[50, 50], [55, 50], [55, 51]]) World.map.set(cx, cy, 0);
    F.flags.phase = 'react'; F.flags.reactT = 30; F.flags.flushT = 6; F.flags.gunT = 3;
    F.moeR.goCell(54, 52, 70); F.dl.goCell(F.flags.door === 'side' || F.flags.both ? 55 : 49, 50.5, 80); F.tee.say('Let me see the paper.');
    if (F.rookG) F.rookG.say('...');
    toast('BREACH', 'Moe is running for the toilet. Rook is reaching.');
  },
  update(F, dt) {
    const fl = F.flags;
    if (fl.phase === 'rescue') { fl.rescueT -= dt; F.pursuit = true;
      if (dist(F.me, C(28, 36)) < 30) { fl.phase = 'plan'; FL().coreyRescued = true; F.rk.goCell(25, 42, 90); F.rk.say('...'); F.cy.say('Detective. I-I-I...'); toast('Corey is alive', 'Rook went out the back.'); meter('case', 2, null); this.plan(F); }
      else if (fl.rescueT <= 0) { fl.phase = 'plan'; FL().coreyRescued = false; F.cy.visible = false; F.rk.visible = false; toast('Too late', 'Fourteen-twelve is empty.'); this.plan(F); } return; }
    if (fl.phase === 'react') {
      fl.reactT -= dt; fl.flushT -= dt; fl.gunT -= dt;
      if (fl.flushT <= 0 && !fl.flushDone) { fl.flushDone = 1; if (F.flags.both && RNG.sim() < .5) { fl.flushSaved = 1; toast('Ren got him', 'Moe on the floor by the toilet.'); } else { toast('Flushed', 'Some of it went down the pipes.'); meter('case', -3, null); } }
      if (fl.gunT <= 0 && F.rookG && !fl.rookDone) { fl.rookDone = 1; FL().rookDrew = true; F.rookG.say('...'); game.after(2, () => { F.rookG.pose = 'handsup'; toast('He dropped it', 'Two long seconds.'); }); }
      if (F.dl && dist(F.dl, C(55, 50.5)) < 10 && !fl.daleDone && !F.flags.both && F.flags.door === 'side') { fl.daleDone = 1; F.dl.visible = false; FL().daleEscaped = true; toast('The courier ran', 'Out the roll-up and gone.'); }
      if (fl.reactT <= 0 || (fl.rookDone && fl.flushDone && fl.paper)) { fl.phase = 'search'; toast('Search it', 'Two of these four hold something.'); }
    }
  },
  results(F) {
    F.flags.phase = 'done'; meter('brass', 40, 'Dope on the table'); meter('heat', 15, 'The raid');
    Talk.run([['lou', 'Major blow, they\'ll say. Watch.']], () => finish());
  },
  drawUnder(F, r) {
    r.shape('boxtruck', 57.5 * T, 49 * T, 0, { facing: -Math.PI / 2 }); if (F.flags.phase !== 'rescue') lightBar(58 * T, 45 * T);
    // the four places to search, with their clues: a car's trunk, a ladder under a loose ceiling tile, a toolbox, plaster dust at a false wall
    if (F.flags.phase === 'search' || F.flags.phase === 'react' || F.flags.phase === 'done') {
      const S = F.flags.spots;
      r.shape('sedan', (S[0][1] - .3) * T, (S[0][2] - .6) * T, 0, { facing: Math.PI / 2 });
      r.queue(S[1][1] * T, S[1][2] * T, 0, g => { const a = r.w(S[1][1] * T - 3, S[1][2] * T, 0), b = r.w(S[1][1] * T - 3, S[1][2] * T, 22), c = r.w(S[1][1] * T + 3, S[1][2] * T, 0), d = r.w(S[1][1] * T + 3, S[1][2] * T, 22); px.line(g, a[0], a[1], b[0], b[1], '#a8884a'); px.line(g, c[0], c[1], d[0], d[1], '#a8884a'); for (let k = 1; k < 6; k++) { const p0 = r.w(S[1][1] * T - 3, S[1][2] * T, k * 4), p1 = r.w(S[1][1] * T + 3, S[1][2] * T, k * 4); px.line(g, p0[0], p0[1], p1[0], p1[1], '#a8884a'); } });
      r.shape('chest', S[2][1] * T, S[2][2] * T, 0, { facing: 0, scale: .7, mats: { w: '#a82a22 metal', b: '#3a3a3a', l: '#c8c8c8' } });
      r.decal(() => r.groundDisc(S[3][1] * T, S[3][2] * T, 6, '#d8d0c0', .5));
      for (const [i, sp] of S.entries()) if (F.flags.searched.includes(i)) r.decal(() => r.groundRing(sp[1] * T, sp[2] * T, 7, '#5a5a5a', .5));
    }
  },
  objective(F) {
    const fl = F.flags;
    if (fl.phase === 'rescue') return { step: 'EP5 · RESCUE', title: 'Get to 1412 Gaither (' + Math.ceil(fl.rescueT) + 's)', text: 'Run.', at: C(28, 36) };
    if (fl.phase === 'stack') return { step: 'EP5 · RAID', title: 'Breach the door', text: 'On your go', at: fl.door === 'side' ? C(49.4, 50) : C(55.6, 50.5) };
    if (fl.phase === 'react') return { step: 'EP5 · RAID', title: !fl.flushDone ? 'Stop Moe before he flushes it' : !fl.rookDone && F.rookG ? 'Rook: make him show his hands' : 'Talk to Tee', text: Math.ceil(fl.reactT) + 's', at: !fl.flushDone && F.moeR ? { x: F.moeR.x, y: F.moeR.y } : F.rookG && !fl.rookDone ? { x: F.rookG.x, y: F.rookG.y } : F.tee ? { x: F.tee.x, y: F.tee.y } : null };
    if (fl.phase === 'search') { const left = fl.spots.map((s, i) => [s, i]).filter(([, i]) => !fl.searched.includes(i)).sort((a, b) => dist(F.me, C(a[0][1], a[0][2])) - dist(F.me, C(b[0][1], b[0][2]))); const nx = left[0] && left[0][0]; return { step: 'EP5 · RAID', title: 'Search the garage (' + (fl.got || 0) + '/2 found)', text: nx ? 'Next: ' + nx[0] + ' · plaster dust, a ladder, a trunk, a toolbox' : '', at: nx ? C(nx[1], nx[2]) : C(52.5, 50.5) }; }
    return null;
  },
  counts: () => []
};

/* ---- 5.3B THE COUNT: the money tail, Lonnie's headlights, the long lens on Mama B's back room ---- */
MISSIONS.count = {
  place: "Mama B's, Thursday", mood: 'night', clock: ['22:30', '23:30'], clockRate: .7, start: [34, 30.6], civilians: 6,
  setup(F) {
    const who = FL().pigeonTrust >= 70 ? 'pigeon' : 'tavon'; F.flags.who = who;
    const r = F.runner = npc(who, 27, 36, { id: 'runnerC', watcher: true, range: who === 'pigeon' ? 120 : 170, fov: 1.5 }); r.brain = routeBrain(COUNT_RUN, { speed: 44 });
    const car = F.lonnie = npc('lonnie', 31.5, 13.5, { id: 'lonnieCar', watcher: true, range: 120, fov: .5 }); car.visible = false; car.carD = 0;
    F.flags.phase = 'tail'; F.lens = { t: 0, win: 0, n: 0, aim: [0, 0], focus: 0, got: false };
    F.interact({ id: 'roof', at: C(50, 20.6), verb: 'Climb to the roof', when: () => F.flags.phase === 'roof', act: () => { F.flags.phase = 'lens'; F.me.locked = true; F.me.body.x = 50 * T; F.me.body.y = 18 * T; F.me.body.z = 40; tip('lens', 'The long lens', 'Easy only shows his face when the money changes hands. Hold the frame on him, wait, and shoot when he looks up.'); } });
  },
  intro: F => [['dana', FL().pigeonTrust >= 70 ? "Pigeon said he'd walk slow. Back door of Mama B's." : 'Tavon carries the bag on Thursdays. He watches his back.'], ['lou', "(radio) Lonnie's driving circles. Stay out of his headlights."]],
  update(F, dt) {
    const car = F.lonnie, loop = [[31.5, 13.5], [57.5, 13.5], [57.5, 28.5], [31.5, 28.5]]; car.carD += 45 * dt;
    { let d = car.carD % 2600, i = 0; for (; i < 4; i++) { const a = C(...loop[i]), b = C(...loop[(i + 1) % 4]), s = dist(a, b); if (d < s) { car.body.x = lerp(a.x, b.x, d / s); car.body.y = lerp(a.y, b.y, d / s); car.facing = angTo(a, b); break; } d -= s; } }
    if (F.flags.phase === 'tail') { const r = tailCheck(F, dt, F.runner, { ease: F.flags.who === 'pigeon' ? 1.6 : 1 }); if (r === 'lost') { STATE.stats.retries++; meter('brass', -5, 'Lost the bag'); const s = C(...COUNT_RUN[0]); F.runner.body.x = s.x; F.runner.body.y = s.y; F.runner.rt = null; F.losing = 0; F.me.body.x = 33 * T; F.me.body.y = 30.6 * T; toast('Lost him', 'Again, from the vacant.'); }
      if (F.runner.arrived) { F.flags.phase = 'roof'; F.runner.visible = false; toast('Mama B\'s back door', 'He knocked twice. Now the roof across the alley.'); } }
    if (F.flags.phase === 'lens') this.lensUpdate(F, dt);
  },
  lensUpdate(F, dt) {
    const L = F.lens, c = F.me.ctl, I = game.input; L.t += dt;
    // three count-handoff windows of 4 s, every 11 s; the count goes round again if you miss them all
    const ph = L.t % 11; L.win = ph > 6 && ph < 10;
    const s = c.aimStick(), m = c.screenMove(); const v = Math.hypot(s[0], s[1]) > .2 ? s : m;
    const ptr = c.pointer && c.pointer();
    if (ptr && F.lensRect) { L.aim = [clamp((ptr[0] - F.lensRect.x) / F.lensRect.w * 2 - 1, -1, 1), clamp((ptr[1] - F.lensRect.y) / F.lensRect.h * 2 - 1, -1, 1)]; }
    else { L.aim[0] = clamp(L.aim[0] + v[0] * dt * 1.2, -1, 1); L.aim[1] = clamp(L.aim[1] + v[1] * dt * 1.2, -1, 1); }
    if (FD.attract) { L.aim[0] = lerp(L.aim[0], -.25, dt * 3); L.aim[1] = lerp(L.aim[1], -.1, dt * 3); }
    const on = Math.hypot(L.aim[0] + .25, L.aim[1] + .1) < .18; L.focus = on ? Math.min(1, L.focus + dt * 2.5) : Math.max(0, L.focus - dt * 3);
    if (c.pressed('photo') || (FD.attract && L.win && L.focus >= 1)) {
      F.me.cam.film--; shutterSound(); const stars = (on ? 1 : 0) * ((L.win ? 1 : 0) + (L.focus >= 1 ? 1 : 0) + (L.win && on ? 1 : 0));
      const ph = { id: 'easy' + Math.floor(L.t * 10), subject: 'easy', stars, tags: stars >= 3 ? ['face', 'focus', 'act', 'act:count-handoff'] : [], turn: 0, mood: 'night', clock: fmtTime(F.clock), ep: 5 };
      STATE.photos.push(ph); Camera.render(ph, null); toast('Darnell Booker ' + '★'.repeat(stars), stars >= 3 ? 'The money in his hands. His face.' : L.win ? 'Not sharp enough' : 'He isn\'t looking up');
      if (stars >= 3 && !L.got) { L.got = true; addFact('face:easy', 2, true); addEvidence({ id: 'act:easy:count', kind: 'photo', ref: ph.id, text: 'Darnell Booker taking the count at Mama B\'s', who: 'easy', direct: true }); meter('case', 20, 'Easy in the act'); Music.sting('photoGood'); game.after(1.5, () => Talk.run([['dana', 'Got him.'], ['lou', '(radio) Then get down off that roof before Lonnie comes round again.']], () => finish())); }
    }
  },
  overlay(F, r) {
    if (F.flags.phase !== 'lens') return;
    r.overlay(g => {
      const W = r.W, H = r.H, w = Math.min(W - 40, 300), hh = Math.min(H - 70, 180), x = Math.round((W - w) / 2), y = Math.round((H - hh) / 2) - 10, L = F.lens;
      F.lensRect = { x, y, w, h: hh };
      px.rect(g, 0, 0, W, H, '#050506'); px.rect(g, x, y, w, hh, '#3a2a1e');
      px.rect(g, x, y + hh * .62, w, hh * .38, '#5a3a22'); px.rect(g, x + w * .6, y + 8, w * .3, hh * .45, '#2a1a12');   // a back room: table, a door
      px.rect(g, x + w * .18, y + hh * .55, w * .46, 8, '#6a4a2a');
      px.disc(g, Math.round(x + w * .4), y + 14, 6, '#ffe0a0');
      for (let i = 0; i < 6; i++) px.rect(g, Math.round(x + w * .28 + i * 9), Math.round(y + hh * .55 - 4 - (i % 2) * 2), 7, 4, '#6aa04a');
      const ex = Math.round(x + w * .375), ey = Math.round(y + hh * .45);   // Easy, head down unless the money moves
      rigOf('lonnie').drawPortrait(g, Math.round(x + w * .62), Math.round(y + hh * .25), 56, { zoom: 1.1, turn: .5, bg: '#3a2a1e' });
      rigOf('easy').drawPortrait(g, ex - 32, ey - 32, 64, { zoom: 1.2, turn: L.win ? 0 : .95, bg: '#3a2a1e' });
      const ax = Math.round(x + w / 2 + L.aim[0] * w / 2), ay = Math.round(y + hh / 2 + L.aim[1] * hh / 2), rad = Math.round(20 - L.focus * 10), col = L.focus >= 1 ? '#7aff8a' : '#ffd84a';
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { px.line(g, ax + a * rad, ay + b * rad, ax + a * (rad - 6), ay + b * rad, col); px.line(g, ax + a * rad, ay + b * rad, ax + a * rad, ay + b * (rad - 6), col); }
      E.font.text(g, L.win ? 'THE MONEY IS MOVING' : 'WAIT FOR IT', W / 2, y + hh + 8, L.win ? '#ff7a5a' : '#cfc8b8', { align: 'center', outline: false });
      Glyph.prompt(g, 'photo', 'Take photo', Math.round(W / 2) - 40, y + hh + 22, '#ffffff');
      E.font.text(g, 'FILM ' + F.me.cam.film, x, y - 12, '#ffd84a', { outline: false });
    });
  },
  objective(F) { const ph = F.flags.phase; return ph === 'tail' ? { step: 'EP5 · THE COUNT', title: 'Follow the bag', text: F.flags.who === 'pigeon' ? 'Pigeon walks slow for you' : 'Tavon checks his back', at: { x: F.runner.x, y: F.runner.y } } : ph === 'roof' ? { step: 'EP5 · THE COUNT', title: 'The vacant across the alley', text: 'Its alley door', at: C(50, 20.6) } : ph === 'lens' ? { step: 'EP5 · THE COUNT', title: 'Easy, in the act', text: 'Three stars or nothing' } : null; },
  bars: F => F.flags.phase === 'tail' ? MISSIONS.tail.bars(F) : [],
  counts: F => [['Film', F.me.cam.film]],
  bot(F, dt) { if (F.flags.phase !== 'lens') { F.flags.phase = 'lens'; F.me.locked = true; } }
};
