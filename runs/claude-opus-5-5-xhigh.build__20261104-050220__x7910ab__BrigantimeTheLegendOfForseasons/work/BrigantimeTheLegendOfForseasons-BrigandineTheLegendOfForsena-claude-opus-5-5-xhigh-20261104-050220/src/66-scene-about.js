// ABOUT & CREDITS and HOW TO PLAY: pages flipped with left / right or L1 / R1 (or a click on the arrows), at most eight
// lines each in 10-foot text. How to Play shows a small live diorama of rigs on each page.

const AU = G.UI, AP2 = E.px;
function pagedScene(id, pagesFn, o = {}) {
  const S = { p: 0, t: 0, off: 0, more: 0 };   // off: the first line shown on a page too long for the screen; more: lines still below
  G.SCENES[id] = {
    view: 'threequarter', input: G.PRESET,
    enter(d = {}) { S.p = 0; S.t = 0; S.off = 0; S.more = 0; S.back = d.back || 'title'; S.pages = pagesFn(); if (o.music) G.music(o.music); },
    back() { G.game.go(S.back === 'pause' ? G.lastPlayScene || 'title' : S.back); return true; },
    update(dt) {
      G.inputTick(dt); S.t += dt; const inp = G.inp(), n = S.pages.length;
      // a page longer than the screen flips through its overflow first
      const fwd = () => { if (S.more > 0) S.off += S.maxL || 8; else { S.p = (S.p + 1) % n; S.off = 0; } S.more = 0; G.sfx('ui_move'); };
      const bwd = () => { if (S.off > 0) S.off = Math.max(0, S.off - (S.maxL || 8)); else { S.p = (S.p + n - 1) % n; S.off = 0; } S.more = 0; G.sfx('ui_move'); };
      if (G.repeat('right') || G.pressed('next')) fwd();
      if (G.repeat('left') || G.pressed('prev')) bwd();
      if (G.repeat('down') && S.more > 0) fwd(); else if (G.repeat('up') && S.off > 0) bwd();
      const c = inp.clicked && inp.clicked(); if (c) { if (c[0] < G.game.W / 3) bwd(); else if (c[0] > G.game.W * 2 / 3) fwd(); }
      if (inp.pressed('cancel') || inp.pressed('confirm') && S.p === n - 1 && S.more <= 0) { G.sfx('ui_cancel'); this.back(); }
    },
    draw(r) {
      r.sky(['#0a0c20', '#1a1e40', '#2a2a50']);
      const pg = S.pages[S.p];
      if (pg.scene) pg.scene(r, S.t);
      r.overlay(g => {
        const k = AU.k(), W = r.W, H = r.H, w = Math.min(W - 24, 400), x = Math.round((W - w) / 2), top = pg.scene ? Math.round(H * .4) : 34;
        AU.title(g, pg.title, W / 2, 8, { scale: 2 });
        AU.box(g, x, top, w, H - top - 26 * k, { alpha: .9 });
        let y = top + 6; const lines = [];
        for (const l of pg.lines) { const [lab, val] = Array.isArray(l) ? l : [null, l]; const wrapped = E.font.wrap((lab ? lab + ': ' : '') + val, w - 16, { scale: k }); wrapped.forEach((t2, i) => lines.push({ t: t2, lab: i === 0 ? lab : null })); }
        const maxL = Math.max(1, Math.floor((H - top - 34 * k) / (10 * k))); S.maxL = maxL; S.more = lines.length - S.off - maxL;
        for (const l of lines.slice(S.off, S.off + maxL)) { if (l.lab) { AU.text(g, l.lab + ':', x + 8, y, AU.COL.gold); AU.text(g, l.t.slice(l.lab.length + 1), x + 8 + AU.width(l.lab + ':'), y, '#ffffff'); } else AU.text(g, l.t, x + 8, y, '#e8e4f0'); y += 10 * k; }
        const by = H - 26 * k + 3;   // under the box, clear of the centred prompt bar
        AU.text(g, (S.p + 1) + ' / ' + S.pages.length, x + w - 2, by, AU.COL.dim, { align: 'right' });
        if (S.more > 0 || S.off > 0) AU.text(g, (S.off > 0 ? '↑ ' : '') + (S.more > 0 ? '↓ more' : ''), x + 2, by, AU.COL.gold);
        AP2.poly(g, [[8, H / 2], [14, H / 2 - 6], [14, H / 2 + 6]], AU.COL.dim); AP2.poly(g, [[W - 8, H / 2], [W - 14, H / 2 - 6], [W - 14, H / 2 + 6]], AU.COL.dim);
      });
      AU.prompts(r, [['left', 'Page'], ['next', 'Page'], ['cancel', 'Back']]);
    }
  };
}
/* ---- About & Credits ---- */
pagedScene('about', () => {
  const A = G.ABOUT, split = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
  const pages = [{ title: 'ABOUT', lines: [A.title, A.tagline, 'Version ' + G.VERSION + ' • built ' + G.BUILD, E.versionLabel ? 'Engine ' + E.versionLabel().replace(/·/g, '•') : 'Engine my-3D2dge', 'Inspired by Brigandine: The Legend of Forsena.', 'The world, characters, music and art are original.'] }];
  split(A.source, 5).forEach((part, i) => pages.push({ title: 'SOURCE INFORMATION ' + (i + 1), lines: part }));
  const q = (title, qs, as) => split(qs.map((qq, i) => [qq, as[i]]), 2).forEach((part, i) => pages.push({ title: title + (i ? ' ' + (i + 1) : ''), lines: part }));
  q('TESTING FEEDBACK', ['Issues caught', 'Critical issues', 'Most helpful test', 'Least helpful test'], A.testing);
  q('ENGINE FEEDBACK', ['Liked most', 'Stuck or guessed wrong', 'Built myself', 'Hardest part', 'Changed in the engine', 'One change'], A.engine);
  q('PROMPT FEEDBACK', ['Liked most', 'Confusing', 'Hardest thing', 'Would change'], A.prompt);
  pages.push({ title: 'CREDITS', lines: A.credits.flatMap(([h, ls]) => [[h, ls.join(' • ')]]) });
  return pages;
});
/* ---- How to Play: eight pages, each with a live diorama ---- */
const DIO = {};
function diorama(r, t, cast, opt = {}) {
  DIO.view = DIO.view || new E.View('dio', 'Dio', 0, 30, 2, 1);
  r.overlay(g => {
    const W = r.W, cy = Math.round(r.H * .38);
    AP2.rect(g, 0, cy - 2, W, 4, '#2a3a2a');
    if (opt.ground) opt.ground(g, W, cy, t);
    cast.forEach((c, i) => {
      const x = Math.round(W / 2 + (i - (cast.length - 1) / 2) * 46);
      c.vis.update(1 / 60, { x: 0, y: 0, z: 0, vx: c.walk ? 30 : 0, vy: 0, facing: c.face === undefined ? Math.PI / 2 : c.face, act: c.move ? { move: c.move, k: (t * .8 + i * .3) % 1, dur: 1 } : null });
      c.vis.draw(g, x, cy, DIO.view);
      if (c.label) AU.text(g, c.label, x, cy + 6, c.color || '#ffffff', { align: 'center' });
    });
  });
}
const dv = (spec) => G.visFor('dio:' + JSON.stringify(spec), spec);
pagedScene('help', () => [
  { title: 'THE WHEEL AND THE SEASONS', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('gareth'), label: 'Spring', color: '#9ad86a' }, { vis: G.knightVis('morgause'), label: 'Summer', color: '#ffd060' }, { vis: G.knightVis('pellam'), label: 'Autumn', color: '#ff9a40' }, { vis: G.knightVis('mordrain'), label: 'Winter', color: '#a8e0ff' }]),
    lines: ['Each turn is a season: Tidings (news), Muster (organize), March (attack), then the battles.', 'The season is also an element. Spring opposes Autumn; Summer opposes Winter.', 'In its own season an element hits 15% harder (the Seasonal Tide); its opposite 15% softer.', 'Seasons change the land: Spring floods, Summer dries and burns, Autumn gales, Winter freezes.', 'Take Meridian and defeat the Gray Knight before the Hour-Candle burns out.'] },
  { title: 'MUSTER', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('lynette'), move: 'cheer' }, { vis: G.monsterVis('treant', 1) }, { vis: G.monsterVis('sproutling', 1) }]),
    lines: ['Choose one of your castles to Organize, Summon, Move, Quest, Equip and Promote.', 'A knight may move once a Muster, to a castle of yours next door.', 'Castles yield mana each Tidings, more in their own season. Monsters cost upkeep.', 'Hold Square / Space to end the Muster.'] },
  { title: 'SUMMON AND BOND', scene: (r, t) => diorama(r, t, [{ vis: G.monsterVis('frostwolf', 1) }, { vis: G.monsterVis('frostwyrm', 1) }, { vis: G.monsterVis('snowkit', 1) }]),
    lines: ["Each castle's summoning circle offers its own species; some only in their season.", 'A troop holds up to six monsters. Their ranks may not add up to more than the knight\'s Bond.', 'Monsters grow by level and change form at 12 and 22 (sooner with a Season Seed).', 'Formations: Vanguard ahead, Shield around, Column behind.'] },
  { title: 'QUESTS', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('wren'), walk: true, face: 0 }, { vis: G.monsterVis('unicorn', 1), walk: true, face: 0 }]),
    lines: ['Send a knight (not a ruler) from a castle to its quest site for one or two seasons.', 'They return with treasure, a beast, a wanderer who joins, mana, training, or a wound.', 'Clerics find treasure, tamers find beasts, rangers find wanderers. Two away at most.'] },
  { title: 'MARCH', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('agravain'), walk: true, face: 0 }, { vis: G.monsterVis('cinderhound', 1), walk: true, face: 0 }, { vis: G.monsterVis('salamander', 1), walk: true, face: 0 }]),
    lines: ['March on a foreign castle beside one of yours with up to three troops.', 'A castle left without knights falls without a battle.', 'Battles you take part in: Command them yourself, or Delegate them to your captains.'] },
  { title: 'BELLS AND THE KEEP', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('ragnell'), move: 'slash' }, { vis: G.monsterVis('icegolem', 1), move: 'haymaker' }]),
    lines: ['A battle lasts twelve bells. Each bell, troops act in order of their knight\'s agility.', 'Each unit may move, then take one action: Attack, Special, Spell, Item, Guard or Wait.', 'Spells need planted feet: cast them before moving.', 'At the last bell the attacker wins only with a knight standing on the Keep.'] },
  { title: 'WARD, SIZE AND ELEMENTS', scene: (r, t) => diorama(r, t, [{ vis: G.monsterVis('pixie', 1) }, { vis: G.monsterVis('wyvern', 1), move: 'bite' }]),
    lines: ["A knight's Ward is the ring around it. A monster outside its own knight's Ward is weaker.", 'Big monsters struggle to hit small, quick ones.', 'The forecast shows hit, damage, crits, and STRONG (↑) or WEAK (↓) before every confirm.', 'Allies next to a foe add flanking hit and surround damage.'] },
  { title: 'KNIGHTS, RETREAT AND CAPTURE', scene: (r, t) => diorama(r, t, [{ vis: G.knightVis('gareth'), move: 'kneel' }, { vis: G.monsterVis('jacklamp', 1) }]),
    lines: ['When a knight falls or retreats, its whole troop leaves the field.', 'Its monsters near an enemy knight may be captured, and join the captor\'s realm.', 'Monsters at 0 HP die for good. Knights are wounded and miss a season.', 'If a ruler falls or retreats, the whole side loses.'] }
], { music: 'event' });
