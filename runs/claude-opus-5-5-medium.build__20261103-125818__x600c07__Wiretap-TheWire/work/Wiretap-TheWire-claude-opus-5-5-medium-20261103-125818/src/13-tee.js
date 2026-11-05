// WIRETAP: playing Tee. One night shift on the corner (the CornerSim with Tee as its lieutenant): the order wheel (hold
// Partner), studying people to call out a cop, the pager and the code card, the payphone keypad, the patrol, the knockers,
// the count at the end against Easy's number.
const INTERLUDES = {
  i1: { title: 'Interlude 1 · Night shift', target: 450, secs: 210, events: [[20, 'dutch'], [45, 'patrol'], [10, 'pigeonSleep'], [70, 'ud'], [130, 'reupNeed']],
    intro: [['rook', 'Who told you the old man\'s name, Tee? The bus driver.'], ['tee', 'Nobody told me nothing. Somebody called 911 and somebody downtown read it out loud. That\'s how it works.'], ['rook', 'Then it works for us.'], ['tee', 'It works till it don\'t. Count\'s at two. Get on your spot.']] },
  i2: { title: 'Interlude 2 · New stash', target: 420, secs: 180, events: [[5, 'stashPick'], [40, 'reupNeed'], [90, 'knockers'], [60, 'ud']],
    intro: [['tee', 'Corey\'s in Central. That means the stash moves tonight. And the phones... we pick a phone they ain\'t sitting on.']] },
  i3: { title: 'Interlude 3 · Making it back', target: 560, secs: 210, events: [[50, 'hearse'], [100, 'ud'], [120, 'shots']],
    intro: [['tee', 'Double shift. Pigeon running. We make back what Sunday took or Easy takes it out of somebody.']] },
  i4: { title: 'Interlude 4 · Throwaways', target: 380, secs: 150, events: [[25, 'danaCar'], [60, 'ud']],
    intro: [['tee', 'Everybody got the new phones? Old ones in the harbor. Not the trash. The harbor.']] }
};
const WHEEL = [['Shut it down', 'shut'], ['Open up', 'open'], ['Move the stash', 'stash'], ['Post up here', 'post']];
MISSIONS.tee = {
  place: 'Gaither & Ridley, night', mood: 'night', clock: ['22:00', '02:00'], clockRate: 1, player: 'tee', start: [30.2, 31.2], civilians: 8, music: 'corner',
  corner: { rate: .35, patrol: true, autoReup: false, vials: 60 },
  setup(F, data) {
    const I = F.il = INTERLUDES[data.il || 'i1']; F.flags.il = data.il || 'i1'; F.flags.T = 0; F.flags.ev = I.events.map(e => ({ t: e[0], k: e[1], done: false }));
    F.flags.inbox = STATE.cipher.dir === 'ccw' ? ['555-0312 11 00'] : ['555-0798 11 00']; F.clockRate = 240 / I.secs;
    const c = F.corner; c.o.payphones = false; c.led.start = c.led.vials;
    if (data.il === 'i2') { c.agents = c.agents.filter(a => a.person !== 'corey'); c.crew.stash = null; }
    if (data.il === 'i3' && !FL().rookFree) { c.agents = c.agents.filter(a => a.person !== 'rook'); c.crew.muscle = null; }
    // payphones: Tee dials the re-up on the number from the card
    for (const id of ['P1', 'P2', 'P3']) F.interact({ id: 'pay' + id, at: C(POI[id][0], POI[id][1] + (POI[id][1] === 26 ? .4 : -.4)), verb: 'Use the payphone', hint: id, when: () => F.flags.needCall, act: () => Cipher.dial('555-0174', n => {
      if (n === '555-0174') { F.flags.needCall = false; F.flags.called = id; FL().payphone = FL().payphone || id; sfx('ringback'); toast('Re-up ordered', 'The package comes in about forty seconds.'); c.reupT = 40; c.o.autoReup = false; game.after(40, () => { c.reup(100); toast('Package in', '100 vials'); }); }
      else if (n) toast('Wrong number', 'A woman yelling about her cable.'); }) });
    F.interact({ id: 'wake', at: C(34.3, 37.2), verb: 'Wake up, Pigeon', when: () => F.flags.asleep, act: () => { F.flags.asleep = false; const pg = c.agents.find(a => a.person === 'pigeon'); if (pg) { pg.watcher = true; pg.say('I\'m up! I\'m up.'); } } });
    F.interact({ id: 'dutch', at: () => F.dutch || { x: -999, y: -999 }, verb: 'Deal with Dutch', when: () => F.dutch && !F.flags.dutchDone, act: () => Talk.run([['man', 'Tee. Tee. I got eight. I\'m two short, I swear on my mother, I got you Friday.'],
      { choices: ['Let it slide', 'Turn him away', 'Let Rook handle it'], pick: i => { F.flags.dutchDone = 1; FL().dutch = ['slide', 'away', 'rook'][i]; if (i === 0) { c.led.vials -= 1; c.led.sold += 1; return [['tee', 'Friday. And Dutch? Everybody hears about it if you don\'t.']]; } if (i === 2) { meter('heat', 5, null); return [['rook', 'Come here, Dutch.'], ['tee', '...Easy, Rook. Easy.']]; } return [['tee', 'Ten is ten. Go on.']]; } }], () => { if (F.dutch) c.leave(F.dutch); }) });
    tip('tee', 'Tee', 'You run the corner tonight. Hold ' + Prompt.label('partner') + ' for orders. Hold ' + Prompt.label('watch') + ' to study people; ' + Prompt.label('photo') + ' calls out a cop. ' + Prompt.label('notebook') + ' opens your pager.');
  },
  intro: (F) => F.il.intro,
  pager(F) { Cipher.teeCard({ inbox: F.flags.inbox, send: (id, enc) => { F.flags.needCall = true; F.flags.paged = id; pagerSound(); toast('Paged', enc + ' · now call it in from a payphone'); } }); },
  update(F, dt) {
    const fl = F.flags, c = F.corner, me = F.me; fl.T += dt;
    for (const e of fl.ev) if (!e.done && fl.T >= e.t) { e.done = true; this.event(F, e.k); }
    // the order wheel: hold Partner, point, let go
    if (me.ctl.down('partner')) { F.wheel = F.wheel || { t: 0, sel: -1 }; F.wheel.t += dt; const m = me.ctl.screenMove(), ptr = me.ctl.pointer && me.ctl.pointer();
      let v = Math.hypot(m[0], m[1]) > .4 ? m : null; if (ptr && me.scr) { const dx = ptr[0] - me.scr[0], dy = ptr[1] - me.scr[1]; if (Math.hypot(dx, dy) > 12) v = [dx, dy]; }
      if (v) { const a = Math.atan2(v[1], v[0]); F.wheel.sel = Math.round(((a + Math.PI / 2 + TAU) % TAU) / (TAU / 4)) % 4; } me.locked = true; }
    else if (F.wheel) { const s = F.wheel.sel; F.wheel = null; me.locked = false; if (s >= 0) this.order(F, WHEEL[s][1]); }
    // calling out a cop: study someone, then Photo
    if (me.cam.watching && me.ctl.pressed('photo') && me.cam.target) { const t = me.cam.target; if (t.undercover) { t.burnedOut = true; t.say('...'); t.goCell(1, 26.5, 60, () => { t.gone = true; }); toast('Called out', 'Plainclothes. He\'s walking.'); meter('heat', 3, null); fl.callouts = (fl.callouts || 0) + 1; c.shutdown('callout', 15); }
      else if (t.cust || (!t.role && !t.person)) { toast('Wrong', 'Just a man waiting on the bus. The line backs off.'); c.spawnT = 10; } }
    if (F.ud && !F.ud.gone) this.udBrain(F, dt);
    if (fl.T >= F.il.secs && !fl.counted) { fl.counted = true; this.count(F); }
  },
  order(F, k) {
    const c = F.corner, me = F.me;
    if (k === 'shut') { c.shutdown('tee', 20); me.say('Shut it down.'); }
    else if (k === 'open') { c.openUp(); }
    else if (k === 'stash') { const n = { v1412: 'buick', buick: 'trashGate', trashGate: 'v1412' }[c.o.stash]; c.setStash(n); FL().stashSpot = n; toast('Stash moved', { v1412: 'Back in 1412', buick: 'Wheel well of the dead Buick', trashGate: 'Trash can by the court' }[n]); }
    else if (k === 'post') { const l = (c.crew.lookouts || []).find(a => a.z < 1); if (l) { l.home = { x: me.x, y: me.y }; l.goTo(me.x, me.y, 70); l.say('Aight.'); } }
    sfx('confirm');
  },
  event(F, k) {
    const c = F.corner;
    if (k === 'dutch') { F.dutch = c.customers[0] || null; if (!F.dutch) { c.spawnCustomer(); F.dutch = c.customers[c.customers.length - 1]; } F.dutch.say('Tee! Tee, lemme talk to you.'); }
    if (k === 'patrol') { c.patrol = { d: 0, wait: 0, on: true, x: PATROL_LOOP[0][0], y: PATROL_LOOP[0][1], f: 0 }; toast('Patrol', 'A radio car on Abbott. Shut it down before it turns onto Ridley.'); }
    if (k === 'pigeonSleep') { const pg = c.agents.find(a => a.person === 'pigeon'); if (pg) { pg.watcher = false; pg.say('zzz'); F.flags.asleep = true; toast('Pigeon\'s asleep', 'On the roof. Wake him from the stoop.'); } }
    if (k === 'reupNeed') { toast('Running low', 'Page the re-up from your pager (' + Prompt.label('notebook') + '), then call it in.'); c.led.vials = Math.min(c.led.vials, 25); c.led.start = c.led.start; }
    if (k === 'knockers') { const tgt = c.crew.runner || c.agents[0]; c.knockers(tgt); toast('Knockers!', 'Jump-out boys on the runner.'); }
    if (k === 'hearse') { toast('A hearse', 'Black, slow, down Ridley. Everybody freezes.'); c.shutdown('hearse', 25); sfx('engine'); }
    if (k === 'shots' && !FL().wallOff) { sfx('gunshot'); game.after(.4, () => sfx('gunshot')); game.shake(2); c.shutdown('shots', 40); toast('Shots on Harlow', 'Two. Far off. Rook went after the hearse.'); FL().rookAfterSunday = true; }
    if (k === 'danaCar') { Talk.run([['tee', 'Beige Lumina. Same one from Tuesday. That\'s her.'], ['tavon', 'Who?'], ['tee', 'Ridley girl. Police now. Smile at her.']]); }
    if (k === 'stashPick') UI.cards({ kicker: 'THE STASH', title: 'Corey\'s gone. Where does it live now?', cards: [{ title: 'The dead Buick', body: 'Close. Quick. Anybody can look in a wheel well.', k: 'buick' }, { title: 'Trash can by the court', body: 'Far. Safe. Slow.', k: 'trashGate' }, { title: 'Back in 1412', body: 'Behind the radiator. Slow and safe.', k: 'v1412' }],
      pick: (i, cd) => { F.corner.setStash(cd.k); FL().stashSpot = cd.k; } });
    if (k === 'ud') { const s = C(20, 30.6), a = F.ud = new Agent({ id: 'ud', x: s.x, y: s.y, seed: 4242, speed: 40 }); a.undercover = true; a.cop = true; F.civs.push(a); }
  },
  udBrain(F, dt) { const a = F.ud; a.udT = (a.udT || 0) - dt; if (a.udT <= 0 && !a.goal) { a.udT = 6; const v = VANTAGE[Math.floor(RNG.sim() * 6)]; a.goCell(v[0], v[1], 40, () => { a.doAct('camera', .8, 'camera'); a.facing = angTo(a, F.corner.crew.money || F.me); }); } },
  count(F) {
    const c = F.corner, total = c.led.banked + c.led.cash, tgt = F.il.target; FL().teeShort = FL().teeShort || total < tgt; STATE.crew.count = total;
    let shown = 0;
    const s = UI.open({ id: 'count', cls: 'count', legend: [['confirm', 'Continue']], tick: (dt) => { if (shown < total) { shown = Math.min(total, shown + Math.max(10, total * dt / 2.5)); sfx('cashflick'); UI.refresh(s); } },
      render(el) { el.append(h('div.panel.dark', h('div.kicker', { text: 'THE COUNT' }), h('div.huge', { text: '$' + Math.round(shown).toLocaleString() }), h('div.small', { text: 'Easy\'s number: $' + tgt.toLocaleString() }),
        h('div.bar', h('i', { style: { width: Math.min(100, shown / tgt * 100) + '%' } })), shown >= total ? h('p.lede', { text: total >= tgt ? 'Short of nothing. Lonnie counts it twice and nods.' : 'Short. Lonnie writes a number on a napkin and folds it.' }) : null, btn('Continue', () => { UI.close(); MISSIONS.tee.endChoice(F); }))); },
      model(ss) { ss.confirm = () => { UI.close(ss); MISSIONS.tee.endChoice(F); }; } });
  },
  endChoice(F) {
    const il = F.flags.il, end = r => finish(r);
    if (il === 'i1') return Talk.run([['tee', FL().dutch === 'rook' ? 'Rook. Next time I say easy, it means easy.' : 'Tomorrow we do it again.']], () => end());
    if (il === 'i2') return UI.cards({ kicker: 'COREY', title: 'Corey\'s in Central Booking', cards: [{ title: 'Bail him out', body: 'He comes home owing.' }, { title: 'Let him sit', body: 'Nobody visits.' }, { title: '"Rook wants to send a message"', body: 'Let Rook decide.', cost: 'Corey in danger' }], pick: i => { FL().coreyFate = ['bail', 'sit', 'message'][i]; end(); } });
    if (il === 'i3') return UI.cards({ kicker: 'THE LOSS', title: 'Who takes the loss to Easy?', cards: [{ title: 'Tee', body: 'It was my corner.' }, { title: 'Corey', body: 'He talked. Everybody knows he talked.' }, { title: 'Pigeon', body: 'He was on the roof. He missed the hearse.' }], pick: i => { FL().lossOn = ['tee', 'corey', 'pigeon'][i]; end(); } });
    if (il === 'i4') return UI.cards({ kicker: 'A CANARY', title: 'Feed Corey a fake re-up time?', text: 'If it comes back to you through the police, you know who\'s talking.', cards: [{ title: 'Yes', body: 'Tell Corey Saturday. It\'s Friday.' }, { title: 'No', body: 'Leave it.' }], pick: i => { FL().canary = i === 0; if (FL().canary && FL().coreyCI) FL().coreyExposed = true; end(); } });
    end();
  },
  overlay(F, r) {
    if (!F.wheel || F.wheel.t < .15) return;
    r.overlay(g => { const s = F.me.scr || [r.W / 2, r.H / 2], cx = Math.round(s[0]), cy = Math.round(s[1]);
      px.blend(g, .6, 'normal', () => px.disc(g, cx, cy, 46, '#0a0a0a'));
      WHEEL.forEach(([lab], i) => { const a = -Math.PI / 2 + i * TAU / 4, x = cx + Math.cos(a) * 34, y = cy + Math.sin(a) * 30, on = F.wheel.sel === i;
        E.font.text(g, lab, Math.round(x), Math.round(y) - 3, on ? '#ffb347' : '#e8e4dc', { align: 'center', shadow: '#000', outline: false }); if (on) px.line(g, cx, cy, Math.round(x), Math.round(y), '#ffb347'); }); });
  },
  objective(F) { const c = F.corner, tot = c.led.banked + c.led.cash, left = Math.max(0, F.il.secs - F.flags.T);
    if (F.flags.asleep) return { step: F.il.title, title: 'Pigeon\'s asleep on the roof', text: 'Wake him from Miss Odessa\'s stoop', at: C(34.3, 37.2) };
    if (F.flags.needCall) return { step: F.il.title, title: 'Call the re-up in', text: 'Any payphone. Dial what the card says.', at: C(...POI[F.flags.paged || 'P1']) };
    return { step: F.il.title, title: 'Make the count: $' + tot + ' / $' + F.il.target, text: Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0') + ' left · ' + (c.open ? 'open' : 'shut down') }; },
  counts: F => [['Vials', F.corner.led.vials], ['Count', '$' + (F.corner.led.banked + F.corner.led.cash)]],
  prompt: F => ({ act: 'partner', label: 'Orders (hold)' }),
  bot(F, dt) { const c = F.corner; if (c.patrol && c.patrol.on && c.open) MISSIONS.tee.order(F, 'shut'); F.me.ctl.mv = [0, 0]; }
};
