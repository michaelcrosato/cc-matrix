/* OLYMPIYIKES! — start: the router scene, deep links, game.debug, the 10-foot stylesheet, the boot, the hub. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game;

/* the router: the first scene; reads the deep link (#ev/<id>, #scene/<name>, #attract, #poselab/<pose>, #games/day/<n>, #touch) */
O.scene('start', {
  lock: 0,
  enter() { this.t = 0; },
  update(dt) {
    this.t += dt; if (this.t < .05) return;
    if (O.inHub) { if (O.Hub.info) { if (!O.hubReadySent) { O.hubReadySent = true; window.AIHub.ready(); } game.go('hubCard', {}, { fade: 0 }); } else if (O.hubFailed) game.go('title', {}, { fade: 0 }); return; }
    const h = (typeof location !== 'undefined' && location.hash || '').replace(/^#/, '').split('/');
    if (h[0] === 'ev' && O.EVENTS[h[1]]) { if (h[2] === 'auto') O.Dev.cheats.autopilot = true; O.meet = O.flow.quickMeet(h[1]); O.flow.begin(O.meet); return game.go('ev:' + h[1], {}, { fade: 0 }); }
    if (h[0] === 'scene' && O.SCENES[h[1]]) { if (!O.meet && ['dayCard', 'eventCard', 'medals', 'podium', 'opening', 'closing', 'beat', 'results'].includes(h[1])) { O.Dev.jump(h[1] === 'beat' ? 'beat:after6' : h[1] === 'closing' ? 'closing:1' : h[1] === 'podium' ? 'podium' : h[1] === 'medals' ? 'medals' : h[1] === 'opening' ? 'opening' : 'day:1'); return; } return game.go(h[1], {}, { fade: 0 }); }
    if (h[0] === 'attract') { game.go('title', {}, { fade: 0 }); return game.after(.05, () => O.Attract.start()); }
    if (h[0] === 'poselab') return game.go('poselab', { pose: h[1] }, { fade: 0 });
    if (h[0] === 'games' && h[1] === 'day') return O.Dev.jump('day:' + (+h[2] || 1));
    if (h[0] === 'dev' && h[1]) { O.Dev.jump(decodeURIComponent(h.slice(1).join('/'))); return; }
    if (h[0] === 'touch') O.forceTouchOnly = true;
    game.go('title', {}, { fade: 0 });
  },
  draw(r) { r.sky(['#0b0f24', '#0b0f24', '#18204a']); }
});

/* the event scenes wait through a hub slot's GET READY */
for (const id in O.EVENTS) { const sc = O.SCENES['ev:' + id], up = sc.update; sc.update = function (dt) { if (O.ctx && O.ctx.hub && O.Hub && O.Hub.info && O.Hub.hold(O.ctx)) { O.sceneT += dt; return; } return up.call(this, dt); }; }

/* game.debug: the handle tests and tools read */
game.debug = {
  snapshot() {
    const c = O.ctx, m = O.meet, onEv = !!(c && game.sceneName && game.sceneName.startsWith('ev:'));
    return { scene: game.sceneName, mode: m ? m.mode : null, day: m ? m.day : null, event: onEv ? c.def.id : null, phase: onEv ? c.phase : null, attempt: onEv ? c.attempt : null, round: onEv ? c.round : null,
      athletes: onEv ? c.athletes.map(a => ({ id: a.id, human: a.human, hype: +a.hype.toFixed(2), best: a.best == null ? null : +(+a.best).toFixed(3), notes: a.notes.slice(), attempts: a.attempts.length })) : [],
      results: m && m.lastResults ? m.lastResults.rows.map(r => [r.a.id, r.v, r.rank]) : null, medals: m ? m.medals : null, torches: m ? m.torches : null,
      hub: O.Hub.info ? { slot: O.Hub.slot, total: O.Hub.total, sent: O.Hub.sent, events: O.Hub.events } : null, dev: { open: O.Dev.isOpen, changed: O.tune.changed().length }, attract: O.Attract.on, errors: game.errors.length };
  }
};
window.__oly = O;

/* the 10-foot stylesheet over the engine's HTML screens (pause, settings, controls): bigger, gold on navy */
if (typeof document !== 'undefined' && document.head && document.createElement) {
  try {
    const st = document.createElement('style');
    st.textContent = '.esh{font-size:clamp(16px,1.55vw,30px)!important}.esh button{font-size:1.15em;min-height:2.6em;padding:.6em 1em}.esh h2{font-size:2em}.esh-mod{width:min(820px,94vw)!important}.esh input[type=range]{width:min(320px,30vw);height:2.2em}' +
      ':root{--esh-accent:#f2b632;--esh-paper:rgba(12,16,40,.94)}.esh button:focus,.esh button:hover{outline:3px solid #f2b632}.esh .esh-m{font-size:.62em!important}.esh .esh-k{font-size:.55em!important}.esh kbd{font-size:.7em!important}.esh small{font-size:.62em!important;line-height:1.3}.esh output{font-size:.7em!important}';
    document.head.appendChild(st);
  } catch (e) { /* headless */ }
}

/* boot: build the venues behind the boot screen; in a hub session, connect first */
O.tune.load();
const steps = [
  ['Inflating the blimp', () => { O.Stadium.build(); }],
  ['Waxing the skis', () => { O.Pool.build(); }],
  ['Teaching the crowd to wave', () => { O.Records.all(); }],
  ['Calming the mascot', () => { O.Art.mascot(); }]
];
if (O.inHub) steps.unshift(['Joining the heats', () => O.Hub.connect().then(info => { if (!info) { O.inHub = false; O.hubFailed = true; } }).catch(() => { O.inHub = false; O.hubFailed = true; })]);
game.start({ scenes: O.SCENES, scene: 'start', boot: { title: 'OLYMPIYIKES!', steps, messages: ['Inflating the blimp', 'Waxing the skis', 'Teaching the crowd to wave', 'Calming the mascot'] } });
})();
