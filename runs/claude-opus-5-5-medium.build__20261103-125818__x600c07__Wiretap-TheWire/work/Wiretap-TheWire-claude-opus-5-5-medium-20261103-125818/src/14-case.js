// WIRETAP: the case. The Board (cards, slots by tier, strings, validation by facts), the Notebook (objectives, map,
// people, evidence, phones, the case), the box (four approaches on a face-button diamond; the kitchen variant), and the
// paper: the affidavit (probable cause, necessity honesty) and Judge Halloway's three questions.
const portraitURL = (() => { const c = {}; return id => { if (!HAS_DOM || !CAST[id]) return ''; if (c[id]) return c[id]; try { const cv = document.createElement('canvas'); cv.width = cv.height = 48; const g = cv.getContext('2d'); px.rect(g, 0, 0, 48, 48, '#3a342c'); rigOf(id).drawPortrait(g, 0, 0, 48, { zoom: 1, bg: '#3a342c' }); return (c[id] = cv.toDataURL()); } catch (e) { return ''; } }; })();
const photoOf = id => { const p = STATE.photos.slice().reverse().find(q => q.subject === id && q.tags.includes('face')); return p ? Camera.render(p, null) || PHOTO_IMG[p.id] : null; };
const knowsPerson = id => hasFact('face:' + id) || hasFact('name:' + id) || hasFact('voice:' + id);

/* ---- THE BOARD ---- */
const TIERS = [
  { id: 'corner', name: 'THE CORNER', slots: [['lieutenant', 'Lieutenant', 'tee'], ['muscle', 'Muscle', 'rook'], ['stash', 'Stash', 'corey'], ['money', 'Money', 'dink'], ['runner', 'Runner', 'tavon'], ['lookout', 'Lookout', 'pigeon'], ['lookout2', 'Lookout', 'moe']] },
  { id: 'package', name: 'THE PACKAGE', slots: [['courier', 'Courier', 'dale'], ['supplier', 'Supplier front', 'harstad'], ['reup', 'Re-up spot', 'gas']] },
  { id: 'money', name: 'THE MONEY', slots: [['boss', 'Boss', 'easy'], ['driver', 'Driver', 'lonnie'], ['front', 'Front', 'mamab']] }
];
const BIZ = { harstad: { name: 'Harstad Auto Parts', need: 'plate:harstad' }, gas: { name: 'Arundel Gas (closed)', need: 'reup:gas' }, mamab: { name: "Mama B's Soul Food", need: 'int:mamab' }, garage: { name: 'Garage behind the Courts', need: 'int:garage' } };
const Board = {
  /** what a slot needs, and why not */
  canPin(slot, card) {
    const [sid, , who] = slot;
    if (card !== who && !(sid === 'lookout' && card === 'moe' && who === 'pigeon') && !(sid === 'lookout2' && card === 'pigeon')) return 'Says who? Nothing puts ' + (CAST[card] ? nameOf(card) : BIZ[card] ? BIZ[card].name : card) + ' in that chair.';
    if (BIZ[card]) return hasFact(BIZ[card].need) ? null : 'Get me something that ties it in.';
    const role = { lieutenant: 'lieutenant', muscle: 'muscle', stash: 'stash', money: 'money', runner: 'runner', lookout: 'lookout', lookout2: 'lookout' }[sid];
    if (role && !(hasFact('obs:' + card + ':' + role) || STATE.facts.some(f => f.startsWith('stmt:') && f.includes(card)) || (card === 'tee' && hasFact('stmt:corey:tee-lieutenant')) || (card === 'corey' && hasFact('seized:pager')))) return 'You\'ve got a face. Now show me him doing the job.';
    if (sid === 'courier' && !(hasFact('act:dale:reup-handoff') || hasFact('face:dale'))) return 'Who says he\'s more than a delivery man?';
    if (sid === 'boss' && !(hasFact('int:boss') || hasFact('face:easy'))) return 'A name on a wire is a rumor. Keep listening.';
    if (sid === 'driver' && !hasFact('voice:lonnie') && !hasFact('int:mamab')) return 'Get his voice first.';
    return null;
  },
  pin(slot, card) {
    const why = this.canPin(slot, card); if (why) { toast('Szabo', why); sfx('cancel'); return false; }
    if (STATE.board.pins[slot[0]] === card) return true;
    STATE.board.pins[slot[0]] = card; sfx('pin'); meter('case', 2, 'Pinned: ' + slot[1]); BUS.emit('pin', slot[0], card); return true;
  },
  canLink(a, b) { const ph = ['P1', 'P2', 'P3', 'PG'].includes(a) ? a : b, who = ph === a ? b : a; if (!CAST[who]) return false;
    return STATE.numbers[ph] && (STATE.numbers[ph].user === who || hasFact('num:' + ph + ':' + who) || STATE.evidence.some(e => e.who === who && e.act === 'payphone' && ph === 'P1') || (ph === 'PG' && who === 'corey')); },
  link(a, b) { if (!this.canLink(a, b)) { toast('Szabo', 'A string needs a reason. Who\'s on that phone?'); sfx('cancel'); return false; }
    if (STATE.board.links.some(l => (l[0] === a && l[1] === b) || (l[0] === b && l[1] === a))) return true; STATE.board.links.push([a, b]); sfx('string'); meter('case', 1, 'String: ' + nameOf(CAST[a] ? a : b) + ' ↔ ' + (CAST[a] ? b : a)); return true; },
  cards() {
    const people = Object.keys(CAST).filter(id => ['tee', 'rook', 'corey', 'dink', 'tavon', 'pigeon', 'moe', 'dale', 'easy', 'lonnie', 'sunday'].includes(id) && knowsPerson(id));
    const phones = ['P1', 'P2', 'P3', 'PG'].filter(k => STATE.numbers[k].known);
    const biz = Object.keys(BIZ).filter(k => hasFact(BIZ[k].need));
    return { people, phones, biz };
  },
  open(o = {}) {
    let tier = 0, sel = null;
    const s = UI.open({ id: 'board', cls: 'board', legend: [['confirm', 'Pick / pin'], ['tabPrev', 'Tier'], ['tabNext', 'Tier'], ['uiAlt', 'Unpin'], ['cancel', 'Close']],
      tab: d => { tier = (tier + d + TIERS.length) % TIERS.length; UI.refresh(s, 0); }, cancel: () => { UI.close(); if (o.done) o.done(); },
      alt: () => { const b = s.items[s.fi]; if (b && b.dataset.slot && STATE.board.pins[b.dataset.slot]) { delete STATE.board.pins[b.dataset.slot]; sfx('cancel'); UI.refresh(s); } },
      render(el) {
        const T = TIERS[tier], cs = Board.cards();
        const card = (id, kind) => h('button.bcard' + (sel === id ? '.sel' : ''), { 'data-f': '', on: () => { if (sel && sel !== id && (kind === 'phone' || ['P1', 'P2', 'P3', 'PG'].includes(sel))) { Board.link(sel, id); sel = null; } else sel = sel === id ? null : id; UI.refresh(s); } },
          kind === 'person' ? h('img', { src: photoOf(id) || portraitURL(id), alt: '' }) : h('div.bicon', { text: kind === 'phone' ? '☎' : '■' }),
          h('span', { text: kind === 'person' ? nameOf(id) : kind === 'phone' ? id + ' ' + STATE.numbers[id].n : BIZ[id].name }));
        el.append(h('div.panel.cork', h('div.tierbar', TIERS.map((t, i) => h('span' + (i === tier ? '.on' : ''), { text: t.name }))),
          h('div.slots', T.slots.map(sl => { const pin = STATE.board.pins[sl[0]]; return h('button.slot' + (pin ? '.pinned' : ''), { 'data-f': '', 'data-slot': sl[0], on: () => { if (sel) { if (Board.pin(sl, sel)) sel = null; UI.refresh(s); } else if (pin) toast(sl[1], nameOf(pin)); } },
            h('div.slot-t', { text: sl[1] }), pin ? h('img', { src: CAST[pin] ? photoOf(pin) || portraitURL(pin) : '', alt: '' }) : h('div.q', { text: '?' }), h('div.slot-n', { text: pin ? (CAST[pin] ? CAST[pin].name : BIZ[pin].name) : '' })); })),
          h('div.cardrow', ...cs.people.slice(0, 8).map(id => card(id, 'person')), ...cs.phones.map(id => card(id, 'phone')), ...(tier ? cs.biz.map(id => card(id, 'biz')) : [])),
          h('div.strings', { text: STATE.board.links.map(l => nameOf(CAST[l[0]] ? l[0] : l[1]) + ' — ' + (CAST[l[0]] ? l[1] : l[0])).join('   ·   ') || (sel ? 'Pick a slot, or a phone to tie a string' : 'Pick a card') })));
      },
      model(ss) { ss.confirm = () => { for (const t of TIERS) for (const sl of t.slots) if (!Board.canPin(sl, sl[2])) Board.pin(sl, sl[2]); UI.close(ss); if (o.done) o.done(); }; }
    });
    tip('board', 'The Board', 'Pick a face, then the chair it sits in. A pin needs a fact behind it. Pick a person and a phone to tie a string.');
    return s;
  }
};

/* ---- THE NOTEBOOK ---- */
const Notebook = {
  tabs: ['objectives', 'map', 'people', 'evidence', 'phones', 'case'],
  open(tab = 'objectives') {
    let ti = Math.max(0, this.tabs.indexOf(tab)), page = 0;
    const s = UI.open({ id: 'notebook', cls: 'notebook', legend: [['tabPrev', 'Tab'], ['tabNext', 'Tab'], ['cancel', 'Close']], tab: d => { ti = (ti + d + 6) % 6; page = 0; UI.refresh(s, 0); }, cancel: () => UI.close(),
      render(el) {
        const t = Notebook.tabs[ti], body = h('div.nb-body.scroll');
        if (t === 'objectives') { const o = Director.objectiveText(); body.append(h('h2', { text: o.title }), h('p.lede', { text: o.text }), ...(o.list || []).map(l => h('p', { text: '• ' + l }))); }
        if (t === 'map') { const cv = h('canvas', { width: 216, height: 168 }); body.append(cv); const g = cv.getContext('2d'); const M = World.map;
          for (let y = 0; y < 56; y++) for (let x = 0; x < 72; x++) { const ch = ROWS[y][x]; g.fillStyle = WT[ch] ? '#5a4a3c' : ch === '=' ? '#2a2a2e' : ch === '-' ? '#3a3834' : ch === 'f' || ch === 'x' ? '#6a6a50' : '#8a8a80'; g.fillRect(x * 3, y * 3, 3, 3); }
          const mk = (cx, cy, c, l) => { g.fillStyle = c; g.fillRect(cx * 3 - 2, cy * 3 - 2, 5, 5); body.append(h('div.mk', { text: l, style: { color: c } })); };
          for (const id of ['P1', 'P2', 'P3']) if (STATE.numbers[id].known) mk(POI[id][0], POI[id][1], '#7aa7ff', id + ' payphone');
          mk(30, 32, '#ff5a4a', 'The corner'); mk(46, 26, '#ffb347', "Mama B's"); if (FL().dreLine) mk(63, 48, '#45d6a0', 'Arundel Gas (where Dre broke his ankle)');
          if (FD.me && game.sceneName === 'field') mk(FD.me.x / T, FD.me.y / T, '#ffffff', 'You'); }
        if (t === 'people') { const ids = ['tee', 'rook', 'corey', 'dink', 'tavon', 'pigeon', 'moe', 'dale', 'easy', 'lonnie', 'sunday', 'pockets', 'odessa'].filter(knowsPerson);
          body.append(h('div.grid', (ids.length ? ids : []).map(id => h('div.person', h('img', { src: photoOf(id) || portraitURL(id), alt: '' }), h('b', { text: CAST[id].name }), h('span', { text: (STATE.facts.find(f => f.startsWith('obs:' + id + ':')) || '').split(':')[2] || 'role unknown' })))));
          if (!ids.length) body.append(h('p', { text: 'Nobody yet. Faces first.' })); }
        if (t === 'evidence') { const ev = STATE.evidence.slice(-12); body.append(h('div.grid', ev.map(e => h('div.ev', e.ref && PHOTO_IMG[e.ref] ? h('img', { src: PHOTO_IMG[e.ref], alt: '' }) : h('div.bicon', { text: { page: '#', stmt: '"', seizure: '■', obs: '•', int: '☎', plate: '▭', serials: '▤' }[e.kind] || '•' }), h('span', { text: e.text })))));
          if (!ev.length) body.append(h('p', { text: 'Nothing in the locker.' })); }
        if (t === 'phones') { for (const [k, v] of Object.entries(STATE.numbers)) if (v.known) body.append(h('p', { text: k + '  ' + v.n + '  ' + (NUM_NAME[k] || '') + (v.user ? ' · used by ' + nameOf(v.user) : '') + (v.dead ? ' · DEAD' : '') }));
          for (const p of STATE.cipher.decoded) body.append(h('p.mono', { text: 'Page ' + p })); }
        if (t === 'case') { const m = STATE.meters, heat = m.heat < 30 ? 'Calm' : m.heat < 50 ? 'Wary' : m.heat < 75 ? 'Spooked' : 'Gone dark';
          body.append(...[['Case', m.case, 160], ["Major's patience", m.brass, 100], ['Legal risk', m.legal, 100]].map(([l, v, mx]) => h('div.meter', h('b', { text: l + '  ' + v }), h('div.bar', h('i', { style: { width: Math.min(100, v / mx * 100) + '%' } })))),
            h('p', { text: 'Street: ' + heat + ' (' + m.heat + ')' }), h('p', { text: 'Photos ' + STATE.stats.photos + ' · made ' + STATE.stats.made + ' times · minimized ' + STATE.stats.minimized + ' · violations ' + STATE.stats.violations }), h('p', { text: 'Fund $' + m.fund })); }
        el.append(h('div.panel.manila', h('div.tabs', Notebook.tabs.map((x, i) => h('span' + (i === ti ? '.on' : ''), { text: x.toUpperCase() }))), body, btn('Close', () => UI.close())));
      } });
  }
};

/* ---- THE BOX ---- */
const BOX = {
  corey: { who: 'corey', resolve: 100, fear: 30, n: 12, kind: 'box',
    beats: [{ id: 'B1', need: s => s.resolve <= 75, say: 'Tee. Terrence. He run Gaither. I just... I just sit.', fact: 'stmt:corey:tee-lieutenant' },
      { id: 'B2', need: s => s.resolve <= 50 && s.shown.includes('pager'), say: "The numbers... it's the phone, man. You turn it. That's all I know.", fact: 'stmt:corey:code' },
      { id: 'B3', need: s => s.resolve <= 25, say: "Fourteen-twelve. Behind the radiator. There's a board loose.", fact: 'stmt:corey:stash' }],
    ev: { package: [-30, 0, ['dana', 'Forty vials. Orange tops. Your prints on the bag.'], ['corey', 'That bag was on the ground.']], pager: [-15, 0, ['lou', "Your pager's been busy, Corey. Real popular kid."], ['corey', 'Everybody got a pager.']],
      'act:corey:stash-access': [-25, 0, ['dana', "That's you going into fourteen-twelve. Again. And again."], ['corey', '...']], 'face:corey': [-10, 0, ['dana', "That's you."], ['corey', 'That could be anybody.']], 'face:tee': [-10, 0, ['dana', 'Who is this?'], ['corey', "I don't know him."]] },
    lines: { lean: [['lou', "You know what distribution in a school zone gets you? That court's a school zone, Corey. Look it up."], ["I ain't distributing nothing. I was sitting.", "Why y'all on me? I'm nobody.", 'Stop. Just... stop.']],
      offer: [['dana', "You're nineteen. Tee's twenty-four. Who do you think takes the weight?"], ['Tee look out for me.', "...Tee ain't gonna let me go down.", 'What happens to me? If I say something. What happens?']],
      bluffOk: [['dana', 'Pigeon told us you hold for them.'], "Pigeon don't know nothing about— ...man."], bluffBad: [['dana', 'Rook says you set up Felton.'], "Rook don't talk to police. You making stuff up now."],
      combo: ['lou', 'Lou slams the table and walks out.'], comboD: ['dana', "He's gone. It's just me. Talk to me, Corey."], lawyer: 'I-I want a lawyer. I know my rights. I want a lawyer.', flip: "If Tee finds out, I'm dead. You know that, right? ...What I gotta do?" } },
  rook: { who: 'rook', resolve: 100, fear: 0, n: 3, kind: 'box', comic: [['dana', 'Nice car.', 'Lawyer.'], ['lou', "Taillight's out.", 'Lawyer.'], ['dana', "Who's the hammer for, Ricky?", 'Law. Yer.']] },
  pigeon: { who: 'pigeon', trust: 20, fear: 40, n: 8, kind: 'kitchen' }
};
const Box = {
  open(id, done) {
    const cfg = BOX[id], s = { resolve: cfg.resolve, fear: cfg.fear, trust: cfg.trust + (id === 'pigeon' && FL().odessaRespect ? 15 : 0), rapport: 0, n: cfg.n, shown: [], got: [], last: null, pushes: 0, over: false };
    const finishBox = (why) => { if (s.over) return; s.over = true; UI.close(); Talk.run(why ? [why] : [], () => done(s)); };
    if (cfg.comic) { let i = 0; const nx = () => { if (i >= cfg.comic.length) return done(s); const [w, l, r] = cfg.comic[i++]; Talk.run([[w, l], ['rook', r]], nx); }; return nx(); }
    const say = (seq, after) => { UI.close(); Talk.run(seq, () => { after && after(); if (!s.over) this.screen(id, cfg, s, say, finishBox, done); }); };
    this.screen(id, cfg, s, say, finishBox, done);
  },
  band: s => s.resolve > 60 ? 0 : s.resolve >= 30 ? 1 : 2,
  checkBeats(cfg, s, out) {
    for (const b of cfg.beats || []) if (!s.got.includes(b.id) && b.need(s)) { s.got.push(b.id); out.push([cfg.who, b.say]); addFact(b.fact, 2, true); addEvidence({ id: b.fact, kind: 'stmt', text: nameOf(cfg.who) + ': "' + b.say + '"' }); if (b.fact === 'stmt:corey:code') STATE.cipher.hint = true; }
  },
  act(id, cfg, s, k, say, finishBox) {
    const out = []; s.n--;
    if (cfg.kind === 'kitchen') return this.kitchen(cfg, s, k, say, finishBox);
    const L = cfg.lines, b = this.band(s);
    if (k === 'lean') { s.resolve -= 12; s.fear += Math.max(5, 15 - s.rapport * 3); out.push(L.lean[0], [cfg.who, L.lean[1][b]]); }
    if (k === 'offer') { if (s.got.includes('B3') && s.fear <= 60 && s.rapport >= 1) { FL().coreyCI = true; out.push(['dana', 'Work for us.'], [cfg.who, L.flip]); addFact('ci:corey', 3, true); this.checkBeats(cfg, s, out); return say(out, () => finishBox(['lou', 'Welcome to the team, kid. Don\'t tell anybody.'])); }
      s.fear -= 15; s.resolve -= 8; out.push(L.offer[0], [cfg.who, L.offer[1][b]]); if (s.last === 'lean') { s.resolve -= 20; s.rapport = Math.min(3, s.rapport + 1); out.unshift(L.combo, L.comboD); toast('Good cop, bad cop', 'Rapport +1'); } }
    if (k === 'bluff') { if (Board.cards().people.length >= 3 && hasFact('obs:pigeon:lookout')) { s.resolve -= 25; out.push(L.bluffOk[0], [cfg.who, L.bluffOk[1]]); } else { s.resolve += 20; s.rapport = Math.max(0, s.rapport - 1); out.push(L.bluffBad[0], [cfg.who, L.bluffBad[1]]); } }
    s.last = k; s.resolve = clamp(s.resolve, 0, 100); s.fear = clamp(s.fear, 0, 100);
    this.checkBeats(cfg, s, out);
    if (s.fear >= 80) return say(out, () => finishBox([cfg.who, L.lawyer]));
    if (s.n <= 0) return say(out, () => finishBox(['lou', "Booking wants him at Central. That's all we get."]));
    say(out);
  },
  showEvidence(id, cfg, s, say, finishBox) {
    const ev = STATE.evidence.filter(e => ['photo', 'seizure', 'stmt', 'page'].includes(e.kind)).slice(-6);
    UI.open({ id: 'pick', cls: 'pick', legend: [['confirm', 'Show'], ['cancel', 'Back']], cancel: () => UI.close(),
      render(el) { el.append(h('div.panel.manila', h('div.kicker', { text: 'SHOW EVIDENCE' }), h('div.grid', ev.map(e => h('button.ev', { 'data-f': '', on: () => { UI.close(); Box.useEv(id, cfg, s, e, say, finishBox); } }, e.ref && PHOTO_IMG[e.ref] ? h('img', { src: PHOTO_IMG[e.ref], alt: '' }) : h('div.bicon', { text: '■' }), h('span', { text: e.text })))), ev.length ? null : h('p', { text: 'Nothing to show.' }), btn('Back', () => UI.close()))); },
      model(ss) { ss.confirm = () => { UI.close(ss); if (ev[0]) Box.useEv(id, cfg, s, ev[0], say, finishBox); }; } });
  },
  useEv(id, cfg, s, e, say, finishBox) {
    s.n--; const key = cfg.ev && (cfg.ev[e.id] ? e.id : e.id === 'package' ? 'package' : e.id === 'pager' ? 'pager' : null), r = key ? cfg.ev[key] : null;
    const out = [];
    if (cfg.kind === 'kitchen') { const ok = !!e; s.trust += ok ? 10 : 0; out.push(['dana', 'I know what this is. So do you.'], ['pigeon', ok ? '...Yeah.' : 'That ain\'t nothing.']); return say(out); }
    if (r) { s.resolve += r[0]; s.shown.push(key); out.push(r[2], r[3]); } else { s.resolve += 10; s.fear += 5; out.push(['dana', 'Look at this.'], [cfg.who, "That's a picture of a corner, Detective."]); }
    s.resolve = clamp(s.resolve, 0, 100); this.checkBeats(cfg, s, out); if (s.n <= 0) return say(out, () => finishBox(['lou', "Booking wants him at Central. That's all we get."])); say(out);
  },
  kitchen(cfg, s, k, say, finishBox) {
    const out = [];
    if (k === 'honest') { const ok = hasFact('obs:pigeon:lookout') || hasFact('face:pigeon'); s.trust += ok ? 15 : -5; out.push(['dana', ok ? 'I know you watch from the roof. I know Tee pays you forty a day.' : 'I know more than you think.'], ['pigeon', ok ? '...Thirty-five.' : 'You don\'t know nothing.']); }
    if (k === 'promise') { s.trust += 20; FL().promise = true; out.push(['dana', 'Nobody will know you talked to me.'], ['pigeon', 'Everybody always know.']); }
    if (k === 'push') { s.fear += 20; s.trust -= 10; s.pushes++; out.push(['dana', 'You want to end up like Corey?'], ['pigeon', '...']); if (s.pushes >= 2) return say(out, () => finishBox(['odessa', "That's enough. You can go now, Dana Lynn."])); }
    if (k === 'listen') { s.trust += 8; out.push(['pigeon', "Homers always come back. You take 'em fifty miles and they come back. That's the thing about 'em."], ['odessa', '(from the stove) Mm-hm.']); }
    if (k === 'heard') { s.trust -= 40; out.push(['dana', 'I heard your call. To your grandmother.'], ['pigeon', 'You was listening to me?']); s.usedHeard = true; }
    s.trust = clamp(s.trust, 0, 100); FL().pigeonTrust = s.trust;
    if (s.trust >= 70) { FL().pigeonTrust = Math.max(75, s.trust); addFact('stmt:pigeon:count', 3, true); addEvidence({ id: 'stmt:pigeon:count', kind: 'stmt', text: 'Pigeon: Thursdays he carries the bag to Mama B\'s back door' }); return say(out, () => finishBox(['pigeon', "Thursdays I carry the bag. Mama B's. The back door."])); }
    if (s.n <= 0) return say(out, () => finishBox(['odessa', "He's a good boy. He's fourteen. Those two things don't last long around here."]));
    say(out);
  },
  screen(id, cfg, s, say, finishBox, done) {
    const kit = cfg.kind === 'kitchen';
    const opts = kit ? [['boxTop', 'Be honest', 'honest'], ['boxLeft', 'Promise', 'promise'], ['boxRight', 'Push', 'push'], ['boxBottom', 'Listen', 'listen']]
      : [['boxTop', 'Show evidence', 'show'], ['boxLeft', 'Bluff', 'bluff'], ['boxRight', 'Lean on him', 'lean'], ['boxBottom', s.got.includes('B3') && s.fear <= 60 && s.rapport >= 1 ? 'Work for us' : 'Offer a way out', 'offer']];
    const go = k => { if (k === 'show') return this.showEvidence(id, cfg, s, say, finishBox); this.act(id, cfg, s, k, say, finishBox); };
    const keys = {}; for (const [a, , k] of opts) keys[a] = () => go(k);
    UI.open({ id: 'box', cls: 'box', keys, legend: [['confirm', 'Choose']],
      render(el) {
        const bars = kit ? [['Trust', s.trust, 100, s.trust >= 70 ? 'enough' : 'not yet'], ['Fear', s.fear, 100, s.fear > 60 ? 'scared' : 'wary']] : [['Resolve', s.resolve, 100, s.resolve > 60 ? 'holding' : s.resolve >= 30 ? 'cracking' : 'breaking'], ['Fear', s.fear, 100, s.fear >= 80 ? 'lawyer' : s.fear > 60 ? 'scared' : 'calm']];
        el.append(h('div.panel.dark.boxpanel', h('div.kicker', { text: kit ? "MISS ODESSA'S KITCHEN" : 'THE BOX · ' + CAST[cfg.who].name }),
          ...bars.map(([l, v, mx, w]) => h('div.meter', h('b', { text: l + ' · ' + w }), h('div.bar', h('i', { style: { width: v / mx * 100 + '%' } })))),
          h('div.small', { text: (kit ? '' : 'Rapport ' + '●'.repeat(s.rapport) + '○'.repeat(3 - s.rapport) + ' · ') + (kit ? 'Time ' : 'Booking wants him in ') + s.n + ' exchanges' + (s.got.length ? ' · Beats: ' + s.got.join(' ') : '') }),
          h('div.diamond', opts.map(([a, lab, k]) => h('button.dopt.' + a, { 'data-f': '', on: () => go(k), html: glyphHTML(a) + '<span>' + esc(lab) + '</span>' }))),
          kit && FL().heardPigeon && !s.usedHeard ? btn('"I heard your call."', () => go('heard'), 'special') : null));
      },
      model(ss) { ss.confirm = () => go(kit ? 'listen' : (s.last === 'lean' ? 'offer' : 'lean')); } });
  }
};

/* ---- THE PAPER: the affidavit and the judge ---- */
const NECESSITY = [['surv', 'Physical surveillance', () => STATE.stats.photos > 0], ['ci', 'Confidential informant', () => FL().pocketsMet], ['uc', 'Undercover purchase', () => false], ['sw', 'Search warrant', () => false], ['gj', 'Grand jury subpoena', () => false]];
const Paper = {
  lines() { return [{ id: 'P1', name: 'P1 · Gaither Market payphone' }, { id: 'P2', name: 'P2 · Suds City payphone' }, { id: 'PG', name: 'Pager clone · 555-0110' }, ...(STATE.numbers.P3.known ? [{ id: 'P3', name: 'P3 · bus stop payphone' }] : [])]; },
  /** probable-cause points of one evidence item for a line, and whether it is direct */
  pts(e, line) {
    if (e.kind === 'page' && e.num === line) return [2, true];
    if (line === 'PG' && e.id === 'pager') return [2, true];
    if (line === 'PG' && e.kind === 'page') return [1, true];
    if (e.kind === 'photo' && e.act === 'payphone' && line === 'P1') return [2, true];
    if (e.kind === 'photo' && e.act === 'stash-access' && line === 'PG') return [1, false];
    if (e.kind === 'stmt' && (e.id === 'stmt:corey:code' && line === 'PG')) return [1, false];
    if (e.kind === 'stmt' && e.id === 'stmt:pockets') return [1, false];
    if (e.kind === 'stmt' && e.id === 'stmt:pat' && line === 'P1') return [2, false];
    if (e.kind === 'obs' && e.id === 'numplate:' + line) return [1, false];
    if (e.kind === 'photo' && e.id.startsWith('face:') && ['tee', 'corey'].includes(e.who)) return [1, false];
    if (e.kind === 'seizure' && line === 'PG') return [1, false];
    return [0, false];
  },
  score(line, picks) { let p = 0, direct = false; for (const e of picks) { const [n, d] = this.pts(e, line); p += n; direct = direct || (d && n > 0); } return { p, direct, ok: p >= 4 && direct }; },
  open(done) {
    const lines = this.lines(), pick = Object.fromEntries(lines.map(l => [l.id, []])), nec = {}; let li = 0;
    const s = UI.open({ id: 'affidavit', cls: 'affidavit', legend: [['confirm', 'Select'], ['tabPrev', 'Line'], ['tabNext', 'Line'], ['cancel', 'Back']], tab: d => { li = (li + d + lines.length + 1) % (lines.length + 1); UI.refresh(s, 0); sfx('typekey'); },
      cancel: () => {},
      render(el) {
        const ln = lines[li], body = h('div.scroll.doc');
        if (ln) { const sc = Paper.score(ln.id, pick[ln.id]);
          body.append(h('h2', { text: 'Target line: ' + ln.name }), h('p.mono', { text: 'Probable cause: ' + sc.p + ' / 4 · ' + (sc.direct ? 'direct evidence ✓' : 'needs a direct item (an act photo or a decoded page)') }),
            h('div.grid', STATE.evidence.filter(e => Paper.pts(e, ln.id)[0] > 0 || pick[ln.id].includes(e)).slice(0, 8).map(e => { const on = pick[ln.id].includes(e), [n] = Paper.pts(e, ln.id);
              return h('button.ev' + (on ? '.sel' : ''), { 'data-f': '', on: () => { const a = pick[ln.id]; if (on) a.splice(a.indexOf(e), 1); else if (a.length < 3) a.push(e); sfx('typekey'); UI.refresh(s); } }, h('span', { text: (on ? '☑ ' : '☐ ') + e.text + '  (+' + n + ')' })); })));
        } else {
          body.append(h('h2', { text: 'Necessity: techniques tried and failed' }), h('p.small', { text: 'Tick only what you did. The judge reads every line.' }),
            ...NECESSITY.map(([k, lab]) => h('button.check' + (nec[k] ? '.on' : ''), { 'data-f': '', on: () => { nec[k] = !nec[k]; sfx('typekey'); UI.refresh(s); } }, (nec[k] ? '☑ ' : '☐ ') + lab)),
            btn('Sign and send it to Judge Halloway', () => { UI.close(); done(lines.map(l => Object.assign({}, l, Paper.score(l.id, pick[l.id]), { picks: pick[l.id] })), nec); }, 'primary'));
        }
        el.append(h('div.panel.paper', h('div.tabs', [...lines.map(l => l.id), 'NECESSITY'].map((x, i) => h('span' + (i === li ? '.on' : ''), { text: x }))), body));
      },
      model(ss) { ss.confirm = () => { for (const l of lines) { pick[l.id] = STATE.evidence.filter(e => Paper.pts(e, l.id)[0] > 0).sort((a, b) => Paper.pts(b, l.id)[0] - Paper.pts(a, l.id)[0]).slice(0, 3); } nec.surv = true; UI.close(ss); done(lines.map(l => Object.assign({}, l, Paper.score(l.id, pick[l.id]), { picks: pick[l.id] })), nec); }; } });
    tip('paper', 'The affidavit', 'Each line needs 4 points of probable cause, with at least one direct item. Then the necessity section: what you tried. Don\'t lie to a judge.');
  },
  /** Halloway's three questions: weakest lines first, any false necessity tick always */
  judge(result, nec, done) {
    const qs = [], lies = NECESSITY.filter(([k, , t]) => nec[k] && !t());
    for (const [k] of lies) qs.push({ q: k === 'uc' ? 'Tell me about the undercover buys.' : k === 'sw' ? 'Tell me about the search warrant you served.' : k === 'gj' ? "Which grand jury? I'd like to see those returns." : 'Tell me about your informant.', lie: true, answers: ['We... the paperwork is coming.', 'It was an informal arrangement.', 'I misspoke, Your Honor.'] });
    const weak = result.slice().sort((a, b) => a.p - b.p);
    for (const l of weak) { if (qs.length >= 3) break;
      if (l.id === 'PG') qs.push({ line: l, q: "These are numbers on a pager. How do you know they're phone numbers at all?", answers: [hasFact('stmt:corey:code') && STATE.cipher.decoded.length ? ['Decoded with the crew\'s keypad code, they match payphones on Ridley. A crew member described the code in an interview.', true] : ["It's how they do it.", false], ["It's how they do it.", false], ['Our informant says so.', false]] });
      else qs.push({ line: l, q: 'How do you know the man on ' + l.id + ' is the man in your photograph?', answers: [l.picks.some(e => e.kind === 'photo' && e.act === 'payphone') || l.picks.some(e => e.kind === 'page') ? ['We have him on that phone, and his pages call it back. It\'s in the exhibits.', true] : ['He\'s on that corner every day.', false], ['Our informant says so.', false], ['He\'s on that corner every day.', false]] });
    }
    while (qs.length < 3) qs.push({ q: "Who's monitoring, and do they know the rules?", answers: [['Detective Pettiford. Every call logged, minimized in the first seconds if it isn\'t pertinent.', true], ['We all take turns.', false]] });
    let i = 0, caught = false; const struck = new Set(result.filter(l => !l.ok).map(l => l.id));
    const ask = () => {
      if (i >= qs.length || caught) return end();
      const q = qs[i++], ans = q.lie ? q.answers.map(a => [a, false]) : shuffle(q.answers.slice(0, 3).filter((a, j, arr) => arr.findIndex(b => b[0] === a[0]) === j), RNG.cos);
      Talk.run([['halloway', q.q], { who: 'dana', choices: ans.map(a => a[0]), pick: j => { if (q.lie) { caught = true; FL().perjury = true; return [['halloway', "Detective, I've signed wiretaps for twenty-two years, and I regret eleven of them. This one I won't sign."]]; } if (!ans[j][1] && q.line) { struck.add(q.line.id); return [['halloway', "That's not an answer. I'm striking " + q.line.id + '.']]; } return [['halloway', 'Mm.']]; } }], ask);
    };
    const end = () => {
      const up = result.filter(l => !struck.has(l.id) && !caught);
      if (caught) { meter('brass', -15, 'Perjury in chambers'); meter('legal', 30, 'A false affidavit'); }
      if (!up.length) { if (!caught) meter('brass', -10, 'Affidavit denied'); FL().denied++; Talk.run([['vance', caught ? 'You lied to Abner Halloway. Do you know how long it took me to get him to trust this office?' : "He wants more. One more act on a payphone. Then we go back."]], () => done(false)); return; }
      for (const l of up) { STATE.wire.lines[l.id] = 'up'; }
      FL().wireUp = true; sfx('stamp'); game.shake(1);
      Talk.run([['halloway', "You're up. Thirty days. Minimize, Detective. I read the logs."], ['halloway', "If I find a grandmother's phone call in your transcripts, I'll pull this wire myself."]], () => done(up.map(l => l.id)));
    };
    Talk.run([['halloway', 'Sit, Detective. Ms. Vance, you may stay. I have three questions and a crossword.']], ask);
  }
};
