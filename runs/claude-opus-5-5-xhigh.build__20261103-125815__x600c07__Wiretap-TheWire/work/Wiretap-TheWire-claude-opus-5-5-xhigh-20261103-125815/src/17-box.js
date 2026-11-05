/* 17-box: interrogation (App. E). Each exchange you pick an approach from a face-button diamond (△ show evidence,
   □ bluff, ○ lean, ✕ offer a way out; 1-4 on a keyboard; hover and click). Resolve falls, Fear rises, Rapport earns
   the flip. Fear 80 means "lawyer". The kitchen is the same machine with Trust for Resolve. */
const BOX_CFG = {
  corey: { who: 'corey', title: 'Corey "Stash" Lyle', resolve: 100, fear: 30, n: 12, clock: 'Booking wants him at Central in 20 minutes',
    opts: { top: 'Show evidence', left: 'Bluff', right: 'Lean on him', bottom: 'Offer a way out' },
    lines: {
      lean: [['lou', 'You know what distribution in a school zone gets you? That court\'s a school zone, Corey. Look it up.'], ['lou', 'Nineteen. You\'ll be thirty-five when you walk out. Thirty-five, Corey.']],
      leanR: { high: ['I ain\'t distributing nothing. I was sitting.', 'I was sitting on a step. That\'s it.'], mid: ['Why y\'all on me? I\'m nobody.', 'I-I\'m nobody, man. Ask anybody.'], low: ['Stop. Just... stop.', 'Okay. Okay. Stop.'] },
      offer: [['dana', 'You\'re nineteen. Tee\'s twenty-four. Who do you think takes the weight?'], ['dana', 'Nobody on that corner is coming to see you in here, Corey. Nobody.']],
      offerR: { high: ['Tee look out for me.', 'Tee got my back.'], mid: ['...Tee ain\'t gonna let me go down.', 'He-he said if anything happen, he got a lawyer.'], low: ['What happens to me? If I say something. What happens?', 'If I talk... where I go?'] },
      combo: [['narr', 'Lou slams the table and walks out.'], ['dana', 'He\'s gone. It\'s just me. Talk to me, Corey.']],
      bluffOK: [['dana', 'Pigeon told us you hold for them.'], ['corey', 'Pigeon don\'t know nothing about— ...man.']],
      bluffNo: [['dana', 'Rook says you set up Felton.'], ['corey', 'Rook don\'t talk to police. You making stuff up now.']],
      irrelevant: [['corey', 'That\'s a kid. Why you showing me a kid?']]
    },
    beats: [
      { id: 'B1', when: s => s.resolve <= 75, say: 'Tee. Terrence. He run Gaither. I just... I just sit.', fact: 'stmt:corey:tee-lieutenant', also: ['name:tee'] },
      { id: 'B2', when: s => s.resolve <= 50 && s.used.pager, say: 'The numbers... it\'s the phone, man. You turn it. That\'s all I know.', fact: 'stmt:corey:code', also: ['codes:known'] },
      { id: 'B3', when: s => s.resolve <= 25, say: 'Fourteen-twelve. Behind the radiator. There\'s a board loose.', fact: 'stmt:corey:stash' }],
    flip: { say: 'If Tee finds out, I\'m dead. You know that, right? ...What I gotta do?' },
    lawyer: 'I-I want a lawyer. I know my rights. I want a lawyer.',
    evidence: () => {
      const out = [];
      if (F().coreyPackage) out.push({ id: 'package', label: 'The package', sub: 'Forty vials, orange tops', fx: { resolve: -30 }, say: [['dana', 'Forty vials. Orange tops. Your prints on the bag.'], ['corey', 'That bag was on the ground.']] });
      out.push({ id: 'pager', label: 'His pager', sub: 'Seized at the arrest', fx: { resolve: -15 }, say: [['lou', 'Your pager\'s been busy, Corey. Real popular kid.'], ['corey', 'People page me. So?']] });
      if (hasFact('act:corey:stash-access') || hasFact('obs:corey:stash')) out.push({ id: 'vacant', label: 'Corey at the vacant', sub: 'Photo / observation log', fx: { resolve: -25 }, say: [['dana', 'That\'s you going into fourteen-twelve. Again. And again.'], ['corey', '...I live around there.']] });
      if (hasFact('face:tee')) out.push({ id: 'tee', label: 'Photo of Tee', sub: 'Face on file', fx: { resolve: -10 }, say: [['corey', 'I don\'t know him.']] });
      if (hasFact('face:pigeon')) out.push({ id: 'pigeon', label: 'Photo of Pigeon', sub: 'Kid on the roof', irrelevant: true });
      out.push({ id: 'corner', label: 'Photo of the corner', sub: 'Gaither & Ridley, daytime', irrelevant: true, say: [['corey', 'That\'s a picture of a corner, Detective.']] });
      return out.slice(0, 6);
    } },
  pigeon: { who: 'pigeon', title: 'Junior "Pigeon" Hollis', kitchen: true, trust: 20, fear: 40, n: 8, clock: 'Miss Odessa\'s kitchen. The radio plays gospel.',
    opts: { top: 'Be honest', left: 'Promise', right: 'Push', bottom: 'Listen' } }
};
const Box = {
  st: null, s: null, q: [], typer: null,
  start(cfgId, done) {
    const C = BOX_CFG[cfgId]; this.C = C; this.done = done; this.q = []; this.typer = null; this.log = [];
    this.st = C.kitchen ? { trust: C.trust + (F().odessaRespect ? 15 : 0), fear: C.fear, n: C.n, pushes: 0, over: false, used: {} } : { resolve: C.resolve, fear: C.fear, rapport: 0, n: C.n, beats: {}, used: {}, lastLean: false, over: false, flipped: false };
    this.s = UI.open({ id: 'box', cls: 'siderun', allowPause: true, onBack: null, noConfirm: false,
      html: () => this.html(), legend: () => this.st.over ? [['confirm', 'Continue']] : [['boxTop', C.opts.top], ['boxLeft', C.opts.left], ['boxRight', C.opts.right], ['boxBottom', this.bottomLabel()]],
      // the diamond's face buttons; ✕ is also the pad's confirm, so on Continue or the kitchen's special line it presses that instead
      keys: { boxTop: () => this.key('top'), boxLeft: () => this.key('left'), boxRight: () => this.key('right'), boxBottom: id => this.key('bottom', id) },
      onSelect: id => { if (id === 'end') this.finish(); else if (id.startsWith('o:')) this.pick(id.slice(2)); },
      tick: dt => this.tick(dt) });
    if (C.kitchen) this.say([['odessa', 'He\'s a good boy. He\'s fourteen. Those two things don\'t last long around here.'], ['narr', 'Junior keeps his eyes on the table.']]);
    else this.say([['narr', C.clock + '.'], ['lou', 'Corey Lyle. Have a seat. Oh, you\'re sitting. Good.']]);
  },
  bottomLabel() { const C = this.C, s = this.st; if (!C.kitchen && this.canFlip()) return 'Work for us'; return C.opts.bottom; },
  canFlip() { const s = this.st; return !this.C.kitchen && s.beats.B3 && s.fear <= 60 && s.rapport >= 1 && !s.flipped; },
  say(lines) { for (const l of lines) this.q.push(l); },
  tick(dt) {
    if (!this.typer && this.q.length) {
      const [who, text] = this.q.shift(); const entry = { who, text, shown: '' }; this.log.push(entry); if (this.log.length > 14) this.log.shift();
      this.typer = new Typer(text, who === 'narr' ? 'narr' : who, { mute: who === 'narr', onChar: () => { entry.shown = this.typer.shown; this.paintLog(); }, onDone: () => { entry.shown = entry.text; this.paintLog(); } });
      this.speaker = who; bus.emit('boxLine', { who });
    }
    if (this.typer) { this.typer.update(dt); if (game.input.pressed('confirm') && this.typer.i > 2 && !this.typer.done) this.typer.finish(); if (this.typer.done) { this.wait = (this.wait || 0) + dt; if (this.wait > .45 || !this.q.length) { this.typer = null; this.wait = 0; this.paintLog(); if (!this.q.length) this.refresh(); } } }
  },
  busy() { return !!this.typer || this.q.length > 0; },
  paintLog() { const el = this.s && this.s.el && this.s.el.querySelector('.log'); if (!el) return; el.innerHTML = this.logHtml(); el.scrollTop = el.scrollHeight; },
  logHtml() { return this.log.map(e => e.who === 'narr' ? `<p class="sys">${esc(e.shown)}</p>` : `<p><span class="sp">${esc(nameOf(e.who))}</span>${esc(e.shown)}</p>`).join(''); },
  refresh() { if (this.s) UI.render(this.s); },
  bar(label, v, cls, word) { return `<div class="meter ${cls}"><label><span>${esc(label)}</span><span>${esc(word)} · ${Math.round(v)}</span></label><div class="bar"><i style="width:${clamp(v, 0, 100)}%"></i></div></div>`; },
  html() {
    const C = this.C, s = this.st, word = v => v > 66 ? 'High' : v > 33 ? 'Middling' : 'Low';
    const meters = C.kitchen ? this.bar('Trust', s.trust, 'trust', word(s.trust)) + this.bar('Fear', s.fear, 'fear', word(s.fear))
      : this.bar('Resolve', s.resolve, '', word(s.resolve)) + this.bar('Fear', s.fear, 'fear', s.fear >= 80 ? 'Lawyer' : word(s.fear));
    const opt = (k, cls) => `<button class="opt d-${k}${this.busy() || s.over ? ' dis' : ''}" data-f="o:${k}"><span data-g="${{ top: 'boxTop', left: 'boxLeft', right: 'boxRight', bottom: 'boxBottom' }[k]}"></span><span>${esc(k === 'bottom' ? this.bottomLabel() : C.opts[k])}<small>${esc(this.optSub(k))}</small></span></button>`;
    return `<div class="side"><div class="panel" style="padding:.7em 1em"><div class="kicker">${C.kitchen ? 'Miss Odessa\'s kitchen' : 'Interview room 3'} · ${s.n} ${C.kitchen ? 'minutes before Odessa ends it' : 'exchanges before booking'}</div>
      <h2>${esc(C.title)}</h2><div class="meters">${meters}</div>${C.kitchen ? '' : `<div class="pips">Rapport ${'●'.repeat(s.rapport)}${'○'.repeat(3 - s.rapport)}</div>`}</div>
      <div class="log">${this.logHtml()}</div>
      ${s.over ? `<button class="btn primary" data-f="end">Continue</button>` : `<div class="diamond">${opt('top')}${opt('left')}${opt('right')}${opt('bottom')}</div>${C.kitchen && C.special && C.special() && !s.used.special ? `<button class="btn" data-f="o:special">"I heard your call."</button>` : ''}`}</div>`;
  },
  optSub(k) {
    const C = this.C; if (C.kitchen) return { top: 'Cite what you know', left: 'He\'ll remember it', right: 'Odessa is watching', bottom: 'Let him talk' }[k];
    return { top: 'Up to 6 items', left: Board.pinnedTo('corey') === 'stash' ? 'Backed by the Board' : 'Nothing to back it', right: 'Resolve down, fear up', bottom: this.st.lastLean ? 'Good cop, now' : 'Fear down a little' }[k];
  },
  band() { const r = this.st.resolve; return r > 60 ? 'high' : r >= 30 ? 'mid' : 'low'; },
  key(k, id) {
    if (this.st.over) { if (!this.busy()) this.finish(); return; }
    if (k === 'bottom' && id === 'o:special' && game.input.pressed('confirm')) { this.pick('special'); return; }
    this.pick(k);
  },
  pick(k) {
    if (this.busy() || this.st.over) return; const C = this.C, s = this.st, R = RNG.cos;
    if (C.kitchen) return this.pickKitchen(k);
    if (k === 'top') { this.evidencePicker(); return; }
    s.n--;
    if (k === 'left') {
      if (Board.pinnedTo('corey') === 'stash' || hasFact('obs:corey:stash')) { s.resolve -= 25; this.say(C.lines.bluffOK); } else { s.resolve += 20; s.rapport = Math.max(0, s.rapport - 1); this.say(C.lines.bluffNo); }
      s.lastLean = false;
    } else if (k === 'right') {
      s.resolve -= 12; s.fear += Math.max(3, 15 - 3 * s.rapport); this.say([pick(R, C.lines.lean), ['corey', pick(R, C.lines.leanR[this.band()])]]); s.lastLean = true;
    } else if (k === 'bottom') {
      if (this.canFlip()) { s.flipped = true; this.say([['dana', 'Work for us, Corey. You tell us when it moves. Nobody knows.'], ['corey', C.flip.say]]); F().coreyCI = true; addFact('ci:corey'); Toast('Corey works for you now', 'A confidential informant. Keep him alive.'); this.end(); return; }
      s.fear -= 15; s.resolve -= 8;
      if (s.lastLean) { s.resolve -= 20; s.rapport = Math.min(3, s.rapport + 1); this.say(C.lines.combo.concat([['corey', pick(R, C.lines.offerR[this.band()])]])); if (tip('combo')) Toast('Good cop', 'Lean, then offer: Lou plays the bad cop. Rapport +1.'); }
      else this.say([pick(R, C.lines.offer), ['corey', pick(R, C.lines.offerR[this.band()])]]);
      s.lastLean = false;
    }
    this.after();
  },
  evidencePicker() {
    const C = this.C, s = this.st, list = C.evidence().filter(e => !s.used[e.id]);
    UI.choose({ kicker: 'Show evidence', title: 'What goes on the table?', allowPause: true, cards: list.map(e => ({ id: e.id, label: e.label, sub: e.sub })), back: () => UI.close() }, id => {
      const e = list.find(x => x.id === id); s.used[e.id] = true; s.n--;
      if (e.irrelevant) { s.resolve += 10; s.fear += 5; this.say(e.say || C.lines.irrelevant); }
      else { s.resolve += e.fx.resolve || 0; this.say(e.say); }
      s.lastLean = false; this.after();
    });
  },
  after() {
    const C = this.C, s = this.st; s.resolve = clamp(s.resolve, 0, 100); s.fear = clamp(s.fear, 0, 100);
    for (const b of C.beats) if (!s.beats[b.id] && b.when(s)) {
      s.beats[b.id] = true; this.say([['corey', b.say]]); addFact(b.fact); (b.also || []).forEach(f => addFact(f, true));
      addEvidence({ id: b.fact, kind: 'stmt', ref: 'corey', pts: 1, text: 'Corey Lyle, interview: "' + b.say + '"' }); casePoint('stmt', 'Statement: ' + b.id);
      if (b.id === 'B3') { addEvidence({ id: 'seizure:stash1412', kind: 'seizure', ref: 'corey', pts: 1, text: 'Stash location: 1412 Gaither, behind the radiator (from Corey)' }); }
    }
    if (this.canFlip() && tip('flip')) Toast('He\'s close', 'With rapport and not too scared, ' + Prompts.label('boxBottom') + ' becomes "Work for us".');
    if (s.fear >= 80) { this.say([['corey', C.lawyer]]); this.end(); return; }
    if (s.n <= 0) { this.say([['narr', 'A uniform knocks on the glass. Booking is here.']]); this.end(); return; }
    this.refresh();
  },
  pickKitchen(k) {
    const s = this.st, P = 'pigeon'; s.n--;
    if (k === 'top') { const known = hasFact('obs:pigeon:lookout') || Board.pinnedTo('pigeon'); this.say([['dana', known ? 'I know you watch from the roof. I know Tee pays you forty a day.' : 'I know what you do up there.'], [P, known ? '...Fifty. He pays fifty now.' : 'I feed my birds. That\'s what I do up there.']]); s.trust += known ? 15 : -5; }
    else if (k === 'left') { this.say([['dana', 'Nobody will know you talked to me. Nobody.'], [P, 'People always know. Everybody always know everything.']]); s.trust += 20; F().promise = true; }
    else if (k === 'right') { s.pushes++; s.fear += 20; s.trust -= 10; this.say([['dana', 'You want to end up like Corey? In a room with no windows?'], [P, '...No.']]); if (s.pushes >= 2) { this.say([['odessa', 'That\'s enough. You can go now, Dana Lynn.']]); this.end(); return; } }
    else if (k === 'bottom') { s.trust += 8; this.say([['dana', 'Tell me about the birds.'], [P, 'Homers always come back. You take \'em fifty miles and they come back. That\'s the thing about \'em.']]); }
    else if (k === 'special') { s.used.special = true; s.trust -= 40; this.say([['dana', 'I heard your call. To your grandmother.'], [P, 'You was listening to me?']]); }
    s.trust = clamp(s.trust, 0, 100); s.fear = clamp(s.fear, 0, 100);
    if (s.trust >= 70) { this.say([[P, 'Thursdays I carry the bag. Mama B\'s. The back door.'], ['odessa', 'Go on and eat now, Junior.']]); F().pigeonTrust = s.trust; F().pigeonRunner = true; addFact('count:thursday'); addFact('place:mamab'); addEvidence({ id: 'stmt:pigeon:count', kind: 'stmt', ref: 'pigeon', pts: 1, text: 'Junior Hollis: he carries the bag to Mama B\'s back door on Thursdays.' }); casePoint('stmt', 'Pigeon will tell you when the count moves'); this.end(); return; }
    if (s.n <= 0) { this.say([['odessa', 'It\'s late. He has school.']]); this.end(); return; }
    this.refresh();
  },
  end() { this.st.over = true; F().pigeonTrust = this.C.kitchen ? Math.max(F().pigeonTrust, this.st.trust) : F().pigeonTrust; this.refresh(); },
  finish() { UI.close(this.s, true); this.s = null; const d = this.done; this.done = null; if (d) d(this.st); }
};
/* the kitchen's fifth option: only if Dana listened past the window on S3-4 */
BOX_CFG.pigeon.special = () => F().heardS34;
/* ---- Rook: three exchanges that can't be won ---- */
const RookBox = {
  start(done) {
    const lines = [['dana', 'Nice car.'], ['rook', 'Lawyer.'], ['lou', 'Taillight\'s out.'], ['rook', 'Lawyer.'], ['dana', 'Who\'s the hammer for, Ricky?'], ['rook', 'Law. Yer.']];
    Talk.play(lines.concat([['lou', 'Well. That went about how I pictured it.']]), () => { F().rookBoxed = true; done(); });
  }
};
