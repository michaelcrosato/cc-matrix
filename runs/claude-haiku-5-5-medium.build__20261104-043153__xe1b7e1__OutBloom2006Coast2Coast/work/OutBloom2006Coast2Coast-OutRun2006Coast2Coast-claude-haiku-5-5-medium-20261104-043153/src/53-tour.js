// The Tour's screens (plan §7.8, §7.9): the postcard map, the brief, the debrief with the seeds and the unlocks, and the
// Garage Garden with its beds. Every screen uses the same menu and footer as the rest of the game.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { px } = E;
const G = () => OB.game;
const INK = '#fff4e0', SUN = '#ffcf4a';
const RANK_TXT = { C: 'C', B: 'B', A: 'A', AAA: 'AAA' };
const MULT = { C: 1, B: 1.25, A: 1.5, AAA: 2 };

const missionOf = id => OB.MISSIONS.find(m => m.id === id);
const RULE_TEXT = m => {
  const r = m.ranks;
  switch (m.rule) {
    case 'sprint': return 'Seconds left: C ' + r[0] + ', B ' + r[1] + ', A ' + r[2] + ', AAA ' + r[3];
    case 'driftduel': case 'draftdash': return 'Against the rival: win is C, then +10%, +25%, +40%';
    case 'knockout': return 'Finish top two. Then first, then first by 2 s and by 5 s';
    case 'clean': return 'No contacts, then time against par';
    case 'speedkeep': return 'Share above 240 km/h: C 70%, B 80%, A 88%, AAA 95%';
    case 'heartbreak': return 'Keep your petals. Clear with some left, AAA if theirs run out';
    case 'memory': return 'Gates with the right colour: C 3, B 4, A 5, AAA 5 with no wrong';
    case 'photo3': return 'Photo points: C 3, B 5, A 6, AAA 9';
    case 'love': return 'A goal at grade B or better';
    default: return 'C ' + r[0] + ', B ' + r[1] + ', A ' + r[2] + ', AAA ' + r[3];
  }
};
/** the postcard's state: open, cleared (with its best rank), or locked */
const stateOf = id => { if (!OB.missionOpen(id)) return 'locked'; const c = OB.profile.career[id]; return c && c.cleared ? 'cleared' : 'open'; };

/* ---- the Tour map: the island of Bellafiore as a leaf, the sunrise coast on the right, the pyramid of stages as roads
 *      and pins, and each postcard pinned at its stage. The focus moves between the postcards in the directions. ---- */
/** the pin of each stage on a screen of W x H: row is how far west, col is the stage's place across the row */
function pinOf(st, W, H) {
  const x = W * (.7 - (st.row - 1) * .14), y = H * (.42 + ((st.col - 1) - (st.row - 1) / 2) * .19);
  return [x, y];
}
function drawMap(g, W, H) {
  px.rect(g, 0, 0, W, H, '#2a6a9a');
  // the island: a leaf (the sea round it)
  const pts = [];
  for (let k = 0; k < 40; k++) { const th = k / 40 * Math.PI * 2, rr = 1 + .1 * Math.sin(3 * th) + .05 * Math.cos(5 * th); pts.push([W * .5 + Math.cos(th) * W * .42 * rr, H * .52 + Math.sin(th) * H * .42 * rr]); }
  px.poly(g, pts, '#c8a060');
  for (const st of OB.STAGES) { const [x, y] = pinOf(st, W, H); px.disc(g, x, y, 15, st.grass[0]); }
  // the roads of the pyramid: each stage to the two below it
  for (const st of OB.STAGES) for (const nx of OB.nextStages(st)) { if (!nx) continue; const [x1, y1] = pinOf(st, W, H), [x2, y2] = pinOf(nx, W, H); px.line(g, x1, y1, x2, y2, '#fff4e0', 2); }
  for (const st of OB.STAGES) { const [x, y] = pinOf(st, W, H); px.disc(g, x, y, 3, '#ffffff'); if (st.goal) px.disc(g, x, y, 5, '#ffcf4a'); }
  E.font.text(g, 'SUNRISE COAST', W * .9, H * .08, '#ffe6c0', { align: 'right', outline: false, shadow: '#000', font: 'tiny' });
  E.font.text(g, 'VESPERA COAST', W * .08, H * .9, '#ffe6c0', { outline: false, shadow: '#000', font: 'tiny' });
}
const tour = {
  enter() { OB.loadProfile(); this.build(); OB.Music.play('garden'); OB.idle.reset(); },
  build() {
    const W = G().W || 480, H = G().H || 270;
    const per = {};
    const items = OB.MISSIONS.map(m => {
      const st = stateOf(m.id), rank = OB.profile.career[m.id] && OB.profile.career[m.id].rank;
      const label = m.id + ' ' + m.title.toUpperCase().slice(0, 18);
      let pos;
      if (m.id === 'F') pos = [W * .5, H * .8];
      else { const stage = OB.STAGES.find(s => s.id === m.route[0]); const [x, y] = pinOf(stage, W, H); const k = per[stage.id] = (per[stage.id] || 0) + 1; const side = x + 62 + 50 < W ? 62 : -62; pos = [x + side, y + (k - 1) * 30 - (OB.MISSIONS.filter(q => q.route && q.route[0] === stage.id).length - 1) * 15]; }
      return { label, sub: OB.GIVERS[m.giver].name + ' • ' + (st === 'locked' ? 'LOCKED' : st === 'cleared' ? 'BEST ' + rank : 'OPEN'), disabled: st === 'locked', id: m.id, pos, w: 100, h: 26,
        act: () => G().go('brief', { id: m.id }, { fade: 'wipe' }) };
    });
    this.m = new OB.Menu(items, { x: W / 2, y: 0, gap: 0, cols: 1, w: 100, h: 26, onBack: () => G().go('menu', null, { fade: 'wipe' }) }).layout(W, H);
  },
  update(dt) {
    OB.idle.tick(dt, 'tour');
    const I = G().input;
    if (I.pressed('nextTab') || I.pressed('radio')) { G().go('garden', null, { fade: 'wipe' }); return; }
    this.m.update(dt, I);
  },
  draw(r) {
    const W = r.W, H = r.H;
    r.sky(['#2a6a9a', '#3a8aba', '#6ac0d8']);
    r.overlay(g => drawMap(g, W, H));
    this.m.layout(W, H);
    r.overlay(g => {
      E.font.title(g, 'COAST 2 COAST TOUR', W / 2, 4, { scale: 1, align: 'center' });
      this.m.draw(g, { scale: 1 });
      const it = this.m.items[this.m.focus];
      if (it) E.font.text(g, it.label + ' • ' + it.sub + ' • SEEDS ' + OB.profile.seeds, W / 2, H - 26, '#ffd6a0', { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      OB.UI.footer(r, H - 14, [['confirm', 'Brief'], ['nextTab', 'Garden'], ['cancel', 'Back']]);
    });
  },
};

/* ---- the brief: the giver, the title, the rules as words, the reward for each rank, the best rank ---- */
const brief = {
  enter(data) { this.id = data.id; this.m = missionOf(this.id); this.focus = 0; OB.Music.play('garden'); OB.idle.reset(); },
  update(dt) {
    OB.idle.tick(dt, 'brief');
    const I = G().input;
    if (I.pressed('confirm') || I.pressed('start')) G().go('garage', { mode: this.m.rule === 'love' ? 'love' : 'arcade', mission: this.id }, { fade: 'wipe' });
    if (I.pressed('cancel')) G().go('tour', null, { fade: 'wipe' });
  },
  draw(r) {
    const W = r.W, H = r.H, m = this.m, g0 = OB.GIVERS[m.giver], best = OB.profile.career[m.id] && OB.profile.career[m.id].rank;
    r.sky(['#2a1450', '#5a2a6a', '#c86a6a']);
    r.overlay(g => {
      OB.UI.panel(g, 16, 14, W - 32, H - 42, { bg: ['#fff8ea', '#ffe6c0'], flat: true, border: '#8a4a2a' });
      E.font.text(g, m.id + '  ' + m.title.toUpperCase(), 28, 22, '#3a1a10', { outline: false, scale: 2 });
      E.font.text(g, g0.name.toUpperCase() + ':', 28, 46, '#7a3a20', { outline: false, font: 'tiny' });
      E.font.text(g, '"' + g0.line + '"', 28, 56, '#3a1a10', { outline: false, font: 'tiny' });
      E.font.text(g, m.brief, 28, 76, '#3a1a10', { outline: false, font: 'tiny', wrap: W - 60 });
      E.font.text(g, 'RULES: ' + RULE_TEXT(m), 28, 112, '#3a1a10', { outline: false, font: 'tiny' });
      const base = m.base;
      E.font.text(g, 'SEEDS  C ' + Math.round(base) + '  B ' + Math.round(base * 1.25) + '  A ' + Math.round(base * 1.5) + '  AAA ' + Math.round(base * 2), 28, 128, '#7a3a20', { outline: false, font: 'tiny' });
      E.font.text(g, 'YOUR BEST: ' + (best || 'NONE YET'), 28, 140, '#7a3a20', { outline: false, font: 'tiny' });
      OB.UI.footer(r, H - 16, [['confirm', 'Start'], ['cancel', 'Back']]);
    });
  },
};

/* ---- the debrief: the rank stamp, the seeds counted, the unlocks, and what next ---- */
const debrief = {
  enter(data) {
    this.id = data.id; this.m = missionOf(this.id); this.res = data.result; this.t = 0; this.focus = 0;
    const res = this.res.mission || { cleared: false, rank: null };
    this.rank = res.rank; this.pay = 0; this.unlocked = [];
    if (this.rank) {
      const before = OB.profile.career[this.id] && OB.profile.career[this.id].rank;
      this.pay = OB.Progress.payMission(this.id, this.rank);
      if (!before) this.unlockNext();
    }
    this.count = 0;
    OB.Music.play(this.rank ? 'results' : 'sunset');
    OB.idle.reset();
  },
  /** open the giver's next postcard, and any bed the mission delivers */
  unlockNext() {
    const order = OB.TOUR_ORDER[this.m.giver];
    const i = order ? order.indexOf(this.id) : -1;
    if (i >= 0 && i + 1 < order.length) this.unlocked.push('Next postcard: ' + order[i + 1]);
    if (this.m.unlocks) { const bed = OB.BEDS.find(b => b.id === this.m.unlocks || b.after === this.id); if (bed) this.unlocked.push('A new bed is ready in the Garden: ' + bed.name); }
  },
  update(dt) {
    this.t += dt; this.count = Math.min(this.pay, Math.floor(this.t * this.pay / 1.5));
    const I = G().input;
    if (I.pressed('left') || I.pressed('right')) this.focus = 1 - this.focus;
    if (this.t > 1.6 && (I.pressed('confirm') || I.pressed('start'))) {
      if (this.focus === 0 && this.rank && this.id === 'F') G().go('credits', null, { fade: 'wipe' });   // the Finale closes with the credits
      else if (this.focus === 0) G().go('garage', { mode: this.res.mode === 'love' ? 'love' : 'arcade', mission: this.id }, { fade: 'wipe' });
      else G().go('tour', null, { fade: 'wipe' });
    }
    if (I.pressed('cancel')) G().go('tour', null, { fade: 'wipe' });
  },
  draw(r) {
    const W = r.W, H = r.H, m = this.m;
    r.sky(this.rank ? ['#1e1040', '#4a1e6a', '#ff8a5a'] : ['#1a1040', '#2a1a40', '#4a2a4a']);
    r.overlay(g => {
      E.font.title(g, this.rank ? (this.rank === 'AAA' ? 'FULL BLOOM' : 'RANK ' + this.rank) : 'NOT THIS TIME', W / 2, 18, { scale: 2, align: 'center' });
      E.font.text(g, m.id + '  ' + m.title.toUpperCase(), W / 2, 50, INK, { align: 'center', outline: false, shadow: '#000', scale: 1 });
      if (this.rank) { OB.UI.panel(g, W / 2 - 60, 70, 120, 34, { bg: ['#ffcf4a', '#ff8a4a'], border: '#fff4e0' }); E.font.text(g, this.rank, W / 2, 80, '#2a1450', { align: 'center', outline: false, scale: 2 }); }
      E.font.text(g, 'SEEDS EARNED  ' + this.count, W / 2, 116, SUN, { align: 'center', outline: false, shadow: '#000', scale: 2 });
      this.unlocked.forEach((u, i) => { if (this.t > 1.2) E.font.text(g, u, W / 2, 140 + i * 12, '#ffd6a0', { align: 'center', outline: false, shadow: '#000', font: 'tiny' }); });
      const bw = 130, by = H - 46;
      [[this.rank ? 'NEXT' : 'RETRY', 0], ['MAP', 1]].forEach(([lab, i]) => {
        const x = W / 2 - bw - 8 + i * (bw + 16), f = this.focus === i;
        OB.UI.panel(g, x, by, bw, 24, { bg: f ? ['#7a3a7a', '#aa5a9a'] : ['#1e1040', '#3a2050'], border: f ? SUN : '#8a6a9a' });
        E.font.text(g, lab, x + bw / 2, by + 7, f ? SUN : INK, { align: 'center', outline: false, shadow: '#000', scale: 1 });
      });
      OB.UI.footer(r, H - 16, [['left', 'Choose'], ['confirm', 'Select']]);
    });
  },
};

/* ---- the credits: the Finale's closing scene, and the About's credits, with the lullaby */
const credits = {
  enter() { OB.Music.play('lastlight'); this.t = 0; },
  update(dt) { this.t += dt; const I = G().input; if (this.t > 2 && (I.pressed('confirm') || I.pressed('cancel') || I.pressed('start'))) G().go('tour', null, { fade: 'wipe' }); },
  draw(r) {
    const W = r.W, H = r.H;
    r.sky(['#0a0a2a', '#2a1a4a', '#5a2a6a']);
    r.overlay(g => {
      OB.Art.playerCar(g, W * .5, H * .7, Math.max(1, H / 220), { paint: '#e0503a', passenger: { skin: '#f0c8a0' } });
      const y0 = H - Math.max(0, (this.t - 1) * 22);
      OB.ABOUT.credits.forEach((l, i) => E.font.text(g, l, W / 2, y0 + i * 14, '#fff4e0', { align: 'center', outline: false, shadow: '#000', font: 'tiny' }));
      OB.UI.footer(r, H - 10, [['confirm', 'Back']]);
    });
  },
};
OB.scenes = OB.scenes || {};
OB.scenes.credits = credits;

/* ---- the Garage Garden: beds in rows of three; each is one unlock; planting it costs seeds ---- */
const garden = {
  enter() { OB.loadProfile(); this.build(); OB.Music.play('garden'); OB.idle.reset(); },
  build() {
    const items = OB.BEDS.map(b => {
      const owned = OB.Progress.owns(b.id), locked = !OB.Progress.unlockedBed(b);
      const status = owned ? 'BLOOMED' : locked ? 'LOCKED' : OB.profile.seeds >= b.cost ? 'PLANT ' + b.cost : 'NEEDS ' + b.cost;
      return { label: b.name.toUpperCase(), sub: status + (locked && b.after ? ' • CLEAR ' + b.after : ''), disabled: owned, bed: b,
        act: () => { if (OB.Progress.buy(b)) { OB.Sfx.play('pickup'); this.toast = 'Planted: ' + b.name; this.toastT = 2.4; this.build(); } else { this.toast = locked ? 'Clear ' + b.after + ' to open this bed.' : 'Not enough seeds yet.'; this.toastT = 2.4; } } };
    });
    this.m = new OB.Menu(items, { x: 240, y: 52, gap: 6, cols: 3, w: 150, h: 34, onBack: () => G().go('tour', null, { fade: 'wipe' }) }).layout(0, 0);
  },
  update(dt) {
    OB.idle.tick(dt, 'garden');
    if (this.toastT > 0) this.toastT -= dt;
    this.m.update(dt, G().input);
  },
  draw(r) {
    const W = r.W, H = r.H;
    r.sky(['#2a4a3a', '#4a7a5a', '#ffb07a']);
    this.m.o.x = W / 2; this.m.o.y = 56; this.m.layout(W, H);
    r.overlay(g => {
      E.font.title(g, 'GARAGE GARDEN', W / 2, 6, { scale: 2, align: 'center' });
      E.font.text(g, 'SEEDS  ' + OB.profile.seeds, W / 2, 36, SUN, { align: 'center', outline: false, shadow: '#000', scale: 1 });
      this.m.draw(g, { scale: 1 });
      if (this.toast && this.toastT > 0) E.font.text(g, this.toast, W / 2, H - 42, '#fff4e0', { align: 'center', outline: false, shadow: '#000', font: 'tiny' });
      OB.UI.footer(r, H - 16, [['confirm', 'Plant'], ['cancel', 'Back']]);
    });
  },
};
OB.scenes = OB.scenes || {};
Object.assign(OB.scenes, { tour, brief, debrief, garden });
})();
