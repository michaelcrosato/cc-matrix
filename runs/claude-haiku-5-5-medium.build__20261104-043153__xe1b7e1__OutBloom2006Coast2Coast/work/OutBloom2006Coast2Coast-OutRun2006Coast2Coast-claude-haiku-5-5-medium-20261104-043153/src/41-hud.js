// The race HUD (plan §7.18): the clock top centre, the score and the Bloom chain top left, the stage and the mini-map
// top right, the speed and gear bottom right, the passenger and the request card bottom left, the banners in the
// middle (one at a time, in a queue), and the passenger's speech bubble. Drawn from the race's state each frame.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { px, clamp } = E;
const G = () => OB.game;
const T = k => OB.tune(k);
const INK = '#fff4e0', SUN = '#ffcf4a', PINK = '#ff5fa2';

const Hud = {
  race: null, banners: [], bubbleT: 0, bubbleText: '', bubbleWho: null, hints: {}, hintT: 0, hintText: '', toast: null,
  /** queue a banner: text, colour, seconds on screen (at most one at a time; the rest wait) */
  banner(text, color = '#ffffff', seconds = 2.2) { this.banners.push({ text, color, seconds, t: 0 }); if (this.banners.length > 4) this.banners.shift(); },
  /** a passenger's subtitle over the car, typed out over its seconds */
  bubble(text, who, seconds = 3) { this.bubbleText = text; this.bubbleWho = who; this.bubbleT = seconds; },
  /** a hint (once per profile, when the hints setting is on) */
  hint(key, text) {
    if (!G().settings.hints || this.hints[key]) return;
    this.hints[key] = true; this.hintText = text; this.hintT = 4;
  },
  /** step the banners and the subtitle */
  update(dt) {
    if (this.banners.length) { const b = this.banners[0]; b.t += dt; if (b.t > b.seconds) this.banners.shift(); }
    if (this.bubbleT > 0) this.bubbleT -= dt;
    if (this.hintT > 0) this.hintT -= dt;
  },
  /** the banner on screen, if any */
  current() { return this.banners[0] || null; },
};
OB.Hud = Hud;

/** draw the HUD over a race: r is the frame, race the OB.Race, W/H the screen's size in pixels */
OB.drawHud = (r, race) => {
  const W = r.W, H = r.H, car = race.car, I = G().input, t = G().time || 0;
  const big = G().settings.hudSize === 'Extra large' ? 1.25 : 1;
  r.overlay(g => {
    // the clock: the time left (or the time elapsed in a trial), red and flashing below ten seconds
    const trial = race.mode === 'trial', secs = trial ? race.elapsed : race.clock;
    const label = trial ? 'TIME' : 'DAYLIGHT', low = !trial && secs < 10;
    E.font.text(g, label, W / 2, 4, SUN, { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
    E.font.text(g, String(Math.ceil(secs)).padStart(2, ' '), W / 2, 12, low && Math.floor(t * 4) % 2 ? '#ff4030' : '#ffffff', { align: 'center', scale: Math.round(3 * big), shadow: '#000', outline: false });
    // the score and the Bloom chain (five flowers, filled by the level)
    E.font.text(g, 'SCORE ' + String(Math.round(race.score)).padStart(6, '0'), 6, 6, '#ffffff', { shadow: '#000', outline: false, font: 'tiny' });
    for (let k = 0; k < 5; k++) { const cx = 10 + k * 11, cy = 22; px.disc(g, cx, cy, 4, k < race.bloom.level ? PINK : '#3a2050'); }
    E.font.text(g, 'x' + race.bloom.level, 66, 18, race.bloom.level >= 5 ? SUN : INK, { shadow: '#000', outline: false, font: 'tiny' });
    // the stage and its mini-map: the pyramid of 15 with the route lit
    const sn = race.stage.def.name.toUpperCase();
    E.font.text(g, sn, W - 6, 6, INK, { align: 'right', shadow: '#000', outline: false, font: 'tiny' });
    const mx = W - 60, my = 16;
    for (const s of OB.STAGES) {
      const x = mx + (s.col - 1) * 9 - (s.row - 1) * 4.5 + 22, y = my + (s.row - 1) * 7;
      const on = race.routeIds.includes(s.id), cur = s.id === race.stage.def.id;
      px.disc(g, x, y, 2.5, cur ? (Math.floor(t * 4) % 2 ? '#ffffff' : SUN) : on ? PINK : '#4a3a6a');
    }
    // the speed and the gear, bottom right
    const kmh = Math.round(race.car.v * (G().settings.speedUnits === 'mph' ? .621 : 1));
    E.font.text(g, String(kmh).padStart(3, ' '), W - 6, H - 26, '#ffffff', { align: 'right', scale: Math.round(3 * big), shadow: '#000', outline: false });
    E.font.text(g, (G().settings.speedUnits === 'mph' ? 'MPH' : 'KM/H') + '  ' + (car.gear > 0 ? 'G' + car.gear : ''), W - 6, H - 10, SUN, { align: 'right', shadow: '#000', outline: false, font: 'tiny' });
    // the drift and the chain points in motion
    if (car.drift.on) E.font.text(g, 'DRIFT ' + Math.round(car.drift.score), W / 2, H - 26, '#ffe04a', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
    if (car.slip > .5) E.font.text(g, 'SLIPSTREAM', W / 2, H - 16, '#8af0ff', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
    // the fork: its sign ahead, and the choice when it's made
    if (race.fork && !race.fork.decided) {
      E.font.text(g, '< ' + race.fork.left.name.toUpperCase() + '   /   ' + race.fork.right.name.toUpperCase() + ' >', W / 2, 36, '#ffffff', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
    }
    // the passenger, bottom left (love, and any mode with a passenger): her portrait, and the request card above it
    if (race.passenger) {
      OB.Art.portrait(g, race.passenger, 6, H - 46, 40, Hud.mood(race));
      const grade = race.grade ? race.grade() : null;
      E.font.text(g, 'PETALS ' + race.petals, 50, H - 40, '#ffe0f0', { shadow: '#000', outline: false, font: 'tiny' });
      if (grade) E.font.text(g, 'GRADE ' + grade.grade, 50, H - 30, SUN, { shadow: '#000', outline: false, font: 'tiny' });
      const req = race.requests.find(r => r.state === 'intro' || r.state === 'active');
      if (req) {
        const pw = Math.min(170, W / 2.6);
        OB.UI.panel(g, 6, H - 112, pw, 30, { bg: ['#2a1450', '#4a1a5a'], alpha: .85 });
        E.font.text(g, req.def.call.replace('{n}', req.n), 12, H - 106, '#ffffff', { shadow: '#000', outline: false, font: 'tiny' });
        const prog = req.state === 'active' ? req.progress() : 'GET READY';
        E.font.text(g, String(prog), 12, H - 92, SUN, { shadow: '#000', outline: false, font: 'tiny' });
        if (req.state === 'active') E.ui.bar(g, 12, H - 84, pw - 12, 3, clamp(1 - (car.z - req.z0) / (req.z1 - req.z0), 0, 1), '#ff5fa2');
      }
    }
    // the banner: one at a time, in the middle of the road's upper half
    const b = Hud.current();
    if (b) {
      E.font.text(g, b.text, W / 2, Math.round(H * .3), b.color, { align: 'center', scale: 2, shadow: '#000', outline: true });
    }
    // the hint, bottom centre, and the passenger's subtitle near the car's right seat
    if (Hud.hintT > 0) E.font.text(g, Hud.hintText, W / 2, H - 6, '#ffe6c0', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
    if (Hud.bubbleT > 0 && Hud.bubbleText) {
      const txt = Hud.bubbleText, chars = Math.floor(txt.length * Math.min(1, (3 - Hud.bubbleT + .5) / 1.2 + .2));
      const shown = txt.slice(0, Math.max(0, chars));
      const bw = Math.min(W * .6, E.font.width(shown, { font: 'tiny' }) + 12), bx = W * .58, by = H * .38;
      OB.Art.bubble(g, bx, by, bw, 14);
      E.font.text(g, shown, bx + 6, by + 4, '#3a1a10', { shadow: null, outline: false, font: 'tiny' });
    }
  });
};
/** the passenger's mood face from the last events: pouty after a miss, angry after a crash, happy otherwise */
Hud.mood = race => (race.lastRating === 'miss' || race.lastCrash ? 'pouty' : 'happy');
})();
