// Applies Tide Crisis 3's engine patches to engine/my-3d2dge.js (idempotent: each patch checks its marker first).
// Every patch is logged in engine/PATCHES.md with its reason.
import { readFileSync, writeFileSync } from 'node:fs';
const file = new URL('../engine/my-3d2dge.js', import.meta.url);
let src = readFileSync(file, 'utf8');
const done = [];
function patch(name, find, replace) {
  if (src.includes('/*TC:' + name + '*/')) return;
  const i = src.indexOf(find);
  if (i < 0) throw new Error('patch ' + name + ': anchor not found');
  if (src.indexOf(find, i + 1) >= 0 && !replace.includes('/*TC:' + name + '*/')) throw new Error('patch ' + name + ': anchor not unique');
  src = src.slice(0, i) + replace + src.slice(i + find.length);
  done.push(name);
}

// 1. Long guns and the cutlass on E.Humanoid: rifle, smg, shotgun, launcher, sniper, minigun, harpoon, flare are guns
//    with their own length and look (o.gunKind); cutlass is a curved short sword. Long guns put the left hand on the
//    fore-grip while aiming.
patch('weapons',
  `    if (this.o.weapon && !['sword', 'gun', 'staff'].includes(this.o.weapon)) {`,
  `    /*TC:weapons*/ { const LG = { rifle: 13, smg: 9, shotgun: 12, launcher: 15, sniper: 17, minigun: 14, harpoon: 14, flare: 6 };
      if (LG[this.o.weapon]) { this.o.gunKind = this.o.weapon; this.o.gunLen = LG[this.o.weapon]; this.o.weapon = 'gun'; }
      else if (this.o.weapon === 'cutlass') { this.o.weapon = 'sword'; this.o.cutlass = true; if (!o.bladeLen) this.o.bladeLen = 9.5; } }
    if (this.o.weapon && !['sword', 'gun', 'staff'].includes(this.o.weapon)) {`);
patch('tip',
  `tip() { const J = this.J, L = this.o.weapon === 'gun' ? 5 : `,
  `tip() { /*TC:tip*/ const J = this.J, L = this.o.weapon === 'gun' ? (this.o.gunLen || 5) : `);
// the left hand on the fore-grip of a long gun while it points
patch('foregrip',
  `      const [elbow, h2] = ik3(sh, hand, o.armUpper, o.armLower, [-1, s * .7, -.2]);`,
  `      if (s < 0 && o.gunLen > 7 && this._pointW > 0 && !(this.downW > .2)) { /*TC:foregrip*/ const aa = this._aimA || 0, hr = add(J.shR, [armLen * .92 * Math.cos(aa), -.6, armLen * .92 * Math.sin(aa) - .4]), fg = add(hr, [Math.cos(aa) * o.gunLen * .42, 0, Math.sin(aa) * o.gunLen * .42 - .5]); hand = V3.lerp(hand, fg, this._pointW); }
      const [elbow, h2] = ik3(sh, hand, o.armUpper, o.armLower, [-1, s * .7, -.2]);`);
// HD drawing of the long guns (and the flare pistol): a stock behind the hand, a body, a barrel, a magazine or drum
patch('drawhd',
  `    if (o.weapon === 'gun') {
      const hd = J.handR, bd = J.bladeDir, Hn = Q.handR, mz = Sp(hd, bd[0] * 5.5, bd[1] * 5.5, bd[2] * 5.5), gp = Sp(hd, -bd[0] * .6, -bd[1] * .6, -bd[2] * .6 - 1.4), m = tones(C.metal);`,
  `    if (o.weapon === 'gun' && o.gunKind) { /*TC:drawhd*/
      const hd = J.handR, bd = J.bladeDir, Hn = Q.handR, L = o.gunLen, K = o.gunKind, m = tones(C.metal), wd = tones(C.stock || '#6a4428');
      const at = k => Sp(hd, bd[0] * k, bd[1] * k, bd[2] * k), st = Sp(hd, -bd[0] * 3.2, -bd[1] * 3.2, -bd[2] * 3.2 - .6), mz = at(L), mid = at(L * .55), mag = Sp(hd, bd[0] * 2.4, bd[1] * 2.4, bd[2] * 2.4 - 2.6);
      const fat = K === 'launcher' ? 1.7 : K === 'minigun' ? 1.6 : K === 'harpoon' ? 1.1 : K === 'shotgun' ? 1.05 : 1;
      ops.push({ d: Hn[2] + .04, f: () => {
        if (K !== 'flare' && K !== 'launcher' && K !== 'minigun') cap(st, Hn, .9 * u, .8 * u, K === 'smg' ? m.deep : wd.sh);
        if (K === 'rifle' || K === 'smg' || K === 'sniper') cap(Hn, mag, .55 * u, .5 * u, m.deep);
        cap(Hn, mid, .95 * u * fat, .85 * u * fat, m.sh); cap(Hn, mid, Math.max(.4, .95 * u * fat - .8), Math.max(.4, .85 * u * fat - .8), m.base, -.5, -.5);
        cap(mid, mz, (K === 'launcher' ? 1.5 : K === 'minigun' ? 1.3 : .55) * u, (K === 'launcher' ? 1.6 : K === 'minigun' ? 1.2 : .5) * u, K === 'shotgun' ? wd.base : m.sh);
        if (K === 'minigun') { const t = this.t * 40; for (let i = 0; i < 3; i++) { const a = t + i * 2.1, off = [Math.cos(a) * .6 * u, Math.sin(a) * .6 * u]; px.line(g, mid[0] + off[0], mid[1] + off[1], mz[0] + off[0], mz[1] + off[1], m.lt); } }
        if (K === 'sniper') { const sc = Sp(hd, bd[0] * 4, bd[1] * 4, bd[2] * 4 + 1.6), sc2 = Sp(hd, bd[0] * 8, bd[1] * 8, bd[2] * 8 + 1.6); cap(sc, sc2, .6 * u, .6 * u, m.deep); }
        if (K === 'harpoon') { const sp = at(L + 4); px.line(g, mz[0], mz[1], sp[0], sp[1], '#d8d0c0'); }
        if (K === 'flare') { px.disc(g, mz[0], mz[1], Math.max(1, .9 * u), '#ff7a2a'); }
        px.dot(g, mz[0], mz[1], '#ffffff');
      } });
    } else if (o.weapon === 'gun') {
      const hd = J.handR, bd = J.bladeDir, Hn = Q.handR, mz = Sp(hd, bd[0] * 5.5, bd[1] * 5.5, bd[2] * 5.5), gp = Sp(hd, -bd[0] * .6, -bd[1] * .6, -bd[2] * .6 - 1.4), m = tones(C.metal);`);
patch('drawclassic',
  `    if (o.weapon === 'gun') {
      const hd = J.handR, bd = J.bladeDir, Hn = Q.handR, mz = Sp(hd, bd[0] * 5, bd[1] * 5, bd[2] * 5), gp = Sp(hd, -bd[0] * .6, -bd[1] * .6, -bd[2] * .6 - 1.2);`,
  `    if (o.weapon === 'gun') { /*TC:drawclassic*/
      const hd = J.handR, bd = J.bladeDir, Hn = Q.handR, GL = o.gunLen || 5, mz = Sp(hd, bd[0] * GL, bd[1] * GL, bd[2] * GL), gp = Sp(hd, -bd[0] * .6, -bd[1] * .6, -bd[2] * .6 - 1.2);`);
// cutlass: a curved blade (the sword path with a bowed tip)
patch('cutlass',
  `    if (o.weapon === 'sword') {
      const hd = J.handR, bd = J.bladeDir, Lb = o.bladeLen, Hn = Q.handR, sl = Math.hypot(bd[0], bd[1]) || 1, gx = -bd[1] / sl * 1.8, gy = bd[0] / sl * 1.8;`,
  `    if (o.weapon === 'sword' && o.cutlass) { /*TC:cutlass*/
      const hd = J.handR, bd = J.bladeDir, Lb = o.bladeLen, Hn = Q.handR, mt = tones(C.metal), ht = tones(C.hilt || '#c8a040');
      const pts = []; for (let i = 0; i <= 4; i++) { const k = i / 4, bow = Math.sin(k * Math.PI * .8) * 1.6; pts.push(Sp(hd, bd[0] * Lb * k, bd[1] * Lb * k, bd[2] * Lb * k - bow)); }
      ops.push({ d: Hn[2] + .05, f: () => { for (let i = 0; i < 4; i++) { cap(pts[i], pts[i + 1], (1 - i * .18) * .8 * u, (1 - (i + 1) * .18) * .8 * u, mt.base); px.line(g, pts[i][0], pts[i][1] - 1, pts[i + 1][0], pts[i + 1][1] - 1, mt.hi); } px.disc(g, Hn[0], Hn[1], Math.max(1, u * .9), ht.base); } });
    } else if (o.weapon === 'sword') {
      const hd = J.handR, bd = J.bladeDir, Lb = o.bladeLen, Hn = Q.handR, sl = Math.hypot(bd[0], bd[1]) || 1, gx = -bd[1] / sl * 1.8, gy = bd[0] / sl * 1.8;`);

// 2. PlayStation glyphs by default (TASK.md: a DualSense first, with a Settings option for Xbox's A B X Y)
patch('glyphs',
  `  glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['xbox', 'Xbox'], ['playstation', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Positions']],`,
  `  glyphs: /*TC:glyphs*/ { group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']],`);
patch('glyphs2', `this.glyphs = 'auto'; this.rumbleScale = .6;`, `this.glyphs = 'playstation'; /*TC:glyphs2*/ this.rumbleScale = .6;`);

// 3. Mouse-wheel codes: a notch presses WheelUp / WheelDown for one step (bindable, labelled), when the scene does not zoom
patch('wheel',
  `      if (!this._wheelOn) return; e.preventDefault();`,
  `      if (!this._wheelOn) { /*TC:wheel*/ if (e.deltaY) { e.preventDefault(); const c = e.deltaY < 0 ? 'WheelUp' : 'WheelDown'; this.mouse.active = true; this.lastDevice = 'mouse'; this._tapCode(c); } return; } e.preventDefault();`);
patch('wheellabel', `Mouse0: 'Left click', Mouse1: 'Middle click',`, `Mouse0: 'Left click', /*TC:wheellabel*/ WheelUp: 'Wheel up', WheelDown: 'Wheel down', Mouse1: 'Middle click',`);
patch('wheelbind', `|CapsLock|Mouse[0-4]|Pad([0-8]|1[0-5]))$/;`, `|CapsLock|Mouse[0-4]|Wheel(Up|Down)|Pad([0-8]|1[0-5]))$/; /*TC:wheelbind*/`);

// 4. Audio buses: game.audio.bus('sfx' | 'music') for the voice synth and our own Web Audio graphs (volumes apply)
patch('bus',
  `  applyVolume() { if (!this.ctx) return;`,
  `  /** the sfx or music bus (a GainNode), or null before sound starts */ bus(which) { /*TC:bus*/ return !this.ctx ? null : which === 'music' ? this._musBus : this._sfxBus; }
  applyVolume() { if (!this.ctx) return;`);

patch('wheeldev', `else this.lastDevice = code.startsWith('Mouse') ? 'mouse' : 'keyboard';`, `else this.lastDevice = code.startsWith('Mouse') || code.startsWith('Wheel') /*TC:wheeldev*/ ? 'mouse' : 'keyboard';`);

writeFileSync(file, src);
console.log(done.length ? 'patched: ' + done.join(', ') : 'engine already patched');
