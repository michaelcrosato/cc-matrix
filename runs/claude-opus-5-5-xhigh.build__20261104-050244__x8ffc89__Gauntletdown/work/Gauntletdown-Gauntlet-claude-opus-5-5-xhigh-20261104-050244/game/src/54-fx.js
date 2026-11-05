/* ---- JUICE: what the sim says becomes particles, hit-stop, shake, flashes, sounds and barks (cosmetic: Math.random) ---- */
const local = h => h && !h.remote && W && W.role !== 'server';
const onScreen = q => !HEADLESS && q && W;
bus.on('throw', ({ h, kind }) => { if (local(h) || Math.random() < .4) sfx(kind === 'axe' ? 'axe' : kind === 'javelin' ? 'javelin' : kind === 'arrow' ? 'arrow' : 'hex', { vol: local(h) ? .9 : .4 }); });
bus.on('swing', () => sfx('swing'));
bus.on('meleeHit', ({ h, q, dmg }) => { game.hitFx(q.x, q.y, 14, { power: .7, angle: h.aim, damage: q.isGen || q.isBoss ? Math.round(dmg) : undefined, sound: 'thunk', textZ: 24 }); game.freeze(.035); });
bus.on('hit', ({ m, kind }) => { if (kind === 'shot') P.sparks(m.x, m.y, 12, 3, null, { color: '#ffe8b0' }); });
bus.on('shrink', ({ m }) => { P.smoke(m.x, m.y, 10, 3, { size: 1.6, color: '#d8d0e8' }); });
bus.on('clink', ({ m }) => { P.sparks(m.x, m.y, 16, 4, null, { color: '#d0d8ff' }); sfx('genhit', { pitch: 2 }); });
bus.on('kill', ({ m }) => {
  if (!m || !onScreen(m)) { return; }
  switch (m.ai) {
    case 'ghost': P.smoke(m.x, m.y, 12, 6, { size: 2, color: '#e0e8ff' }); sfx('ghostdie', { vol: .5 }); break;
    case 'melee': P.bits(m.x, m.y, 10, 6, ['#7a9070', '#5a3a1e', '#e8e0c8']); sfx('grunt', { vol: .6 }); if (Math.random() < .2) speak('urk', 'gnasher'); break;
    case 'imp': P.explosion(m.x, m.y, 8, .5, { debris: false, freeze: false, shake: 0 }); break;
    case 'fryar': P.smoke(m.x, m.y, 12, 8, { size: 2.4, color: '#4a3a5a' }); sfx('smoke'); break;
    case 'lobber': P.bits(m.x, m.y, 10, 6, ['#ffffff', '#c84a3a', '#e8b090']); sfx('grunt', { vol: .5, pitch: 1.3 }); break;
    case 'snatcher': P.bits(m.x, m.y, 10, 8, ['#8a7a50', '#b8a070']); sfx('giggle', { pitch: .7 }); break;
    case 'tithe': P.bits(m.x, m.y, 16, 14, ['#e8e0cc', '#ffffff', '#ff4a4a']); sfx('bones'); game.shake(4); game.flash('#ff2a2a', .08, .4); break;
  }
});
bus.on('ghostBite', ({ m }) => { P.smoke(m.x, m.y, 12, 5, { size: 2, color: '#c8d4ff' }); sfx('chomp', { vol: .6, pitch: .7 }); });
bus.on('hurt', ({ h, amount, kind }) => { if (kind === 'drain') { if (Math.random() < .1) sfx('drain'); return; } if (local(h)) { sfx('hit', { vol: .8 }); if (amount > 8) game.shake(2); h.input && h.input.rumble && h.input.rumble(.3, .12); bark(h, 'hurt'); } P.sparks(h.x, h.y, 14, 4, null, { color: '#ff6a4a' }); });
bus.on('fall', ({ h }) => { P.smoke(h.x, h.y, 10, 10, { size: 2.4, color: '#d8e0f0' }); sfx('die'); if (local(h)) game.flash('#ff2a2a', .12, .5); });
bus.on('rise', ({ h }) => { P.glints(h.x, h.y, 16, 10, '#ffe08a', 14); sfx('rise'); bark(h, 'join'); });
bus.on('eat', ({ h, it, heal }) => { P.bits(it.x, it.y, 8, 8, ['#c8803a', '#e8b060', '#8a4a1e']); P.text(h.x, h.y, 34, '+' + Math.round(heal), '#9aff8a', { bounce: true }); sfx('chomp'); });
bus.on('stew', ({ h }) => { sfx('gurgle'); P.smoke(h.x, h.y, 20, 4, { size: 1.6, color: '#9ae84a' }); });
bus.on('take', ({ h, it }) => {
  const k = it.D.kind;
  if (k === 'key') sfx('jingle'); else if (k === 'flask') sfx('flask'); else if (it.type === 'gold') sfx('coins'); else if (it.type === 'gem') sfx('gem'); else if (it.type === 'crown' || k === 'gauntlet') sfx('crown');
  else if (k === 'special') sfx('special'); else if (k === 'amulet') sfx('amulet'); else if (k === 'chest') { sfx('chest'); P.bits(it.x, it.y, 10, 12, ['#f0c030', '#fff0a0']); }
  if (k === 'treasure' || k === 'chest') P.glints(it.x, it.y, 8, 6, '#fff0a0', 10);
  if (it.D.points && k !== 'food') P.text(it.x, it.y, 20, String(it.D.points), '#ffe08a', { bounce: false });
  if (k !== 'food' && k !== 'treasure' && Math.random() < .5) bark(h, 'pick');
});
bus.on('shotItem', ({ it }) => { if (it.type === 'flask') return; sfx(it.type === 'stew' ? 'gurgle' : 'splat'); P.bits(it.x, it.y, 6, 10, it.type === 'stew' ? ['#7ab83a', '#4a7a1a'] : ['#c87a3a', '#e8c890', '#ffffff']); });
bus.on('cooked', ({ it }) => { P.smoke(it.x, it.y, 6, 6, { size: 1.6, color: '#3a2a2a' }); sfx('fireball', { vol: .5 }); });
bus.on('magic', ({ h, x, y, r }) => { game.flash('#ffffff', .18, .9); game.shake(5); sfx('blast'); P.ring(x, y, 6, r || 220, '#ffffff', .6); P.ring(x, y, 4, (r || 220) * .7, '#b8d8ff', .5); bark(h, 'magic'); });
bus.on('magicLocal', ({ h }) => { game.flash('#ffffff', .12, .6); sfx('blast'); P.ring(h.x, h.y, 6, 200, '#ffffff', .6); });
bus.on('genHit', ({ g }) => { if (Math.random() < .5) sfx('genhit'); P.bits(g.x, g.y, 8, 3, ['#8a7a6a', '#5a4a3a']); });
bus.on('genDead', ({ g }) => { if (!onScreen(g)) return; P.explosion(g.x, g.y, 6, .8, { freeze: false, shake: 3 }); P.bits(g.x, g.y, 10, 16, ['#8a7a6a', '#5a4a3a', '#c8b8a0']); sfx('crumble'); game.shake(3); });
bus.on('spawn', ({ m, gen }) => { if (gen && onScreen(m)) { P.dust(m.x, m.y, 0, 5); if (Math.random() < .3) sfx('spawn'); if (m.ai === 'snatcher') sfx('giggle'); } });
bus.on('door', ({ d }) => { sfx('door'); for (const [cx, cy] of d.cells) P.dust(mid(cx), (cy + 1) * T, 0, 4); });
bus.on('wall', ({ cx, cy, kind }) => { P.dust(mid(cx), mid(cy), 4, 12); P.bits(mid(cx), mid(cy), 10, 10, ['#8a7a64', '#5a4a3a']); sfx(kind === 'fake' ? 'secret' : 'crumble'); if (kind === 'fake') P.glints(mid(cx), mid(cy), 12, 10, '#ffffff', 10); });
bus.on('crack', ({ cx, cy }) => { P.bits(mid(cx), mid(cy) + 8, 12, 3, ['#8a7a64', '#5a4a3a']); sfx('genhit', { pitch: .7, vol: .6 }); });
bus.on('trap', ({ p }) => { sfx('trap'); game.shake(5); for (const t of W.p.trapWalls[p.kind]) P.dust(mid(t.cx), mid(t.cy), 2, 8); });
bus.on('teleport', ({ h, from, to }) => { sfx('warp'); P.glints(mid(from.cx), mid(from.cy), 4, 10, '#8afff4', 12); P.glints(mid(to.cx), mid(to.cy), 4, 10, '#8afff4', 12); });
bus.on('stun', ({ h }) => { sfx('stun'); P.sparks(h.x, h.y, 4, 6, null, { color: '#ff4a6a' }); });
bus.on('zap', ({ b }) => { sfx('zap'); P.sparks(b.x, b.y, 10, 8, null, { color: '#9afff8' }); });
bus.on('spiked', ({ b }) => { sfx('shing'); P.sparks(b.x, b.y, 4, 5, null, { color: '#e8ecf4' }); });
bus.on('bell', ({ h }) => { sfx('bell'); if (W.bell) W.bell.swing = 1; });
bus.on('stolen', ({ m }) => { sfx('giggle'); speak('hee hee', 'snatcher'); });
bus.on('escaped', ({ m }) => { P.smoke(m.x, m.y, 8, 6, { size: 1.8 }); sfx('giggle', { pitch: 1.3 }); });
bus.on('tithePaid', ({ m }) => { P.smoke(m.x, m.y, 16, 12, { size: 2.6, color: '#2a1a2a' }); sfx('drone'); });
bus.on('lob', () => sfx('whistle', { vol: .5 }));
bus.on('spit', () => sfx('fireball', { vol: .6 }));
bus.on('blink', ({ m, out }) => { P.smoke(m.x, m.y, 10, 6, { size: 2, color: '#5a4a6a' }); if (Math.random() < .4) sfx('blink'); if (!out && Math.random() < .2) speak('frying', 'fryar'); });
bus.on('shatter', ({ x, y, kind }) => { sfx('shatter', { vol: .6 }); P.bits(x, y, 2, 8, kind === 'plate' ? ['#ffffff', '#c8c8d4'] : ['#8a4a2a', '#d08a4a']); P.dust(x, y, 0, 4); });
bus.on('hexBurst', ({ x, y }) => { P.ring(x, y, 2, 12, '#d070ff', .25); });
bus.on('allyStun', ({ h }) => { sfx('stun', { pitch: 1.4 }); });
bus.on('windup', ({ m }) => { if (m.isBoss) sfx('roar', { vol: .4, pitch: 1.4 }); });
bus.on('descend', () => sfx('stairs'));
bus.on('impatience', ({ stage }) => { sfx(stage === 2 ? 'door' : 'trap'); if (stage === 3) game.flash('#ffd060', .1, .3); });
bus.on('hoardShut', () => { sfx('stomp'); game.shake(4); });
bus.on('stomp', ({ K }) => { sfx('stomp'); game.shake(6); P.ring(K.x, K.y, 10, 60, '#ffd060', .4); P.dust(K.x, K.y, 0, 14); });
bus.on('plates', () => sfx('plate'));
bus.on('kingEats', () => { sfx('chew'); speak('nom nom nom', 'king', { max: 3 }); });
bus.on('kingAte', ({ it }) => { sfx('chew'); P.bits(it.x, it.y, 12, 10, ['#c8803a', '#e8b060']); });
bus.on('roar', () => { sfx('roar'); game.shake(4); });
bus.on('charge', () => sfx('roar', { pitch: 1.2 }));
bus.on('fog', ({ K }) => { sfx('drone'); for (let i = 0; i < 20; i++) P.add({ kind: 'smoke', x: K.x + Math.cos(K.fog.a) * i * 6, y: K.y + Math.sin(K.fog.a) * i * 6, z: 20, vz: 2, max: 3, color: '#5a7a3a' }); });
bus.on('wave', () => sfx('trap', { vol: .5 }));
bus.on('boss', ({ phase }) => { if (phase > 1) { sfx('roar'); game.shake(6); } const S2 = A.song; if (S2) { A.layer('p2', phase >= 2 ? 1 : 0, 1); A.layer('p3', phase >= 3 ? 1 : 0, 1); } });
bus.on('bossHit', ({ K, amount }) => { if (Math.random() < .3) P.text(K.x, K.y, 46, String(Math.round(amount)), '#ffe08a', { bounce: true }); P.sparks(K.x, K.y, 30, 3, null, { color: '#e8c0ff' }); });
bus.on('bossDead', ({ K }) => { sfx('collapse'); game.shake(10); game.flash('#ffffff', .3, 1); P.bits(K.x, K.y, 30, 40, ['#f0e8d4', '#ffffff', '#e8c040']); });
bus.on('gauntletDrop', ({ K }) => { sfx('crown'); P.glints(K.x, K.y, 20, 30, '#ffe08a', 30); });
bus.on('kingSays', ({ text }) => { speak(text, 'king'); KING_LINE.text = text; KING_LINE.end = game.real + 3.2; });
const KING_LINE = { text: '', end: 0 };
bus.on('points', ({ h, points, why }) => { if (why === 'exit' || why === 'hoard' || why === 'king') P.text(h.x, h.y, 40, '+' + points, '#ffe08a', { scale: 2, bounce: true }); });
