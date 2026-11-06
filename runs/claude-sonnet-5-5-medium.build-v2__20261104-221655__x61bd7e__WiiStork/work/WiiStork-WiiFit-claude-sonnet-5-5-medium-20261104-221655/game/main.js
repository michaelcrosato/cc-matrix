// main: game, shell, settings, scenes, deep links
(() => {
const E = My3D2dge, G = window.G;
const inSession = G.inSession;
for (const a of G.actList) G.scenes['act_' + a.id] = G.makeScene(a);
const theme = { ink: '#20404c', paper: '#f7fbfb', accent: '#14a8c8', muted: '#5f7f8a', danger: '#e0553a', line: '#c8dde2', font: 'system-ui, sans-serif', titleFont: 'system-ui, sans-serif' };
const sceneName = () => G.game && G.game.sceneName || '';
const game = new E.Game({
  canvas: 'screen', id: G.ID, res: 'ps1', expand: true, touch: 'never', input: G.INPUT, view: 'brawler',
  autoPause: !inSession, live: inSession, fullscreen: inSession ? false : 'button',
  menu: {
    quit: inSession ? false : 'title',
    items: inSession ? [] : [['Restart Session', () => { const n = sceneName(); if (/^act_/.test(n)) { G.game.resume(); G.game.go(n, G.lastActData || {}); } else G.game.resume(); }], ['Dev Mode', () => { G.game.resume(); G.dev && G.dev.open(); }]],
    settings: [
      { key: 'music', value: .1 }, { key: 'glyphs', value: 'playstation' },
      { key: 'voice', label: 'Voice', type: 'slider', value: 1, group: 'Sound', apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } },
      { key: 'gentle', label: 'Gentle Mode', type: 'toggle', value: false, group: 'Comfort', help: 'A larger ring and a calmer body', apply: (g, v) => { if (v && G.caption && g.sceneName && !/^(title)$/.test(g.sceneName)) G.caption(G.tareSay('gentle'), 'Tare', 4); } },
      { key: 'breathMode', label: 'Breath', type: 'select', value: 'Hold', options: [['Hold', 'Hold'], ['Toggle', 'Toggle']], group: 'Controller', help: 'Hold the breath button, or press it to switch' },
      { key: 'tips', label: "Tare's Tips", type: 'toggle', value: true, group: 'Comfort' }
    ],
    controls: { confirm: 'Confirm', cancel: 'Back', breath: 'Breathe / effort', catchL: 'Catch left', catchR: 'Catch right', jump: 'Jump', more: 'More', paceL: 'Pace left', paceR: 'Pace right', stepL: 'Step left', stepR: 'Step right', stepU: 'Step up', stepD: 'Step down', interact: 'Interact', retry: 'Retry',
      dvU: false, dvD: false, dvL: false, dvR: false, dvCL: false, dvCR: false, wL: false, wR: false, wU: false, wD: false, axL: false, axR: false, axU: false, axD: false, nL: false, nR: false, nU: false, nD: false, breathK: false, breathP: false, start: false }
  }
});
G.attach(game);
const _pause = game.pause.bind(game); game.pause = function () { if (G.S && !G.inSession) G.S.pauses = (G.S.pauses || 0) + 1; return _pause.apply(null, arguments); };
G.talk = G.makeTalk(game);
G.tare = new G.Tare();
let shell = null;
try { shell = new E.Shell(game, { theme }); } catch (e) { game.fail && game.fail('shell', e); }
if (typeof document !== 'undefined') document.addEventListener('pointerover', e => { const b = e.target.closest && e.target.closest('.esh-sh button:not(:disabled), .esh-sh input:not(:disabled)'); if (b && e.pointerType === 'mouse') b.focus({ preventScroll: true }); });
game.fadeTime = game.fadeTime;
game.debug = { snapshot() { const run = G.curRun, c = run && run.cs[0], S = G.S; return { scene: game.sceneName, activity: run ? run.def.id : null, tier: run ? run.tier : null, day: S.day, session: S.done, pct: c ? c.pct : null, stars: S.best, minutes: S.minutes, spineAge: G.spineAge(), lean: c ? [c.bal.p.x, c.bal.p.y] : null, source: c ? c.it.src : null, time: run ? run.time : null }; } };
G.boot = G.LINES.boot.map((t, i) => [t, () => { if (i === 0 && G.lib) G.lib(); }]);
G.start = () => { G.wrapDev(G.scenes); return game.start({ scenes: G.scenes, scene: inSession ? 'round' : 'title', boot: { title: G.TITLE, steps: G.boot } }); };
G.deepLink = () => {
  const h = (location.hash || '').replace(/^#/, '').split('/'); if (!h[0] || inSession) return;
  game.hook && 0;
  const go = () => {
    G.S.started = true; G.S.arrived = true; G.S.checked = true; if (!G.S.spine.length) G.S.spine = [71];
    if (h[0] === 'act' && G.acts[h[1]]) { G.noSave = true; game.go('act_' + h[1], { tier: +h[2] || 1, mode: 'free', back: 'title', skipCard: h[3] === 'go' }); }
    else if (h[0] === 'day') { G.S.day = +h[1] || 1; game.go('island'); }
    else if (h[0] === 'ending') { G.S.day = 5; game.go('ending'); }
    else if (h[0] === 'scene' && G.scenes[h[1]]) game.go(h[1]);
  };
  setTimeout(() => { if (game.booted && game.booted.then) game.booted.then(() => setTimeout(go, 50)); else go(); }, 0);
};
if (!window.__noStart) { G.start(); G.deepLink && G.deepLink(); if (inSession) G.hubInit(game); }
})();
