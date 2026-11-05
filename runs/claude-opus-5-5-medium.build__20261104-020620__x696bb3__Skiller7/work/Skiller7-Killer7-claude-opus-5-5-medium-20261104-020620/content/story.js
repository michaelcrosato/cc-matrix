/* SKILLER7 content — the cast, every line, and the beats (coroutines: yield seconds, a condition, B.say, B.card, B.cam).
 * Style (§11.2): short flat sentences; euphemism as menace; politics as weather; repetition with drift. */
S7.PEOPLE = {
  holle: { name: 'OMA HOLLE', voice: 'holle', rig: { build: 'chibi', size: 1.0, hair: 'long', colors: { skin: '#e8d8c8', hair: '#f4f4f4', cloth: '#f0ece4', pants: '#f0ece4' }, weapon: null } },
  rosalind: { name: 'SISTER ROSALIND', voice: 'rosalind', rig: { build: 'heroic', outfit: 'robe', hood: true, acc: [{ kind: 'shades', color: '#2a2a3a', shine: '#c0c8e0' }], weapon: null, colors: { skin: '#ead6c6', hair: '#f4f4f4', cloth: '#18181c', coat: '#18181c', trim: '#f4f4f4', pants: '#18181c' } } },
  concierge: { name: 'THE CONCIERGE', voice: 'concierge', rig: { build: 'heroic', outfit: 'coat', hair: 'short', weapon: null, colors: { skin: '#d8d0cc', hair: '#c0c0c8', cloth: '#101014', coat: '#101014', pants: '#101014', trim: '#d8b040', eye: '#d0d0d8' } } },
  fohn: { name: 'MISTER FÖHN', voice: 'fohn', rig: { build: 'heroic', outfit: 'coat', hair: 'short', acc: [{ kind: 'shades', color: '#101010' }], weapon: null, colors: { skin: '#b8805a', hair: '#101010', cloth: '#f4efe4', coat: '#f4efe4', pants: '#f4efe4', trim: '#e0d8c8' } } },
  pim: { name: 'PIM, THE LIFT BOY', voice: 'pim', rig: { build: 'chibi', size: 1.0, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#2e5a3a' }, weapon: null, colors: { skin: '#d8e8e0', hair: '#5a4a3a', cloth: '#2e5a3a', pants: '#2a3a30' } } },
  murmel: { name: 'MURMEL', voice: 'murmel', blob: true },
  grau: { name: 'BELLCAPTAIN GRAU', voice: 'grau', rig: { build: 'heroic', size: 1.4, outfit: 'coat', hair: 'short', hat: { style: 'pillbox', color: '#a01818', band: '#e0b040' }, weapon: null, colors: { skin: '#a8a8a8', hair: '#606060', cloth: '#a01818', coat: '#a01818', pants: '#801010', trim: '#e0b040' } } },
  hansi: { name: 'HANSI PULVER', voice: 'hansi', rig: { build: 'heroic', size: 1.4, outfit: 'shirt', hair: 'spiky', hat: { style: 'racehelmet', color: '#e0b040', visor: '#c0e8ff' }, acc: [{ kind: 'goggles', color: '#c0e8ff' }], weapon: 'poles', colors: { skin: '#c89060', hair: '#f0d860', cloth: '#e0b040', pants: '#e0b040', trim: '#ffffff', metal: '#e0e0e8' } } },
  exposure: { name: 'EXPOSURE', voice: null },
  tuba: { name: 'THE TUBA', voice: 'tuba', rig: { build: 'bulky', size: 1.3, outfit: 'shirt', hair: 'bald', hat: { style: 'felt', color: '#3a5a2a', feather: '#e8e0c0' }, weapon: null, colors: { skin: '#f6f6f4', cloth: '#f0ece0', pants: '#5a3a1e', trim: '#2e5a2e', eye: '#101010' } } },
  villager: { name: 'A VILLAGER', voice: 'villager', rig: { build: 'heroic', outfit: 'coat', hair: 'short', weapon: null, colors: { skin: '#e8d0b8', cloth: '#6a4a3a', coat: '#6a4a3a', pants: '#3a2a20', hair: '#5a3a20' } } }
};
for (const id of S7.ORDER) S7.PEOPLE[id] = { name: S7.PERSONAS[id].name.toUpperCase(), voice: S7.PERSONAS[id].voice, rig: S7.PERSONAS[id].rig, persona: true };

const L = S7.lines;
L('murmel_first', ['Welcome... to Piz Nada... Higher than you think...', 'Gratuity... is customary... The first one... is on the house...', 'Hold the button... and you walk... Let go... and you are only standing... Standing is honest...']);
L('hints', {
  rope: 'The bar... is for members... Membership is a matter of means... Who in the family has means...?',
  key: 'Staff keys... live behind bars... The bar... is behind the rope...',
  bell: 'Ring for service... at the end of the hall... Only an old man\'s eyes... reach that far...',
  gap: 'A hole in the floor... is a ski jump... for someone in a hurry...',
  grau: 'The Bellcaptain... works in the shaft... Every floor has a bell... Wait for the hat...',
  bell1: 'The church bell... shakes the snow off the lift station... Someone with a long gun... and long patience...',
  gate: 'The gondola is for delegates... Three Edelweiss... One in the Palais... one in a tuba... one on the mountain...',
  mirrors: 'Mirrors lie... Echoes don\'t... Sing to the wall...',
  press: 'The press room is dark... Someone with a flash... could develop a secret... A safe likes dates...',
  patrol: 'The ridge is closed... Patrol only... The Sweep lives in Room 7... Wake him...',
  cornice: 'The ridge wears a snow hat... Knock it off... and you have a bridge... Brigid knows how...',
  crystals: 'Ice hums... when it wants a note... Ice weeps... when it meets an ember...',
  ledger: 'A ledger frozen dark... wants a flash...',
  seracs: 'Ice towers... come down... for an engineer...',
  hansi: 'The summit... Hansi falls to the left... He always did...'
});
L('hint_fallback', ['Have you tried... being somebody else...?']);
L('objectives', {
  rope: 'Get past the velvet rope into the bar.', key: 'Find the service key behind the bar. Take the stairwell up.', bell: 'Ring for service: the bell across the light well.',
  gap: 'Cross the hole in the floor.', grau: 'The service shaft. The Bellcaptain is on duty.', bell1: 'Clear the snow off the lift station.',
  gate: 'Collect three Edelweiss passes for the gondola.', mirrors: 'The Palais: find the passes. Sing past the mirrors.', press: 'The press room is dark. Develop what\'s on the board.',
  patrol: 'The Black Run: cross the patrol rope.', cornice: 'Bring down the cornice. Reach the avalanche shelter.', crystals: 'The Archive: shatter the humming crystals.',
  ledger: 'Read the frozen ledger.', seracs: 'Bring down the seracs. Take the freight elevator.', hansi: 'The summit. Hansi Pulver skis at midnight.'
});
L('rosalind_obj', {
  rope: 'The bar has a rope. Ropes have prices.', key: 'Staff keys hang where staff drink.', bell: 'The Bellcaptain\'s luggage is heavy. Ring for service.', gap: 'The floor is gone. Someone in this family has never once slowed down.',
  grau: 'He is waiting in the shaft. He has always been waiting.', bell1: 'The church rings. The roof listens.', gate: 'Three flowers for a gondola. Go and pick them.',
  mirrors: 'Mirrors in the Palais. Kasimir sings badly enough.', press: 'Dark rooms keep secrets. Mireille keeps a flash.', patrol: 'The ridge is closed. Your brother is patrol.',
  cornice: 'Brigid brings the snow down. Gently, she says.', crystals: 'The vault. Read nothing. Read everything.', ledger: 'The vault. Read nothing. Read everything.', seracs: 'Ice towers. Brigid.', hansi: 'Midnight. The summit. She taught him to fall.'
});
L('holle_bed', ['Shake the bed...', 'Hansi always fell to the left.', 'Seven coats. Seven hooks. One girl.', 'Is it spring yet? Don\'t tell me.', 'The wind is warm today. Close the window.', 'Eight on the lift... no, seven... no...']);
L('lobby_door', ['The revolving door turns in the storm. It does not let anyone out.', 'Checkout is not available at this time.']);
L('lookout', ['Across the light well, the hotel\'s great service bell. Seventy years of dust on it.', 'Too far for a pistol. Not too far for an old man\'s eyes.']);
L('hole', ['The floor fell through to the second floor. Nobody heard it. Nobody heard anything here.']);
L('village1', ['It hasn\'t stopped snowing since Grandmother was a girl.']);
L('village2', ['The Föhn came through Tuesday. My husband laughed until he wasn\'t there.']);
L('village3', ['Bend the knees. Bend the truth. Same muscles.']);
L('lookout1', ['The church tower. Its bell, eighty metres off, dark against the dusk.', 'A bell that big could shake the snow off half the village.']);
L('coastal', ['The Coastal Ambassador, frozen mid-handshake: "We have nothing to hide that we haven\'t already hidden."']);
L('steppe', ['The Steppe General, frozen saluting: "Neutrality isn\'t a place. It\'s a direction. Away."']);
L('interpreter', ['The interpreter: "He says... he is sorry. He is not saying that."']);
L('waiter', ['A waiter with a tray: "The canapés were always frozen. Now they\'re honest."']);
L('journalist', ['A journalist: "Off the record? The record is on ice."']);
L('secretary', ['A secretary: "Sign here. And here. And under the ice."']);
L('mirrorwall', ['An ornate wall of mirrors. Seven faces in it, all the same face.', 'It hums when you speak. It would ring if you sang.']);
L('cornice', ['The ridge wears a cornice of snow over a crevasse.', 'Bring it down in the right place and it makes a bridge.']);
L('deposit1', ['Account 4417. Contents: a journalist, 1961.']);
L('deposit2', ['Account 2210. Contents: a quarrel between two countries. Unopened.']);
L('deposit3', ['Account 0889. Contents: the truth about a war. Interest accrues.']);
L('briefing0', [['concierge', 'Good evening, Madame Holle. A guest has checked into the Grand Hotel who will not be checking out.'], ['concierge', 'Bellcaptain Grau. Third floor and below. The Department thanks you for your discretion.']]);
L('briefing1', [['concierge', 'At midnight, at the summit, the Coastal Federation and the Steppe Directorate will sign the Thaw Accord.'], ['concierge', 'Forty years of frozen war, ended with a fountain pen.'],
  ['concierge', 'Article Nine requires the Canton to open the Glacier Archive. Every account. Every name. Every body.'], ['rosalind', 'Bodies in a bank.'], ['concierge', 'Deposits, Sister.'],
  ['concierge', 'The Föhn has booked a guest onto the mountain. Hansi Pulver. Three Olympic golds. The face on the chocolate.'],
  ['concierge', 'He will ski the summit at midnight and the glacier will weep. The Department would prefer it did not weep.']]);

const B_ = S7.beat;
const toRoom = (area, node) => { S7.flurry && S7.flurry(); S7.enterArea(area, node, { noAutosave: true }); };
/* ---- the cold open (Room 7) ---- */
B_('cold_open', function* (B) {
  B.cut(true);
  yield B.card('THE WINTER OF THE THAW ACCORD.', '', 2.8);
  yield B.card('THE FREE CANTON OF PIZ NADA.', 'POPULATION: DISCREET.', 2.8);
  yield B.cam({ shot: 'fixed', at: [10.6, 8.6, 2.8], look: [3.5, 3, 1], fov: 54 }, 999);
  B.emit('phoneRing', {}); yield 1.4;
  yield B.say(S7.LINES.briefing0);
  yield B.cam({ shot: 'fixed', at: [5, 5.2, 1.6], look: [2.2, 2.6, .8], fov: 44 }, 999);
  yield B.say([['holle', '...Shake the bed, Rosalind.'], ['rosalind', 'She means it\'s time. She always means it\'s time.']]);
  B.emit('featherShake', {}); yield 1.6;
  yield B.cam({ shot: 'fixed', at: [6, 7.6, 2.2], look: [1.6, 6.6, 1.4], fov: 50 }, 999);
  B.emit('wardrobeOpen', {}); yield .8;
  yield B.say([['ignaz', 'Grau. His grandfather carried my luggage in 1925. He never smiled either.'], ['dagny', 'This one\'s smiling.'], ['rurik', 'Everyone smiles when the price is right.']]);
  B.camOff(); B.cut(false);
  yield B.card('TARGET 00', 'TURN-DOWN SERVICE', 3, { target: true, who: 'grau' });
  const G = B.G(); G.r7from = { area: '00A', node: 'r7' }; G.lastDoor['00A'] = 'r7';
  toRoom('00A', 'r7'); S7.autosave && S7.autosave('area');
});
B_('t00_first_whiteout', function* (B) {
  const G = B.G();
  S7.startWave('first'); yield .5;
  yield B.say([['ignaz', 'Laughter. In a hotel lobby. At this hour.'], ['dagny', 'Shoot it before it finishes the joke.']]);
  S7.tip('aim');
  yield () => G.aim.on || !S7.aliveEnemies().length; S7.tip('scan');
  yield () => G.scan || G.enemies.some(e => e.alive && e.vis > .5) || !S7.aliveEnemies().length; S7.tipDone('scan'); S7.tip('fire');
  yield () => !S7.aliveEnemies().length;
  S7.tipDone('fire'); S7.setFlag('firstThaw');
  if (G.stats.crits) S7.barkLine(G.persona === 'ignaz' ? 'ignaz' : G.persona, 'Clean.');
  yield 1.2;
  if (G.roster[G.persona].hp < G.roster[G.persona].max * .7) S7.tip('heal');
  else S7.tip('interact');
});
B_('pim1', function* (B) {
  S7.setFlag('pim1seen');
  yield B.say([['pim', 'Going up? Nobody\'s going up. The elevator\'s been laughing since Tuesday.'], ['pim', 'Seven of you. I always count. Count again, later.']]);
  S7.setFlag('pim1done');
});
B_('pim2', function* (B) { yield B.say([['pim', 'Room 7 isn\'t on the plan. The architect was very sorry. He\'s in the walls now.']]); });
B_('pim3', function* (B) { yield B.say([['pim', 'Do you know why it never stops snowing here? Somebody upstairs is shaking a bed.']]); });
B_('pim5', function* (B) { yield B.say([['pim', 'They froze the whole team in the photograph. Smile, everybody. Nobody smiled.']]); });
B_('concierge_bar', function* (B) { B.emit('phoneRing', {}); yield .6; yield B.say([['concierge', 'The Bellcaptain is on duty tonight. Third floor and below.'], ['concierge', 'Do enjoy the bar. It is complimentary, for members.']]); });
B_('concierge_booth', function* (B) { B.emit('phoneRing', {}); yield .6; yield B.say([['concierge', 'The gondola is reserved for delegates. Delegates carry Edelweiss.'], ['concierge', 'Edelweiss grows where it likes.']]); });
B_('concierge_atrium', function* (B) { B.emit('phoneRing', {}); yield .6; yield B.say([['concierge', 'The Accord has forty-three articles. Article Nine is the one with teeth.'], ['concierge', 'The others are gums.']]); B.give('doc_art9'); });
B_('concierge_vault', function* (B) { B.emit('phoneRing', {}); yield .6; yield B.say([['concierge', 'You are in the vault. The Department would prefer you didn\'t read anything.'], ['concierge', 'The Department knows you will.']]); });
B_('briefing_replay0', function* (B) { yield B.say(S7.LINES.briefing0); });
B_('briefing_replay1', function* (B) { yield B.say(S7.LINES.briefing1); });
B_('lookout_hint', function* (B) {
  const G = B.G();
  if (G.persona !== 'ignaz') S7.barkLine('ignaz', 'That bell. Seventy metres. My kind of conversation.', 3.2);
  else { S7.barkLine('ignaz', 'Ah. A bell that wants ringing.', 2.6); S7.tip('skill'); }
});
B_('bell_rung', function* (B) {
  B.cut(true); B.emit('bigBell', {}); S7.splash('DING.', 1.6, { big: true });
  yield B.cam({ shot: 'fixed', at: [33, 14, 2.2], look: [40.5, 18, 1.2], fov: 46 }, 3);
  B.emit('shaftOpen', {}); yield 3;
  B.cut(false);
  yield B.say([['ignaz', 'Service.'], ['dagny', 'The shaft doors. Downstairs, past the hole.']]);
});
B_('collapse', function* (B) {
  const G = B.G();
  if (G.persona === 'ansel') { B.emit('collapse', {}); S7.splash('THE CEILING MISSES THE SWEEP.', 1.6); return; }
  B.emit('collapse', {}); G.flags.collapseFor = G.persona; yield .25;
  S7.freezeActive();
  yield () => G.mode === 'play' && G.persona === 'ansel';
  S7.startWave('collapse');
  yield B.say([['rosalind', '(over the intercom) The Sweep only leaves Room 7 when someone\'s on the floor.'], ['rosalind', 'Use the wardrobe if you want him back.']]);
  yield () => !S7.statuesHere().length;
  S7.setFlag('rescued');
});
/* ---- after Grau: results, the after-call, the briefing, Target 01 ---- */
B_('t00_done', function* (B) {
  const G = B.G();
  yield 1.4;
  yield B.card('TARGET 00 — AUGUSTIN GRAU', 'ELIMINATED', 3.2, { target: true, who: 'grau', dead: true });
  yield B.results(0);
  toRoom('room7', 'door'); S7.thawLeftBehind(null); if (G.persona === 'ansel') { G.persona = G.roster.ignaz.frozen ? 'rurik' : 'ignaz'; }
  B.cut(true);
  yield B.cam({ shot: 'fixed', at: [10.6, 8.6, 2.8], look: [4, 3, 1], fov: 54 }, 999);
  B.emit('phoneRing', {}); yield 1;
  yield B.say([['concierge', 'Your guest has checked out. Housekeeping has been notified.'], ['concierge', 'Breakfast is served at seven. As always. As it was. As it will be.']]);
  yield 1;
  B.emit('phoneRing', {}); yield 1;
  yield B.say(S7.LINES.briefing1);
  yield B.say([['holle', 'Hansi. I taught Hansi to fall.'], ['mireille', 'Then we\'ll teach him to land.'], ['kasimir', 'Yo-di-ah-hee... hoo.'], ['brigid', 'I\'ll bring the snow down on him. Gently. Like a mother.']]);
  for (const id of ['kasimir', 'mireille', 'brigid']) G.roster[id].unlocked = true;
  B.camOff(); B.cut(false);
  yield B.card('THREE MORE COATS ARE DRY.', '', 2.6);
  yield B.card('TARGET 01', 'APRÈS', 3, { target: true, who: 'hansi' });
  G.target = 1; G.stats = S7.newStatsFn(); B.give('doc_t01');
  G.r7from = { area: '01A', node: 'ht' };
  toRoom('01A', 'ht'); S7.autosave && S7.autosave('area');
});
/* ---- Target 01 beats ---- */
B_('church_bell', function* (B) {
  B.cut(true); B.emit('bigBell', { church: true }); S7.splash('DONG.', 1.6, { big: true });
  yield B.cam({ shot: 'fixed', at: [28, 30, 3.2], look: [38, 25, 4], fov: 50 }, 3.2);
  B.emit('driftSlide', {}); yield 3.2;
  B.cut(false);
  yield B.say([['ignaz', 'The roof is clear. The lift is open.'], ['rurik', 'And the turnstile still wants forty.']]);
});
B_('delegate_gate', function* (B) {
  B.cut(true);
  yield B.cam({ shot: 'fixed', at: [30, 38, 2], look: [32.5, 41.5, 1.4], fov: 44 }, 3);
  for (let i = 0; i < 3; i++) { B.emit('edelSlot', { i }); yield .7; }
  yield .8; B.cut(false); S7.setFlag('gondolaGate');
  yield B.say([['concierge', '(a speaker by the gate) Welcome, delegate. Mind the gap. The gap is very large.']]);
});
B_('inspector', function* (B) {
  const G = B.G();
  if (G.items.edelweiss && G.flags.edel1) return;
  const e = S7.spawnEnemy('inspector', 36.5 * 16, 28.5 * 16, undefined, { marks: [[30, 28.5], [38, 28.5], [34, 32]], wave: null });
  e.drop = 'edelweiss'; e.onDropFlag = 'edel1';
  S7.barkLine(G.persona, 'An inspector. Carrying a pass. He won\'t stay.', 3);
  G.flags.inspectorGone = 0;
});
B_('board_developed', function* (B) {
  B.emit('open', { screen: 'exposure', item: 'exp_board' });
  yield () => !S7.UIOPEN;
  yield B.say([['mireille', 'Twenty-six, oh-one. The day the eight went up.'], ['mireille', 'A date makes a good combination. People never forget the worst day.']]);
});
B_('safe_open', function* (B) {
  B.give('ember'); B.give('doc_art9');
  yield B.say([['rurik', 'An ember in a safe. Rich people keep the strangest things warm.'], [B.G().persona, 'The Ember Charm. Ice weeps when it meets it.']]);
});
B_('cornice_down', function* (B) {
  B.cut(true); B.emit('corniceFall', {});
  yield B.cam({ shot: 'fixed', at: [226, 70, 396], look: [243, 55, 386], fov: 50 }, 3.6);
  yield 3.6; B.cut(false);
  yield B.say([['brigid', 'Bridge. Gently, see.']]);
});
B_('lawine', function* (B) {
  const G = B.G();
  S7.setFlag('lawine');
  G.aval = { d: -38 * 16, pd: 0, speed: 239 * S7.DIFF[G.difficulty].aval, t: 0 };
  B.emit('lawine', {}); S7.splash('LAWINE!', 2.2, { big: true });
  S7.barkLine('dagny', 'Tuck. Tuck. TUCK.', 2.4);
});
B_('slowjump', function* (B) { const G = B.G(); G.slowmo = .6; B.emit('slowmo', {}); yield .6; G.slowmo = 0; });
B_('gondola', function* (B) {
  const G = B.G(), A = S7.W;
  B.emit('gondolaStart', {});
  yield B.say([['mireille', 'A glass box on a wire, over a valley, in a storm. Very discreet.']]);
  const e = A.rails.byId['gs-gl'], at = () => G.walker.s / e.len;
  const crawl = (dir = 1) => { const s = G.walker.s + dir * 26 * 16; const en = S7.spawnEnemy('crawler', 0, 0, 0, { revealed: 0 }); en.track = { edge: 'gs-gl', s: Math.max(0, Math.min(e.len, s)), speed: 40, dz: 2.6 }; };
  const downCab = () => { const en = S7.spawnEnemy('snowballer', 0, 0, 0, {}); en.track = { edge: 'gs-gl', s: Math.min(e.len, G.walker.s + 60 * 16), speed: -160, dy: 12 * 16, dz: -1.2, pass: true }; en.cabin = true; };
  yield () => at() > .08; crawl(1);
  yield () => at() > .16; downCab();
  yield () => at() > .24; crawl(1); crawl(-1);
  yield () => at() > .32; downCab();
  yield () => at() > .4; for (const sd of [-1, 1]) { const en = S7.spawnEnemy('giggler', 0, 0, 0, { revealed: 1 }); en.track = { edge: 'gs-gl', s: G.walker.s + sd * 2.2 * 16, speed: 0, dy: sd * 1.4 * 16, dz: 0, ride: true }; }
  yield () => at() > .48; downCab(); crawl(1);
  yield () => at() >= .55 && !S7.aliveEnemies().length || at() > .6;
  // the power cut
  G.flags.liftStop = 'gs-gl'; S7.setFlag('powerCut'); B.emit('powerCut', {}); S7.splash('THE POWER IS OUT.', 2);
  yield 1.2;
  yield B.say([['pim', '(on the roof, legs dangling) There were eight of us on the lift that day. The snow took seven.'], ['pim', 'Count again.'], ['holle', '(far away) ...hold on to the bar, children... hold on...']]);
  yield B.say([['ignaz', 'The pylon ahead. Three frozen insulators. I will need the scope.']]);
  yield () => S7.flag('ins1') && S7.flag('ins2') && S7.flag('ins3');
  B.emit('powerOn', {}); S7.splash('POWER.', 1.4); G.flags.liftStop = null;
  yield () => at() > .7; downCab(); crawl(1);
  yield () => at() > .82; crawl(1); crawl(-1);
  yield () => at() > .97;
  S7.setFlag('gondolaDone');
});
B_('ledger', function* (B) {
  B.emit('open', { screen: 'exposure', item: 'exp_ledger' });
  yield () => !S7.UIOPEN;
  yield B.say([['exposure', 'ACCOUNT 7 — HOLDER: H. HOLLE — CONTENTS: SEVEN (7) PERSONS, DECEASED 26.1.1926 — IN TRUST.'], ['mireille', 'We\'re in the vault.'], ['ignaz', 'We are the vault, mademoiselle.'], ['dagny', 'Don\'t read it twice. Reading twice is how you fall.']]);
});
/* ---- the epilogue (Room 7) ---- */
B_('t01_done', function* (B) {
  const G = B.G();
  yield 1;
  yield B.card('TARGET 01 — HANSI PULVER', 'ELIMINATED', 3.4, { target: true, who: 'hansi', dead: true });
  yield B.results(1);
  toRoom('room7', 'door'); S7.thawLeftBehind(null); G.flags.epilogue = true;
  B.cut(true); B.emit('fohnHere', {});
  yield B.cam({ shot: 'fixed', at: [5.6, 6.2, 1.9], look: [2.4, 3, 1], fov: 46 }, 999);
  yield 1;
  yield B.say([['fohn', 'Your move, Frau Holle. You lost a bishop. A very handsome bishop. Three gold medals.'], ['holle', 'I have seven more pieces.'], ['fohn', 'You have one piece, Holle. Wearing seven coats.'], ['fohn', 'Spring always comes. That\'s not a threat. It\'s a weather report.']]);
  B.emit('windowDrip', {}); yield 1.6;
  yield B.say([['rosalind', 'Draughty.']]);
  B.emit('fohnGone', {}); B.emit('phoneRing', {}); yield 1.2;
  yield B.say([['concierge', 'The Accord is signed. Nobody remembers signing it. Your next guest arrives with the thaw. Sleep well, Madame.']]);
  if (G.pins.length >= 7) yield B.say([['pim', 'Eight on the lift. Seven in the wardrobe. One in the bed. Now you\'ve counted right.']]);
  B.camOff();
  yield B.card('TARGET 02 — BLACK ICE', '', 3);
  yield B.card('THE SNOW WILL CONTINUE.', '', 3.4);
  B.cut(false);
  G.mode = 'end'; B.emit('credits', {});
});
