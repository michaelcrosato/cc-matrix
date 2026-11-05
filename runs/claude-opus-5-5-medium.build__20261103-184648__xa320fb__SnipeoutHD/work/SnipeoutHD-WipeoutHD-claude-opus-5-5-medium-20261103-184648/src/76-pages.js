// Paged screens (L1/R1, Q/E, the wheel or the arrow chips turn pages): How to play, Records, About / Credits
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px;
const T = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
/** a paged screen: pages = [{ title, draw(g, x, y, w, h) }] */
function paged(id, title, pages, o = {}) {
  let k = 0;
  const turn = d => { k = (k + d + pages().length) % pages().length; };
  return { id, title, layout: 'custom', noShade: true, tabs: turn, prompts: [['tabL', ''], ['tabR', 'PAGE']].concat(o.prompts || []), back: o.back,
    items: () => [{ id: 'page', label: '', rect: null, left: () => turn(-1), right: () => turn(1), pick: () => turn(1) }],
    draw(g, r, ui) {
      const P = pages(), pg = P[k], Wd = r.W, H = r.H, x = 16, y = 50, w = Wd - 32, h = H - 76;
      E.ui.box(g, x, y, w, h, { bg: ['#141a2ef0', '#05060cf0'], border: '#29c8e8' });
      T(g, pg.title, x + 10, y + 8, '#29c8e8', { scale: 2 }); T(g, (k + 1) + '/' + P.length, x + w - 10, y + 10, '#9aa6c0', { align: 'right' });
      pg.draw(g, x + 10, y + 30, w - 20, h - 40);
      ui.items()[0].rect = [x, y, w, h];
      const ay = y + h / 2 - 10; for (const [ax, d, s] of [[x - 14, -1, '<'], [x + w + 1, 1, '>']]) { px.rect(g, ax, ay, 13, 20, '#29c8e8'); px.rect(g, ax + 1, ay + 1, 11, 18, '#141a2e'); T(g, s, ax + 6, ay + 6, '#ffffff', { align: 'center' }); ui.chips.push([ax, ay, 13, 20, () => { turn(d); SN.sfx('ui_tab'); }]); }
    } };
}
SN.paged = paged;
const para = (g, text, x, y, w, c = '#e8f0ff') => { const lines = E.font.wrap(text, w); lines.forEach((l, i) => T(g, l, x, y + i * 10, c)); return y + lines.length * 10 + 4; };
const keyRows = (g, rows, x, y, w) => { const I = SN.game.input; rows.forEach(([acts, label], i) => { let xx = x; for (const a of acts) xx += SN.glyph.draw(g, I, a, xx, y + i * 15) + 2; T(g, label, x + 70, y + i * 15 + 2, '#ffffff'); }); };
/* ---- How to play: controls, racing, weapons (two pages), energy, modes ---- */
SN.screens.howto = () => paged('howto', 'HOW TO PLAY', () => [
  { title: 'CONTROLS', draw(g, x, y, w) { keyRows(g, [[['steer'], 'STEER'], [['pitch'], 'PITCH: NOSE DOWN / UP'], [['thrust'], 'THRUST (HOLD)'], [['brakeL', 'brakeR'], 'AIRBRAKES (ANALOG ON TRIGGERS)'], [['shiftL', 'shiftR'], 'SIDE-SHIFT / BARREL ROLL IN THE AIR'], [['fire'], 'FIRE (HOLD: CHARGE OR STREAM)'], [['absorb'], 'ABSORB WEAPON INTO SHIELD'], [['camera'], 'CAMERA'], [['lookBack'], 'LOOK BACK']], x, y, w); T(g, 'Prompts follow the device you touched last.', x, y + 140, '#9aa6c0', { font: 'tiny' }); } },
  { title: 'RACING', draw(g, x, y, w) { let yy = para(g, 'Hold thrust. Steer into corners and squeeze the INSIDE airbrake: it works like a rudder and adds grip. Both airbrakes slow you down.', x, y, w); yy = para(g, 'Blue chevron pads boost you. Pitch the nose DOWN on descents for speed, UP over gaps to fly further.', x, yy, w); yy = para(g, 'Side-shift jumps four metres sideways. In the air, side-shift or flick the stick left-right for a BARREL ROLL: land it for a boost. It costs shield.', x, yy, w); para(g, 'Hold thrust in the countdown and release the rev bar in the green window at GO for a PERFECT START.', x, yy, w, '#ffd23f'); } },
  { title: 'WEAPONS 1/2', draw(g, x, y, w) { SN.WEAPONS.slice(0, 5).forEach((wp, i) => { SN.drawWeaponIcon(g, wp.id, x, y + i * 28); T(g, wp.name, x + 30, y + i * 28 + 2, wp.color); E.font.text(g, wp.desc, x + 30, y + i * 28 + 12, '#e8f0ff', { wrap: w - 40, font: 'tiny', outline: false }); }); } },
  { title: 'WEAPONS 2/2', draw(g, x, y, w) { SN.WEAPONS.slice(5).forEach((wp, i) => { SN.drawWeaponIcon(g, wp.id, x, y + i * 28); T(g, wp.name, x + 30, y + i * 28 + 2, wp.color); E.font.text(g, wp.desc, x + 30, y + i * 28 + 12, '#e8f0ff', { wrap: w - 40, font: 'tiny', outline: false }); }); } },
  { title: 'ENERGY', draw(g, x, y, w) { let yy = para(g, 'Your SHIELD is your life. Walls, weapons, hard landings and barrel rolls drain it. At zero your craft is ELIMINATED.', x, y, w); yy = para(g, 'Ride the green PIT LANE strip to recharge. Or ABSORB a weapon you can\'t use: it turns into shield.', x, yy, w); para(g, 'Fall off an open edge or into a gorge and the rescue drone puts you back, minus shield and time.', x, yy, w, '#ffd23f'); } },
  { title: 'MODES', draw(g, x, y, w) { [['QUICK RACE', 'Eight craft, weapons on. Place counts.'], ['SEASON', 'Events, briefings, promotions, the Grand Prix.'], ['TIME TRIAL', 'Three laps against your own ghost.'], ['HOT LAP', 'A flying start. Your best lap counts.'], ['SNIPEOUT', 'Points for hits and eliminations.'], ['OVERCLOCK', 'Speed climbs every zone. Survive.'], ['VERSUS', 'Two players, split screen.'], ['ACADEMY', 'Eleven drills. Every mechanic.']].forEach(([a, b], i) => { T(g, a, x, y + i * 14, '#29c8e8'); T(g, b, x + 90, y + i * 14, '#e8f0ff'); }); } }
]);
/* ---- Records: one circuit per page ---- */
SN.screens.records = () => paged('records', 'RECORDS', () => SN.TRACK_IDS.map(id => ({ title: SN.TRACKS[id].name, draw(g, x, y, w) {
  const d = SN.save ? SN.save.data.records : {}; T(g, 'CLASS', x, y, '#9aa6c0'); T(g, 'RACE', x + 90, y, '#9aa6c0'); T(g, 'LAP', x + 170, y, '#9aa6c0'); T(g, 'TIME TRIAL', x + 240, y, '#9aa6c0');
  SN.CLASSES.forEach((c, i) => { const yy = y + 16 + i * 16, r = d[id + '/' + c.id + '/race'], l = d[id + '/' + c.id + '/lap'], t = d[id + '/' + c.id + '/timetrial']; T(g, c.name, x, yy, '#ffffff'); T(g, r ? SN.fmtTime(r.ms / 1000) : '--', x + 90, yy); T(g, l ? SN.fmtTime(l.ms / 1000) : '--', x + 170, yy); T(g, t ? SN.fmtTime(t.ms / 1000) : '--', x + 240, yy); });
  const z = d[id + '/zone']; T(g, 'OVERCLOCK BEST ZONE: ' + (z ? z.zone : '--'), x, y + 92, '#ff3ab4');
  T(g, 'MEDAL TARGETS (TIME TRIAL / HOT LAP, GOLD)', x, y + 112, '#9aa6c0', { font: 'tiny' }); SN.CLASSES.forEach((c, i) => { const m = SN.medalTimes(id, c.id); T(g, c.name[0] + ' ' + SN.fmtTime(m.tt[0]) + ' / ' + SN.fmtTime(m.lap[0]), x + (i % 2) * 150, y + 124 + Math.floor(i / 2) * 10, '#ffd23f', { font: 'tiny' }); });
} })));
/* ---- About / Credits: source information, the three feedbacks, credits ---- */
SN.screens.about = (o = {}) => {
  const A = SN.ABOUT, si = A.sourceInformation;
  const list = (items) => (g, x, y, w, h) => { let yy = y; for (const [k, v] of items) { const lines = E.font.wrap(String(v), w - 80, { font: 'tiny' }), n = Math.max(1, Math.min(lines.length, Math.floor((y + h - yy) / 7))); if (yy > y + h - 7) break; T(g, k, x, yy, '#29c8e8', { font: 'tiny' }); lines.slice(0, n).forEach((l, i) => T(g, l, x + 80, yy + i * 7, '#e8f0ff', { font: 'tiny' })); yy += n * 7 + 4; } };
  const qa = (qs, as) => (g, x, y, w, h) => { let yy = y; qs.forEach((q, i) => { if (yy > y + h - 14) return; T(g, q, x, yy, '#29c8e8', { font: 'tiny' }); const lines = E.font.wrap(String(as[i] || 'unknown'), w, { font: 'tiny' }), n = Math.max(1, Math.min(lines.length, Math.floor((y + h - yy - 8) / 7))); lines.slice(0, n).forEach((l, j) => T(g, l, x, yy + 8 + j * 7, '#e8f0ff', { font: 'tiny' })); yy += 11 + n * 7; }); };
  const pairs = (title, qs, as) => { const out = []; for (let i = 0; i < qs.length; i += 2) out.push({ title: title + ' ' + (i / 2 + 1) + '/' + Math.ceil(qs.length / 2), draw: qa(qs.slice(i, i + 2), as.slice(i, i + 2)) }); return out; };
  const pages = [
    { title: 'SOURCE INFORMATION 1/4', draw: list([['DATE', si.date], ['SOURCE', si.source], ['PLAN', si.plan], ['GENRE', si.genre], ['PERSPECTIVE', si.perspective]]) },
    { title: 'SOURCE INFORMATION 2/4', draw: list([['TECH', si.tech], ['ART', si.artDirection]]) },
    { title: 'SOURCE INFORMATION 3/4', draw: list([['ANIMATION', si.animation], ['AUDIO', si.audio]]) },
    { title: 'SOURCE INFORMATION 4/4', draw: list([['ONLINE', si.online], ['TESTING', si.testing], ['RESEARCH', si.research], ['ENVIRONMENT', si.environment], ['MODEL', si.model], ['USAGE', si.usage]]) },
    ...pairs('TESTING FEEDBACK', ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'], A.testingFeedback),
    ...pairs('ENGINE FEEDBACK', ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'], A.engineFeedback),
    ...pairs('PROMPT FEEDBACK', ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'], A.promptFeedback),
    { title: 'CREDITS', draw(g, x, y, w) { let yy = y; for (const c of A.credits) { yy = para(g, c, x, yy, w); } yy += 4; T(g, 'TEAMS', x, yy, '#29c8e8', { font: 'tiny' }); T(g, SN.TEAMS.map(t => t.name).join(' • '), x, yy + 8, '#e8f0ff', { font: 'tiny' }); T(g, 'ARTISTS', x, yy + 20, '#29c8e8', { font: 'tiny' }); T(g, Object.values(SN.SONGS).map(s => s.artist).join(' • '), x, yy + 28, '#e8f0ff', { font: 'tiny' }); T(g, 'ENGINE CHANGES', x, yy + 40, '#29c8e8', { font: 'tiny' }); A.engineChanges.forEach((c, i) => T(g, '- ' + c.slice(0, 90), x, yy + 48 + i * 7, '#9aa6c0', { font: 'tiny' })); } }
  ];
  if (o.credits) pages.unshift(pages.pop());
  return paged('about', o.credits ? 'CREDITS' : 'ABOUT', () => pages, { back: o.credits ? () => { SN.UI.reset(SN.screens.main()); if (SN.hangar) SN.hangar.turntable(); } : undefined });
};
})();
