/* TARGET 01 — APRÈS: talks and beats (§11.9). */
S7.talk('briefing_t01', [
  ['concierge', 'At midnight, at the summit, the Coastal Federation and the Steppe Directorate will sign the Thaw Accord.'],
  ['concierge', 'Forty years of frozen war, ended with a fountain pen.'],
  ['concierge', 'Article Nine requires the Canton to open the Glacier Archive. Every account. Every name. Every body.'],
  ['rosalind', 'Bodies in a bank.'],
  ['concierge', 'Deposits, Sister.'],
  ['concierge', 'The Föhn has booked a guest onto the mountain. Hansi Pulver. Three Olympic golds. The face on the chocolate.'],
  ['concierge', 'He will ski the summit at midnight and the glacier will weep. The Department would prefer it did not weep.'],
  ['holle', 'Hansi. I taught Hansi to fall.'],
  ['mireille', 'Then we\'ll teach him to land.'],
  ['kasimir', 'Yo-di-ah-hee... hoo.'],
  ['brigid', 'I\'ll bring the snow down on him. Gently. Like a mother.']
]);
S7.talk('pim_01A', [['pim', 'Do you know why it never stops snowing here? Somebody upstairs is shaking a bed.']]);
S7.talk('pim_01D', [['pim', 'There were eight of us on the lift that day. The snow took seven. Count again.'], ['holle', '...Hold on tight, children. Hold on...']]);
S7.talk('pim_01E', [['pim', 'They froze the whole team in the photograph. Smile, everybody. Nobody smiled.']]);
S7.talk('concierge_gate', [['concierge', 'The gondola is reserved for delegates. Delegates carry Edelweiss. Edelweiss grows where it likes.']]);
S7.talk('concierge_atrium', [['concierge', 'The Accord has forty-three articles. Article Nine is the one with teeth. The others are gums.']]);
S7.talk('concierge_vault', [['concierge', 'You are in the vault. The Department would prefer you didn\'t read anything. The Department knows you will.']]);
S7.talk('church_bell', [['ignaz', 'Ring for service, then. Again.'], ['dagny', 'The roof\'s letting go. The lift station\'s clear.']]);
S7.talk('delegate_gate', [['concierge', 'Three Edelweiss. Welcome aboard, delegate. Mind the gap. The gap is about six hundred metres.']]);
S7.talk('darkroom', [['mireille', 'A dark room. My favourite kind of honest.']]);
S7.talk('mirrors_tip', [['kasimir', 'So many of me. And none of them can sing.']]);
S7.talk('band_intro', [['tuba', 'Ein! Zwei! Drei! Vier!'], ['accordion', 'A waltz for the delegates! Everybody dance!'], ['trumpet', 'You came without a partner. That\'s all right. Partners come to you.']]);
S7.talk('band_dead', [['snare', 'Bravo... bravo...'], ['kasimir', 'Encore? No.']]);
S7.talk('cornice', [['brigid', 'Controlled.'], ['ansel', 'Bridge. Logged.']]);
S7.talk('shelter', [['dagny', 'The way down is the way down. Point me at it.']]);
S7.talk('lawine', [['dagny', 'LAWINE!']]);
S7.talk('power_cut', [['rurik', 'The power company. Never trust a monopoly.'], ['ignaz', 'Three insulators on the next pylon. Frozen. A long way off.']]);
S7.talk('power_back', [['dagny', 'Moving. Finally.']]);
S7.talk('ledger', [
  { who: 'exposure', text: 'ACCOUNT 7 — HOLDER: H. HOLLE — CONTENTS: SEVEN (7) PERSONS, DECEASED 26.1.1926 — IN TRUST.' },
  ['mireille', 'We\'re in the vault.'],
  ['ignaz', 'We are the vault, mademoiselle.'],
  ['dagny', 'Don\'t read it twice. Reading twice is how you fall.']
]);
S7.talk('seracs', [['brigid', 'Ice towers. Load-bearing lies. Down they come.']]);
S7.talk('hansi_intro', [
  ['hansi', 'Grüß Gott! You came for a lesson? Lesson one: everything goes downhill.'],
  ['fohn', '(a warm wind, laughing)']
]);
S7.talk('hansi_fall', [['hansi', 'Ha! You melted my snowman. Fine. Catch me if you can ski.']]);
S7.talk('hansi_crash', [['hansi', 'Ooof. Bad edge. Bad... edge...']]);
S7.talk('epilogue', [
  ['fohn', 'Your move, Frau Holle. You lost a bishop. A very handsome bishop. Three gold medals.'],
  ['holle', 'I have seven more pieces.'],
  ['fohn', 'You have one piece, Holle. Wearing seven coats.'],
  ['fohn', 'Spring always comes. That\'s not a threat. It\'s a weather report.'],
  ['rosalind', 'Draughty.'],
  ['concierge', 'The Accord is signed. Nobody remembers signing it. Your next guest arrives with the thaw. Sleep well, Madame.'],
  ['pim', 'Eight on the lift. Seven in the wardrobe. One in the bed. Now you\'ve counted right.', { if: s => s.st.pins.length >= 7 }],
  ['holle', s => s.st.ending === 'fell' ? 'He fell to the left. He always fell to the left.' : 'Seven coats. Seven hooks. Shake the bed, Rosalind.']
]);

S7.beat('pim_01A_seen', function* () { yield 0; });
S7.beat('church_bell', function* (G) {
  G.flag('churchBell'); G.emit('bigbell', {});
  yield G.say('church_bell');
  G.cut(true);
  G.cam({ at: [44 * M, 36 * M, 5 * M], look: [47.5 * M, 32.5 * M, 1 * M], fov: 50 }, 3);
  G.emit('driftfall', {}); G.sfx('rumble');
  yield 2.6;
  G.cam(null); G.cut(false);
  G.toast('THE LIFT STATION IS CLEAR');
});
S7.beat('delegate_gate', function* (G) {
  const sim = G.sim;
  G.cut(true);
  for (let i = 0; i < 3; i++) { G.emit('slot', { i }); G.sfx('chime'); yield .7; }
  yield G.say('delegate_gate');
  G.cut(false);
  sim.st.items.edelweiss = 0; sim.st.flags.gateOpen = 1;
  sim.useExit(sim.rails.nodes.gg);
});
S7.beat('inspector', function* (G) {
  const sim = G.sim;
  if (sim.st.flags.edelweiss1 || sim.enemies.some(e => e.alive && e.type === 'inspector')) return;
  const marks = [[28.5, 29.4], [33.5, 29.4], [31, 32.6]];
  sim.spawnEnemy('inspector', marks[0], { data: { marks, give: 'edelweiss', flag: 'edelweiss1' } });
  sim.say('An inspector, with a delegate\'s pass. He hasn\'t noticed you.', {});
  yield 0;
});
S7.beat('darkroom', function* (G) { if (G.has('exposure1')) return; yield G.say('darkroom'); G.sim.tut('scan'); });
S7.beat('mirrors_tip', function* (G) { yield G.say('mirrors_tip'); });
S7.beat('band_arrive', function* (G) {
  const sim = G.sim;
  if (sim.boss || sim.st.flags.bandDead) return;
  sim.autosave('boss');
  sim.startBoss('band', 0);
  yield 0;
});
S7.beat('band_start', function* (G) {
  G.cut(true);
  G.cam({ at: [46 * M, 37 * M, 3 * M], look: [46.5 * M, 26.6 * M, 2.4 * M], fov: 46 });
  yield G.card('DIE LUSTIGEN VIER', 'THE JOLLY FOUR', { dur: 2.2 });
  yield G.say('band_intro');
  G.cam(null); G.cut(false);
  G.sim.say('Shoot each one while their note sounds.', {});
});
S7.beat('band_end', function* (G) {
  const sim = G.sim;
  G.flag('bandDead'); G.gate('band');
  sim.splash('BRAVO', { crit: true });
  sim.gain('rime', 10, [46 * M, 27 * M, 30]);
  yield G.say('band_dead');
  sim.boss = null; G.music('palais');
});
S7.beat('cornice_down', function* (G) {
  G.cut(true);
  G.cam({ at: [392 * M, 196 * M, G.sim.grid.floorAt(392 * M, 196 * M) + 8 * M], look: [345 * M, 166 * M, G.sim.grid.floorAt(345 * M, 166 * M)], fov: 52 }, 4);
  G.emit('cornicefall', {}); G.sfx('rumble');
  yield 3.4;
  G.cam(null); G.cut(false);
  yield G.say('cornice');
});
S7.beat('lawine', function* (G) {
  const sim = G.sim;
  if (G.has('lawineDone') || G.has('lawine')) return;
  G.flag('lawine');
  sim.lawine = { gap: 12 * M, t: 0, slow: 0 };
  sim.say('LAWINE!', { who: 'dagny', big: true });
  sim.emit('lawine', { on: true });
  yield 0;
});
S7.beat('gondola_board', function* (G) {
  const sim = G.sim;
  yield .6;
  if (sim.W.node === 'gs' && !sim.st.flags.powerBack) { const ex = sim.rails.exits('gs'); if (ex.length) sim.takeBranch(ex[0]); }
  sim.tut('lift');
});
S7.beat('power_cut', function* (G) {
  const sim = G.sim;
  if (G.has('powerBack')) return;
  G.emit('powercut', {}); G.sfx('grind');
  sim.gondola = sim.gondola || {}; sim.gondola.swing = 1;
  yield G.say('power_cut');
  sim.tut('longlook');
});
S7.beat('power_back', function* (G) {
  const sim = G.sim;
  G.flag('powerBack'); G.gate('power');
  G.emit('powerback', {}); G.sfx('lift');
  yield G.say('power_back');
  const ex = sim.rails.exits('mid'); if (sim.W.node === 'mid' && ex.length) sim.takeBranch(ex[0]);
});
S7.beat('ledger_reveal', function* (G) {
  yield G.until(s => !s.uiRequest && !s.uiOpen);
  G.cut(true);
  yield G.say('ledger');
  G.cut(false);
});
S7.beat('seracs_down', function* (G) { G.emit('seracfall', {}); G.sfx('collapse'); yield 1; yield G.say('seracs'); G.flag('archiveDone'); });
S7.beat('summit_arrive', function* (G) { const sim = G.sim; if (sim.boss) return; sim.st.flags.gondolaDone = 1; sim.autosave('boss'); sim.startBoss('hansi', 0); yield 0; });
S7.beat('hansi_intro', function* (G) {
  const sim = G.sim, B = sim.boss;
  G.cut(true); G.music('powderking');
  B.actors = [{ who: 'hansi', x: 1000 * M, y: 300 * M, z: sim.grid.floorAt(1000 * M, 300 * M), facing: Math.PI / 2, pose: 'hips' }];
  G.cam({ orbit: { c: [1000 * M, 300 * M, sim.grid.floorAt(1000 * M, 300 * M) + 2 * M], r: 7 * M, h: 1 * M, speed: .25, a0: 1.2 }, fov: 50 });
  yield G.card('HANSI PULVER', 'THE POWDER KING', { who: 'hansi', dur: 2.6 });
  yield G.say('hansi_intro');
  G.emit('avalaughrise', {}); G.sfx('rumble');
  B.actors = [];
  G.cam({ at: [1000 * M, 345 * M, sim.grid.floorAt(1000 * M, 345 * M) + 3 * M], look: [1000 * M, 290 * M, sim.grid.floorAt(1000 * M, 290 * M) + 9 * M], fov: 60 }, 2.5);
  B.rise = 0; yield 2.5;
  G.cam(null); G.cut(false);
  yield G.card('THE AVALAUGH', '', { dur: 1.6 });
  B.phase = 1; sim.autosave('boss');
});
S7.beat('hansi_fall', function* (G) {
  const sim = G.sim, B = sim.boss;
  G.cut(true);
  G.emit('avalaughfall', {}); G.sfx('collapse');
  B.actors = [{ who: 'hansi', x: 1000 * M, y: 305 * M, z: sim.grid.floorAt(1000 * M, 305 * M), facing: Math.PI / 2, pose: 'crouch', skis: true }];
  G.cam({ at: [1015 * M, 330 * M, sim.grid.floorAt(1015 * M, 330 * M) + 3 * M], look: [1000 * M, 305 * M, sim.grid.floorAt(1000 * M, 305 * M) + 1.5 * M], fov: 52 }, 3);
  yield G.say('hansi_fall');
  yield 1;
  G.cam(null); G.cut(false);
  BOSS.hansi.toSlalom(sim, B);
  sim.autosave('boss');
});
S7.beat('hansi_crash', function* (G) {
  const sim = G.sim, B = sim.boss;
  G.cut(true);
  G.emit('crash', {}); G.sfx('collapse');
  yield G.say('hansi_crash');
  yield G.card('THE INTERVIEW', '', { dur: 1.6 });
  G.cut(false);
  BOSS.hansi.toInterview(sim, B);
});
S7.beat('hansi_end', function* (G) {
  const sim = G.sim;
  yield 2.5;
  S7.interviewGun = false; sim.bossLockAim = false; sim.aimExit(true); sim.mode = 'rail';
  yield G.card('TARGET 01 — HANSI PULVER — ELIMINATED', sim.st.ending === 'fell' ? 'FELL' : 'SHOT');
  sim.finishTarget(1);
});
S7.beat('epilogue', function* (G) {
  const sim = G.sim;
  sim.st.flags.t01Done = 1;
  G.area('room7', 'bed', { silent: false });
  G.cut(true); G.music('epilogue');
  sim.epilogue = true;
  G.cam({ at: [7 * M, 8.8 * M, 2.2 * M], look: [2.8 * M, 3.6 * M, 1.2 * M], fov: 48 });
  yield 1;
  yield G.say('epilogue');
  G.emit('curtain', {});
  yield 1;
  yield G.card('TARGET 02 — BLACK ICE', 'NEXT WINTER');
  yield G.card('THE SNOW WILL CONTINUE.');
  G.cam(null); G.cut(false);
  sim.epilogue = false;
  sim.autosave('end');
  sim.creditsReady = true;
});
