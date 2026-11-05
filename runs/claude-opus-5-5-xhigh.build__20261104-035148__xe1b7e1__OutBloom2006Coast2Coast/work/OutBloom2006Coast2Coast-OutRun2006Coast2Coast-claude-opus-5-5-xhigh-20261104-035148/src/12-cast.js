/* OutBloom — the cast on screen: E.Humanoid rigs dressed per OB.CAST, animated by the rig's own system (poses,
 * expressions, point and aim, breathing, hair). The driver and passenger sit between the car's under and over layers;
 * the passenger turns, points, cheers, sulks and screams with the race's events; speech bubbles type each line at the
 * babble's pace. Bruno waves his sunflower flag at the start. Portraits for the HUD, menus and briefs. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const Cast = OB.Cast = {};
OB.CHASE_VIEW = new E.View('chase', 'Chase', 0, 14);
OB.SIDE_VIEW = E.VIEWS ? E.VIEWS.side : new E.View('side2', 'Side', 0, 0);
const rigs = new Map();
/** a rig for a cast member (size, outfit), made once */
Cast.rig = (id, size = 1.3, outfit = 0) => {
  const key = id + ':' + size + ':' + outfit;
  if (!rigs.has(key)) {
    const C = OB.CAST[id] || OB.CAST.local, o = JSON.parse(JSON.stringify(C.rig || OB.CAST.local.rig));
    o.size = size; if (C.outfits && C.outfits[outfit]) Object.assign(o.colors, C.outfits[outfit]);
    const rig = new E.Humanoid(o); rig.castId = id; rig.st = { pose: null, expr: null, poseT: 0, facing: -Math.PI / 2, point: false, aim: 0, look: 0 };
    rigs.set(key, rig);
  }
  return rigs.get(key);
};
/* ---- the occupants: poses from events, held for a while, then back to riding ---- */
const occ = { driver: { pose: null, t: 0, expr: null, lean: 0, look: 0 }, pass: { pose: null, t: 0, expr: null, look: 0, point: false, aim: 0 } };
Cast.occ = occ;
Cast.pose = (who, pose, expr, seconds = 1.5, o = {}) => { const s = occ[who]; Object.assign(s, { pose, expr, t: seconds, point: !!o.point, look: o.look || 0, aim: o.aim || 0 }); };
Cast.step = (dt, car) => {
  for (const s of Object.values(occ)) { if (s.t > 0) { s.t -= dt; if (s.t <= 0) { s.pose = null; s.expr = null; s.point = false; s.look = 0; } } }
  occ.driver.lean += ((car ? car.steerSm || 0 : 0) * .35 - occ.driver.lean) * Math.min(1, dt * 6);
};
let occCv = null;
/** draw a car's two occupants at the seat anchors (from the car's sprite frame): [beltL, beltR, hipL, hipR] */
Cast.drawOccupants = (g, A, k, o) => {
  const size = 5, S = 190;
  if (!occCv) occCv = E.mkCanvas(S * 2, S);
  const cg = E.ctx2d(occCv); cg.clearRect(0, 0, S * 2, S);
  const yawLook = o.yaw || 0, dt = 1 / 60;
  const pairs = [[o.driver || 'leo', occ.driver, 0, o.driverOutfit || 0], [o.passenger, occ.pass, 1, o.outfit || 0]];
  for (const [id, st, i, outfit] of pairs) {
    if (!id) continue;
    const rig = Cast.rig(id, size, outfit), belt = A[i], hip = A[i + 2]; if (!belt || !hip) continue;
    const facing = -Math.PI / 2 + yawLook * .8 + (i === 0 ? st.lean * .4 : -occ.driver.lean * .25) + (st.look || 0);
    rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing, pose: st.pose || undefined, expr: st.expr || undefined, point: st.point, aim: st.aim || 0 });
    // the rig's hips at the seat: its feet hidden below, drawn into the work canvas, clipped at the beltline
    const legs = (rig.o.legUpper + rig.o.legLower) * size * .92, ox = S * (i + .5), oy = S - 10;
    rig.draw(cg, ox, oy, OB.CHASE_VIEW);
    const hipY = oy - legs, sx = hip[0] - (ox - S * i) * k, sy = hip[1] - (hipY) * k + 2 * k;
    const clipY = belt[1] + 1 * k;
    g.save(); g.beginPath(); g.rect(sx - 4, 0, S * k + 8, Math.max(0, clipY)); g.clip();
    g.drawImage(occCv, S * i, 0, S, S, Math.round(hip[0] - S / 2 * k), Math.round(hip[1] - hipY * k + 2 * k), Math.round(S * k), Math.round(S * k));
    g.restore();
    // a scarf or long hair streaming back with speed
    if (o.speed > 40 && (id === 'vivi' || id === 'marisol') && k > .5) {
      const hx = hip[0], hy = hip[1] - (legs * .0 + rig.o.torso * size * 1.6) * k, flow = clamp(o.speed / 250, 0, 1), sw = Math.sin(OB.now() * 9 + i) * 2 * k;
      px.line(g, Math.round(hx + 2 * k), Math.round(hy), Math.round(hx + (8 + flow * 10) * k * (i ? 1 : -1) + sw), Math.round(hy + 4 * k), id === 'vivi' ? '#c8a0f0' : '#a8402a', Math.max(1, Math.round(2 * k)));
    }
  }
};
/* ---- speech bubbles: a queue; each line types at the babble's pace with the portrait's mouth moving ---- */
const Talk = OB.Talk = { q: [], cur: null, t: 0, last: 0 };
Talk.say = (who, text, o = {}) => {
  if (!text) return;
  const prio = o.prio || 0;
  if (Talk.cur && prio > (Talk.cur.prio || 0)) { Talk.q.unshift(Talk.cur); Talk.cur = null; }
  if (Talk.q.length > 3 && !prio) return;
  Talk.q.push({ who, text, mood: o.mood || 'happy', prio, dur: 0 });
};
Talk.clear = () => { Talk.q.length = 0; Talk.cur = null; };
Talk.step = dt => {
  if (!Talk.cur && Talk.q.length) {
    Talk.cur = Talk.q.shift(); Talk.t = 0;
    const plan = OB.Babble ? OB.Babble.say(Talk.cur.text, Talk.cur.who, Talk.cur.mood) : null;
    Talk.cur.dur = plan ? plan.duration : Math.max(1, Talk.cur.text.length / 14);
    Talk.cur.shown = 0;
    if (OB.game.audio.musicLevel) OB.game.audio.musicLevel(.6, .2);
  }
  if (Talk.cur) {
    Talk.t += dt; Talk.cur.shown = Math.min(Talk.cur.text.length, Math.ceil(Talk.cur.text.length * Math.min(1, Talk.t / Math.max(.3, Talk.cur.dur))));
    if (Talk.t > Talk.cur.dur + 1.2) { Talk.cur = null; if (!Talk.q.length && OB.game.audio.musicLevel) OB.game.audio.musicLevel(1, .4); }
  }
};
Talk.speaking = () => !!(Talk.cur && Talk.t < Talk.cur.dur);
/* ---- the passenger's reactions to the race (chatter setting: full, less, off) ---- */
const chatChance = () => ({ full: .35, less: .1, off: 0 }[OB.setting('chatter')] || .35);
Cast.react = (race, name, e) => {
  const p = race.p1; if (!p || !p.passenger || (e && e.car && e.car !== p.id)) return;
  const who = p.passenger, rnd = race.chatRnd || (race.chatRnd = OB.rand.stream('chat', race.seed)), say = (ev, mood, chance = chatChance(), prio = 0, vars) => { if (rnd() < chance) Talk.say(who, OB.line(who, ev, vars), { mood, prio }); };
  switch (name) {
    case 'go': Talk.say(who, OB.line(who, 'start'), { mood: 'excited', prio: 1 }); Cast.pose('pass', 'cheer', 'smile', 1.4); break;
    case 'car:crash': say('crash', 'scared', Math.max(.6, chatChance())); Cast.pose('pass', 'cheer', 'shout', 1.3); Cast.pose('driver', null, 'wince', 1.2); break;
    case 'car:bump': say('bump', 'angry', chatChance() * .7); Cast.pose('pass', 'guard', 'wince', .8); break;
    case 'nearmiss': say('nearmiss', 'scared'); Cast.pose('pass', 'guard', 'wince', .8); break;
    case 'air:land': say('air', 'excited', e.hard ? .7 : chatChance()); Cast.pose('pass', 'guard', 'shout', .7); break;
    case 'checkpoint': if (rnd() < .6 && OB.setting('chatter') !== 'off') Talk.say(who, OB.line(who, 'checkpoint'), { mood: 'happy' }); Cast.pose('pass', 'cheer', 'smile', 1); break;
    case 'time:low': if (OB.setting('chatter') !== 'off') Talk.say(who, OB.line(who, 'lowtime'), { mood: 'scared', prio: 1 }); break;
    case 'goal': Talk.say(who, OB.line(who, 'goal'), { mood: 'excited', prio: 2 }); Cast.pose('pass', 'wave', 'smile', 3); Cast.pose('driver', 'cheer', 'smile', 2.5); break;
    case 'time:up': Talk.say(who, OB.line(who, 'timeup'), { mood: 'sad', prio: 2 }); Cast.pose('pass', 'hips', 'angry', 3); break;
    case 'drift:end': if (e.score > 3000) { say('perfect', 'excited', chatChance() * .5); Cast.pose('pass', 'cheer', 'smile', 1); } break;
  }
};
/* ---- Bruno at the start line: a flag on his hand, waving overhead ---- */
let brunoCv = null;
Cast.drawBruno = (g, sx, sy, scale, t) => {
  const hpx = 1900 * scale; if (hpx < 4) return;
  const S = 180, size = 2.6; if (!brunoCv) brunoCv = E.mkCanvas(S, S);
  const cg = E.ctx2d(brunoCv); cg.clearRect(0, 0, S, S);
  const rig = Cast.rig('bruno', size), r = OB.Race.current, phase = r ? r.phase : 'race', waving = phase === 'grid' || phase === 'countdown' || (r && r.t < 5);
  const u = (t * 2.2) % 1;
  rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI * .5 + .6, vx: 0, vy: 0, attack: waving ? { spec: E.MOVES.overhead, phase: u < .4 ? 'wind' : 'active', u: u < .4 ? u / .4 : (u - .4) / .6 } : null, pose: waving ? undefined : 'cheer', expr: 'smile' });
  rig.draw(cg, S / 2, S - 6, E.VIEWS.brawler);
  const hand = rig.hand('R'), hx = S / 2 + (hand.x || 0), hy = S - 6 - (hand.z || 40) * .95;
  px.line(cg, Math.round(hx), Math.round(hy), Math.round(hx + 6), Math.round(hy - 30), '#6a4a2a', 2);
  const fl = Math.sin(t * 9) * 4; px.poly(cg, [[hx + 6, hy - 30], [hx + 28, hy - 26 + fl], [hx + 26, hy - 12 + fl], [hx + 6, hy - 16]], '#ffc81a'); px.disc(cg, Math.round(hx + 16), Math.round(hy - 22 + fl / 2), 4, '#6a3a1a');
  const k = hpx / (S * .85);
  g.drawImage(brunoCv, Math.round(sx - S / 2 * k), Math.round(sy - S * k), Math.round(S * k), Math.round(S * k));
};
/** a portrait: a live close-up of a cast member (blinks, hair, hat) with a mood: happy, neutral or pouty */
Cast.portrait = (g, id, x, y, size, o = {}) => {
  const rig = Cast.rig(id, 1.3, o.outfit || 0);
  rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, vx: 0, vy: 0, expr: o.expr || (o.mood === 'pouty' ? 'angry' : o.mood === 'happy' ? 'smile' : undefined), pose: o.pose });
  rig.drawPortrait(g, Math.round(x), Math.round(y), size, { zoom: o.zoom || 3, turn: o.turn === undefined ? .4 : o.turn, bg: o.bg === undefined ? (OB.CAST[id] && OB.CAST[id].color ? E.shade(OB.CAST[id].color, -.55) : '#2a1450') : o.bg, frame: o.frame !== false });
};
/** a full-body side-view figure (endings, garage, briefs) */
Cast.drawFigure = (g, id, x, y, size, o = {}) => {
  const rig = Cast.rig(id, size, o.outfit || 0);
  rig.update(o.dt || 1 / 60, { x: o.wx || 0, y: 0, z: 0, facing: o.facing === undefined ? 0 : o.facing, vx: o.vx || 0, vy: 0, pose: o.pose, expr: o.expr, point: o.point, aim: o.aim, run: o.run });
  rig.draw(g, Math.round(x), Math.round(y), E.VIEWS.side);
  return rig;
};
OB.SCENERY.bruno = [600, 1900, 0];
})();
