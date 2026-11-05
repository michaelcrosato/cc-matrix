/* 45-tee: playing Terrence "Tee" Mabry for a night shift (§7.3). Same movement as Dana. ✕ gives a context order to
   whoever's next to you. Hold △ / Q for the order wheel (shut it down, open up, move the stash, post up). Watch (L2 /
   right mouse) studies people: a careful read shows you the plainclothes cop, and △ while watching calls them out.
   Create / Tab: the pager and the code card (plaintext beside the encoded digits). Payphones dial with real DTMF. */
const WHEEL = [{ id: 'shut', label: 'Shut it down', a: -Math.PI / 2 }, { id: 'open', label: 'Open up', a: Math.PI / 2 }, { id: 'stash', label: 'Move the stash', a: Math.PI }, { id: 'post', label: 'Post up a lookout', a: 0 }];
const TeeShift = {
  wheel: null, held: 0, card: null,
  setup(M, o) {
    this.M = M; this.o = o; this.wheel = null; this.held = 0; this.target = o.target || 0; this.pages = []; this.sent = []; this.counted = false; const st0 = parseClock(o.start || '22:00'), en0 = parseClock(o.end || '02:00'); this.endAt = en0 + (en0 < st0 ? 24 : 0);
    const sim = M.sim; sim.ltHuman = true; const lt = sim.lt; if (lt) { lt.gone = true; sim.crew = sim.crew.filter(a => a !== lt); }
    M.P.role = 'lieutenant'; M.P.crewId = 'tee'; sim.crew.push(M.P); M.P.ltHuman = true; M.P.home = sim.spot('lt');
    M.police = []; Perception.setup([], M.police);
    Cam.reset({ film: 999, base: 1.2, readable: a => a.isCop && !a.revealed, onRead: a => { a.revealed = true; Toast('That\'s a cop', 'The way he stands. The shoes. ' + Prompts.label('partner') + ' while watching calls him out.'); Snd.play('select'); return true; }, onShot: () => {}, noShoot: true });   // Tee doesn't take pictures (a flag the next Cam.reset clears; never replace Cam.shoot)
    M.hudCounts = () => [['Count', money(sim.L.taken)], this.target ? ['Target', money(this.target)] : null, ['Stash', sim.vials + ' vials'], ['Time', clockStr(M.clock)]].filter(Boolean);
    M.hudBars = () => [{ label: 'Night', value: Math.round(clamp((M.clock - st0) / (this.endAt - st0) * 100, 0, 100)), max: 100, color: '#7a8aff' }];
    // payphones
    for (const k of ['P1', 'P2', 'P3']) { const pp = World.props.find(p => p.tag === k); M.int({ id: 'phone:' + k, x: pp.x, y: pp.y + (k === 'P3' ? -10 : 10), r: 18, verb: () => '', when: () => true, act: () => this.payphone(k) }).verbFn = k; }
    for (const i of M.ints) if (i.verbFn) Object.defineProperty(i, 'verb', { get: () => this.ringing === i.verbFn ? 'Answer the phone' : 'Use the payphone' });
    if (tip('tee')) Tut.say('Tee\'s corner', 'Hold ' + Prompts.label('partner') + ' for orders. ' + Prompts.label('notebook') + ' is the pager. Watch for cars and faces that don\'t belong; your lookouts call 5-0, but you call the shots.');
  },
  tick(M, dt) {
    const c = M.ctl, sim = M.sim, P = M.P;
    playerTick(M, dt);
    if (Globals.blocked()) { this.wheel = null; this.held = 0; return; }
    if (Globals.notebookPressed()) { this.pager(); return; }
    // call out a revealed cop: △ while watching
    if (Cam.on && c.pressed('partner')) { const t = Cam.target; if (t && t.isCop && t.revealed) this.callOut(t); else if (t) this.callOut(t); return; }
    if (!Cam.on) {
      if (c.down('partner')) { this.held += dt; if (this.held > .18 && !this.wheel) { this.wheel = { sel: null }; Snd.play('ui_tick'); } }
      if (this.wheel) {
        const mv = c.move(), ptr = game.input.pointer(), mouse = ptr && game.input.lastDevice !== 'gamepad' && this.center;
        let ang = null; if (Math.hypot(mv[0], mv[1]) > .4) ang = Math.atan2(mv[1], mv[0]); else if (mouse && Math.hypot(ptr[0] - this.center[0], ptr[1] - this.center[1]) > 10) ang = Math.atan2(ptr[1] - this.center[1], ptr[0] - this.center[0]);
        if (ang !== null) { let best = null, bd = 9; for (const w of WHEEL) { const d = Math.abs(angDiff(ang, w.a)); if (d < bd) { bd = d; best = w.id; } } if (best !== this.wheel.sel) { this.wheel.sel = best; Snd.play('ui_tick'); } }
        P.vx = P.vy = 0;
        if (!c.down('partner')) { const s = this.wheel.sel; this.wheel = null; this.held = 0; if (s) this.order(s); }
        return;
      }
      if (c.released('partner')) this.held = 0;
      // context orders
      if (c.pressed('interact') && !M.near) {
        const n = sim.crew.filter(a => a !== P && !a.roof && dist2(a, P) < 30).sort((a, b) => dist2(a, P) - dist2(b, P))[0];
        if (n) this.context(n);
      }
    }
    // the end of the shift: the count
    if (!this.counted && M.clock >= this.endAt) { this.counted = true; this.count(); }
  },
  context(a) {
    const P = this.M.P;
    if (a.asleep) { a.asleep = false; a.blind = false; a.pose = null; Talk.play([['tee', 'Wake up, Pigeon. Eyes on the street.'], ['pigeon', 'I\'m up. I\'m up.']]); return; }
    const line = { money: ['Count it again.', 'I counted it twice, Tee.'], runner: ['Walk with me.', 'Where we going?'], stash: ['Keep it dry.', 'It\'s dry.'], muscle: ['Easy tonight.', 'I\'m easy.'], tout: ['Louder.', 'Overtime! Overtime!'] }[a.role] || ['You good?', 'I\'m good.'];
    Talk.play([['tee', line[0]], [a.crewId || 'tavon', line[1]]]); STATE.crew.discipline = Math.min(2, (STATE.crew.discipline || 1) + .05);
  },
  order(id) {
    const sim = this.M.sim, P = this.M.P;
    if (id === 'shut') { sim.manual = true; sim.shut('tee', 9999, P); P.say('Shut it down. Now.', 2); }
    else if (id === 'open') { sim.manual = false; sim.reopen(); P.say('We open.', 2); }
    else if (id === 'stash') { UI.choose({ kicker: 'Move the stash', title: 'Where?', back: () => UI.close(), cards: Object.keys(CORNER.stash).map(k => ({ id: k, label: CORNER.stash[k].label, sub: k === sim.stashSpot ? 'Where it is now' : k === 'v1412' ? 'Close. Police know vacants.' : k === 'buick' ? 'Close, on the street' : 'Far, a long walk for the runner' })) }, k => { sim.moveStash(k); P.say('Move it. ' + CORNER.stash[k].label + '.', 2.5); }); }
    else if (id === 'post') {
      const g = { x: P.x + Math.cos(P.facing) * 60, y: P.y + Math.sin(P.facing) * 60 }, w = World.walkableNear(g.x, g.y);
      sim.addThird(); const L = sim.crew.find(a => a.crewId === 'third'); if (L) { L.home = w; L.goTo(w.x, w.y, 70); L.facing = P.facing; }
      P.say('Post up over there. Watch the cars.', 2);
    }
    bus.emit('order', { id });
  },
  callOut(t) {
    const sim = this.M.sim, P = this.M.P;
    if (t.isCop) { P.say('Five-oh in the gray jacket! Shut it down!', 2.5); sim.shut('callout', 25, P); t.burned = true; t.leaveT = 2; Snd.play('select'); Toast('Called out', 'The detective walks away. They\'ll send another.'); bus.emit('callout', { ok: true }); }
    else { P.say('Yo, you. Keep walking.', 2); t.say('I\'m just going to the store, man.', 2); STATE.crew.goodwill = (STATE.crew.goodwill || 0) - 1; Toast('Wrong', 'Just a citizen. The block remembers that.'); bus.emit('callout', { ok: false }); }
  },
  /* ---- the pager and the code card ---- */
  pager() {
    const sim = this.M.sim; let num = 'P2', code = '44';
    const s = UI.open({ id: 'pager', cls: '', html: () => {
      const n = NUMBERS[num], enc = encode(n, STATE.cipher.flipped ? 'ccw' : 'cw');
      return `<div class="panel file narrow"><div class="kicker">Tee's pager · the code card</div><h1>Page the connect</h1>
        <p class="muted">Pages in: ${this.pages.map(p => esc(p)).join(' · ') || 'none'}</p>
        <div class="grid"><div class="item"><b>Callback</b>${['P1', 'P2', 'P3'].map(k => `<button class="btn${k === num ? ' primary' : ''}" data-f="n:${k}">${k}</button>`).join('')}<small>${esc(PHONE_LABEL[num])}</small></div>
        <div class="item"><b>Code</b>${['44', '33', '55', '77'].map(k => `<button class="btn${k === code ? ' primary' : ''}" data-f="c:${k}">${k}</button>`).join('')}<small>${esc(CODES[code])}</small></div></div>
        <p class="digits">Plain: ${esc(n)} ${code} 07</p><p class="digits" style="color:#8a3a1a">Sent: ${esc(enc)} ${code} 07</p>
        <p class="muted">Every digit becomes the one in its place after the keypad turns a quarter ${STATE.cipher.flipped ? 'left' : 'right'}. 0 and 5 stay.</p>
        <p class="muted">Numbers: Easy's people (the connect) 555-0174</p><button class="btn primary" data-f="send">Send the page</button></div>`; },
      legend: [['confirm', 'Choose'], ['cancel', 'Close']],
      onSelect: id => { if (id.startsWith('n:')) num = id.slice(2); else if (id.startsWith('c:')) code = id.slice(2); else if (id === 'send') { UI.close(s); this.sendPage(num, code); return; } UI.render(s); } });
  },
  sendPage(num, code) {
    const sim = this.M.sim; Snd.pager(); this.sent.push({ num, code }); F().payphoneChoice = F().payphoneChoice || num; Toast('Page sent', encode(NUMBERS[num], 'cw') + ' ' + code + ' 07');
    bus.emit('page', { num, code });
    if (code === '44') game.after(8, () => { this.ringing = num; Snd.play('phonering'); Toast('Payphone ringing', num + ', ' + PHONE_LABEL[num]); });
    if (code === '77') sim.shut('page', 20);
    if (code === '55') sim.reopen();
  },
  payphone(k) {
    const sim = this.M.sim, P = this.M.P; P.pose = 'phone'; P.doAct('payphone', 3);
    if (this.ringing === k) {
      this.ringing = null; F().payphoneChoice = k;
      Talk.play([['dale', 'Usual?'], ['tee', 'Usual.'], ['dale', 'Forty minutes. Don\'t make me wait.']], () => { P.pose = null; Toast('Re-up coming', 'Forty minutes on the clock.'); sim.reupPending = 20; sim.autoReup = true; bus.emit('reupCalled', { k }); });
      return;
    }
    this.dial(k);
  },
  /** dial a number on a payphone keypad: real DTMF tones */
  dial(k, want = '5550174', then) {
    let typed = ''; const P = this.M.P;
    const s = UI.open({ id: 'dial', cls: '', html: () => `<div class="panel narrow"><div class="kicker">Payphone ${esc(k)} · ${esc(PHONE_LABEL[k])}</div><h1>Dial</h1><p class="digits">${esc(typed.replace(/^(\d{3})(\d)/, '$1-$2') || '…')}</p>
      <div class="keypad" style="grid-template-columns:repeat(3,3em)">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(d => `<button class="btn" data-f="d:${d}" style="margin:0;height:2.4em">${d}</button>`).join('')}</div>
      <p class="muted">The connect: 555-0174. Hang up with ${Prompts.html('cancel')}.</p></div>`, legend: [['confirm', 'Press'], ['cancel', 'Hang up']],
      onBack: () => { UI.close(s); P.pose = null; Snd.play('hangup'); },
      onSelect: id => { const d = id.slice(2); Snd.play('dtmf' + d); typed += d; if (typed.length > 7) typed = typed.slice(-7); UI.render(s, id);
        if (typed.length === 7) { const ok = typed === want; game.after(.3, () => { Snd.play('ring2'); game.after(1.6, () => { UI.close(s); if (ok) Talk.play([['dale', 'Yeah.'], ['tee', 'It\'s me. Same as always, different phone.'], ['dale', 'Forty minutes.']], () => { P.pose = null; F().payphoneChoice = k; this.M.sim.reupPending = 20; this.M.sim.autoReup = true; bus.emit('reupCalled', { k }); if (then) then(); }); else Talk.play([['narr', 'A recording: the number you have dialed is not in service.']], () => { P.pose = null; }); }); }); } } });
  },
  /* ---- the count ---- */
  count() {
    const sim = this.M.sim, total = sim.L.taken, tgt = this.target; sim.paused = true; let shown = 0;   // the corner closes for the night; the mission ends after the count's choice
    if (tgt && total < tgt) F().teeShort = true;
    STATE.crew.count = total;
    const s = UI.open({ id: 'count', cls: '', onBack: null, html: () => `<div class="panel narrow"><div class="kicker">The count · ${esc(clockStr(this.M.clock))}</div><h1>${money(shown)}</h1>
      <p>${tgt ? 'Target ' + money(tgt) + ' · ' + (shown >= tgt ? '<b style="color:#45d6a0">MADE IT</b>' : shown >= total ? '<b style="color:#ff8a7a">SHORT ' + money(tgt - total) + '</b>' : 'counting…') : 'No target tonight.'}</p>
      <p class="muted">${sim.sales} sales · ${sim.L.sold} vials · ${sim.vials} left in the stash</p>${shown >= total ? '<button class="btn primary" data-f="ok">Done</button>' : ''}</div>`,
      legend: [['confirm', 'Done']], tick: dt => { if (shown < total) { shown = Math.min(total, shown + Math.max(10, total * dt * .5)); Snd.play('cashflick', { vol: .4 }); UI.render(s); } }, onSelect: () => { UI.close(s, true); const f = this.o.after; if (f) f(this.M); else this.M.finish(); } });
  },
  draw(r) {
    if (!this.wheel || !this.M) return; const P = this.M.P, [cx, cy] = r.w(P.x, P.y, P.z + 20); this.center = [cx, cy];
    r.overlay(g => {
      px.disc(g, Math.round(cx), Math.round(cy), 38, '#00000088'.slice(0, 7));
      for (const w of WHEEL) { const x = Math.round(cx + Math.cos(w.a) * 30), y = Math.round(cy + Math.sin(w.a) * 26), on = this.wheel.sel === w.id; const tw = E.font.width(w.label) + 8; px.rect(g, x - tw / 2, y - 6, tw, 12, on ? '#ffb347' : '#141210'); E.font.text(g, w.label, x, y - 3, on ? '#1a1208' : '#f2ead8', { align: 'center', outline: false }); }
      E.font.text(g, 'ORDERS', Math.round(cx), Math.round(cy) - 3, '#9a9080', { align: 'center', font: 'tiny', outline: false });
    });
  }
};
/** a plainclothes detective in a crowd: lingers, raises a camera now and then (the tell) */
function plainclothes(M, x, y, seed) {
  const a = new Agent({ seed, x: W(x - .5), y: W(y - .5), walk: 36, role: 'cop' }); a.isCop = true; a.rig.C.cloth = '#6a6a72'; a.rig.C.coat = '#6a6a72'; a.rig.C.boot = '#2a2420';
  a.brain = (ag, dt, M2) => {
    if (ag.leaveT > 0) { ag.leaveT -= dt; if (ag.leaveT <= 0) { const ex = pick(RNG.sim, EXITS); ag.goTo(ex[0], ex[1], 50, () => { ag.gone = true; ag.hidden = true; }); } return; }
    ag.tt = (ag.tt || 0) + dt; if (ag.burned) return;
    if (!ag.goal && ag.tt > 5) { ag.tt = 0; const p = pick(RNG.sim, SIDEWALK_POIS.filter(q => Math.hypot(q[0] - W(30), q[1] - W(33)) < 240)); ag.goTo(p[0], p[1], 34, () => { ag.pose = 'camera'; ag.faceTo(M2.sim.spot('money')); game.after(.8, () => { ag.pose = null; }); }); }
  };
  M.extras.push(a); return a;
}
