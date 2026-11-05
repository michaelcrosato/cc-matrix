// WIRETAP: the wire room. A shift is calls on a clock (App. D). You may listen to the first seconds of every call; a
// call that isn't pertinent must be minimized (spot-check it every ten seconds), key lines must be logged as they're said,
// voices matched to people, pages decoded. Listening where the law says you can't costs Legal; at 100 the judge pulls it.
const CALLS = {
  s1: [
    { id: 'S1-1', t: '16:05', line: 'P2', sp: ['pigeon', 'odessa'], type: 'N', lines: [['pigeon', "Hey Grandma. I'm at the library."], ['odessa', 'Library closes at five on Tuesdays, Junior.'], ['pigeon', 'It\'s the study room. They got a study room now.'], ['odessa', 'Mm-hm. You eat?'], ['pigeon', "I ate. I'll be home by the streetlights."], ['odessa', 'You be home before them.']], late: ['hal', "That's a boy and his grandmother, Detective."] },
    { id: 'S1-2', t: '16:40', line: 'P1', sp: ['tee', 'tavon'], type: 'T', turnAt: 3, lines: [['tee', 'You see the game?'], ['tavon', "They ain't got no bullpen. None."], ['tee', 'They got a bullpen. Bullpen just tired.'], ['tee', 'Tell your man the thing go down at the place where Dre messed up his ankle. Four o\'clock.', 1], ['tavon', 'Where Dre... oh. Yeah.'], ['tee', 'Don\'t "yeah" me. Be there.']], unlock: 'int:riddle', decide: 'riddle' },
    { id: 'S1-3', t: '17:10', page: '555-0743 11 00' },
    { id: 'S1-4', t: '17:25', line: 'P3', sp: ['dale', 'tee'], type: 'P', lines: [['dale', 'Usual?'], ['tee', 'Usual. But your count been light, my man.'], ['dale', "Count is the count. I don't open the boxes."], ['tee', 'Somebody opening them.', 1], ['dale', "Four o'clock. Don't make me wait, I got a route.", 1]], unlock: 'int:courier' },
    { id: 'S1-5', t: '18:00', line: 'P2', sp: ['woman', 'man'], type: 'N', lines: [['woman', 'I need a cab at Ridley and Gaither, the laundromat.'], ['man', 'Forty minutes, ma\'am.'], ['woman', 'No, I am not waiting forty minutes. I have groceries.'], ['man', 'Thirty-five.']] },
    { id: 'S1-6', t: '18:30', line: 'P1', sp: ['rook', 'keisha'], type: 'N', lines: [['rook', "I said I'ma bring it."], ['keisha', 'You said that Friday. He need shoes, Ricky. His toes out the front.'], ['rook', 'I got him. Tonight.']] },
    { id: 'S1-7', t: '19:05', line: 'P1', sp: ['tee', 'moe'], type: 'P', lines: () => FL().danaKnown ? [['tee', 'That lady on the bench Tuesday, leather coat?', 1], ['moe', 'She was reading the paper.'], ['tee', 'Nobody reads the paper on Ridley.']] : [['tee', 'Knockers came through twice. Nothing in the pockets, nothing on the corner.', 1], ['moe', 'Like you said.'], ['tee', 'Like I said.']], unlock: 'int:discipline' },
    { id: 'S1-8', t: '19:40', line: 'P3', sp: ['man', 'woman'], type: 'N', lines: [['man', 'Sister Pauline, about the folding chairs for Sunday.'], ['woman', 'We have forty, Reverend.'], ['man', 'We will need sixty. The Fultons are coming.']] },
    { id: 'S1-9', t: '20:30', line: 'P2', sp: ['tavon', 'dink'], type: 'P', lines: [['tavon', 'How we looking.'], ['dink', 'Light. Like nine hundred light.', 1], ['tavon', 'Nine hundred?'], ['dink', "Testers was weak. Overtime ain't moving like last week."], ['tavon', "Don't tell Tee. I'll tell Tee."]], unlock: 'int:money' },
    { id: 'S1-10', t: '21:15', page: '555-0769 33 07' },
    { id: 'S1-OT', t: '22:10', ot: true, line: 'P1', sp: ['tavon', 'dink'], type: 'P', lines: [['tavon', 'Tee want it tight tonight. Extra man up on Harlow.'], ['dink', 'Package came in light, so we cutting the testers.', 1], ['tavon', "Cut 'em. Ain't nobody gonna complain."]], unlock: 'int:product' }],
  s2: [
    { id: 'S2-1', t: '20:10', line: 'P2', sp: ['tee', 'rook'], type: 'P', lines: [['tee', 'Man took it right off the boy. Walked up like he was asking directions.'], ['rook', 'In a hearse? A hearse?'], ['tee', 'Hit me at the laundry later. Not this phone.', 1], ['rook', "It's Sunday. Gotta be."], ['tee', "Don't say names on the phone.", 1]], unlock: 'int:sunday' },
    { id: 'S2-2', t: '20:45', line: 'P3', sp: ['rook', 'smokey'], type: 'P', lines: [['rook', 'I need a hammer. Tonight.', 1], ['smokey', 'What kind of hammer?'], ['rook', 'The kind that finishes a job.', 1], ['smokey', 'Come by the shop at eleven. Cash.']], unlock: 'int:hammer', decide: 'hammer' },
    { id: 'S2-3', t: '21:20', line: 'P2', sp: ['odessa', 'man'], type: 'N', lines: [['odessa', 'Hello? Is this the laundromat phone? Is my grandson out there? Junior Hollis. Little red hoodie.'], ['man', "Ain't nobody here, ma'am."]] },
    { id: 'S2-4', t: '21:50', page: '555-0329 22 07', flip: true },
    { id: 'S2-5', t: '22:30', line: 'P1', sp: ['lonnie', 'tee'], type: 'P', lines: [['lonnie', 'He wants to see you.'], ['tee', 'Tonight?'], ['lonnie', "You know where. Mama B's. The back.", 1], ['tee', "I'm coming."], ['lonnie', 'And Terrence. Come by yourself.']], unlock: 'int:mamab' },
    { id: 'S2-6', t: '23:10', line: 'P2', sp: ['woman', 'kid'], type: 'N', lines: [['woman', 'You told Marcus I said that?'], ['kid', 'I ain\'t tell Marcus nothing. And I want my jacket back.']] },
    { id: 'S2-7', t: '23:50', line: 'P3', sp: ['tavon', 'man'], type: 'P', lines: [['tavon', 'Tee say we gotta be easy for a minute. No more phones on Ridley after Friday.'], ['man', 'Then what we using?'], ['tavon', 'He gonna get us something. Throwaways.', 1]], unlock: 'int:throwaways' },
    { id: 'S2-8', t: '00:30', line: 'P1', sp: ['man', 'woman'], type: 'N', lines: [['man', "I don't miss you, Denise. I miss the dog."], ['woman', "It's one in the morning, Calvin."], ['man', 'Tell Biscuit I said hey.']] },
    { id: 'S2-OT', t: '00:50', ot: true, line: 'P2', sp: ['dink', 'tavon'], type: 'P', lines: [['dink', 'Tee got scared of phones. Say after Friday nobody talk on these no more.'], ['tavon', 'Then how I\'m supposed to reach the stash?', 1], ['dink', 'He say he got a plan. Everybody getting a new number.']], unlock: 'int:burnerplan' }],
  s3: [
    { id: 'S3-1', t: '22:05', line: 'B1', sp: ['lonnie', 'tee'], type: 'P', lines: [['lonnie', 'Thursday. After close. Same as always.', 1], ['tee', 'Same as always.'], ['lonnie', 'He says bring it counted this time. Counted twice.']], unlock: 'int:count' },
    { id: 'S3-2', t: '22:30', line: 'B3', sp: ['tavon', 'woman'], type: 'N', lines: [['tavon', 'Your cousin still doing the cookout Sunday?'], ['woman', 'If it don\'t rain. Bring ice.']] },
    { id: 'S3-3', t: '23:00', line: 'B4', sp: ['dale', 'tee'], type: 'P', lines: [['dale', "Friday, the truck, nine o'clock."], ['tee', 'Not the gas station. The new place.', 1], ['dale', 'Which new place?'], ['tee', 'The garage behind the Courts. Pull in off Harlow.', 1]], unlock: 'int:garage' },
    { id: 'S3-4', t: '23:25', line: 'B5', sp: ['pigeon', 'odessa'], type: 'N', lines: [['pigeon', "Grandma? I'm okay. I'm at Tavon's."], ['odessa', 'At this hour?'], ['pigeon', "I don't wanna do this no more."], ['odessa', 'Then come home, baby.']], heard: true },
    { id: 'S3-5', t: '23:50', line: 'B1', sp: ['tee', 'lonnie'], type: 'P', lines: [['tee', 'That detective. Whitlock. She grew up on Ridley. Her mother still stays over by the church.', 1], ['lonnie', "He ain't gonna like you saying that on a phone. Or at all."]], unlock: 'int:mom', decide: 'mom' },
    { id: 'S3-6', t: '00:20', line: 'B2', sp: ['lonnie', 'tee'], type: 'P', heat: 70, lines: [['lonnie', "Count's moving to Saturday. He's feeling something.", 1], ['tee', 'Saturday.']], unlock: 'int:saturday' }]
};
const SESSION = { s1: { name: 'Session 1 · P1, P2, P3 and the pager', start: '16:00', end: '23:00' }, s2: { name: 'Session 2 · night', start: '20:00', end: '01:30' }, s3: { name: 'Session 3 · the throwaways', start: '22:00', end: '01:00' } };
const Wire = {
  run(sid, done, o = {}) {
    const auto = !!o.attract, cfg = SESSION[sid];
    const calls = CALLS[sid].filter(c => (!c.ot || FL().ops1 === 'ot') && (!c.heat || STATE.meters.heat >= c.heat)).map(c => Object.assign({}, c, { lines: typeof c.lines === 'function' ? c.lines() : c.lines }));
    for (const c of calls) if (c.line && STATE.numbers[c.line] && STATE.numbers[c.line].dead) c.line = ['P2', 'P3', 'P1'].find(k => STATE.numbers[k] && !STATE.numbers[k].dead) || c.line;
    const W = { sid, calls, i: 0, clock: hm(cfg.start), end: hm(cfg.end) + (hm(cfg.end) < hm(cfg.start) ? 1440 : 0), cur: null, panel: 0, pages: [], log: [], legal0: STATE.meters.legal, viol: 0, mins: 0, logged: 0, pulled: false, pend: null, auto };
    const unknown = {}; let um = 0; const spName = who => STATE.wire.ids[who] ? nameOf(who) : (unknown[who] = unknown[who] || 'UNKNOWN ' + (['odessa', 'keisha', 'woman'].includes(who) ? 'FEMALE ' : 'MALE ') + (++um));
    Music.play('wire'); Amb.set(['hiss', 'hvac']);
    const startCall = c => {
      if (c.page) { pagerSound(); W.pages.push(c.page); if (c.flip) { STATE.cipher.dir = 'ccw'; STATE.cipher.flipSeen = true; } toast('Page on the clone', c.page); W.i++; return; }
      W.cur = { c, li: 0, ch: 0, t: 0, min: false, spotT: 0, spotOn: 0, spoken: '', shown: [], keyOpen: -1, keyT: 0, lost: false, done: false, endT: 0, pertinent: c.type === 'P' };
      sfx('phonering'); sfx('reel'); Music.layer('pulse', c.type !== 'N' ? 1 : 0, 1);
    };
    const s = UI.open({ id: 'wire', cls: 'wire', legend: () => [['uiAlt', W.cur && W.cur.min ? 'Spot-check' : 'Minimize'], ['confirm', 'Log line'], ['uiInfo', 'ID voice'], ['tabNext', 'Panels'], ['uiFast', 'Fast-forward (hold)']],
      keys: { uiAlt: () => this.minimize(W), uiInfo: () => this.idVoice(W, spName), confirm: () => W.panel === 2 && W.pages.length ? Cipher.open(W.pages.slice(), {}) : this.log(W), tabNext: () => { W.panel = (W.panel + 1) % 3; UI.refresh(s); }, tabPrev: () => { W.panel = (W.panel + 2) % 3; UI.refresh(s); } },
      tick: dt => {
        if (W.pend || Talk.open) return;
        const cur = W.cur, win = DIFF().minWin;
        if (!cur) {
          const nx = W.calls[W.i]; const fast = game.input.down('uiFast') || auto ? 4 : 1;
          if (!nx || W.clock >= W.end || W.pulled) { if (!W.endT) { W.endT = 1; this.result(W, s, done); } return; }
          W.clock += dt * 9 * fast; if (W.clock >= hm(nx.t) + (hm(nx.t) < hm(cfg.start) ? 1440 : 0)) { W.clock = Math.max(W.clock, hm(nx.t)); startCall(nx); }
          if ((W.rt = (W.rt || 0) + dt) > .25) { W.rt = 0; UI.refresh(s); }
          return;
        }
        cur.t += dt; W.clock += dt / 30;
        const ln = cur.c.lines[cur.li];
        if (!ln) { cur.endT += dt; if (cur.endT > 1.2) { sfx('reel'); W.log.push(cur); if (cur.c.late && !cur.min && cur.c.type === 'N') Talk.run([cur.c.late]); W.cur = null; W.i++; Music.layer('pulse', 0, 1); if (cur.c.decide) this.decide(W, cur, s); if (cur.c.heard && !cur.min) FL().heardPigeon = true; UI.refresh(s); } return; }
        // pertinence: a T call turns at a line; past the window a non-pertinent call must be minimized
        if (cur.c.type === 'T' && cur.li >= cur.c.turnAt) cur.pertinent = true;
        const listening = !cur.min || cur.spotOn > 0;
        if (cur.min) { cur.spotT -= dt; if (cur.spotOn > 0) cur.spotOn -= dt; }
        if (listening && cur.t > win && !cur.pertinent && !auto) { meter('legal', 4 * dt, null); W.viol += dt; if (!cur.warned) { cur.warned = 1; STATE.stats.violations++; toast('Minimize', 'This call isn\'t pertinent. Legal risk climbs while you listen.'); } }
        if (STATE.meters.legal >= 100 && !W.pulled) { W.pulled = true; meter('brass', -20, 'The judge pulled the wire'); Talk.run([['hal', 'That\'s the judge on the phone. We\'re dark. He read the logs.']]); }
        // speech: characters at about 14 a second, through the phone filter when heard
        cur.ch += dt * 15; const txt = clean(ln[1]);
        while (cur.spoken.length < Math.min(txt.length, Math.floor(cur.ch))) { const k = txt[cur.spoken.length]; cur.spoken += k; if (listening) Voice.char(k, VOICES[ln[0]] ? ln[0] : 'man', { phone: true }); }
        if (ln[2]) { if (cur.keyOpen !== cur.li) { cur.keyOpen = cur.li; cur.keyT = 0; } }
        if (cur.ch >= txt.length + 6) { cur.shown.push(listening ? [ln[0], txt, !!ln[2]] : [null, '— minimized —', !!ln[2]]); if (!listening && ln[2]) cur.lost = true; if (ln[2]) { cur.keyClose = cur.li; cur.keyT = 2; } cur.li++; cur.ch = 0; cur.spoken = ''; }
        if (cur.keyT > 0) cur.keyT -= dt;
        if (auto) { if (cur.c.type === 'N' && cur.t > 2 && !cur.min) this.minimize(W); if (ln[2] && cur.spoken.length > 8 && !cur.loggedLi) { cur.loggedLi = 1; this.log(W); } }
        if ((W.rt = (W.rt || 0) + dt) > .12) { W.rt = 0; UI.refresh(s); }
      },
      render(el) { Wire.render(el, W, spName); },
      model(ss) { ss.confirm = () => this.log(W); } });
    W.screen = s;
    if (!auto) tip('wire', 'The wire', 'You may listen to the first seconds of a call. Family, food, citizens: ' + Prompt.label('uiAlt') + ' minimize, and spot-check now and then. When a key line is spoken, ' + Prompt.label('confirm') + ' logs it. ' + Prompt.label('uiInfo') + ' matches a voice.');
    return W;
  },
  minimize(W) {
    const cur = W.cur; if (!cur) return;
    if (!cur.min) { cur.min = true; cur.spotT = 10; W.mins++; STATE.stats.minimized++; sfx('reel'); if (cur.c.type === 'N') meter('case', 0, null); }
    else if (cur.spotT <= 0) { cur.spotOn = 3; cur.spotT = 10; sfx('reel'); }
    else if (cur.pertinent || cur.c.type === 'T') { cur.min = false; sfx('reel'); }
    else toast('Spot-check', 'In ' + Math.ceil(cur.spotT) + ' seconds');
    UI.refresh(W.screen);
  },
  log(W) {
    const cur = W.cur; if (!cur) return;
    const li = cur.keyT > 0 ? cur.keyClose : cur.li, ln = cur.c.lines[li];
    const live = (cur.keyOpen === cur.li && cur.c.lines[cur.li] && cur.c.lines[cur.li][2]) ? cur.li : (cur.keyT > 0 ? cur.keyClose : -1);
    if (live < 0 || (cur.min && cur.spotOn <= 0)) { if (!W.auto) toast('Hal', "Write that down if you want, it ain't evidence."); return; }
    const key = cur.c.id + ':' + live; if (STATE.wire.logs.some(l => l.key === key)) return;
    STATE.wire.logs.push({ key, call: cur.c.id, line: cur.c.line, t: fmtTime(W.clock) }); W.logged++;
    const l2 = cur.c.lines[live];
    addEvidence({ id: 'int:' + key, kind: 'int', text: cur.c.id + ' ' + (cur.c.line || '') + ': "' + l2[1] + '"', num: cur.c.line, who: l2[0] }); meter('case', 4, 'Logged: ' + cur.c.id);
    if (cur.c.unlock) addFact(cur.c.unlock, 0, true); if (cur.c.unlock === 'int:mamab') addFact('int:boss', 0, true);
    if (cur.c.line && STATE.numbers[cur.c.line] && STATE.wire.ids[l2[0]]) STATE.numbers[cur.c.line].user = STATE.numbers[cur.c.line].user || l2[0];
    sfx('typekey'); UI.refresh(W.screen);
  },
  idVoice(W, spName) {
    const cur = W.cur; if (!cur) return; const ln = cur.c.lines[Math.min(cur.li, cur.c.lines.length - 1)], who = ln && ln[0];
    const prints = Array.from(new Set(STATE.wire.voiceprints.concat(['tee', 'rook', 'pigeon', 'corey', 'dale', 'lonnie', 'tavon', 'dink', 'odessa', 'moe'].filter(id => hasFact('face:' + id) || hasFact('name:' + id) || STATE.wire.voiceprints.includes(id))))).filter(id => !['dana', 'lou', 'hal', 'ren', 'navarre'].includes(id)).slice(0, 8);
    const bars = id => h('div.vp', Voice.print(id).map(v => h('i', { style: { height: v * 4 + 'px' } })));
    UI.open({ id: 'vid', cls: 'vid', legend: [['confirm', 'Match'], ['cancel', 'Back']], cancel: () => UI.close(),
      render(el) { el.append(h('div.panel.wire', h('div.kicker', { text: 'VOICE ID · ' + spName(who) }), h('div.vrow', h('b', { text: 'On the line' }), bars(who)),
        h('div.grid', prints.map(id => h('button.ev', { 'data-f': '', on: () => { UI.close(); if (id === who) { STATE.wire.ids[who] = 1; addFact('voice:' + who, 2, true); toast('Voice matched', nameOf(who) + ' on ' + (cur.c.line || '')); if (cur.c.line && STATE.numbers[cur.c.line]) STATE.numbers[cur.c.line].user = STATE.numbers[cur.c.line].user || who; meter('case', 0, null); } else toast('Hal', 'Listen to the vowels.'); UI.refresh(W.screen); } }, bars(id), h('span', { text: nameOf(id) }))))), prints.length ? null : h('p', { text: 'No voiceprints yet. You have to hear them in person first.' })); },
      model(ss) { ss.confirm = () => { UI.close(ss); STATE.wire.ids[who] = 1; addFact('voice:' + who, 2, true); }; } });
  },
  decide(W, cur, s) {
    const k = cur.c.decide; W.pend = true; const go = () => { W.pend = false; UI.refresh(s); };
    if (W.auto) { W.pend = false; return; }
    if (k === 'riddle') {
      if (!FL().dreLine) Talk.run([['hal', "'Where Dre messed up his ankle.' Somebody on that street knows the story. Pockets would."], ['dana', 'Then I\'ll ask Pockets.'], () => { FL().dreLine = true; toast('Pockets, at the bus stop', '"Arundel station fence. Everybody know that."'); }]);
      const places = [['Arundel Gas (closed)', 'gas'], ['The basketball court', 'court'], ['The Delancey Courts', 'courts'], ['Suds City', 'suds']];
      game.after(.1, () => UI.cards({ kicker: 'THE RIDDLE', title: '"The place where Dre messed up his ankle. Four o\'clock."', cards: places.map(([t, kk]) => ({ title: t, body: kk === 'gas' ? 'The old station on Harlow. A fence.' : '', k: kk })),
        pick: (i, c) => { FL().reupSpot = c.k; if (c.k === 'gas') { addFact('reup:gas', 4, true); toast('The re-up', 'Arundel Gas, four o\'clock. Ren gets the van.'); } else toast('Hal', 'Maybe. We\'ll see who shows.'); go(); } }));
    } else if (k === 'hammer') {
      UI.cards({ kicker: 'A THREAT TO LIFE', title: 'Rook wants "a hammer". Tonight.', text: 'A walled-off stop protects the wire: a patrol car, a broken taillight, nobody says why.', cards: [{ title: 'Let it ride', body: 'The wire stays clean.', cost: 'Somebody may get hurt' }, { title: 'Walled-off stop', body: 'Patrol pulls over Rook\'s Monte Carlo.', cost: 'Brass +15 · Heat +5' }],
        pick: i => { if (i === 1) { FL().wallOff = true; FL().rookFree = false; meter('brass', 15, 'Gun arrest on a car stop'); meter('heat', 5, 'Rook got pulled over'); toast('Walled off', 'A taillight. A gun under the seat. Rook in custody.'); } go(); } });
    } else if (k === 'mom') {
      UI.cards({ kicker: 'YOUR MOTHER', title: '"Her mother still stays over by the church."', cards: [{ title: 'Call your mother', body: 'Off the clock. She goes to her sister\'s in the county.' }, { title: 'Stay on the wire', body: 'It\'s a phone call. It\'s just talk.' }],
        pick: i => { if (i === 0) { FL().momSafe = true; Talk.run([['gloria', 'Dana? It\'s midnight.'], ['dana', 'Mama, go to Aunt Bernice\'s for a while. Please.'], ['gloria', '...I\'ll pack a bag.']], go, { phone: true }); } else go(); } });
    } else go();
  },
  result(W, s, done) {
    UI.close(s); Music.layer('pulse', 0, .5);
    const st = [['Key lines logged', W.logged], ['Calls minimized', W.mins], ['Seconds over the window', Math.round(W.viol)], ['Pages', W.pages.length]];
    const finishIt = () => { meter('legal', 0, null); done(W); };
    if (W.auto) return finishIt();
    const go = () => UI.open({ id: 'wres', cls: 'wres', legend: [['confirm', 'Continue']], render(el) { el.append(h('div.panel.wire', h('div.kicker', { text: 'END OF SHIFT · ' + SESSION[W.sid].name }), ...st.map(([l, v]) => h('div.stat', h('b', { text: String(v) }), h('span', { text: l }))), h('p.lede', { text: W.pulled ? 'The wire is dark. You\'ll get the rest the hard way.' : W.viol > 4 ? 'Hal, quietly: "The judge reads these."' : 'Hal: "Clean shift."' }), btn('Continue', () => { UI.close(); finishIt(); }, 'primary'))); }, model(ss) { ss.confirm = () => { UI.close(ss); finishIt(); }; } });
    const undecoded = W.pages.filter(p => !STATE.cipher.decoded.includes(p));
    if (undecoded.length) Talk.run([['hal', 'There\'s ' + undecoded.length + ' page' + (undecoded.length > 1 ? 's' : '') + ' on the clone you haven\'t worked.'] , () => { }], () => Cipher.open(W.pages.slice(), { done: go }));
    else go();
  },
  render(el, W, spName) {
    const cur = W.cur, win = DIFF().minWin, tabs = ['LIVE', 'LOG', 'PAGER'];
    const head = h('div.wtop', h('span.wclock', { text: fmtTime(W.clock) }), h('span', { text: SESSION[W.sid].name }), h('span', { text: 'Legal ' + Math.round(STATE.meters.legal) }));
    const body = h('div.wbody');
    if (W.panel === 0) {
      if (!cur) body.append(h('div.quiet', { text: W.pages.length && W.pages.some(p => !STATE.cipher.decoded.includes(p)) ? 'Quiet line. A page is waiting in PAGER.' : 'Quiet. The reels wait.' }));
      else {
        const c = cur.c, who = c.lines[Math.min(cur.li, c.lines.length - 1)] ? c.lines[Math.min(cur.li, c.lines.length - 1)][0] : null, wl = Math.max(0, win - cur.t);
        body.append(h('div.wline', { text: c.line + ' · ' + (STATE.numbers[c.line] ? STATE.numbers[c.line].n : c.line) + (c.line && c.line[0] === 'B' ? ' (burner)' : '') }),
          h('div.wspk', { text: c.sp.map(spName).join('  →  ') }),
          h('div.wwin' + (wl > 0 ? '' : '.over'), { text: cur.min ? (cur.spotOn > 0 ? 'SPOT-CHECK ' + cur.spotOn.toFixed(1) : 'MINIMIZED · spot-check ' + (cur.spotT > 0 ? 'in ' + Math.ceil(cur.spotT) : 'ready')) : wl > 0 ? 'Listening window ' + wl.toFixed(1) + 's' : 'Past the window' }),
          h('div.energy', Array.from({ length: 24 }, (_, i) => h('i', { style: { height: (!cur.min || cur.spotOn > 0) && cur.spoken ? (4 + Math.abs(Math.sin(cur.t * 9 + i)) * 18) + 'px' : '2px' } }))),
          h('div.trans.scroll', ...cur.shown.map(([w, t, k]) => h('p' + (k && game.settings.hints && game.settings.difficulty === 'rookie' ? '.key' : ''), { text: (w ? spName(w) + ': ' : '') + t })),
            (!cur.min || cur.spotOn > 0) && cur.spoken ? h('p.typing' + (c.lines[cur.li] && c.lines[cur.li][2] && game.settings.hints && game.settings.difficulty === 'rookie' ? '.key' : ''), { text: spName(c.lines[cur.li][0]) + ': ' + cur.spoken }) : cur.min && cur.spotOn <= 0 ? h('p.min', { text: '— minimized —' }) : null));
      }
    } else if (W.panel === 1) body.append(h('div.trans.scroll', ...(STATE.wire.logs.length ? STATE.wire.logs.slice(-10).map(l => h('p', { text: l.t + '  ' + l.call + '  ' + (l.line || '') })) : [h('p', { text: 'Nothing logged yet.' })])));
    else body.append(h('div.trans', ...W.pages.map(p => h('p.mono' + (STATE.cipher.decoded.includes(p) ? '.done' : ''), { text: p + (STATE.cipher.decoded.includes(p) ? '  ✓' : '') }))), W.pages.length ? btn('Decode pages', () => Cipher.open(W.pages.slice(), {})) : h('p', { text: 'No pages yet.' }));
    el.append(h('div.panel.wire.wroom', h('div.tabs', tabs.map((t, i) => h('span' + (i === W.panel ? '.on' : ''), { text: t }))), head, body,
      h('div.wbtns', btn(cur && cur.min ? 'Spot-check' : 'Minimize', () => this.minimize(W)), btn('Log line', () => this.log(W)), btn('ID voice', () => this.idVoice(W, spName)))));
  }
};
