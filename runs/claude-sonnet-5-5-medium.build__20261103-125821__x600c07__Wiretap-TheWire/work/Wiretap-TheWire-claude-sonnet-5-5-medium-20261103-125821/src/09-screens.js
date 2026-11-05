// 09-screens: investigation screens as DOM case-file cards: notebook, board, cipher, wire room, the box, paper + judge, meters
const meters = () => `<div class="meters"><span>Brass <b>${Math.round(STATE.brass)}</b></span><span>Heat <b>${Math.round(STATE.heat)}</b></span><span>Legal <b>${Math.round(STATE.legal)}</b></span><span>Case <b>${Math.round(STATE.caseScore)}</b></span></div>`;
const Screens = {
  notebook() {
    const pages = [
      ['Objectives', () => '<p>' + (Field.m ? esc(Field.objectiveText().join(' — ')) : 'Report to the Annex.') + '</p><p>Brass ' + Math.round(STATE.brass) + ' · Heat ' + Math.round(STATE.heat) + ' · Legal ' + Math.round(STATE.legal) + ' · Case ' + Math.round(STATE.caseScore) + '</p>'],
      ['People', () => BOARD_PEOPLE.map(p => `<p><b>${esc(p.name)}</b> — ${p.role}${STATE.board[p.id] ? ' ✓ on the Board' : ''}</p>`).join('') + '<p>Slim Dawkins — the man at the top. No photo yet.</p>'],
      ['Phones', () => Object.entries(STATE.cipher).filter(([k]) => k.startsWith('phone_')).map(([k, v]) => `<p>${esc(v)}</p>`).join('') || '<p>No numbers read yet. Payphones near the corner carry them.</p>'],
      ['Evidence', () => `<p>Photos: ${STATE.photos.length} · Film left ${STATE.film}</p><p>Wire calls logged: ${STATE.wire.logged.length}</p><p>Arrests: ${STATE.stats.arrests} · Times made: ${STATE.stats.madeCount}</p>`]
    ];
    const s = UI.open({ kicker: 'Notebook', title: 'Dana\'s notebook', tab: 0, tabs: pages.map(p => p[0]), cls: 'note', body: s => pages[s.tab][1](), items: [{ label: 'Close' }], legend: [['tabPrev', 'Prev'], ['tabNext', 'Next'], ['cancel', 'Close']], onKey: (a, s) => { if (a === 'tabNext') { s.tab = (s.tab + 1) % pages.length; UI.render(); return true; } if (a === 'tabPrev') { s.tab = (s.tab + pages.length - 1) % pages.length; UI.render(); return true; } if (a === 'cancel') { UI.close(); return true; } return false; } });
    s.items[0].fn = () => UI.close();
  },
  board(done) {
    const people = BOARD_PEOPLE.filter(p => STATE.photos.some(ph => ph.slot === p.id));
    if (!people.length) { Hud.toast('The Board', 'No photographs yet.'); return done && done(); }
    let i = 0; const next = () => { if (i >= people.length) { UI.closeAll(); return done && done(); } const p = people[i++], ph = STATE.photos.find(x => x.slot === p.id);
      UI.open({ kicker: 'The Board · ' + i + '/' + people.length, title: 'Who is this?', cls: 'board', body: `<p class="photo">${'★'.repeat(ph.stars)}${'☆'.repeat(3 - ph.stars)} ${ph.act ? 'Hand-to-hand' : 'Standing'} · taken from the street</p><p>${esc(({ tee: 'Man on the corner. Takes the money. Others defer to him.', runner: 'Carries the package between the stash and the corner.', lookout: 'Watches the street, never handles product.' })[p.id])}</p>`,
        items: p.opts.map(o => ({ label: o, fn: () => { const ok = o === p.name; STATE.board[p.id] = ok ? 2 : 1; STATE.caseScore += ok ? 15 : -5; Sound.sfx(ok ? 'good' : 'bad'); Hud.toast(ok ? 'Confirmed' : 'Wrong name', ok ? p.name + ' goes on the Board' : 'The Major asks questions'); UI.closeAll(); next(); } })), numberKeys: true, back: false, legend: [['confirm', 'Pin name'], ['cancel', '']] }); };
    next();
  },
  cipher(done) {
    let i = 0, right = 0; const key = CIPHER.key.map(k => `<span class="kv">${k[0]} = ${k[1]}</span>`).join(' ');
    const next = () => { if (i >= CIPHER.pages.length) { UI.closeAll(); STATE.cipher.done = right; STATE.caseScore += right * 7; Hud.toast('Pager traffic', right + '/' + CIPHER.pages.length + ' decoded'); STATE.paper.evidence.push('cipher'); return done && done(); }
      const p = CIPHER.pages[i++]; Sound.sfx('pager');
      UI.open({ kicker: 'Pager ' + i + '/' + CIPHER.pages.length, title: p.code, cls: 'cipher', body: `<p>Every beeper is one of Slim\'s people. Match the code to the key:</p><p>${key}</p>`, items: p.opts.map(o => ({ label: o, fn: () => { const ok = o === p.ans; if (ok) right++; Sound.sfx(ok ? 'good' : 'bad'); Hud.toast(ok ? 'Decoded' : 'Wrong', p.note); UI.closeAll(); next(); } })), numberKeys: true, back: false, legend: [['confirm', 'Choose']] }); };
    next();
  },
  wire(done) {
    let ci = 0, score = 0; const W = STATE.wire; W.logged = []; W.bad = 0;
    const call = () => { if (ci >= WIRE.length) { UI.closeAll(); STATE.legal = clamp(STATE.legal - W.bad * 8, 0, 100); STATE.caseScore += score; STATE.paper.evidence.push('wire'); Sound.stop(); return UI.open({ kicker: 'Wire room', title: 'Shift over', body: meters() + `<p>${W.logged.length} calls logged. ${W.bad ? W.bad + ' minimization errors; the Legal meter took it.' : 'Clean minimization.'}</p>`, items: [{ label: 'Back to the Annex' }], legend: [['confirm', 'OK']], back: false }).items[0].fn = () => { UI.closeAll(); done && done(); }; }
      const c = WIRE[ci++]; let li = 0; Sound.music('wire'); Sound.sfx('ring');
      const hear = () => { const L = c.lines[li]; Sound.speak(L, c.voice, { phone: true });
        const mini = diff().mini; const s = UI.open({ kicker: `Call ${ci}/${WIRE.length} · ${c.from} → ${c.to}`, title: 'Live', cls: 'wire', body: () => `<div class="callog">${c.lines.slice(0, li + 1).map((l, k) => `<p class="${game.settings.hints && k === c.key ? 'key' : ''}">${esc(say(l))}</p>`).join('')}</div>`,
          items: [li < c.lines.length - 1 ? { label: 'Keep listening', fn: () => { li++; UI.closeAll(); hear(); } } : { label: 'Log this call', fn: () => finish(true) }, { label: 'Minimize (hang up)', fn: () => finish(false) }], legend: [['confirm', 'Choose']], back: false });
          s.items[0].sub = ''; };
      const finish = logged => { UI.closeAll(); const heard = li + 1;
        if (c.pert) { if (logged) { W.logged.push(c.id); score += 12; STATE.stats.calls++; Hud.toast('Logged', c.id); Sound.sfx('good'); } else { score -= 4; Hud.toast('Minimized a live call', 'Missed: ' + c.id); Sound.sfx('bad'); } }
        else { if (logged || heard > 2) { W.bad++; Hud.toast('Over-listened', 'Personal call. The judge will ask.'); Sound.sfx('bad'); } else { score += 4; Sound.sfx('good'); Hud.toast('Minimized', 'Right call.'); } }
        call(); };
      hear(); };
    UI.open({ kicker: 'Wire room', title: 'The wire room', cls: 'wire', body: `<p>Four calls tonight. Pertinent calls about the business: log them. Personal ones: minimize (hang up) within the first two lines. Past that the lawyers will use it.</p>${meters()}`, items: [{ label: 'Headphones on', fn: () => { UI.closeAll(); call(); } }], legend: [['confirm', 'Start']], back: false });
  },
  box(done) {
    let ri = 0, rap = 0, pre = 0, info = 0;
    const round = () => { if (ri >= BOX.rounds.length) { UI.closeAll(); const flip = rap >= 2 && info >= 3, res = flip ? 'flips' : (pre > 6 && rap < 0 ? 'asks for a lawyer' : 'stonewalls'); STATE.box = { done: true, flip }; STATE.caseScore += flip ? 25 : 5; STATE.legal = clamp(STATE.legal - (pre > 8 ? 10 : 0), 0, 100); if (flip) STATE.paper.evidence.push('tip');
        return UI.open({ kicker: 'The box', title: BOX.suspect + ' ' + res, body: flip ? '<p>He gives up the garage on Penn and who counts the money. It is not clean. Nobody is.</p>' : '<p>He says nothing useful. The clock on the wall is louder than he is.</p>', items: [{ label: 'Leave the room' }], legend: [['confirm', 'OK']], back: false }).items[0].fn = () => { UI.closeAll(); done && done(); }; }
      const R = BOX.rounds[ri++]; Sound.music('stinger');
      const s = UI.open({ kicker: `The box · ${ri}/${BOX.rounds.length}`, title: BOX.suspect, cls: 'box', body: `<p>${esc(R.q)}</p><p class="meters"><span>Rapport <b>${rap}</b></span><span>Pressure <b>${pre}</b></span></p>`, cols: 2, numberKeys: true, back: false, legend: [['confirm', 'Say it'], ['boxTop', 'Top'], ['boxLeft', 'Left'], ['boxRight', 'Right'], ['boxBottom', 'Bottom']],
        items: R.opts.map(o => ({ label: o.t, html: `<span class="dia">${glyph(o.k)}</span> ${esc(o.t)}`, fn: () => { rap += o.r; pre += o.p; info += o.i; Sound.speak(o.t, 'dana'); UI.closeAll(); round(); } })),
        onKey: (a, s) => { const idx = { boxTop: 0, boxLeft: 1, boxRight: 2, boxBottom: 3 }[a]; if (idx != null) { UI.setFocus(idx); UI.activate(); return true; } return false; } }); };
    round();
  },
  paper(done) {
    const have = EVIDENCE.filter(e => (e.id === 'photos' && STATE.photos.length) || (e.id === 'phones' && Object.keys(STATE.cipher).some(k => k.startsWith('phone_'))) || STATE.paper.evidence.includes(e.id) || (e.id === 'tip' && STATE.box.flip));
    const pick = []; let pts = 0;
    const list = () => { const s = UI.open({ kicker: 'Affidavit', title: 'Build the affidavit', cls: 'paper', body: () => `<p>Probable cause for a wiretap on three numbers. Pick up to 3 exhibits. Strongest first: the judge reads the top.</p><p>Chosen: ${pick.map(p => esc(p.name)).join(' · ') || 'none yet'}</p>`,
        items: have.filter(e => !pick.includes(e)).map(e => ({ label: e.name, sub: e.pts + ' pts', fn: () => { pick.push(e); pts += e.pts; UI.closeAll(); if (pick.length >= 3 || pick.length >= have.length) judge(); else list(); } })).concat([{ label: pick.length ? 'Submit to the judge' : 'Submit with nothing', fn: () => { UI.closeAll(); judge(); } }]), legend: [['confirm', 'Add']], back: false }); };
    const judge = () => { let qi = 0, jp = 0; const q = () => { if (qi >= JUDGE.length) { const granted = pts + jp * 10 >= 40; STATE.paper.granted = granted; STATE.caseScore += granted ? 30 : 0; Sound.sfx('gavel'); UI.closeAll();
          return UI.open({ kicker: 'Chambers', title: granted ? 'Order signed' : 'Denied', body: `<p>${granted ? 'Judge Okafor signs. Thirty days. "Don\'t make me regret it."' : 'Judge Okafor slides it back. "Come back when there is something here."'}</p>${meters()}`, items: [{ label: 'Out of chambers' }], legend: [['confirm', 'OK']], back: false }).items[0].fn = () => { UI.closeAll(); if (!granted) STATE.legal = clamp(STATE.legal - 10, 0, 100); done && done(); }; }
        const J = JUDGE[qi++]; Sound.speak(J.q, 'judge'); UI.open({ kicker: 'Judge Okafor', title: 'Chambers', cls: 'box', body: `<p>${esc(J.q)}</p>`, items: J.opts.map(o => ({ label: o.t, fn: () => { jp += o.ok; Sound.sfx(o.ok > 0 ? 'good' : 'bad'); UI.closeAll(); q(); } })), numberKeys: true, back: false }); }; q(); };
    list();
  },
  // Annex hub: pick the next assignment, or look at meters
  annex() {
    const step = STORY[STATE.beat];
    UI.closeAll(); UI.open({ kicker: 'The Annex · basement of the courthouse', title: 'WIRETAP', cls: 'annex', body: () => `${meters()}<p>${esc(Director.nextLabel())}</p>`,
      items: [{ label: 'Next assignment', fn: () => { UI.closeAll(); Director.advance(); } }, { label: 'Notebook', fn: () => Screens.notebook() }, { label: 'Save', fn: () => { saveState(); Hud.toast('Saved', 'The Annex autosave'); } }, { label: 'Title', fn: () => { UI.closeAll(); game.go('title'); } }], back: false, legend: [['confirm', 'Select']] });
  }
};
