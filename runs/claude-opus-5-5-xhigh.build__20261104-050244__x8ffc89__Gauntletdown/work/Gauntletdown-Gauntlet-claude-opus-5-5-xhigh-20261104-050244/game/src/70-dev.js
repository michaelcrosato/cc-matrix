/* ---- DEV TOOLS (pause menu; never in sessions or the attract mode): cheats, warp, give and spawn, live tuning ---- */
game.settings.define({ key: 'dev_type', group: 'Dev spawn', label: 'Monster', options: all('monsters').map(m => [m.id, m.name]), value: 'gnasher' });
game.settings.define({ key: 'dev_rank', group: 'Dev spawn', label: 'Rank', options: [[1, 'I'], [2, 'II'], [3, 'III']], value: 3 });
game.settings.define({ key: 'dev_gen', group: 'Dev spawn', label: 'Generator', options: all('gens').filter(g => !g.onTable).map(g => [g.id, g.name]), value: 'den' });
game.settings.define({ key: 'dev_bot', group: 'Dev cheats', label: 'Bot plays player 1', type: 'toggle', value: false, apply: (g, v) => { const h = W && W.heroes[0]; if (h && !SESSION && !RUN_DEMO()) h.bot = v ? makeBot({ cheat: false }) : null; } });
game.settings.reset('Dev cheats');
const dev = fn => () => { if (W) W.devUsed = true; if (RUN) RUN.dev = true; fn(); game.shell.show(game.shell.screen); };
const devAt = () => { const h = W.heroes.find(q => q.alive) || W.heroes[0]; return h; };
function warpTo(index, o = {}) { game.resume(); if (RUN) RUN.dev = true; game.go('play', Object.assign({ floor: index, card: false, prev: index - 1 }, o)); }
function warpBoss(phase) {
  warpTo(FLOOR_ORDER.indexOf('f9'));
  game.after(.05, () => { const K = W && W.boss; if (!K) return; K.phase = 1; K.hp = K.max * (phase === 2 ? .69 : .34); });
}
function devTools() {
  const S = game.shell;
  S.show('dev', { kicker: 'Pause', title: 'Dev Tools', text: 'Testing tools. While a cheat is on the HUD shows DEV and high scores are not kept.', actions: () => [
    ['Cheats', () => S.show('dev-cheats', { kicker: 'Dev Tools', title: 'Cheats', rows: CHEAT_SPEC.map(c => 'cheat_' + c[0]).concat('cheat_timescale', 'dev_bot'), actions: [['Back', () => S.back()]] })],
    ['Warp', () => S.show('dev-warp', { kicker: 'Dev Tools', title: 'Warp', actions: () => [
      ...FLOOR_ORDER.map((id, i) => { const F = get('floors', id); return [F.treasure ? (id === 't1' ? 'Treasure Room I' : 'Treasure Room II') : F.boss ? 'Floor 9: the Banquet' : 'Floor ' + F.no + ': ' + F.name.toLowerCase(), () => warpTo(i)]; }),
      ['Boss phase 2', () => warpBoss(2)], ['Boss phase 3', () => warpBoss(3)],
      ['Ending', () => { game.resume(); RUN.dev = true; game.go('ending'); }], ['Game over', () => { game.resume(); RUN.dev = true; game.go('over'); }],
      ['Descent II', () => { game.resume(); RUN.dev = true; descentTwo(); }], ['Restart floor', () => warpTo(W.index)], ['Back', () => S.back()]] })],
    ['Give and spawn', () => S.show('dev-give', { kicker: 'Dev Tools', title: 'Give and spawn', rows: ['#Spawn', 'dev_type', 'dev_rank', 'dev_gen'], actions: () => [
      ['Spawn 5 here', dev(() => { const h = devAt(); for (let i = 0; i < 5; i++) spawnMonster(game.settings.dev_type, h.x + Math.cos(i * 1.3) * 40, h.y + Math.sin(i * 1.3) * 40, +game.settings.dev_rank, { rise: .4 }); })],
      ['Spawn a generator here', dev(() => { const h = devAt(); addGen(game.settings.dev_gen, h.x + 40, h.y, +game.settings.dev_rank); })],
      ['+3 keys', dev(() => { for (const h of W.heroes) h.keys = Math.min(heroLimit(h), h.keys + 3); })],
      ['+3 flasks', dev(() => { for (const h of W.heroes) h.flasks = Math.min(heroLimit(h), h.flasks + 3); })],
      ['A roast', dev(() => { const h = devAt(); addItem('roast', h.x + 20, h.y); })], ['A spoiled stew', dev(() => { const h = devAt(); addItem('stew', h.x + 20, h.y + 10); })],
      ...all('amulets').map(a => ['Amulet: ' + a.name.toLowerCase(), dev(() => { const h = devAt(); h.amulet = { type: a.id, t: AMULET_TIME }; })]),
      ['Every special potion', dev(() => { for (const h of W.heroes) for (const s of all('specials')) h.specials[s.id] = true; })],
      ['+1000 score', dev(() => { for (const h of W.heroes) h.score += 1000; })], ['Heal the party', dev(() => { for (const h of W.heroes) { if (!h.alive) rise(h); h.hp = Math.max(h.hp, startHealth()); } })],
      ['Kill all monsters', dev(() => { for (const m of W.monsters) if (!m.dead) killMonster(m, null, 'magic'); })],
      ['Destroy all generators', dev(() => { for (const g of W.gens) if (!g.dead) hurtGen(g, 999, null); })],
      ['Open every door', dev(() => { for (const d of W.doors) openDoor(d, null); })],
      ['Reveal secrets', dev(() => { for (const k of [...W.fake]) { const [cx, cy] = k.split(',').map(Number); revealFake(cx, cy, null); } })],
      ['Next impatience stage', dev(() => { W.t = Math.max(W.t, [TUNE.impatience - 30, TUNE.impatience, TUNE.impatience + 60][Math.min(2, W.impatience)]); })],
      ['Start the attract mode now', () => { game.resume(); game.go('attract'); }], ['Back', () => S.back()]] })],
    ['Tuning', () => S.show('dev-tuning', { kicker: 'Dev Tools', title: 'Tuning', text: 'Live: each slider changes the game at once, and is kept.', rows: TUNE_SPEC.map(t => 'tune_' + t[0]), actions: [['Reset tuning to defaults', () => { resetTuning(); S.show('dev-tuning'); }], ['Back', () => S.back()]] })],
    ['Back', () => S.back()]] });
}
