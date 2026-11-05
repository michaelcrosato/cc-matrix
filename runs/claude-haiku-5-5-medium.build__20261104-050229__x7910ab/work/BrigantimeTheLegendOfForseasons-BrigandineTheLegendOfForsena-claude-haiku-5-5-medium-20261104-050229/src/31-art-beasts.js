// Beast rigs: the monsters that are animals rather than blobs or skeletons. Four bodies: a quadruped (four legs, a tail,
// ears), a drake (a long neck, a head with horns, two wings, two legs), an avian (round body, feathered wings, a beak) and
// a serpent (a body of segments moving in a wave). They share the interface of the engine's rigs: update(dt, state) poses
// them from plain state (walk, flap, facing), draw(g, ox, oy, view) draws inside r.actor, and drawPortrait(g, x, y, size)
// draws one still. Everything is drawn with the engine's pixel primitives: no image files.
(() => {
  const H = G, px = E.px;

  class Beast {
    constructor(o = {}) {
      this.body = o.body || 'quadruped';
      this.c = Object.assign({ dk: '#3a2a1a', base: '#8a6a4a', lt: '#c8a880', eye: '#ffe060', pupil: '#100a04' }, o.colors || {});
      this.size = o.size || 1;
      this.t = 0; this.walk = 0; this.flap = 1; this.face = 1; this.squash = 0;
    }
    update(dt, st = {}) {
      this.t += dt;
      this.walk = st.walk || 0;
      this.flap = st.flap === undefined ? 1 : st.flap;
      if (st.facing !== undefined) this.face = Math.cos(st.facing) < 0 ? -1 : 1;
      this.squash = st.squash || 0;
    }
    // the body's parts in its own frame (x forward, y up), scaled by size; the feet are at y = 0
    draw(g, ox, oy) { this.paint(g, ox, oy, this.walk, this.t, this.flap); }
    drawPortrait(g, x, y, size) { this.paint(g, x, y, 0, this.t, 0.4, size / 24); }
    paint(g, ox, oy, walk, t, flap, scale = 1) {
      const s = this.size * scale * (1 + this.squash), f = this.face, c = this.c;
      const P = (x, y) => [Math.round(ox + f * x * s), Math.round(oy - y * s)];
      const wave = Math.sin(t * (walk ? 12 : 3));
      const body = (cx, cy, rx, ry, col) => { const [x, y] = P(cx, cy); px.ell(g, x, y, Math.max(1, Math.round(rx * s)), Math.max(1, Math.round(ry * s)), col); };
      const line = (a, b, col, w = 1) => { const [x0, y0] = P(a[0], a[1]), [x1, y1] = P(b[0], b[1]); px.line(g, x0, y0, x1, y1, col, w); };
      const disc = (x, y, r, col) => { const [px0, py0] = P(x, y); px.disc(g, px0, py0, Math.max(1, Math.round(r * s)), col); };
      if (this.body === 'quadruped') {
        // four legs swing in pairs as it walks; a tail sways; the head is forward and up
        const sw = walk ? wave * 3 : 0;
        for (const x of [-7, 6]) { line([x, 5], [x + sw, 0], c.dk, 2); line([x + 1, 5], [x - sw * .5 + 1, 0], c.dk, 2); }
        body(0, 8, 9, 5, c.base); body(0, 6, 9, 3, c.lt);
        disc(9, 13, 4.5, c.base);
        line([9, 13], [11, 17], c.base, 2);
        line([-9, 10], [-12, 13 + wave * 1.5], c.dk, 2);
        disc(12, 15, 0.9, c.eye);
      } else if (this.body === 'drake') {
        // two legs, two wings beating, a long neck to a horned head, a barbed tail
        const beat = Math.sin(t * 6) * 6 * (flap || 0);
        body(0, 9, 8, 5, c.base);
        line([-4, 10], [-6, 6 + beat * .3], c.dk, 3); line([4, 10], [6, 6 + beat * .2], c.dk, 3);
        line([0, 12], [-8, 22 + beat], c.dk, 2); line([0, 12], [8, 22 + beat * .6], c.lt, 2);
        line([-9, 9], [-16, 9 + wave], c.dk, 2);
        line([6, 12], [11, 20], c.base, 3); disc(13, 22, 4, c.base);
        line([15, 25], [18, 29], c.dk, 1); line([11, 25], [9, 29], c.dk, 1);
        disc(16, 23, 1, c.eye);
      } else if (this.body === 'avian') {
        // a round body on two thin legs, feathered wings that beat, a beak
        const beat = Math.sin(t * 8) * 5 * (flap || 0);
        body(0, 8, 6, 6, c.base); body(0, 7, 4, 3, c.lt);
        line([-2, 2], [-3, 0], c.dk, 1); line([2, 2], [3, 0], c.dk, 1);
        line([-3, 9], [-11, 13 + beat], c.dk, 3); line([-11, 13 + beat], [-14, 6 + beat], c.base, 2);
        line([3, 9], [9, 12 - beat * .4], c.dk, 3);
        disc(5, 13, 3.5, c.base); line([7, 13], [11, 12], c.eye, 1);
        disc(6, 14, 0.8, c.pupil);
      } else {
        // a serpent: segments on a wave, its head forward; the wave runs along the body while it moves
        const seg = 7;
        for (let i = 0; i < seg; i++) {
          const x = -i * 3.4, y = 3 + Math.sin(t * (walk ? 8 : 2) - i * .9) * 3;
          const r = 4.2 - i * .35;
          disc(x, y, Math.max(1.2, r), i % 2 ? c.base : c.lt);
        }
        disc(3, 4 + Math.sin(t * (walk ? 8 : 2)) * 1.5, 4.6, c.base);
        disc(5.4, 5.5, 1, c.eye);
        line([7, 4], [10, 2], c.dk, 1);
      }
    }
    // a point to breathe from, or to launch a missile at, in the rig's own frame (its mouth)
    mouth() { return { x: this.face * 12 * this.size, y: 14 * this.size }; }
    tip() { return { x: this.face * 16 * this.size, y: 16 * this.size }; }
  }
  H.Beast = Beast;
})();
