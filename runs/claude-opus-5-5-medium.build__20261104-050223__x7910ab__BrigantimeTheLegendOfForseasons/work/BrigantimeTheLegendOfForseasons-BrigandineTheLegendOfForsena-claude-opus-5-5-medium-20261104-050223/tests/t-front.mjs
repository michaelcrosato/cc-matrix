// prompts, attract, touch-only, dev mode, audio
export default async ({ boot, t, rd }) => {
  const { G, game } = boot(); const I = game.input, snap = () => game.debug.snapshot(), tap = (a, s = .2) => { I.tap(a); game.advance(s); };
  game.advance(.5);
  await t('prompts: PlayStation glyphs on a pad, Xbox with the setting, keys on a keyboard, mouse buttons', () => {
    I.lastDevice = 'gamepad'; game.settings.set('glyphs', 'playstation'); const ps = ['confirm', 'cancel', 'command', 'info'].map(G.ui.glyphLabel).join(''); if (ps !== '✕○□△') throw new Error(ps);
    game.settings.set('glyphs', 'xbox'); const xb = ['confirm', 'cancel', 'command', 'info'].map(G.ui.glyphLabel).join(''); if (xb !== 'ABXY') throw new Error(xb); game.settings.set('glyphs', 'playstation');
    I.lastDevice = 'keyboard'; if (G.ui.glyphLabel('confirm') !== 'Enter' || G.ui.glyphLabel('command') !== 'Space') throw new Error(G.ui.glyphLabel('confirm') + G.ui.glyphLabel('command'));
    I.lastDevice = 'mouse'; if (G.ui.glyphLabel('cancel') !== 'R-Click') throw new Error(G.ui.glyphLabel('cancel')); I.lastDevice = 'keyboard';
  });
  await t('attract: 10 s idle on the title starts it; a key returns to the title', () => { game.go('title', {}, { fade: 0 }); game.advance(10.6); if (snap().scene !== 'attract') throw new Error(snap().scene); game.advance(1); tap('confirm', .1); game.advance(.1); if (snap().scene !== 'title') throw new Error(snap().scene); });
  await t('attract: a full loop runs with no errors and reaches every beat', () => { game.errors.length = 0; game.go('attract', {}, { fade: 0 }); game.advance(.1); const beats = new Set(); for (let i = 0; i < 960; i++) { game.advance(.1); if (snap().attract.beat) beats.add(snap().attract.beat); } if (game.errors.length) throw new Error(game.errors[0].message); for (const b of ['wheel', 'summon', 'battle', 'graynight', 'logo']) if (!beats.has(b)) throw new Error('beat ' + b + ' of ' + [...beats]); game.go('title', {}, { fade: 0 }); game.advance(.2); });
  await t('touch-only: the notice shows, attract still starts, no scene has touch buttons', () => { G.forceTouchOnly = true; game.go('title', {}, { fade: 0 }); game.advance(.3); if (!snap().touchOnly) throw new Error('notice'); game.advance(10.5); if (snap().scene !== 'attract') throw new Error(snap().scene); for (const k in G.scenes) if (G.scenes[k].touch && G.scenes[k].touch.length) throw new Error(k); G.forceTouchOnly = false; game.go('title', {}, { fade: 0 }); game.advance(.2); });
  await t('dev: the panel opens from the pause menu items, a slider changes the outcome, reset restores', () => {
    G.makeCampaign({ realms: ['verdance'], seed: 4, skipPrologue: true }); game.go('battle', G.battleReq = { spec: G.quickBattleSpec('river_ford', 'summer'), back: 'title' }, { fade: 0 }); game.advance(.5);
    const item = G.pauseItems().find(i => i[0] === 'Dev Mode'); if (!item) throw new Error('no Dev Mode item'); item[1](); if (!G.dev.open || !G.run.dev) throw new Error('not open');
    const B = G.battle, a = B.sim.state.units[0], d = B.sim.state.units.find(u => u.side === 1), x = B.sim.physDmg(a, d, [a.cx, a.cy], null, 1)[1];
    G.devState.tab = 3; game.advance(.1); const L = G.devState.list, k = L.items.findIndex(r => r.slider === 'dmgScale'); L.i = k; for (let i = 0; i < 20; i++) { I.hold('right'); game.advance(.06); } I.hold('right', false); game.advance(.1);
    if (!(G.tune.dmgScale > 1.4)) throw new Error('slider ' + G.tune.dmgScale); const y = B.sim.physDmg(a, d, [a.cx, a.cy], null, 1)[1]; if (y <= x) throw new Error(x + ' ' + y);
    L.i = 0; tap('confirm'); if (G.tune.dmgScale !== 1) throw new Error('reset'); G.devState.tab = 0; game.advance(.1); const L0 = G.devState.list, gi = L0.items.findIndex(r => r.label === 'God mode'); L0.i = gi; tap('confirm'); if (!G.dev.god) throw new Error('god'); L0.i = gi; tap('confirm');
    G.devState.tab = 1; game.advance(.1); const L1 = G.devState.list; L1.i = L1.items.findIndex(r => r.label === 'Win now'); tap('confirm'); tap('cancel'); game.advance(1); if (!B.sim.state.over || B.sim.state.over.winner !== 0) throw new Error('win now'); if (game.errors.length) throw new Error(game.errors[0].message);
  });
  await t('audio: songs parse, every scene and season has music, every sound is defined, no audio files', () => {
    const tok = /^([A-G](#|b)?\d|-|\.|\||[ksohct])$/; for (const [id, s] of Object.entries(G.SONGS).concat(Object.entries(G.STINGS))) for (const tr of s.tracks) for (const x of tr.notes.split(/\s+/).filter(Boolean)) if (!tok.test(x)) throw new Error(id + ' token ' + x);
    for (const id of ['title', 'spring', 'summer', 'autumn', 'winter', 'battle_attack', 'battle_defend', 'hourless', 'boss', 'event', 'ending']) if (!G.SONGS[id]) throw new Error('song ' + id);
    const src = rd('dist/game.js'), used = [...src.matchAll(/G\.sfx\('([a-z_0-9]+)'/g)].map(m => m[1]), pre = Object.keys(game.audio.presets || {}); for (const u of used) if (!G.SFX[u] && !pre.includes(u)) throw new Error('sfx ' + u);
    if (/\.(mp3|wav|ogg|m4a)\b/.test(src)) throw new Error('audio file');
  });
};
