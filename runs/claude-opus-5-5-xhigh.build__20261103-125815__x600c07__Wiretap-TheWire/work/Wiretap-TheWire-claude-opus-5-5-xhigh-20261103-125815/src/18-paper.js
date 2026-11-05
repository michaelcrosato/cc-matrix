/* 18-paper: the affidavit (§6.5, App. F). Each target line takes up to three items of evidence; a line needs 4
   probable-cause points including a direct item (an ACT photo or a decoded page). The necessity section is honest or
   it is perjury, hidden until Judge Halloway asks. Then chambers: three questions, the weakest lines first. */
const LINES = [['P1', 'Payphone, Gaither Market', '555-0187'], ['P2', 'Payphone, Suds City', '555-0143'], ['P3', 'Payphone, the bus stop', '555-0129'], ['PG', 'Pager clone (stash pager)', '555-0110']];
const NECESSITY = [['surveil', 'Physical surveillance', () => STATE.stats.photos > 0], ['ci', 'Confidential informant', () => F().pocketsMet || F().coreyCI], ['uc', 'Undercover purchase', () => false],
  ['warrant', 'Search warrant', () => false], ['gj', 'Grand jury subpoena', () => false]];
const LINE_USER = { P1: 'tee', P2: 'tee', P3: 'dale', PG: 'corey' };
const Paper = {
  /** probable-cause points of one item on one line → [points, direct] */
  value(line, e) {
    if (!e) return [0, false];
    if (line === 'PG') {
      if (e.id === 'seizure:pager') return [Cipher.solvedCount('mem') > 0 ? 2 : 1, Cipher.solvedCount('mem') > 0];
      if (e.kind === 'page') return [1, true];
      if (e.id === 'stmt:corey:code') return [1, false];
      if (e.id === 'face:corey') return [1, false];
      if (e.kind === 'act' && e.ref === 'corey' && e.act === 'stash-access') return [1, false];
      if (e.kind === 'obs' && e.ref === 'corey') return [1, false];
      return [0, false];
    }
    if (e.kind === 'act' && e.act === 'payphone' && e.place && e.place.startsWith(line)) return [2, true];
    if (e.kind === 'page' && e.line === line) return [2, true];
    if (e.kind === 'int' && e.line === line) return [1, false];
    if (e.kind === 'stmt' && e.line === line) return e.direct ? [2, true] : [1, false];
    if (e.kind === 'stmt' && e.id === 'stmt:corey:tee-lieutenant' && LINE_USER[line] === 'tee') return [1, false];
    if (e.kind === 'seizure' && line !== 'P3') return [1, false];
    if (e.kind === 'photo' && e.ref === LINE_USER[line]) return [1, false];
    if (e.kind === 'obs' && e.ref === LINE_USER[line]) return [1, false];
    return [0, false];
  },
  score(line, ids) {
    let pts = 0, direct = false, inf = 0;
    for (const id of ids) { const e = evidence(id), [p, d] = this.value(line, e); if (e && e.kind === 'stmt' && !e.direct && e.ref === 'pockets') { inf += p; continue; } pts += p; direct = direct || d; }
    if (direct) pts += inf;   // an informant counts only beside a direct item
    return { pts, direct, ok: pts >= 4 && direct };
  },
  linesAvailable() { return LINES.filter(([k]) => knownNumber(k) || k === 'PG'); },
  open(done) {
    const A = STATE.affidavit && !STATE.affidavit.signed ? Object.assign({}, STATE.affidavit, { submitted: false }) : { lines: {}, nec: {}, submitted: false };
    for (const [k] of this.linesAvailable()) A.lines[k] = (A.lines[k] || []).filter(id => evidence(id) && !(A.struck || []).includes(k));
    A.struck = []; this.A = A; this.done = done;
    const s = this.s = UI.open({ id: 'affidavit', cls: '',
      html: () => this.html(), legend: () => [['confirm', 'Choose'], ['uiAlt', 'Remove item'], ['cancel', 'Leave it for now']],
      onSelect: id => this.select(id),
      onAlt: id => { if (id && id.startsWith('it:')) { const [, k, i] = id.split(':'); A.lines[k].splice(+i, 1); Snd.play('typekey'); UI.render(s); } },
      onBack: () => { UI.close(s); this.s = null; } });
    return s;
  },
  select(id) {
    const A = this.A, s = this.s;
    if (id.startsWith('add:')) { const k = id.slice(4); this.picker(k); }
    else if (id.startsWith('it:')) { const [, k, i] = id.split(':'); A.lines[k].splice(+i, 1); UI.render(s); }
    else if (id.startsWith('nec:')) { const k = id.slice(4); A.nec[k] = !A.nec[k]; Snd.play('typekey'); UI.render(s); }
    else if (id === 'submit') {
      const any = Object.keys(A.lines).some(k => this.score(k, A.lines[k]).ok);
      if (!any) { Snd.play('bump'); Toast('Vance', 'Not one of these lines makes four points with a direct item. She won\'t walk it in.'); return; }
      A.submitted = true; STATE.affidavit = A; Snd.play('stamp'); Toast('Affidavit typed', 'Vance takes it to chambers.'); UI.close(s); this.s = null; if (this.done) this.done(A);
    }
  },
  picker(k) {
    const A = this.A; if (A.lines[k].length >= 3) { Toast('Three items a line', 'Take one off first.'); return; }
    // the strongest first (direct items, then points), six at most on the screen
    const list = STATE.evidence.filter(e => !A.lines[k].includes(e.id) && this.value(k, e)[0] > 0).sort((a, b) => { const va = this.value(k, a), vb = this.value(k, b); return (vb[1] - va[1]) || (vb[0] - va[0]); }).slice(0, 6), none = !list.length;
    UI.choose({ kicker: 'Line ' + k, title: 'Attach evidence', text: none ? 'Nothing in the locker supports this line.' : 'Points shown are probable cause on this line.', back: () => UI.close(),
      cards: none ? [{ id: 'none', label: 'Nothing to attach', sub: 'Back to the affidavit' }] : list.map(e => { const [p, d] = this.value(k, e); return { id: e.id, label: (d ? 'DIRECT · ' : '') + p + ' pt', sub: e.text }; }) },
    id => { if (id !== 'none') { A.lines[k].push(id); Snd.play('typekey'); } if (this.s) UI.render(this.s); });
  },
  html() {
    const A = this.A;
    const lines = this.linesAvailable().map(([k, label, n]) => {
      const sc = this.score(k, A.lines[k] || []);
      return `<div class="line"><span class="pts ${sc.ok ? 'ok' : 'weak'}">${sc.pts} pts${sc.direct ? '' : ' · no direct item'}</span><b>${esc(k)} · ${esc(n)}</b> <span class="muted">${esc(label)}</span>
        <div>${(A.lines[k] || []).map((id, i) => { const e = evidence(id), [p] = this.value(k, e); return `<button class="btn" data-f="it:${k}:${i}" style="font-size:.8em">✕ ${esc((e && e.text || id).slice(0, 60))} (${p})</button>`; }).join('')}
        ${(A.lines[k] || []).length < 3 ? `<button class="btn primary" data-f="add:${k}" style="font-size:.8em">+ Attach</button>` : ''}</div></div>`;
    }).join('');
    const nec = NECESSITY.map(([k, l]) => `<button class="btn" data-f="nec:${k}" style="font-size:.85em"><span class="chk">${A.nec[k] ? 'X' : ''}</span>${esc(l)}</button>`).join('');
    return `<div class="panel doc"><div class="kicker">State of Maryland · Application for interception</div><h1>Affidavit</h1>
      <p class="muted">A line needs 4 points, at least one of them direct: an ACT photo of someone using that phone, or a decoded page.</p>${lines}
      <div class="line"><b>Necessity: techniques tried</b> <span class="muted">tick only what you did</span><div>${nec}</div></div>
      <button class="btn primary" data-f="submit">Sign and send to Vance</button></div>`;
  }
};
/* ---- chambers: Judge Halloway's three questions ---- */
const Chambers = {
  start(done) {
    const A = STATE.affidavit || { lines: {}, nec: {} }; this.A = A; this.done = done; this.struck = new Set(); this.lied = false; this.qi = 0;
    const lines = Object.keys(A.lines).filter(k => (A.lines[k] || []).length).map(k => ({ k, sc: Paper.score(k, A.lines[k]) })).sort((a, b) => a.sc.pts - b.sc.pts);
    const Q = [], falseTick = NECESSITY.find(([k, , real]) => A.nec[k] && !real());
    if (lines[0]) Q.push(this.qFor(lines[0].k));
    if (falseTick) Q.push(this.qTrap(falseTick));
    if (lines[1] && Q.length < 3) Q.push(this.qFor(lines[1].k));
    if (Q.length < 3) Q.push(this.qNecessity());
    if (Q.length < 3) Q.push(this.qMin());
    this.Q = Q.slice(0, 3);
    Talk.play([['halloway', 'I\'ve signed wiretaps for twenty-two years, Detective, and I regret eleven of them.'], ['halloway', 'I read every log. If I find a grandmother\'s phone call in your transcripts, I\'ll pull this wire myself.']], () => this.ask());
  },
  ask() {
    if (this.lied) return this.verdict();
    const q = this.Q[this.qi++]; if (!q) return this.verdict();
    Talk.play([{ who: 'halloway', text: q.ask, choices: q.answers.map(a => ({ label: a.text, do: () => { if (a.lie) { this.lied = true; return [['halloway', 'Detective, there were no undercover buys, no warrant and no grand jury. You just told me there were. We\'re done.']]; } if (!a.ok && q.line) { this.struck.add(q.line); return [['halloway', 'Then that line comes out. ' + (q.line ? q.line + ' is struck.' : '')]]; } return [['halloway', a.ok ? pick(RNG.cos, ['Mm.', 'Go on.', 'All right.', 'That I can read.']) : 'That\'s not an answer. Moving on.']]; } })) }], () => this.ask());
  },
  qFor(k) {
    const A = this.A, ids = A.lines[k] || [], ev = ids.map(evidence).filter(Boolean);
    if (k === 'PG') {
      const ok = Cipher.solvedCount('mem') >= 2 && hasFact('stmt:corey:code');
      return { line: k, ask: 'These are numbers on a pager. How do you know they\'re phone numbers at all?', answers: [ok && { text: 'Decoded with the crew\'s keypad code, they match three payphones on Ridley. A crew member described the code in an interview.', ok: true }, { text: 'It\'s how they do it.', ok: false }, { text: 'Detective Pettiford has seen it before.', ok: false }].filter(Boolean) };
    }
    const act = ev.find(e => e.kind === 'act' && e.act === 'payphone'), pat = ev.find(e => e.id === 'stmt:pat:p1'), inf = ev.find(e => e.ref === 'pockets');
    if (inf && !act && !pat) return { line: k, ask: 'Your informant is a drug addict. Why should I believe a word?', answers: [{ text: 'He\'s been reliable before.', ok: false }, { text: 'He has no reason to lie.', ok: false }, ev.some(e => e.kind === 'page') && hasFact('face:tee') && { text: 'He\'s corroborated by the pager memory and our photographs.', ok: true }].filter(Boolean) };
    const ph = act && STATE.photos.find(p => p.id === act.photo);
    return { line: k, ask: 'How do you know the man on this payphone is the man in your photograph?', answers: [act && { text: 'We photographed him using that phone at ' + (ph ? ph.t : 'four') + ' on ' + (ph ? LCD(parseClock(ph.t)).slice(0, 5).replace(' ', '/') : 'the twelfth') + '.', ok: true }, pat && { text: 'A citizen who works at the market watches him use it every afternoon. She signed a statement.', ok: true }, { text: 'Our informant says so.', ok: false }, { text: 'He\'s on that corner every day.', ok: false }].filter(Boolean) };
  },
  qTrap([k, label]) {
    const ask = { uc: 'Tell me about the undercover buys.', warrant: 'Tell me about the search warrant you tried.', gj: 'Which grand jury? I\'d like to see those returns.', surveil: 'Tell me about the surveillance.', ci: 'Tell me about your informant.' }[k];
    return { ask, answers: [{ text: 'They were... informal, Your Honor.', lie: true }, { text: 'I\'d have to check the file, Your Honor.', lie: true }, { text: 'That box was ticked in error. We didn\'t do that.', lie: true }] };
  },
  qNecessity() {
    const made = STATE.stats.made > 0;
    return { ask: 'Why can\'t you just keep watching the corner?', answers: [{ text: 'Surveillance shows us hand-to-hands, not who supplies them.', ok: true }, { text: 'Their lookouts made us' + (made ? ' twice this month.' : '.'), ok: made, line: null }, { text: 'Watching takes too long.', ok: false }] };
  },
  qMin() { return { ask: 'Who\'s monitoring, and do they know the rules?', answers: [{ text: 'Detective Pettiford. Every call logged, minimized in the first seconds if it isn\'t pertinent.', ok: true }, { text: 'Whoever\'s on shift.', ok: false }] }; },
  verdict() {
    const A = this.A, signed = this.lied ? [] : Object.keys(A.lines).filter(k => !this.struck.has(k) && Paper.score(k, A.lines[k]).ok);
    if (this.lied) { Meters.add('brass', -15, 'Caught lying to a judge'); Meters.add('legal', 30, 'Perjury on an affidavit'); }
    if (signed.length) {
      Snd.play('stamp'); A.signed = true; F().wireUp = true; for (const k of signed) { if (!STATE.numbers[k]) STATE.numbers[k] = { n: NUMBERS[k], known: true }; STATE.numbers[k].tapped = true; }
      if (signed.includes('PG')) STATE.numbers.PG = Object.assign(STATE.numbers.PG || {}, { n: '555-0110', known: true, tapped: true, user: 'corey' });
      Talk.play([['halloway', 'You\'re up. Thirty days. ' + signed.join(', ') + '.'], ['halloway', 'Minimize, Detective. I read the logs.'], ['vance', 'That\'s a wire. Don\'t make me regret it.']], () => this.finish({ signed }));
    } else {
      F().affidavitTries++; if (!this.lied) Meters.add('brass', -10, 'Affidavit denied');
      Talk.play([['halloway', 'Denied. Bring me something I can sign.'], ['vance', 'One more photo of somebody on one of those phones. That\'s all he wants. Go get it.']], () => this.finish({ signed: null }));
    }
  },
  finish(res) { const d = this.done; this.done = null; if (d) d(res); }
};
