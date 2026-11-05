/* ---- ABOUT & CREDITS: the run's record, in the game ---- */
const ABOUT = window.SOP_ABOUT || [];   // filled by about.js (the same text as the exit interview)
let aboutMenu = null, aboutPage = 0, aboutFrom = 'title', aboutScroll = 0;
const about = {
  enter(d = {}) {
    aboutFrom = d.from || 'title'; aboutPage = 0; aboutScroll = 0; L.enabled = false; game.weather = null;
    aboutMenu = new E.Menu(game, ABOUT.map(p => p.title).concat(['BACK']), { x: 8, y: 40, onPick(i) { if (i >= ABOUT.length) game.go('title'); }, onCancel() { game.go('title'); },
      onMove(i) { if (i < ABOUT.length) { aboutPage = i; aboutScroll = 0; } } });
    aboutMenu.bg = '#140c0a'; aboutMenu.border = '#c8a060';
  },
  update(dt) {
    aboutMenu.update(dt); if (aboutMenu.i < ABOUT.length) aboutPage = aboutMenu.i;
    const pa = padAim(); if (pa) aboutScroll = Math.max(0, aboutScroll + pa[1] * 120 * dt);
    if (input.down('heavy') || input.down('brake')) aboutScroll += 80 * dt;
    if (input.down('breathe') && !input.down('brake')) aboutScroll = Math.max(0, aboutScroll - 80 * dt);
    const z = input.zoom ? input.zoom() : 1; if (z !== 1) aboutScroll = Math.max(0, aboutScroll + (z < 1 ? 20 : -20));
  },
  draw(r) {
    r.sky(['#120806', '#241410']);
    const p = ABOUT[aboutPage] || { title: '', lines: [] };
    r.overlay(g => {
      E.font.title(g, 'ABOUT & CREDITS', r.W / 2, 8, { scale: 2, align: 'center', colors: ['#fff6e0', '#e8c070'] });
      const x = 128, w = r.W - x - 10, top = 34, h = r.H - top - 26;
      E.ui.box(g, x - 6, top - 4, w + 10, h + 8, { bg: ['#1e1410', '#0c0806'], border: '#6a5a4a' });
      g.save(); g.beginPath(); g.rect(x - 4, top - 2, w + 6, h + 4); g.clip();
      let y = top + 2 - Math.round(aboutScroll);
      for (const line of p.lines) {
        const head = line.startsWith('#'), txt = head ? line.slice(1).trim() : line;
        const wr = E.font.wrap(txt, w - 4);
        for (const l of wr) { E.font.text(g, l, x, y, head ? '#f0c860' : '#e8e0d0', { shadow: '#000', outline: false }); y += 10; }
        y += head ? 2 : 4;
      }
      g.restore();
      const total = y + Math.round(aboutScroll) - top; if (aboutScroll > total - h) aboutScroll = Math.max(0, total - h);
      promptRow(g, r.W / 2, r.H - 16, [['up', 'Page'], ['heavy', 'Scroll'], ['cancel', 'Back']], { center: true });
    });
    aboutMenu.draw(r);
  }
};

/* ---- AI HUB: Session Protocol v1, ghost mode. Every copy runs its own Collection Run; the other players show as ghosts ---- */
let hubInfo = null, hubEnded = false, hubProgT = 0, hubSendT = 0, hubResultSent = false;
const ghosts = {}, ghostRigs = {};
function hubCountdown() {
  if (!HUB || !window.AIHub) return 0;
  const t = AIHub.time(); return t === -Infinity ? 99 : t < 0 ? -t / 1000 : 0;
}
function hubStart() {
  AIHub.on('message', (d, from) => { if (d && d.k === 'g') ghosts[from] = Object.assign(ghosts[from] || {}, d, { at: game.real }); });
  AIHub.on('leave', ({ id }) => { delete ghosts[id]; });
  AIHub.on('time-up', () => { if (S && S.mode === 'run' && !runOver) endRun(); else hubResult(); });
  AIHub.on('end', () => { hubEnded = true; hubResult(); try { audio.music(null); audio.setVolume(0); } catch (e) { /* none */ } input.clear(); game.after(.1, () => game.stop()); });
  AIHub.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    hubInfo = info;
    if (!info) { game.go('title'); return; }
    const len = info.limitMs ? Math.max(20, Math.min(180, info.limitMs / 1000 - 4)) : 180;
    newRun(len);
    AIHub.ready();
  }).catch(() => game.go('title'));
}
function hubTick(dt) {
  if (!hubInfo || hubEnded) return;
  if ((hubProgT -= dt) <= 0) { hubProgT = 1; AIHub.progress({ score: S.money, label: fmt$(S.money) }); }
  if ((hubSendT -= dt) <= 0 && hubCountdown() <= 0) {
    hubSendT = .12;
    AIHub.send({ k: 'g', x: Math.round(hero.x), y: Math.round(hero.y), f: +hero.facing.toFixed(2), d: driving ? 1 : 0, a: +car.angle.toFixed(2), area: A.id, m: S.money }, { reliable: false });
  }
}
function hubResult() {
  if (hubResultSent || !HUB || !hubInfo) return; hubResultSent = true;
  AIHub.result({ score: S ? S.money : 0, stats: { 'Guys put down': S ? S.kos : 0 } });
}
function drawGhosts(r) {
  if (!hubInfo) return;
  for (const id in ghosts) {
    const gh = ghosts[id]; if (gh.area !== A.id || game.real - gh.at > 3) continue;
    const pl = (hubInfo.players || []).find(p => String(p.id) === String(id)) || { name: 'P' + id, color: '#ffffff' };
    if (gh.d) { drawCar(r, null, gh.x, gh.y, 0, gh.a, pl.color, 'suv', {}); }
    else {
      const rig = ghostRigs[id] || (ghostRigs[id] = rigOf(Object.assign({}, LOOKS.tony, { colors: Object.assign({}, LOOKS.tony.colors, { cloth: pl.color }) })));
      const vx = gh.px !== undefined ? (gh.x - gh.px) * 8 : 0, vy = gh.py !== undefined ? (gh.y - gh.py) * 8 : 0; gh.px = gh.x; gh.py = gh.y;
      rig.update(1 / 60, { x: gh.x, y: gh.y, z: 0, vx, vy, facing: gh.f });
      r.actor(gh.x, gh.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { alpha: .5 });
    }
    r.textAt(gh.x, gh.y, 50, pl.name + ' ' + fmt$(gh.m || 0), pl.color);
  }
}
const hubwait = {
  update() {}, draw(r) { r.sky(['#0a0406', '#1a0c0c']); r.text('THE SOPRANIACS', r.W / 2, r.H / 2 - 20, '#e83a3a', { align: 'center', scale: 2 }); r.text('Joining the AI Hub session...', r.W / 2, r.H / 2 + 10, '#e8e0d0', { align: 'center' }); }
};
