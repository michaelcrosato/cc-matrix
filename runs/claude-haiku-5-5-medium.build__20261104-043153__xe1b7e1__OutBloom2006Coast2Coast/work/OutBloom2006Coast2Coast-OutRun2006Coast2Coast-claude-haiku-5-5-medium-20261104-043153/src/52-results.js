// The end of a run (plan §7.6, §8.3): the goal's ending vignette (a sky, the arrival and the passenger's line, the
// caption) and the results: the score, the route, the style, the grade and the records, with Drive again and Menu.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { px } = E;
const G = () => OB.game;
const INK = '#fff4e0', SUN = '#ffcf4a';
const SKIES = { A: ['#ffb070', '#ff6a9a', '#3a1a5a'], B: ['#ffd0a0', '#e88aa0', '#4a2a5a'], C: ['#1a1040', '#c04a8a', '#ff9a4a'], D: ['#0a0a2a', '#1a2a5a', '#3a3a7a'], E: ['#ff9a5a', '#ff5a7a', '#2a1a4a'] };

/** the ending: a side-view vignette. The car drives in and parks, the passenger says her line, the caption and the
 *  mood's title come up, and then the results. Props follow the goal's place. */
const ending = {
  enter(data) {
    this.res = data.result; this.t = 0;
    this.g = this.res.goal || 'A'; this.mood = this.res.mood || 'Bloom';
    this.e = OB.ending(this.g, this.mood) || { arrive: '', title: '', lines: {} };
    this.who = this.res.passenger || 'marisol';
    this.said = false;
    OB.Music.play(this.mood === 'Wilt' ? 'sunset' : 'title');
    this.line = this.e.lines[this.who] || '';
  },
  update(dt) {
    this.t += dt;
    const I = G().input;
    if (this.res.attract) { if (this.t > 9) OB.attract.next(); return; }   // (the attract's ending: on to the next segment)
    if (this.t > 1.5 && !this.said) { this.said = true; OB.Babble.say(this.line, this.who); }
    if (this.t > 2 && (I.pressed('confirm') || I.pressed('start') || I.pressed('cancel'))) G().go('results', { result: this.res }, { fade: 'wipe' });
    if (this.t > 14) G().go('results', { result: this.res }, { fade: 'wipe' });
  },
  draw(r) {
    const W = r.W, H = r.H, s = SKIES[this.g] || SKIES.A, t = this.t;
    r.sky(s);
    const gy = H * .72;
    r.overlay(g => {
      // the sea or the ground, the sun or the moon, and the goal's props
      px.rect(g, 0, gy, W, H - gy, this.mood === 'Wilt' ? '#4a4a6a' : '#2a6a9a');
      px.disc(g, W * .5, H * .58, H * .12, this.mood === 'Wilt' ? '#c0a0b0' : '#ffd060');
      const place = this.e.place || '';
      if (this.g === 'A') for (let k = 0; k < 14; k++) { const y = H * .65 - ((t * 14 + k * 17) % (H * .6)); px.disc(g, W * (.1 + k * .06), y, 3, 'rgba(255,190,110,.9)'); }
      if (this.g === 'B') { px.rect(g, W * .72, H * .3, 60, gy - H * .3, '#c8b890'); px.poly(g, [[W * .7, H * .3], [W * .82, H * .18], [W * .94, H * .3]], '#8a5a3a'); px.disc(g, W * .8, H * .5, 10, '#ffffff'); }
      if (this.g === 'C') { px.rect(g, W * .1, gy - 4, W * .8, 6, '#c03040'); for (let k = 0; k < 6; k++) px.disc(g, W * (.2 + k * .12), H * .3 + (t * 9 + k * 5) % 14, 2, '#ffffff'); }
      if (this.g === 'D') { px.poly(g, [[W * .72, gy], [W * .76, H * .45], [W * .9, gy]], '#5a5a7a'); px.disc(g, W * .8, H * .48, 22, '#8aa0c8'); for (let k = 0; k < 6; k++) px.disc(g, W * (.1 + ((k * 53) % 70) / 100), H * (.1 + (k % 3) * .1), 1.5, '#ffffff'); }
      if (this.g === 'E') { px.rect(g, W * .8, H * .3, 22, gy - H * .3, '#f0f0f0'); px.disc(g, W * .8 + 11, H * .3, 10, '#ffd060'); px.poly(g, [[W * .8 + 11, H * .3], [W * .4, H * .24], [W * .4, H * .36]], 'rgba(255,220,120,.25)'); }
      // the car drives in from the left and parks at the centre
      const u = Math.min(1, t / 2.8), cx = W * (-.2 + .5 * u * u * (3 - 2 * u) * 1.2 + .1);
      OB.Art.playerCar(g, cx, gy + 14, Math.max(1, H / 220), { paint: '#e0503a', passenger: { skin: '#f0c8a0', shades: this.who === 'vivi' }, passengerHair: OB.CAST[this.who].hair, drift: 0 });
      // the passenger, with her mood face, and her line typed out as a bubble
      OB.Art.portrait(g, this.who, 6, 6, 44, this.mood === 'Wilt' ? 'pouty' : 'happy');
      if (t > 2) OB.Art.bubble(g, 56, 10, Math.min(W - 70, E.font.width(this.line, { font: 'tiny' }) + 12), 14);
      if (t > 2) E.font.text(g, this.line.slice(0, Math.floor((t - 2) * 30)), 62, 14, '#3a1a10', { outline: false, shadow: null, font: 'tiny' });
      // the caption: the goal, the place, the arrival line, and the title
      OB.UI.panel(g, 16, H - 52, W - 32, 40, { bg: ['#1a0e34', '#2a1450'], alpha: .9 });
      E.font.text(g, OB.ENDING_CAPTION(this.g), W / 2, H - 46, SUN, { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      if (t > 4.5) E.font.text(g, this.e.title, W / 2, H - 36, INK, { align: 'center', outline: false, shadow: '#000', scale: 1 });
      if (t > 4.5) E.font.text(g, (this.e.arrive || '').slice(0, 96), W / 2, H - 24, '#ffd6a0', { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      if (t > 2) OB.UI.footer(r, H - 8, [['confirm', 'Continue']]);
    });
  },
};

/** the records: the best score per mode and the route; a new best is marked */
function recordFor(res) {
  OB.loadProfile();
  const key = res.mode + ':' + (res.goal || 'none');
  const best = OB.profile.best || {};
  const was = best[key] || 0, isNew = res.score > was && res.score > 0;
  if (isNew) { best[key] = res.score; OB.profile.best = best; OB.saveProfile(); }
  return { was, isNew, key };
}

/** the results: big tiles, no tables */
const results = {
  enter(data) {
    this.res = data.result || { score: 0, route: '', petals: 0 };
    this.rec = this.res.mode === 'trial' ? { isNew: !!this.res.newBest } : recordFor(this.res); this.focus = 0; this.t = 0;
    this.seeds = this.res.mode === 'trial' || this.res.mission ? 0 : OB.Progress.payRun(this.res);
    OB.Music.play('results');
  },
  update(dt) {
    this.t += dt;
    const I = G().input;
    if (I.pressed('left') || I.pressed('right')) this.focus = 1 - this.focus;
    if (I.pressed('confirm') || I.pressed('start')) {
      if (this.focus === 0) G().go('garage', { mode: this.res.mode === 'trial' ? 'trial' : this.res.mode }, { fade: 'wipe' });
      else G().go('menu', null, { fade: 'wipe' });
    }
    if (I.pressed('cancel')) G().go('menu', null, { fade: 'wipe' });
  },
  draw(r) {
    const W = r.W, H = r.H, R = this.res;
    r.sky(['#1e1040', '#4a1e6a', '#8a3a6a']);
    r.overlay(g => {
      const head = R.goal ? 'GOAL ' + R.goal + ' • ' + (R.mood || '').toUpperCase() : (R.status === 'over' ? 'THE SUN SET' : 'RUN OVER');
      E.font.title(g, head, W / 2, 10, { scale: 2, align: 'center' });
      const tiles = [
        ['SCORE', String(R.score)],
        ['TIME', (R.time || 0).toFixed(1) + ' s'],
        ['ROUTE', (R.route || '-') + ' • ' + (R.routeIds || []).length + ' STAGES'],
        ['STYLE', 'DRIFT ' + (R.bestDrift || 0) + ' • NEAR ' + (R.nearmisses || 0)],
      ];
      if (R.mode === 'love' && R.grade) tiles.push(['PETALS', R.petals + ' • GRADE ' + R.grade.grade]);
      if (R.mode === 'trial' && R.routeIds && R.routeIds.length === 1) { const st = OB.STAGES.find(s => s.id === R.routeIds[0]); const med = OB.medalFor((R.time || 0) * 1000, st.par); tiles.push(['MEDAL', (med || 'NONE') + ' • PAR ' + st.par.toFixed(1)]); }
      tiles.forEach(([lab, val], i) => {
        const col = i % 2, row = Math.floor(i / 2), x = 30 + col * (W / 2 - 16), y = 46 + row * 42;
        OB.UI.panel(g, x, y, W / 2 - 46, 34, { bg: ['#2a1450', '#4a2a6a'] });
        E.font.text(g, lab, x + 6, y + 4, '#ffd6a0', { outline: false, shadow: '#000', font: 'tiny' });
        E.font.text(g, val, x + 6, y + 15, INK, { outline: false, shadow: '#000', scale: 1 });
      });
      if (this.rec.isNew || this.newBest) E.font.text(g, 'NEW RECORD!', W / 2, H - 80, SUN, { align: 'center', outline: false, shadow: '#000', scale: 2 });
      if (this.seeds) E.font.text(g, 'SEEDS +' + this.seeds, W / 2, H - 96, SUN, { align: 'center', outline: false, shadow: '#000', scale: 1 });
      // the two buttons
      const bw = 130, by = H - 50;
      [['DRIVE AGAIN', 0], ['MENU', 1]].forEach(([lab, i]) => {
        const x = W / 2 - bw - 8 + i * (bw + 16), f = this.focus === i;
        OB.UI.panel(g, x, by, bw, 24, { bg: f ? ['#7a3a7a', '#aa5a9a'] : ['#1e1040', '#3a2050'], border: f ? SUN : '#8a6a9a' });
        E.font.text(g, lab, x + bw / 2, by + 7, f ? SUN : INK, { align: 'center', outline: false, shadow: '#000', scale: 1 });
      });
      OB.UI.footer(r, H - 16, [['left', 'Choose'], ['confirm', 'Select']]);
    });
  },
};

/** the About pages: the credits, then the source information and the three feedback blocks (the JSON's text) */
OB.aboutPages = () => {
  const A = OB.ABOUT;
  const kv = (o) => Object.entries(o).map(([k, v]) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()) + ': ' + v);
  return [
    { title: 'CREDITS', lines: A.credits },
    { title: 'SOURCE', lines: kv(A.sourceInformation) },
    { title: 'TESTING', lines: A.testingFeedback },
    { title: 'ENGINE', lines: A.engineFeedback },
    { title: 'PROMPT', lines: A.promptFeedback },
  ];
};
OB.scenes = OB.scenes || {};
Object.assign(OB.scenes, { ending, results });
})();
