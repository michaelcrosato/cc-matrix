/* 14-board: the case as a corkboard. Tiers of slots (THE CORNER, THE PACKAGE, THE MONEY, PHONES); cards come from
   what you can prove (faces, names, places); a pin holds only if the evidence backs it ("Says who?"). Select a card,
   then a slot (or drag it there); □ unpins; △ inspects. Correct pins add to Case. */
const PLACES = { gas: 'Arundel Gas', garage: 'The garage behind the Courts', mamab: 'Mama B\'s Soul Food', harstadco: 'Harstad Auto Parts', thursday: 'Thursday, after close' };
const roleEvidence = (p, role) => hasFact('obs:' + p + ':' + role) || hasFact('stmt:corey:' + p + '-' + role) || hasFact('pocket:' + p + ':' + role);
const BOARD = [
  { id: 'corner', title: 'The Corner', slots: [
    { id: 'lieutenant', label: 'Lieutenant', who: 'tee', why: 'Says who? Get me something that puts him in charge: a read on him working, or somebody saying it.' },
    { id: 'muscle', label: 'Muscle', who: 'rook', why: 'Big don\'t make you muscle. Catch him standing on the money.' },
    { id: 'stash', label: 'Stash', who: 'corey', why: 'Says who? Get me something that puts him on the stash.' },
    { id: 'money', label: 'Money', who: 'dink', why: 'Watch his hands. Who takes the cash?' },
    { id: 'runner', label: 'Runner', who: 'tavon', why: 'Catch him walking product from the stash.' },
    { id: 'lookout1', label: 'Lookout', who: 'pigeon', why: 'Kid on a roof is a kid on a roof. Read him watching.' },
    { id: 'lookout2', label: 'Lookout', who: 'moe', why: 'Kid on a bike is a kid on a bike. Read him watching.' }] },
  { id: 'package', title: 'The Package', slots: [
    { id: 'courier', label: 'Courier', who: 'dale', need: () => hasFact('act:dale:reup-handoff') || hasFact('int:S1-4'), why: 'A man in a work shirt. Put him at the re-up.' },
    { id: 'supplier', label: 'Supplier front', who: 'harstadco', need: () => hasFact('plate:harstad'), why: 'Read me the plate on that truck first.' },
    { id: 'reup', label: 'Re-up spot', who: () => hasFact('garage:friday') ? 'garage' : 'gas', need: () => hasFact('reup:gas') || hasFact('garage:friday'), why: 'Where does the package land? Somebody said it on a phone.' }] },
  { id: 'money', title: 'The Money', slots: [
    { id: 'boss', label: 'Boss', who: 'easy', need: () => hasFact('name:easy'), why: 'Nobody on that corner signs his own checks. Find the name.' },
    { id: 'driver', label: 'Driver', who: 'lonnie', need: () => hasFact('name:lonnie'), why: 'The voice on the phone has a name. Find it.' },
    { id: 'front', label: 'Front', who: 'mamab', need: () => hasFact('place:mamab'), why: 'Where does he sit? Somebody will say it.' },
    { id: 'count', label: 'The count', who: 'thursday', need: () => hasFact('count:thursday'), why: 'When does the money get counted?' }] },
  { id: 'phones', title: 'Phones', slots: ['P1', 'P2', 'P3', 'PG', 'B1', 'B2', 'B3', 'B4', 'B5'].map(k => ({ id: k, label: k === 'PG' ? 'Pager clone' : k, phone: k })) }
];
const PHONE_USERS = { P1: 'tee', P2: 'tee', P3: 'dale', PG: 'corey', B1: 'tee', B2: 'lonnie', B3: 'rook', B4: 'dale', B5: 'pigeon' };
const Board = {
  tier: 0, sel: null, from: null, s: null, drag: null,
  slotWho(sl) { return typeof sl.who === 'function' ? sl.who() : sl.who; },
  cards() {
    const people = Object.keys(PEOPLE).filter(p => ['tee', 'rook', 'corey', 'dink', 'tavon', 'pigeon', 'moe', 'dale', 'easy', 'lonnie', 'sunday', 'pockets'].includes(p) && (hasFact('face:' + p) || hasFact('name:' + p)));
    const places = Object.keys(PLACES).filter(k => ({ gas: hasFact('reup:gas') || hasFact('pocket:dre'), garage: hasFact('garage:friday'), mamab: hasFact('place:mamab'), harstadco: hasFact('plate:harstad'), thursday: hasFact('count:thursday') })[k]);
    return people.concat(places);
  },
  cardName(c) { return PLACES[c] || (PEOPLE[c] ? (hasFact('face:' + c) || hasFact('name:' + c) ? nameOf(c) : 'UNKNOWN') : c); },
  /** the role slot a card sits in (phones=false), or a phone it's tied to (phones=true): a person keeps one role and can be tied to any number of phones */
  pinnedTo(c, phones = false) { return Object.keys(STATE.board.pins).find(k => STATE.board.pins[k] === c && !!(this.slot(k) || {}).phone === phones); },
  /** can this card go on that slot? → true, or the reason it can't */
  check(sl, c) {
    if (sl.phone) {
      if (!PEOPLE[c]) return 'Phones go to people.';
      if (!knownNumber(sl.phone)) return 'We don\'t have that number yet.';
      const ok = hasFact('num:' + sl.phone + ':' + c) || hasFact('payphoneAct:' + c + ':' + sl.phone) || Object.entries(STATE.wire.ids || {}).some(([k, v]) => v === c && k.startsWith(sl.phone + ':'));
      return ok ? true : 'You seen him on that phone? Photo, a page, his voice on the line. Something.';
    }
    const want = this.slotWho(sl);
    if (c !== want) {
      if (PEOPLE[c] && PEOPLE[want] && !PLACES[c]) return want === c ? true : 'Doesn\'t fit what we know. ' + sl.why;
      return 'That doesn\'t go there.';
    }
    if (sl.need) return sl.need() ? true : sl.why;
    if (!(hasFact('face:' + c) || hasFact('name:' + c))) return 'A face first. Get me a picture.';
    return roleEvidence(c, sl.id.startsWith('lookout') ? 'lookout' : sl.id) ? true : sl.why;
  },
  pin(slotId, c) {
    const sl = this.slot(slotId); if (!sl) return false;
    const ok = this.check(sl, c);
    if (ok !== true) { Snd.play('bump', { vol: .4 }); this.say(ok); return false; }
    const was = sl.phone ? null : this.pinnedTo(c); if (was) delete STATE.board.pins[was];   // a role moves; a phone tie never takes the card off its role
    const fresh = STATE.board.pins[slotId] !== c; STATE.board.pins[slotId] = c; Snd.play('pin');
    if (fresh) { Meters.add('case', 1, 'Pinned ' + this.cardName(c) + ': ' + sl.label, true); bus.emit('pin', { slot: slotId, card: c }); }
    if (sl.phone && !STATE.board.links.some(l => l[0] === c && l[1] === sl.phone)) { STATE.board.links.push([c, sl.phone]); Snd.play('string'); }
    if (sl.phone && STATE.numbers[sl.phone]) STATE.numbers[sl.phone].user = c;
    return true;
  },
  unpin(slotId) { if (STATE.board.pins[slotId]) { delete STATE.board.pins[slotId]; STATE.board.links = STATE.board.links.filter(l => l[1] !== slotId); Snd.play('cancel', { vol: .4 }); } },
  slot(id) { for (const t of BOARD) for (const s of t.slots) if (s.id === id) return s; return null; },
  pinned() { return Object.keys(STATE.board.pins).length; },
  eligible() { let n = 0; for (const s of BOARD[0].slots) if (this.check(s, this.slotWho(s)) === true) n++; return n; },
  say(t) { this.msg = t; if (this.s) UI.render(this.s); },
  open(o = {}) {
    this.sel = null; this.from = null; this.msg = o.msg || (this.pinned() ? '' : 'Pick a face from the tray, then the slot it belongs in.'); this.tier = o.tier || 0;
    const s = this.s = UI.open({ id: 'board', cls: 'boardscr', allowPause: false,
      html: () => this.html(), legend: () => [['confirm', this.sel ? 'Pin here' : 'Pick up'], ['uiAlt', 'Unpin'], ['uiInfo', 'Inspect'], ['tabPrev', 'Tier'], ['tabNext', 'Tier'], ['cancel', this.sel ? 'Put down' : 'Close']],
      onTab: d => { this.tier = (this.tier + d + BOARD.length) % BOARD.length; UI.render(s); },
      onBack: () => { if (this.sel) { this.sel = null; this.from = null; UI.render(s); } else { UI.close(s); this.s = null; if (o.onClose) o.onClose(); } },
      onSelect: id => this.select(id),
      onAlt: id => { if (id && id.startsWith('slot:')) { this.unpin(id.slice(5)); UI.render(s); } },
      onInfo: id => { const c = id && id.startsWith('card:') ? id.slice(5) : id && id.startsWith('slot:') ? STATE.board.pins[id.slice(5)] : null; if (c) this.inspect(c); } });
    if (s.el) this.wireDrag(s);
    return s;
  },
  select(id) {
    const s = this.s;
    if (id.startsWith('tier:')) { this.tier = +id.slice(5); UI.render(s); return; }
    if (id.startsWith('card:')) { this.sel = id.slice(5); this.from = null; this.msg = 'Holding ' + this.cardName(this.sel) + '. Now the slot.'; UI.render(s, id); return; }
    if (id.startsWith('slot:')) {
      const sid = id.slice(5);
      if (!this.sel) { const c = STATE.board.pins[sid]; if (c) { this.sel = c; this.from = sid; this.msg = 'Holding ' + this.cardName(c) + '.'; UI.render(s, id); } else this.say('Pick a card from the tray first.'); return; }
      const from = this.from; if (this.pin(sid, this.sel)) { if (from && from !== sid && this.slot(from).phone && STATE.board.pins[from] === this.sel) this.unpin(from); this.msg = this.cardName(this.sel) + ' → ' + this.slot(sid).label + '.'; this.sel = null; this.from = null; }   // a tie picked up off a phone moves
      UI.render(s, id);
    }
  },
  wireDrag(s) {
    s.el.addEventListener('pointerdown', e => { const n = e.target.closest('[data-f^="card:"]'); if (n && e.button === 0) { this.drag = n.dataset.f.slice(5); } });
    s.el.addEventListener('pointerup', e => { if (!this.drag) return; const n = e.target.closest('[data-f^="slot:"]'); const c = this.drag; this.drag = null; if (n) { this.sel = c; this.from = null; this.select(n.dataset.f); } });
  },
  portrait(c, empty) { if (!PEOPLE[c] || HEADLESS) return ''; return `<canvas width="1" height="1" style="background:url(${portraitURL(c, { bg: '#2a2620' })}) center/cover"></canvas>`; },
  html() {
    const t = BOARD[this.tier], pins = STATE.board.pins, cards = this.cards().filter(c => t.id === 'phones' ? !!PEOPLE[c] : !this.pinnedTo(c));
    const slotHtml = sl => {
      const c = pins[sl.id], known = !!c, who = this.slotWho(sl), unknownBoss = sl.id === 'boss' && !hasFact('name:easy') && hasFact('boss:?');
      const num = sl.phone && STATE.numbers[sl.phone];
      return `<button class="slot${known ? '' : ' empty'}${this.sel ? ' sel' : ''}" data-f="slot:${sl.id}"><div class="role">${esc(sl.label)}</div>
        ${known ? (PEOPLE[c] ? `<div style="height:3.6em;width:3.6em;margin:.1em auto;background:url(${HEADLESS ? '' : portraitURL(c, { bg: '#2a2620' })}) center/cover"></div>` : `<div style="height:3.6em;display:flex;align-items:center;justify-content:center;font-weight:700">${esc(PLACES[c] || c)}</div>`)
          : `<div style="height:3.6em;display:flex;align-items:center;justify-content:center;font-size:1.8em;color:#8a7a5a">${unknownBoss ? '?' : sl.phone ? '☎' : '?'}</div>`}
        <div class="who">${known ? esc(this.cardName(c)) : sl.phone ? esc(num && num.known ? num.n : 'unknown number') : unknownBoss ? 'BOSS ?' : '—'}</div></button>`;
    };
    return `<div class="panel board"><div class="kicker">The Board · ${this.pinned()} pinned · Case ${STATE.meters.case}</div>
      <div class="tabs">${BOARD.map((x, i) => `<span class="tab${i === this.tier ? ' on' : ''}" data-f="tier:${i}">${esc(x.title)}</span>`).join('')}</div>
      <div class="tier">${t.slots.map(slotHtml).join('')}</div>
      <h2 style="margin-top:.6em">Tray${this.sel ? ' · holding ' + esc(this.cardName(this.sel)) : ''}</h2>
      <div class="tray">${cards.length ? cards.map(c => `<button class="item${this.sel === c ? ' is-sel' : ''}" data-f="card:${c}" style="${this.sel === c ? 'outline:4px dashed #b3261e' : ''}">${PEOPLE[c] ? `<div style="height:2.6em;width:2.6em;float:left;margin-right:.4em;background:url(${HEADLESS ? '' : portraitURL(c, { bg: '#2a2620' })}) center/cover"></div>` : ''}<b>${esc(this.cardName(c))}</b><small>${esc(PEOPLE[c] ? PEOPLE[c].role : 'Place')}</small></button>`).join('') : '<p class="muted">Nothing new to pin. Go get more.</p>'}</div>
      ${STATE.board.links.length ? `<p class="string">${STATE.board.links.map(l => esc(this.cardName(l[0])) + ' ── ' + esc(l[1])).join(' · ')}</p>` : ''}
      <p style="min-height:1.4em"><b>LOU:</b> ${esc(this.msg || '')}</p></div>`;
  },
  inspect(c) {
    const ev = STATE.evidence.filter(e => e.ref === c), ph = STATE.photos.filter(p => p.subject === c && p.stars > 0).slice(-3);
    UI.open({ id: 'inspect', cls: '', html: () => `<div class="panel file narrow"><div class="kicker">Card</div><h1>${esc(this.cardName(c))}</h1><p class="muted">${esc(PEOPLE[c] ? PEOPLE[c].name + ' · ' + PEOPLE[c].role : PLACES[c] || '')}</p>
      <div style="display:flex;gap:1em;flex-wrap:wrap">${ph.map(p => `<div style="width:9em">${polaroidHTML(p)}</div>`).join('')}</div>
      <ul>${ev.map(e => `<li>${esc(e.text)}</li>`).join('') || '<li>Nothing in the file yet.</li>'}</ul>${PEOPLE[c] && PEOPLE[c].shoes && hasFact('pocket:' + c) ? `<p><b>Shoes:</b> ${esc(PEOPLE[c].shoes)}</p>` : ''}
      <button class="btn primary" data-f="ok">Back</button></div>`, legend: [['cancel', 'Back']], onSelect: () => UI.close() });
  }
};
