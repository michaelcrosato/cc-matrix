// WIRETAP: the crew's pager code, "turn the pad" (App. C). The police decoder (a keypad you turn a quarter at a time,
// decoded digits updating live, a MATCH when it lands on a number you know), Tee's code card and pager, the payphone keypad.
const PAD = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];
const CW = { 0: 0, 1: 7, 2: 4, 3: 1, 4: 8, 5: 5, 6: 2, 7: 9, 8: 6, 9: 3 };
const inv = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, +k]));
const CCW = inv(CW);
/** encode with the turn ('cw' = Ep1-3, 'ccw' = after the flip); decode is the other turn's map */
const encode = (num, dir = 'cw') => num.replace(/\d/g, d => (dir === 'cw' ? CW : CCW)[d]);
const decodeTurns = (num, turns) => { let s = num; const n = ((turns % 4) + 4) % 4; for (let i = 0; i < n; i++) s = s.replace(/\d/g, d => CCW[d]); return s; };   // each clockwise turn of the pad undoes one CW encoding
const CODES = { 11: 'package ready', 22: 'call me at the usual phone', 33: 'the count', 44: 'need product', 55: 'all clear', 77: 'police around', 99: 'stop everything' };
const SENDERS = { '07': 'Tee', 13: 'Rook', 14: 'Pigeon', 21: 'Corey', '00': "Easy's people" };
const PAGES_COREY = ['555-0781 22 07', '555-0743 11 00', '555-0769 33 07', '555-0769 77 14', '555-0798 44 07'];
const knownNumbers = () => Object.entries(STATE.numbers).filter(([k, v]) => v.known || k === 'H1' && hasFact('plate:harstad')).map(([k, v]) => ({ id: k, n: v.n }));
const NUM_NAME = { P1: 'Gaither Market payphone', P2: 'Suds City payphone', P3: 'bus stop payphone', H1: 'Harstad Auto Parts, Dundalk', MB: "Mama B's Soul Food", PG: 'the stash pager' };
const Cipher = {
  /** try a page against the known numbers with a number of turns; returns the match id or null */
  match(page, turns) { const cb = page.split(' ')[0], d = decodeTurns(cb, turns); const k = knownNumbers().find(x => x.n === d); return k ? k.id : null; },
  /** solve a page in evidence: Case +3 and a fact */
  solve(page, id) {
    if (STATE.cipher.decoded.includes(page)) return false; STATE.cipher.decoded.push(page);
    const [cb, code, from] = page.split(' ');
    addEvidence({ id: 'page:' + page, kind: 'page', text: 'Page ' + page + ' → ' + STATE.numbers[id].n + ' (' + NUM_NAME[id] + '): ' + (CODES[code] || '?') + ', from ' + (SENDERS[from] || from), num: id, code, from, direct: true });
    addFact('page:' + id + ':' + code, 3, true); addFact('num:' + id + ':' + (SENDERS[from] || '').toLowerCase().split(' ')[0], 0, true);
    if (from === '07') STATE.numbers[id].user = STATE.numbers[id].user || 'tee';
    BUS.emit('decoded', page, id); return true;
  },
  /** the decoder screen: pages on the right, the keypad on the left, turned with L1/R1 (Q/E) or the arrows */
  open(pages, o = {}) {
    let sel = 0, turns = 0, hint = false;
    const s = UI.open({ id: 'cipher', cls: 'cipher', legend: () => [['tabPrev', 'Turn left'], ['tabNext', 'Turn right'], ['confirm', 'Select page'], ['uiInfo', 'Hint'], ['cancel', 'Close']],
      tab: d => { turns = (turns + d + 4) % 4; sfx('pin'); check(); UI.refresh(s); }, info: () => { hint = !hint; UI.refresh(s); }, cancel: () => { UI.close(); if (o.done) o.done(); },
      render(el) {
        const pg = pages[sel] || '', cb = pg.split(' ')[0] || '', dec = decodeTurns(cb, turns), m = pg && Cipher.match(pg, turns), solved = STATE.cipher.decoded.includes(pg);
        const rot = n => { const g = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']]; let r = g; for (let i = 0; i < n; i++) r = r[0].map((_, c) => r.map(row => row[c]).reverse()); return r; };
        const pad = rot(turns);
        el.append(h('div.panel.wire', h('div.kicker', { text: 'PAGER CODE · TURN THE PAD' }), h('div.cipher-row',
          h('div.keypad', h('button.turn', { 'data-f': '', on: () => { turns = (turns + 3) % 4; sfx('pin'); check(); UI.refresh(s, 0); } }, '⟲'), h('div.pad', { style: { transform: 'rotate(' + turns * 90 + 'deg)' } }, pad.flat().map(d => h('span.key', { text: d })).concat([h('span.key', { text: '*' }), h('span.key', { text: '0' }), h('span.key', { text: '#' })])), h('button.turn', { 'data-f': '', on: () => { turns = (turns + 1) % 4; sfx('pin'); check(); UI.refresh(s, 1); } }, '⟳'), h('div.turns', { text: turns + ' quarter turn' + (turns === 1 ? '' : 's') + ' clockwise' })),
          h('div.pages', pages.map((p, i) => h('button.page' + (i === sel ? '.sel' : '') + (STATE.cipher.decoded.includes(p) ? '.done' : ''), { 'data-f': '', on: () => { sel = i; check(); UI.refresh(s, 2 + i); } }, p)),
            h('div.decode', h('div.big', { text: pg ? dec + ' ' + pg.split(' ').slice(1).join(' ') : '' }), h('div.' + (m ? 'match' : 'nomatch'), { text: m ? 'MATCH: ' + NUM_NAME[m] + (solved ? ' ✓' : '') : 'NO MATCH' }),
              pg ? h('div.small', { text: 'Code ' + pg.split(' ')[1] + ': ' + (hasFact('stmt:corey:code') || STATE.ep >= 3 ? (CODES[pg.split(' ')[1]] || '?') : '?') + ' · from ' + pg.split(' ')[2] }) : null,
              hint ? h('div.hint', { text: STATE.cipher.flipSeen ? 'Hal: "They didn\'t change the lock. They just turned the key the other way."' : 'Corey: "It\'s the phone, man. You turn it."' }) : null)))));
      },
      model(ss) { ss.confirm = () => {}; }
    });
    function check() { const pg = pages[sel], m = pg && Cipher.match(pg, turns); if (m && Cipher.solve(pg, m)) { toast('Decoded', pg + ' → ' + NUM_NAME[m]); Music.sting('photoGood'); if (o.onSolve) o.onSolve(pg, m); } else if (pg && !m && STATE.cipher.decoded.length && turns === 1 && !Cipher.match(pg, 1)) { STATE.cipher.noMatch = (STATE.cipher.noMatch || 0) + 1; } }
    return s;
  },
  /** Tee's side: the pager and the code card (plaintext and encoded side by side) */
  teeCard(o = {}) {
    const dir = STATE.cipher.dir;
    const s = UI.open({ id: 'codecard', cls: 'cipher', legend: [['confirm', 'Send'], ['cancel', 'Close']], cancel: () => { UI.close(); },
      render(el) {
        el.append(h('div.panel.wire', h('div.kicker', { text: "TEE'S PAGER · THE CODE CARD" }),
          h('div.cipher-row', h('div.card-code', h('h3', { text: 'Turn the pad ' + (dir === 'cw' ? 'right' : 'left') }), h('div.map', Object.keys(CW).map(d => h('span', { text: d + '→' + (dir === 'cw' ? CW : CCW)[d] })))),
            h('div.pages', h('div.small', { text: 'Incoming' }), ...(o.inbox || []).map(p => h('div.page', { text: p })),
              h('div.small', { text: 'Page the re-up: call me back at…' }),
              ...['P1', 'P2', 'P3'].map(id => { const n = STATE.numbers[id].n, enc = encode(n, dir) + ' 44 07'; return btn(id + '  ' + n + '  →  ' + enc, () => { UI.close(); if (o.send) o.send(id, enc); }); })))));
      },
      model(ss) { ss.confirm = () => { UI.close(ss); if (o.send) o.send('P1', encode(STATE.numbers.P1.n, dir) + ' 44 07'); }; }
    });
    return s;
  },
  /** a payphone's keypad: dial digits with real DTMF tones; done(number) */
  dial(target, done) {
    let typed = '';
    const press = d => { typed += d; sfx('dtmf' + d); if (typed.replace(/-/g, '').length >= 7) { const num = typed.slice(0, 3) + '-' + typed.slice(3, 7); game.after(.4, () => { UI.close(s); done(num); }); } UI.refresh(s); };
    const s = UI.open({ id: 'dial', cls: 'dial', legend: [['confirm', 'Press'], ['cancel', 'Hang up']], cancel: () => { UI.close(); done(null); },
      render(el) {
        el.append(h('div.panel.dark', h('div.kicker', { text: 'PAYPHONE · 25¢' }), h('div.big', { text: (typed.length > 3 ? typed.slice(0, 3) + '-' + typed.slice(3) : typed) || '___-____' }),
          target ? h('div.small', { text: 'The card says: ' + target }) : null,
          h('div.dialpad', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(d => btn(d, () => { if (/\d/.test(d)) press(d); }, 'dkey')))));
      },
      model(ss) { ss.confirm = () => { for (const d of (target || '5550174').replace(/\D/g, '')) press(d); }; }
    });
    return s;
  }
};
