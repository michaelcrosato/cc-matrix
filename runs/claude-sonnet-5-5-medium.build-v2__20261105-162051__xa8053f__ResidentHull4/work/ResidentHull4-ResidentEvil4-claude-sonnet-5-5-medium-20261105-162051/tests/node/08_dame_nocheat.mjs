import { boot, S, Bot } from './_helpers.mjs';
import { abbey } from '../../src/data/levels/abbey.js';
import { quay } from '../../src/data/levels/quay.js';
export const slow = true;
export async function run(T) {
  // Dame hides in a niche on command, safe from enemies, and comes out again
  {
    const { e, a } = await boot({ ...abbey, scripts: [] }); a.addDame(a.player.x, a.player.z);
    const h = a.level.markers.h[0]; a.dame.x = h.x + 1; a.dame.z = h.z; a.player.teleport(h.x + 2, h.z); e.step(2);
    a.interact.command(); T.check('Dame hides in the niche', a.dame.hidden && a.dame.mode === 'hide');
    const g = a.spawn('gaffer', h.x + 2, h.z + 1, { state: S.APPROACH }); e.step(120);
    T.eq('hidden Dame takes no damage', a.dame.hp, a.dame.maxHp);
    a.interact.command(); T.check('Dame comes out on the next command', !a.dame.hidden);
    a.dame.x += 10; a.dame.z += 3; // away from the niche
    a.interact.command(); T.eq('wait command', a.dame.mode, 'wait'); a.interact.command(); T.eq('follow command', a.dame.mode, 'follow');
    T.eq('errors', e.errors.length, 0, e.errors.join('|'));
  }
  // The Dame's crypt rules: hearing radius, whack stun, two hits restart (no god)
  {
    const { e, a } = await boot({ ...abbey, scripts: [] }); a.addDame(a.player.x, a.player.z); const d = a.dame;
    const { cp } = await import('../../src/game/kit.js');
    const [sx, sz] = cp(a, 3, 12); d.x = sx; d.z = sz;
    a.crypt = { knights: [], hits: 0, whackCd: 0, lever: false, noise: null };
    const k = a.spawn('knight', sx + 6, sz, { state: S.APPROACH, noBody: true }); k.blindKnight = { path: [[sx + 6, sz], [sx + 6, sz + 1]], i: 1, hunt: null, stun: 0, huntT: 0 }; a.crypt.knights.push(k);
    a.control = 'dame'; a.player.noMove = true; a.dev.god = false;
    // standing still makes no noise: the knight never hunts
    for (let i = 0; i < 120; i++) { a.cur = { mx: 0, my: 0, run: false, actionPressed: false }; a.def.fixed(a, 1 / 60); }
    T.eq('still Dame is not heard', k.blindKnight.huntT, 0);
    // running within 9 m is heard
    for (let i = 0; i < 5; i++) { a.cur = { mx: 0, my: 1, run: true, actionPressed: false }; a.def.fixed(a, 1 / 60); }
    T.check('running within 9 m is heard', k.blindKnight.huntT > 0 || k.blindKnight.hunt);
    // two hits restart the segment
    k.blindKnight.stun = 0; k.blindKnight.huntT = 0; k.x = d.x; k.z = d.z; k.blindKnight.cool = 0; a.crypt.hits = 0; d.hidden = false;
    d.x = sx + 3; d.z = sz; k.x = d.x; k.z = d.z; a.cur = { mx: 0, my: 0, run: false, actionPressed: false }; a.def.fixed(a, 1 / 60);
    T.eq('first knight contact is one hit', a.crypt.hits, 1);
    k.blindKnight.cool = 0; k.x = d.x; k.z = d.z; a.def.fixed(a, 1 / 60);
    T.eq('second hit restarts the segment', a.crypt.hits, 0);
    T.check('Dame is back at the start', Math.hypot(d.x - sx, d.z - sz) < 0.5, `${d.x - sx}`);
    // whack stuns
    k.x = d.x + 1; k.z = d.z; a.crypt.whackCd = 0; a.cur = { mx: 0, my: 0, run: false, actionPressed: true }; a.def.fixed(a, 1 / 60);
    T.check('whack stuns a knight for 2 s', k.blindKnight.stun > 1 || a.crypt.whackCd === 8, k.blindKnight.stun);
  }
  // The quay played by the bot WITHOUT cheats reaches the Foghorn
  {
    const { e, a } = await boot(quay, { warm: 2, bot: { cheat: false, teleportStuck: false } });
    let died = 0; a.onPlayerDead = () => { died++; a.run.hp = a.run.maxHp; a.player.dead = false; a.player.invuln = 2; a.deathT = 0; };
    for (let s = 0; s < 60 * 330 && !a.hasFlag('siege-done'); s += 30) { e.step(30); if (a.scripts.cut) a.scripts.cut.tl.skip(); }
    T.check('no-cheat bot survives to the Foghorn', a.hasFlag('siege-done'), `deaths ${died}`);
    T.check('no-cheat bot dies fewer than 4 times', died < 4, died);
  }
}
