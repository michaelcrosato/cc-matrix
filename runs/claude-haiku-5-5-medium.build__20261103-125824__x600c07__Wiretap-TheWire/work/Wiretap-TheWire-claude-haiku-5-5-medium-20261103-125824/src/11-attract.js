// Attract mode (PLAN §10): a bot plays the field from a script, with captions. It cheats: its watchers never look.
// Any input returns to the title. Nothing it does is saved (ATTRACT.on blocks saves).
const ATTRACT = {
  on: false, stashed: null, steps: [], i: 0, t: 0, goal: null, watchId: null, shot: false, badge: 0, caption: '', current: null,
  reel: [
    { name: 'THE CORNER', steps: [
      { caption: 'The corner keeps its hours. The detail keeps its own.', walk: [36, 26] },
      { wait: 6 },
    ] },
    { name: 'EYES ON', steps: [
      { caption: 'Take the faces. Read the jobs. Stay unseen.', walk: [36, 31] },
      { watch: 'tee', s: 1.6 }, { photo: true },
      { watch: 'rook', s: 1.6 }, { photo: true },
      { watch: 'pigeon', s: 1.6 }, { photo: true },
      { wait: 2 },
    ] },
  ],
  vignette: 0,
  bot: {
    ground: () => {
      const g = ATTRACT.goal;
      if (!g) return [0, 0];
      const dx = g[0] - DANA.x, dy = g[1] - DANA.y, d = Math.hypot(dx, dy);
      if (d < 4) return [0, 0];
      const dir = FLOW ? FLOW.dir(DANA.x, DANA.y, g[0], g[1]) : [dx / d, dy / d];
      return [dir[0] * .85, dir[1] * .85];
    },
    down: a => a === 'watch' && !!ATTRACT.watchId,
    pressed: a => a === 'photo' && ATTRACT.shot,
    reticleAt: () => {
      const p = ATTRACT.watchId && PEOPLE.find(q => q.id === ATTRACT.watchId);
      return p ? [p.x, p.y] : null;
    },
  },
  start() {
    this.vignette = 0; this.begin(this.reel[0]);
  },
  begin(v) {
    this.steps = v.steps.map(s => Object.assign({}, s, { done: false }));
    this.i = 0; this.caption = v.name; this.enter();
  },
  enter() {
    this.t = 0; this.goal = null; this.watchId = null;
    const st = this.steps[this.i];
    this.current = st || null;
    if (!st) return;
    if (st.caption) this.caption = st.caption;
    if (st.walk) this.goal = cellWorld(st.walk);
    if (st.watch) this.watchId = st.watch;
  },
  next() {
    this.i++;
    if (this.i >= this.steps.length) {                  // the vignette ends: loop the reel
      this.vignette = (this.vignette + 1) % this.reel.length;
      this.begin(this.reel[this.vignette]);
      return;
    }
    this.enter();
  },
  update(dt) {
    const cur = this.current;
    this.t += dt;
    this.shot = !!(cur && cur.photo && !cur.done && this.t > .3);     // the shutter fires once, mid-step
    if (this.shot) cur.done = true;
    fieldUpdate(dt, this.bot, { cheat: true, silent: true, interacts: [] });
    this.shot = false;
    if (!cur) { this.next(); return; }
    if (cur.walk) { const [x, y] = cellWorld(cur.walk); if (Math.hypot(x - DANA.x, y - DANA.y) < 8) this.next(); }
    else if (cur.watch) { if (this.t >= cur.s) this.next(); }
    else if (cur.photo) { if (cur.done) this.next(); }
    else if (cur.wait) { if (this.t >= cur.wait) this.next(); }
    this.badge = (this.badge + dt) % 1;
  },
  draw(r) {
    const H = Math.round(r.H * .07);
    r.overlay(g => {
      E.px.rect(g, 0, 0, r.W, H, '#000000');
      E.px.rect(g, 0, r.H - H, r.W, H, '#000000');
    });
    r.text('DEMO', 10, H + 8, '#ffb347', { shadow: '#000' });
    r.text(this.caption, r.W / 2, r.H - H - 26, '#f2ece0', { align: 'center', shadow: '#000' });
    if (this.badge < .6) r.text('PRESS ' + glyph(game, 'confirm').toUpperCase() + ' TO PLAY', r.W / 2, r.H - H - 12, '#ffffff', { align: 'center', shadow: '#000' });
  },
};
