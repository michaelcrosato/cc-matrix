/* TARGET 00 — TURN-DOWN SERVICE: talks and beats (§11.9). Talk lines: [speaker, text] or { card: [title, sub] }. */
S7.talk('cold_open_phone', [
  ['concierge', 'Good evening, Madame Holle. A guest has checked into the Grand Hotel who will not be checking out.'],
  ['concierge', 'Bellcaptain Grau. Third floor and below. The Department thanks you for your discretion.'],
  ['holle', '...Shake the bed, Rosalind.'],
  ['rosalind', 'She means it\'s time. She always means it\'s time.']
]);
S7.talk('cold_open_wardrobe', [
  ['ignaz', 'Grau. His grandfather carried my luggage in 1925. He never smiled either.'],
  ['dagny', 'This one\'s smiling.'],
  ['rurik', 'Everyone smiles when the price is right.']
]);
S7.talk('briefing_t00_replay', [
  ['concierge', 'Bellcaptain Grau. Third floor and below.'],
  ['concierge', 'The Department thanks you for your discretion. It always has.']
]);
S7.talk('first_whiteout', [
  ['ignaz', 'Laughter. In a hotel lobby. At this hour.'],
  ['dagny', 'Shoot it before it finishes the joke.']
]);
S7.talk('murmel_first', [
  ['murmel', 'Welcome... to Piz Nada... Higher than you think...'],
  ['murmel', 'Gratuity... is customary... The first one... is on the house...'],
  ['murmel', 'Hold the button... and you walk... Let go... and you are only standing... Standing is honest...']
]);
S7.talk('pim_00A', [
  ['pim', 'Going up? Nobody\'s going up. The elevator\'s been laughing since Tuesday.'],
  ['pim', 'Seven of you. I always count. Count again, later.']
]);
S7.talk('concierge_bar', [
  ['concierge', 'The Bellcaptain is on duty tonight. Third floor and below.'],
  ['concierge', 'Do enjoy the bar. It is complimentary, for members.']
]);
S7.talk('pim_00B', [['pim', 'Room 7 isn\'t on the plan. The architect was very sorry. He\'s in the walls now.']]);
S7.talk('t00_collapse', [
  ['intercom', 'Housekeeping. Somebody is frozen on the third floor.'],
  ['intercom', 'The Sweep only leaves Room 7 when someone\'s on the floor. He\'s coming.']
]);
S7.talk('t00_after_rescue', [
  ['ansel', 'Clear. Logged.'],
  ['intercom', 'Use the wardrobe if you want him back. Otherwise he goes home to his chair.']
]);
S7.talk('t00_bell', [
  ['ignaz', 'Ring for service, then.'],
  { who: 'sign', text: 'DONNNG.', sfx: 'bigbell' },
  ['dagny', 'Something opened at the end of the hall.']
]);
S7.talk('grau_intro', [
  ['grau', 'Ding. Ding. Ding. Every floor has a bell, and every bell has a floor.'],
  ['grau', 'Your luggage, Madame? It is very heavy. It is full of everyone you were.']
]);
S7.talk('grau_dead', [
  ['grau', 'Checkout... is at... eleven...']
]);
S7.talk('after_grau', [
  { card: ['TARGET 00 — AUGUSTIN GRAU — ELIMINATED'] },
  ['concierge', 'Your guest has checked out. Housekeeping has been notified.'],
  ['concierge', 'Breakfast is served at seven. As always. As it was. As it will be.']
]);

S7.beat('cold_open', function* (G) {
  const sim = G.sim;
  G.cut(true); G.music('room7');
  yield G.card('THE WINTER OF THE THAW ACCORD.');
  yield G.card('THE FREE CANTON OF PIZ NADA.', 'POPULATION: DISCREET.');
  G.cam({ at: [9 * M, 9.5 * M, 2.6 * M], look: [3 * M, 4 * M, 1 * M], fov: 50 });
  G.sfx('phone');
  yield 1.2;
  yield G.say('cold_open_phone');
  G.emit('shakebed', {});
  G.sfx('feathers');
  G.cam({ at: [6 * M, 6.5 * M, 1.2 * M], look: [1.6 * M, 8 * M, 1.6 * M], fov: 55 });
  yield 1.4;
  G.emit('wardrobe', { open: true });
  yield G.say('cold_open_wardrobe');
  yield G.card('TARGET 00', 'TURN-DOWN SERVICE', { who: 'grau', dur: 3 });
  G.cam(null);
  G.cut(false);
  G.flag('coldOpenDone');
  sim.st.target = 0;
  G.area('00A', 'r7', { face: Math.PI });
  sim.entryNode = 'r7'; sim.lastDoor7 = 'r7';
  sim.tut('walk');
});
S7.beat('t00_first_whiteout', function* (G) {
  const sim = G.sim;
  G.emit('laugh', { at: [33 * M, 12 * M, 30], style: 'giggle', pitch: 0, loud: .8 });
  yield .4;
  yield G.say('first_whiteout');
  G.wave('first');
  sim.tut('aim');
  yield G.until(s => s.aim.on || s.st.flags.firstClear);
  if (!sim.st.flags.firstClear) { sim.tut('scan'); yield G.until(s => s.scan || s.st.flags.firstClear || s.enemies.some(e => e.reveal > 0)); }
  if (!sim.st.flags.firstClear) { sim.tut('fire'); yield G.until(s => s.st.flags.firstClear); }
  if (sim.st.flags.firstCrit) sim.say('Clean.', { who: 'ignaz' });
  yield 1.2;
  sim.tut('junction');
});
S7.beat('t00_rope_tip', function* (G) {
  const sim = G.sim;
  if (sim.gateOpen('rope')) return;
  if (sim.st.persona !== 'rurik') sim.tut('ring');
  sim.st.flags.ropeSeen = 1;
  yield 0;
});
S7.beat('t00_collapse', function* (G) {
  const sim = G.sim;
  G.emit('collapse', { at: [sim.hero.x, sim.hero.y, sim.hero.z + 80] });
  G.sfx('collapse');
  sim.st.flags.scriptedFreeze = 1;
  yield .5;
  // the ceiling gives way on whoever is wearing the coat: frozen, statue left where they stood
  if (sim.st.persona === 'ansel') sim.trySwitch('ignaz', true);
  sim.pstate().hp = 0; sim.freezePersona();
  yield G.until(s => s.mode !== 'frozen');
  yield G.say('t00_collapse');
  G.wave('rescue');
  sim.tut('rescue');
});
S7.beat('t00_after_rescue', function* (G) { yield 1; yield G.say('t00_after_rescue'); G.sim.tut('wax'); });
S7.beat('t00_bell', function* (G) {
  G.flag('bellRung');
  G.emit('bigbell', {});
  yield G.say('t00_bell');
  G.cut(true);
  G.cam({ at: [60 * M, 13 * M, 3 * M], look: [64.5 * M, 9.5 * M, 1.6 * M], fov: 50 }, 3);
  G.emit('shaftdoors', { open: true });
  G.sfx('grind');
  yield 3;
  G.cam(null); G.cut(false);
});
S7.beat('grau_start', function* (G) {
  const sim = G.sim;
  G.cut(true);
  G.music('shaft');
  G.cam({ orbit: { c: [7 * M, 7 * M, 6 * M], r: 5 * M, h: 1 * M, speed: .35, a0: 0 }, fov: 60 });
  yield G.card('AUGUSTIN GRAU', 'THE BELLCAPTAIN', { who: 'grau', dur: 2.4 });
  yield G.say('grau_intro');
  G.cam(null); G.cut(false);
  sim.boss.phase = 1; sim.boss.t = 0;
});
S7.beat('t00_end', function* (G) {
  const sim = G.sim;
  G.cut(true);
  yield G.say('grau_dead');
  yield 1.2;
  G.give('grauBell', 1);
  G.cut(false);
  sim.finishTarget(0);
});
S7.beat('t00_results_done', function* (G) {
  const sim = G.sim;
  sim.st.flags.grauDead = 1;
  G.area('room7', 'bed', { silent: false });
  sim.st.room7Door = { area: '01A', node: 'ht' };
  G.cut(true);
  yield G.say('after_grau');
  yield G.say('briefing_t01');
  G.unlock(['kasimir', 'mireille', 'brigid']);
  yield G.card('THREE MORE COATS ARE DRY.');
  yield G.card('TARGET 01', 'APRÈS', { who: 'hansi', dur: 3 });
  G.cut(false);
  sim.st.target = 1;
  sim.addDossier('t01');
  G.area('01A', 'ht', { face: 0 });
  sim.entryNode = 'ht'; sim.lastDoor7 = null;
  sim.tut('ring');
  sim.toast('THE FEATHERBED HAS SEVEN NOW', { life: 4 });
});
