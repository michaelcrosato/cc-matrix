// arcade, ai, control, input, replay and the proof.
import { fresh, match, playWith, clear, assert, eq, G } from './lib/h.mjs';
const L = fresh(), TT = L.TT;
const mk = o => match(TT, o);
export const cases = {
  'hype: gains per event, a full meter fires a super that works and ends'() {
    const m = mk(); m.hypeAdd(0, 16); eq(m.hype[0], 16, 'monster hit gain');
    clear(m, [5, 12]); const c = playWith(m, 5, G.CX, G.CY); m.hype[0] = 100;
    assert(m.doSuper(c), 'THUNDER RUN starts'); eq(c.sup.kind, 'thunder', 'thunder'); eq(m.hype[0], 0, 'hype spent');
    const t = m.players[12]; t.x = G.CX + 10; t.y = G.CY; t.f = Math.PI; m.contact(t, c, 'tackle'); eq(t.st, 'launch', 'tacklers bounce off like skittles'); assert(c.st !== 'down', 'unstoppable');
    m.parked = new Set(m.players.map(p => p.id)); m.run(TT.TUNE.v.superTime + .5); assert(!c.sup, 'ends on time');
    const m2 = mk(); clear(m2, [5, 12]); m2.parked = new Set([5]); playWith(m2, 12, G.CX + 80, G.CY); const d = m2.players[5]; d.x = G.CX; d.y = G.CY; m2.hype[0] = 100;
    assert(m2.doSuper(d), 'HURRICANE HIT starts'); m2.run(2, () => m2.ev.monsterHit > 0); eq(m2.ev.monsterHit, 1, 'a guaranteed monster hit');
  },
  'ON FIRE: the second try running sets it; the opponents\' score ends it'() {
    const m = mk(); clear(m, [6]); const p = playWith(m, 6, G.X1 + 20, G.CY); m.tryScored(p, p.x, p.y, 'walk'); assert(!(p.fire > 0), 'not after one');
    playWith(m, 6, G.X1 + 20, G.CY); m.tryScored(p, p.x, p.y, 'walk'); assert(p.fire > 0, 'on fire after two'); eq(m.ev.onFire, 1, 'event');
    m.addScore(1, 3, 'pen'); eq(p.fire, 0, 'out when they score');
  },
  'each power-up is thrown, lands, is taken and works'() {
    for (const k of ['pie', 'iron', 'boot', 'grease', 'horn']) {
      const m = mk(); clear(m, [5]); m.parked.add(5); const p = playWith(m, 5, G.CX, G.CY); p.turbo = 0;
      const q = m.throwPowerup(k, { x: G.CX + 2, y: G.CY }); m.run(2, () => q.taken);
      assert(q.taken, k + ' taken'); eq(m.ev.powerupTake, 1, k + ' event');
      if (k === 'horn') eq(m.hype[0], 40, 'horn hype'); else if (k === 'boot') assert(m.megaBoot[0] > 0, 'mega boot armed'); else eq(p.pu.kind, k, k + ' on the player');
      if (k === 'pie') assert(p.turbo >= TT.TUNE.v.turboTank - .01, 'pie: turbo refilled');
    }
  },
  'each hazard warns, then strikes; a struck carrier drops the ball'() {
    for (const [venue, k] of [['docks', 'chicken'], ['furnace', 'flames'], ['megadome', 'lightning']]) {
      const m = mk({ venue }); clear(m, [5]); m.parked.add(5); const p = playWith(m, 5, G.CX, G.CY + 150);
      if (k === 'chicken') { m.startHazard('chicken'); const h = m.hazards[0]; h.x = p.x; h.y = G.Y0 - 30; h.tx = p.x; h.ty = G.Y1 + 40; h.sp = 200; }
      if (k === 'flames') { p.x = TT.GRATES[0].x; p.y = TT.GRATES[0].y; m.startHazard('flames'); m.hazards = [m.hazards[0]]; m.hazards[0].x = p.x; m.hazards[0].y = p.y; m.hazards[0].t = 0; }
      if (k === 'lightning') { m.startHazard('lightning', { near: true }); m.hazards[0].x = p.x; m.hazards[0].y = p.y; }
      eq(m.ev.hazardWarn, 1, k + ' warns');
      m.run(5, () => m.ball.holder !== p.id);
      assert(m.ev.hazard >= 1, k + ' strikes'); assert(m.ball.holder !== p.id, k + ': the carrier dropped it');
    }
  },
  'mud slows a runner at Muddington'() { const m = mk(); const bl = m.mudBlobs || (m.makeMud(), m.mudBlobs); const p = m.players[5]; p.x = bl[0].x; p.y = bl[0].y; const a = m.speedOf(p); p.x = G.X0 + 2; p.y = G.Y0 + 2; const b = m.speedOf(p); assert(a < b * .85, 'slower in mud'); },
  'ref down: no fouls are called for 8 s'() {
    const m = mk(); clear(m, [5, 9, 3]); playWith(m, 3, G.CX, G.CY); m.refDown(); TT.cheats.refStrict = true; const seen = m.foul(m.players[9], 'offBall'); TT.cheats.refStrict = false;
    assert(!seen, 'not called'); m.parked = new Set(m.players.map(p => p.id)); m.run(8.5); eq(m.ref.down, 0, 'up again'); eq(m.ev.refUp, 1, 'ref up');
  },
  'CPU v CPU: 12 seeded matches, no watchdog or errors, sane scores, every part of the game'() {
    const tot = {}; let tries = 0;
    for (let s = 1; s <= 12; s++) {
      const venue = TT.VENUE_ORDER[s % 4], away = ['bad', 'gul', 'irn', 'meg'][s % 4];
      const m = mk({ seed: s * 101, venue, away, halfLen: 45 }); m.run(400, () => m.over);
      assert(m.over, 'seed ' + s + ' finished'); assert(!m.ev.watchdog, 'seed ' + s + ' watchdog');
      assert(m.score[0] <= 80 && m.score[1] <= 80, 'scores ' + m.score);
      tries += (m.ev.try || 0); for (const k in m.ev) tot[k] = (tot[k] || 0) + m.ev[k];
      m.off();
    }
    for (const k of ['pass', 'tackle', 'kick', 'ruck', 'scrum', 'lineout', 'try', 'convMade', 'bigHit', 'powerupTake', 'hazard']) assert(tot[k] > 0, 'never: ' + k);
    assert(tries / 12 >= 1.5 && tries / 12 <= 14, 'tries per match ' + (tries / 12).toFixed(1));
    L.noErrors('in CPU matches');
  },
  'AI shape: the defence spreads across the pitch, few players crowd the ball'() {
    const m = mk({ seed: 5, halfLen: 999 }); m.run(8, () => m.phase === 'play' && m.carrier());
    let spread = 0, crowd = 0, n = 0;
    for (let i = 0; i < 120 * 30; i++) { m.step(1 / 120); const c = m.carrier(); if (!c || m.phase !== 'play' || m.phaseT < 1.2) continue; if (i % 30) continue; n++; const def = m.players.filter(p => p.team !== c.team && m.standing(p)); const ys = def.map(p => p.y); spread += Math.max(...ys) - Math.min(...ys); crowd += m.players.filter(p => m.standing(p) && Math.hypot(p.x - c.x, p.y - c.y) < 40).length > 4 ? 1 : 0; }
    assert(n > 10, 'samples ' + n); assert(spread / n > 200, 'defensive spread ' + (spread / n).toFixed(0)); assert(crowd / n < .3, 'crowding ' + (crowd / n).toFixed(2));
  },
  'control: auto-switch on a kick, L1 / R1 and O switching, a seat never takes another seat\'s man'() {
    const g = L.game, seats = [{ kind: 'local', team: 0, input: g.input }, { kind: 'local', team: 0, input: g.input }];
    const m = mk({ seats }); clear(m, []); playWith(m, 12, G.CX + 100, G.CY); m.parked = new Set(m.players.filter(p => p.team === 1).map(p => p.id)); m.step(1 / 120);
    const s = m.seats[0], a = s.pid; assert(a >= 0 && m.players[a].team === 0, 'seat 1 has a man');
    s.I.pr.r1 = true; m.step(1 / 120); assert(s.pid !== a, 'R1 switched'); const b = s.pid;
    s.I.pr.ci = true; m.step(1 / 120); const near = m.nearestBall(0, s); eq(s.pid, near, 'O: nearest the ball'); void b;
    assert(m.seats[1].pid !== s.pid, 'two seats, two men');
    const c = m.players[12]; m.doKick(c, 'punt', G.CX - 200, G.CY, .8); m.step(1 / 120); m.step(1 / 120); assert(m.ev.switch >= 3, 'auto-switch on the kick');
  },
  'input: PlayStation glyphs by default on a pad, Xbox after the setting, keys on the keyboard'() {
    const g = L.game, I = g.input;
    eq(g.settings.glyphs, 'playstation', 'default setting'); eq(I.label('x', 'gamepad'), '✕', 'cross'); eq(I.label('tri', 'gamepad'), '△', 'triangle'); eq(I.label('sq', 'gamepad'), '□', 'square'); eq(I.label('ci', 'gamepad'), '○', 'circle');
    g.settings.set('glyphs', 'xbox'); eq(I.label('x', 'gamepad'), 'A', 'xbox A'); eq(I.label('l1', 'gamepad'), 'LB', 'LB'); g.settings.set('glyphs', 'playstation');
    eq(I.label('x', 'keyboard'), 'Space', 'space'); eq(I.label('l1', 'keyboard'), 'Q', 'Q'); eq(I.label('turbo', 'keyboard'), 'Shift', 'shift');
  },
  'input: the font draws the PlayStation symbols; two players on one keyboard get their own layouts'() {
    const E = L.E; for (const ch of ['✕', '○', '□', '△']) assert(E.font.width(ch) > 2, 'glyph ' + ch);
    const right = E.Input.halfKeys(TT.KEYS, 'right'), left = E.Input.halfKeys(TT.KEYS, 'left');
    assert(right.x.includes('Period') && right.l1.includes('KeyK') && right.turbo.includes('Comma'), 'right half');
    assert(left.x.includes('Space') && left.l1.includes('KeyQ') && left.ci.includes('KeyC'), 'left half');
  },
  'replay: the buffer holds 5 s; a replay plays and the match resumes where it was'() {
    const g = L.game; g.go('match', { exhibition: true, seed: 3 }, { fade: 0 }); L.advance(12);
    const MS = TT.MS; assert(MS.rep.buf.length >= 299, 'buffer ' + MS.rep.buf.length);
    const t0 = MS.m.t; g.debug.force('monster'); L.advance(1.3); assert(MS.rep.play, 'replay playing');
    L.advance(8); assert(!MS.rep.play, 'replay over'); assert(MS.m.t > t0 + 1, 'the match went on'); L.noErrors();
  },
  'proof: a scripted match from seed 7 gives the same hash twice'() {
    const run = () => { const m = mk({ seed: 7, halfLen: 999 }); for (let i = 0; i < 2400; i++) { if (i === 900) m.force('ruck'); m.step(1 / 120); } m.off(); const s = JSON.stringify([m.score, m.phase, m.players.map(p => [Math.round(p.x), Math.round(p.y), p.st]), Math.round(m.ball.x)]); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
    eq(run(), run(), 'the same hash');
  }
};
