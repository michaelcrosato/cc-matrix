// Modes: Bonus Only for each game; the Practice Range completed by script; Party with 2 and 4 hunters; Quick Draw;
// a Single Hunt from its card to its results.
import { load } from '../lib/load.mjs';
import { check, done } from '../lib/check.mjs';
const { B, game } = load();
const S = () => game.debug.snapshot(), I = game.input;
game.advance(.5);
const drive = (maxT, perSite) => { let t = 0, last = null; while (t < maxT && S().scene === 'hunt') { const s = S(); if (s.seg === 'site') { if (perSite) perSite(s); game.advance(.25); t += .25; } else { I.tap('confirm'); game.advance(.3); t += .3; } last = s; } return t; };
// bonus games
for (const b of ['crow', 'saucer', 'snowball']) {
  const p = new B.Player(0, I, { name: 'YOU' });
  game.go('hunt', { run: B.newRun({ mode: 'bonus', bonus: b, hunts: [B.get('bonus', b).hunt], players: [p] }) }); game.advance(.5);
  let sawSite = false;
  drive(200, s => { if (!sawSite) { sawSite = true; game.debug.bot(true, { skill: 'expert', cheat: true }); } });
  check('bonus ' + b + ': played to the menu', sawSite && S().scene === 'menu', S().scene + ' ' + S().seg);
  check('bonus ' + b + ': scored', p.huntScore > 0, p.huntScore);
}
// the range: stations completed by scripted shots, pumps and calls
{
  const p = new B.Player(0, I, { name: 'YOU' });
  game.go('hunt', { run: B.newRun({ mode: 'range', hunts: ['range'], players: [p] }) }); game.advance(.5);
  let t = 0;
  while (t < 400 && S().scene === 'hunt') {
    const s = S();
    if (s.seg === 'site') {
      const site = B.play.site, R = site.rangeState;
      if (R && !R.finished) {
        const st = R.i, pl = B.play.players[0], live = site.herd.list.filter(a => a.live && !a.dead);
        pl.rack = 0; pl.reload = 0; pl.chambered = true; if (pl.rounds <= 0) pl.rounds = pl.tube;
        if (st === 1) { if (!R.counters.pumps) { B.play.fire(pl, 240, 135); game.debug.pump(); B.bus.emit('pump', { p: pl }); } else { B.bus.emit('reload', { p: pl }); } }
        else if (st === 5) { const a = live.find(x => x.cat === 'animal'); if (a && !a.frozen) B.bus.emit('call', { p: pl }); if (a && a.frozen > 0) { game.debug.aimAt(0, a.id, 'heart'); B.play.fire(pl, pl.ret[0], pl.ret[1]); } }
        else if (st === 4) { const a = live.find(x => x.cat === 'animal'); if (a) { game.debug.aimAt(0, a.id, 'heart'); pl.scoped = true; pl.scopeK = 1; pl.breathHeld = true; B.play.fire(pl, pl.ret[0], pl.ret[1]); } }
        else { const a = live.find(x => x.cat === 'animal' ? x.legal : x.kind === 'squirrel'); if (a && (a.cat !== 'animal' || a.hits.length === 0 || st === 2)) { if (a.rig) game.debug.aimAt(0, a.id, 'heart'); else { const P = site.lens.project(...B.aimPointOf(a)); pl.ret = [P[0], P[1]]; } B.play.fire(pl, pl.ret[0], pl.ret[1]); } }
      }
      game.advance(.25); t += .25;
    } else { I.tap('confirm'); game.advance(.3); t += .3; }
  }
  check('the range: all seven stations, the badge', B.records.range === true && S().scene === 'menu', JSON.stringify(B.records.range) + ' ' + S().scene);
}
// party: 2 and 4 hunters (bots), own tubes and scores, a podium
for (const n of [2, 4]) {
  const ps = []; for (let k = 0; k < n; k++) { const p = new B.Player(k, k ? null : I, { name: 'P' + (k + 1) }); p.bot = new B.Bot(p, { skill: ['expert', 'average', 'novice', 'average'][k] }); ps.push(p); }
  game.go('hunt', { run: B.newRun({ mode: 'party', hunts: ['hollow'], players: ps, botAll: true }) }); game.advance(.5);
  let tubesSeparate = false, sharedCam = false;
  drive(60 * 12, s => { if (s.players.length === n && new Set(s.players.map(p => p.rounds)).size > 1) tubesSeparate = true; if (B.play.site && B.play.site.o.shared) sharedCam = true; });
  check('party ' + n + ': every player kept a score', ps.every(p => p.total >= 0) && ps.some(p => p.total > 0), ps.map(p => p.total).join(','));
  check('party ' + n + ': own tubes, a shared camera', tubesSeparate && sharedCam, tubesSeparate + ' ' + sharedCam);
  check('party ' + n + ': back to the menu', S().scene === 'menu', S().scene);
}
// quick draw
{
  const ps = [0, 1].map(k => { const p = new B.Player(k, k ? null : I); p.bot = new B.Bot(p, { skill: 'average' }); return p; });
  game.go('hunt', { run: B.newRun({ mode: 'quickdraw', hunts: ['hollow'], players: ps }) }); game.advance(.5);
  const sites = new Set(); drive(60 * 6, s => sites.add(s.site));
  check('quick draw: the first site of each hunt and the clays', ['hollow-1', 'bugle-1', 'muskeg-1', 'bonus-saucer'].every(x => sites.has(x)), [...sites].join(','));
}
check('no errors', !game.errors.length, game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
done();
