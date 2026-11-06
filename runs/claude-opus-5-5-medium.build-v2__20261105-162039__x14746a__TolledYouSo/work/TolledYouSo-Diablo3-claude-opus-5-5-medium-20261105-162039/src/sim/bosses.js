// Boss scripts: the Bursar, Bishop Ambrose, Malison, and the Knell's Wardens.
import { DT, after, emit, findOpenNear, livingHeroes, moveCircle, near, nearestHero, walkable } from './world.js';
import { damageHero } from './hero.js';
import { damageRating } from './stats.js';
import { hostileProjectile } from './effects.js';
import { hostileField, killMonster, spawnMonster, telegraph } from './monsters.js';

export const say = (w, who, text, o = {}) => emit(w, { t: 'say', who, text, ...o });
const walkTo = (w, m, x, z, sp) => { const dx = x - m.x; const dz = z - m.z; const d = Math.hypot(dx, dz) || 1; m.facing = Math.atan2(dx, dz); moveCircle(w, m, (dx / d) * sp * DT, (dz / d) * sp * DT, m.r * 0.5); };
const pickT = (w, m) => nearestHero(w, m.x, m.z, 60, false) ?? null;
const atk = (w, m, clip, dur) => emit(w, { t: 'matk', id: m.id, clip, dur });
const addBoss = (w, m, o) => { m.bossState = { phase: 1, t: 0, a: 3, b: 6, c: 9, d: 12, ...o }; w.boss = { id: m.id, name: m.name, ticks: o.ticks ?? [], m }; emit(w, { t: 'boss', id: m.id, name: m.name, ticks: o.ticks ?? [], on: true }); };

// Story bosses are sized to the party that reached them, so a fight lasts its intended time whatever the loot rolled.
const FIGHT_SECONDS = { bursar: 290, malison: 560, ambrose: 130 };
const CLASS_PACE = { bellwarden: 2.6, lamplighter: 3.6, sexton: 3.2 };
function sizeBoss(w, m) {
  const secs = FIGHT_SECONDS[m.defn.boss]; if (!secs) return;
  let dps = 0; for (const h of w.heroes) if (!h.left && h.stats) dps += damageRating(h) * (CLASS_PACE[h.cls] ?? 3);
  if (dps <= 0) return;
  m.maxHp = Math.round(Math.max(m.maxHp * 0.25, Math.min(m.maxHp * 8, dps * secs)) * w.tuning.monsterHp * Math.sqrt(w.diff.hp)); m.hp = m.maxHp;
}
export function startBoss(w, m) {
  sizeBoss(w, m);
  const k = m.defn.boss;
  if (k === 'bursar') addBoss(w, m, { ticks: [0.3] });
  else if (k === 'ambrose') { addBoss(w, m, { ticks: [0.66, 0.33], round: 1 }); }
  else if (k === 'malison') addBoss(w, m, { ticks: [0.6, 0.25], rings: 0, ropes: [] });
  else addBoss(w, m, { ticks: [0.5] });
  m.aggro = true;
}

const SCRIPTS = {
  bursar(w, m, b) {
    b.t += DT; b.a -= DT; b.b -= DT; b.c -= DT;
    const t = pickT(w, m); if (!t) return;
    const hpf = m.hp / m.maxHp;
    if (b.lock > 0) { b.lock -= DT; } else if (Math.hypot(t.x - m.x, t.z - m.z) > 3) walkTo(w, m, t.x, t.z, m.speed);
    if (b.a <= 0) { // Audit: a circle on each player, the ledger slams.
      b.a = 6.5; b.lock = 1.4; atk(w, m, 'CoffinSlam', 1.4);
      if (w.rngs.ai.chance(0.5)) say(w, 'bursar', w.rngs.ai.pick(['YOUR SOUL IS OVERDUE!', 'INTEREST COMPOUNDS, LITTLE CORPSE!', 'I HAVE YOU DOWN FOR ONE DEATH. I SEE IT WAS NOT COLLECTED.']));
      for (const h of livingHeroes(w)) telegraph(w, { kind: 'circle', x: h.x, z: h.z, r: 5, dur: 2, dmg: m.hit * 1.6, level: m.level, name: m.name, vfx: 'ring_chain', sfx: 'coffin_crash', shake: 0.35, color: 'red' });
    }
    if (b.b <= 0) { // Collections: a sweep steals 10% gold, scattered coins heal.
      b.b = 10; b.lock = 1; atk(w, m, 'Slash3', 1);
      telegraph(w, { kind: 'circle', x: m.x, z: m.z, r: 6, dur: 1, dmg: m.hit, level: m.level, name: m.name, vfx: 'ring_bronze', sfx: 'coin_spray', moveWith: m, onHit: (w2, h) => {
        const lost = Math.round(h.gold * 0.1); h.gold -= lost;
        emit(w2, { t: 'toast', seat: h.seat, text: 'COLLECTIONS! PICK UP YOUR COINS.', color: 'sand' });
        for (let i = 0; i < 8; i++) { const p = findOpenNear(w2, h.x + w2.rngs.ai.range(-5, 5), h.z + w2.rngs.ai.range(-5, 5)); w2.hooks.dropCoins(w2, p.x, p.z, Math.max(1, Math.round(lost / 8)), h.seat); }
      } });
    }
    if (b.c <= 0) { // Adjustment: clerks.
      b.c = 13; atk(w, m, 'RaiseHands', 0.8);
      for (let i = 0; i < 2 + w.heroes.length * 2; i++) { const p = findOpenNear(w, m.x + w.rngs.ai.range(-5, 5), m.z + w.rngs.ai.range(-5, 5)); spawnMonster(w, 'skeleton_clerk', p.x, p.z, { dormant: false, aggro: true, noLoot: true, summoned: true }); }
      say(w, 'bursar', 'ADJUSTMENT! A CLERK TO SEE YOU.');
    }
    if (hpf < 0.3 && !b.foreclosed) { // Foreclosure: walls of coffins close in.
      b.foreclosed = true; say(w, 'bursar', 'FORECLOSURE!'); emit(w, { t: 'shake', v: 0.5 }); emit(w, { t: 'sfx', id: 'bell_big' }); emit(w, { t: 'bossphase', id: m.id, phase: 2 });
      const z = w.zone; w.arena = { box: { x0: 1, z0: 1, x1: z.w - 1, z1: z.h - 1 }, shrink: 0.32, minW: 9 };
      emit(w, { t: 'arena', box: w.arena.box });
    }
    if (w.arena?.box && b.foreclosed) {
      const a = w.arena.box; const s = w.arena.shrink * DT;
      if (a.x1 - a.x0 > w.arena.minW) { a.x0 += s; a.x1 -= s; }
      if (a.z1 - a.z0 > w.arena.minW) { a.z0 += s; a.z1 -= s; }
      w.arena.syncT = (w.arena.syncT ?? 0) - DT;
      if (w.arena.syncT <= 0) { w.arena.syncT = 0.5; emit(w, { t: 'arena', box: { ...a } }); }
      // Keep him inside the walls too.
      m.x = Math.max(a.x0 + 0.4, Math.min(a.x1 - 0.4, m.x)); m.z = Math.max(a.z0 + 0.4, Math.min(a.z1 - 0.4, m.z));
      // Those caught at the walls are squeezed.
      for (const h of livingHeroes(w)) if (h.x - a.x0 < 0.8 || a.x1 - h.x < 0.8 || h.z - a.z0 < 0.8 || a.z1 - h.z < 0.8) { h.squeezeT = (h.squeezeT ?? 0) - DT; if (h.squeezeT <= 0) { h.squeezeT = 0.5; damageHero(w, h, m.hit * 0.2, { name: 'THE COFFIN WALL', level: m.level }); } }
    }
  },
  ambrose(w, m, b) {
    b.t += DT; b.a -= DT; b.b -= DT; b.c -= DT;
    if (b.buriedT > 0) { b.buriedT -= DT; m.untargetable = true; m.invulnerable = true; if (b.buriedT <= 0) { // bursts out elsewhere, stronger
      const p = findOpenNear(w, w.zone.w / 2 + w.rngs.ai.range(-12, 12), w.zone.h / 2 + w.rngs.ai.range(-4, 4));
      m.x = p.x; m.z = p.z; m.px = p.x; m.pz = p.z; m.untargetable = false; m.invulnerable = false; m.hit *= 1.2; b.round++; m.speed *= 1.1;
      emit(w, { t: 'bossreveal', id: m.id, x: m.x, z: m.z }); emit(w, { t: 'shake', v: 0.5 }); emit(w, { t: 'sfx', id: 'coffin_crash' }); emit(w, { t: 'vfx', kind: 'ring_grave', x: m.x, z: m.z, r: 4 });
      say(w, 'ambrose', b.round === 2 ? 'ONE LEARNS TO KEEP A SPADE IN THE COFFIN.' : 'AGAIN, MY CHILD? THEY HAVE TRIED THIS THREE TIMES.');
      if (b.round >= 2) for (let i = 0; i < 2 + b.round; i++) { const q = findOpenNear(w, m.x + w.rngs.ai.range(-6, 6), m.z + w.rngs.ai.range(-6, 6)); spawnMonster(w, 'penitent', q.x, q.z, { dormant: false, aggro: true, noLoot: true, summoned: true }); }
    } return; }
    const t = pickT(w, m); if (!t) return;
    if (b.lock > 0) b.lock -= DT; else if (Math.hypot(t.x - m.x, t.z - m.z) > 4) walkTo(w, m, t.x, t.z, m.speed);
    if (b.a <= 0) { // Chains: a telegraphed lash.
      b.a = 3.4; b.lock = 0.8; atk(w, m, 'Cast', 0.8);
      telegraph(w, { kind: 'line', x: m.x, z: m.z, x2: t.x, z2: t.z, width: 0.9, dur: 0.8, dmg: m.hit, level: m.level, name: m.name, vfx: 'hook', sfx: 'chain_whirl', onHit: (w2, h) => { h.rootT = 0.8; } });
    }
    if (b.b <= 0) { // Censer: poison puffs.
      b.b = 5; atk(w, m, 'Slash2', 0.6);
      for (const h of livingHeroes(w)) { const x = h.x; const z = h.z; telegraph(w, { kind: 'circle', x, z, r: 2.4, dur: 0.8, color: 'lime', fire: (w2) => hostileField(w2, x, z, 2.4, 4, m.hit * 0.2, { level: m.level, name: 'THE CENSER', look: 'poison' }) }); }
    }
    if (b.round === 3 && b.c <= 0) { // Round three: a fire ring.
      b.c = 7; atk(w, m, 'CastBig', 1);
      telegraph(w, { kind: 'ring', x: m.x, z: m.z, r: 8, inner: 3, dur: 1, dmg: m.hit * 1.4, level: m.level, name: m.name, vfx: 'ring_fire', sfx: 'explode_fire', shake: 0.3, color: 'orange' });
      say(w, 'ambrose', 'THE SAINT SENDS HER REGARDS.', { rate: 0.4 });
    }
    const hpf = m.hp / m.maxHp;
    if ((b.round === 1 && hpf < 0.66) || (b.round === 2 && hpf < 0.33)) {
      b.buriedT = 2.5; b.a = 2; b.b = 3; b.c = 1;
      m.untargetable = true; m.invulnerable = true;
      emit(w, { t: 'bossbury', id: m.id, x: m.x, z: m.z }); emit(w, { t: 'shake', v: 0.4 }); emit(w, { t: 'sfx', id: 'coffin_crash' });
      say(w, 'ambrose', b.round === 1 ? 'THEY HAVE BURIED ME THREE TIMES, MY CHILD.' : 'A MOMENT. I SHALL JUST DIG MYSELF OUT.');
      emit(w, { t: 'bossphase', id: m.id, phase: b.round + 1 });
    }
  },
  malison(w, m, b) {
    b.t += DT; b.a -= DT; b.b -= DT; b.c -= DT; b.d -= DT;
    const t = pickT(w, m); if (!t) return;
    const hpf = m.hp / m.maxHp; const cx = w.zone.w / 2; const cz = w.zone.h / 2;
    if (b.phase === 1 && hpf < 0.6) { b.phase = 2; say(w, 'malison', 'THEY WALLED ME UP SINGING. DO YOU KNOW WHAT I LEARNED IN THE DARK? EVERY VERSE.'); emit(w, { t: 'bossphase', id: m.id, phase: 2 }); b.d = 8; w.pillars = w.hooks.malisonPillars(w); b.pits = []; b.pitT = 4; emit(w, { t: 'sfx', id: 'bell_cracked' }); emit(w, { t: 'shake', v: 0.6 }); }
    if (b.phase === 2 && hpf < 0.25) { b.phase = 3; b.rings = 0; say(w, 'malison', 'LISTEN. THAT IS EVERY GRAVE YOU EVER WALKED ON, OPENING.'); emit(w, { t: 'bossphase', id: m.id, phase: 3 }); w.hooks.malisonRopes(w); m.invulnerable = true; m.hp = m.maxHp * 0.25; emit(w, { t: 'dark', on: true }); w.dark = true; m.speed = 1.7; }
    if (b.phase === 3) {
      // She chases slowly, her touch is terrible. Three ropes end it.
      if (b.stagger > 0) b.stagger -= DT; else walkTo(w, m, t.x, t.z, m.speed);
      for (const h of livingHeroes(w)) if (near(h, m.x, m.z, m.r + 0.8) && (h.touchedT ?? 0) <= w.time) { h.touchedT = w.time + 0.8; damageHero(w, h, m.hit * 1.2, { name: m.name, level: m.level, pure: false }); moveCircle(w, h, (h.x - m.x) * 0.4, (h.z - m.z) * 0.4); }
      if (b.a <= 0) { b.a = 4; const h = t; telegraph(w, { kind: 'line', x: m.x, z: m.z, x2: h.x, z2: h.z, width: 0.8, dur: 0.9, dmg: m.hit * 0.7, level: m.level, name: m.name, vfx: 'hook', sfx: 'rope_lash' }); emit(w, { t: 'matk', id: m.id, clip: 'lash', dur: 0.9 }); }
      return;
    }
    if (Math.hypot(t.x - m.x, t.z - m.z) > 7) walkTo(w, m, t.x, t.z, m.speed); else if (Math.hypot(m.x - cx, m.z - cz) > 6) walkTo(w, m, cx, cz, m.speed * 0.6);
    if (b.a <= 0) { // Rope lashes along telegraphed lines.
      b.a = b.phase === 1 ? 2.6 : 3.2;
      for (const h of livingHeroes(w)) {
        for (let i = -1; i <= 1; i++) {
          const a = Math.atan2(h.x - m.x, h.z - m.z) + i * 0.55; const L = 22;
          telegraph(w, { kind: 'line', x: m.x, z: m.z, x2: m.x + Math.sin(a) * L, z2: m.z + Math.cos(a) * L, width: 0.9, dur: 0.9, dmg: m.hit, level: m.level, name: m.name, vfx: 'hook', sfx: 'rope_lash' });
        }
      }
      emit(w, { t: 'matk', id: m.id, clip: 'lash', dur: 0.9 });
    }
    if (b.b <= 0) { // Expanding rings with a gap to roll through.
      b.b = 7.5; emit(w, { t: 'sfx', id: 'bell_cracked', x: m.x, z: m.z });
      for (const [i, r] of [[0, 8], [1, 13], [2, 18]]) after(w, i * 0.8, () => { if (!m.dead) telegraph(w, { kind: 'ring', x: m.x, z: m.z, r: r + 1.2, inner: r - 1.2, dur: 0.75, dmg: m.hit * 1.2, level: m.level, name: m.name, vfx: 'ring_bronze', shake: 0.15, color: 'cyan' }); });
      if (w.rngs.ai.chance(0.5)) say(w, 'malison', w.rngs.ai.pick(['A THOUSAND YEARS I HAVE BEEN YOUR FOUNDATION STONE. NOW I SHALL BE YOUR CEILING.', 'RUN, LITTLE RINGER. THE HOUR IS UNRUNG, AND IT IS YOURS.']));
    }
    if (b.c <= 0) { // Adds.
      b.c = 12; const kinds = ['rattlebones', 'cinderling', 'penitent'];
      const k = w.rngs.ai.pick(kinds);
      for (let i = 0; i < 3 + w.heroes.length; i++) { const a = w.rngs.ai.range(0, 6.28); const p = findOpenNear(w, cx + Math.cos(a) * 14, cz + Math.sin(a) * 14); const s = spawnMonster(w, k, p.x, p.z, { dormant: false, aggro: true, noLoot: true, summoned: true, xpMul: 0.5 }); s.aggro = true; }
    }
    if (b.phase === 2) {
      // Floor sections crumble into pits, with a warning.
      b.pitT -= DT;
      if (b.pitT <= 0 && b.pits.length < 10) {
        b.pitT = 3.5;
        const col = Math.floor(cx + w.rngs.ai.range(-14, 14)); const row = Math.floor(cz + w.rngs.ai.range(-14, 14));
        const heroSafe = !livingHeroes(w).some((h) => Math.abs(h.x - col) < 2 && Math.abs(h.z - row) < 2);
        if (heroSafe) {
          telegraph(w, { kind: 'circle', x: col + 0.5, z: row + 0.5, r: 2.2, dur: 1.5, dmg: m.hit * 0.8, level: m.level, name: 'THE FLOOR', color: 'orange', fire: (w2) => { if (w2.hooks.closePit(w2, col, row)) { emit(w2, { t: 'pit', col, row }); b.pits.push({ col, row }); emit(w2, { t: 'sfx', id: 'crumble' }); } } });
        }
      }
      // Every 15 s the bell tolls: stand behind a pillar or take huge damage.
      if (b.d <= 0) {
        b.d = 15;
        emit(w, { t: 'toast', seat: -1, text: 'THE BELL TOLLS. GET BEHIND A PILLAR!', color: 'red' });
        emit(w, { t: 'tolling', dur: 2.5 });
        after(w, 2.5, () => {
          if (m.dead) return;
          emit(w, { t: 'sfx', id: 'bell_cracked' }); emit(w, { t: 'shake', v: 0.9 }); emit(w, { t: 'flash', color: 'white' });
          emit(w, { t: 'vfx', kind: 'ring_bronze', x: cx, z: cz, r: 22 });
          for (const h of livingHeroes(w)) {
            let covered = false;
            for (const p of w.pillars ?? []) if (!p.broken && segDist(cx, cz, h.x, h.z, p.x, p.z) < 1.1 && Math.hypot(p.x - cx, p.z - cz) < Math.hypot(h.x - cx, h.z - cz)) { covered = true; p.hits = (p.hits ?? 0) + 1; }
            if (!covered && h.invulnerable <= 0) damageHero(w, h, h.stats.maxHp * 0.6, { name: 'OLD CLEMENCY', pure: true });
            else h.tookCover = (h.tookCover ?? 0) + 1;
          }
          // A pillar that has sheltered someone through two tolls breaks.
          for (const p of w.pillars ?? []) if (p.hits >= 2 && !p.broken) { p.broken = true; w.hooks.breakPillar(w, p); }
        });
      }
    }
  },
  warden_sexton(w, m, b) { common(w, m, b); b.c -= 0; if (b.c <= 0) { b.c = 7; atk(w, m, 'RaiseHands', 0.8); for (let i = 0; i < 4; i++) { const p = findOpenNear(w, m.x + w.rngs.ai.range(-6, 6), m.z + w.rngs.ai.range(-6, 6)); const s = spawnMonster(w, 'rattlebones', p.x, p.z, { dormant: false, aggro: true, noLoot: true, summoned: true, xpMul: 0.2 }); s.hp = s.maxHp * 0.5; } } },
  warden_chorister(w, m, b) { common(w, m, b); if (b.c <= 0) { b.c = 8; for (let i = 0; i < 4; i++) { const p = findOpenNear(w, m.x + w.rngs.ai.range(-5, 5), m.z + w.rngs.ai.range(-5, 5)); spawnMonster(w, 'choir_skull', p.x, p.z, { dormant: false, aggro: true, noLoot: true, summoned: true, xpMul: 0.2 }); } emit(w, { t: 'sfx', id: 'sour_note' }); } if (b.d <= 0) { b.d = 5; for (const r of [6, 10]) telegraph(w, { kind: 'ring', x: m.x, z: m.z, r: r + 1, inner: r - 1, dur: 1, dmg: m.hit, level: m.level, name: m.name, vfx: 'ring_bronze', color: 'cyan' }); } },
  warden_jaw(w, m, b) {
    common(w, m, b);
    if (b.charge) { b.charge.t -= DT; const hit = moveCircle(w, m, b.charge.x * 11 * DT, b.charge.z * 11 * DT, m.r * 0.5); for (const h of livingHeroes(w)) if (near(h, m.x, m.z, m.r + 0.6) && (m.chargeHit ?? 0) < w.time) { m.chargeHit = w.time + 1; damageHero(w, h, m.hit * 1.3, { name: m.name, level: m.level }); } if (b.charge.t <= 0 || hit) { b.charge = null; emit(w, { t: 'shake', v: 0.4 }); emit(w, { t: 'sfx', id: 'hit_stone' }); b.lock = 1; } return; }
    if (b.c <= 0) { const t = pickT(w, m); if (!t) return; b.c = 6; b.lock = 1; const d = Math.hypot(t.x - m.x, t.z - m.z) || 1; const dx = (t.x - m.x) / d; const dz = (t.z - m.z) / d; atk(w, m, 'Roar', 1); emit(w, { t: 'sfx', id: 'roar' }); telegraph(w, { kind: 'line', x: m.x, z: m.z, x2: m.x + dx * 14, z2: m.z + dz * 14, width: 1.6, dur: 1, color: 'red', fire: () => { b.charge = { x: dx, z: dz, t: 1.2 }; } }); }
  },
};
function common(w, m, b) {
  b.t += DT; b.a -= DT; b.b -= DT; b.c -= DT; b.d -= DT;
  const t = pickT(w, m); if (!t) return;
  if (b.lock > 0) b.lock -= DT; else if (Math.hypot(t.x - m.x, t.z - m.z) > 3 && !b.charge) walkTo(w, m, t.x, t.z, m.speed * (m.hp < m.maxHp / 2 ? 1.25 : 1));
  if (b.a <= 0) { b.a = 3.2; b.lock = 0.9; atk(w, m, 'CoffinSlam', 0.9); const fx = m.x + Math.sin(m.facing) * 2; const fz = m.z + Math.cos(m.facing) * 2; telegraph(w, { kind: 'circle', x: fx, z: fz, r: 3, dur: 0.9, dmg: m.hit, level: m.level, name: m.name, vfx: 'ring_chain', sfx: 'coffin_crash', shake: 0.25 }); }
  if (m.hp < m.maxHp / 2 && !b.half) { b.half = true; emit(w, { t: 'bossphase', id: m.id, phase: 2 }); say(w, 'warden', 'THE KNELL IS NOT FINISHED WITH YOU.'); }
}
const segDist = (ax, az, bx, bz, px, pz) => { const dx = bx - ax; const dz = bz - az; const L2 = dx * dx + dz * dz || 1; const u = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)); return Math.hypot(px - (ax + dx * u), pz - (az + dz * u)); };

export function stepBoss(w, m) {
  if (!m.bossState) { if (w.heroes.some((h) => !h.dead && near(h, m.x, m.z, 15))) { startBoss(w, m); if (m.defn.boss === 'ambrose') { emit(w, { t: 'say', who: 'ambrose', text: 'My child. You have come so far, and you have tracked in so much mud. Let us pray.' }); emit(w, { t: 'music', song: 'ledger' }); } } else return; }
  if (m.intro > 0) { m.intro -= DT; return; }
  SCRIPTS[m.defn.boss](w, m, m.bossState);
}

export function bossOnDeath(w, m, killer) {
  const b = m.bossState; if (!b) return false;
  if (m.defn.boss === 'ambrose' && b.round < 3) { m.hp = 1; return true; }
  if (m.defn.boss === 'malison' && b.phase < 3) { m.hp = 1; return true; }
  w.arena = null; w.pillars = w.pillars ?? [];
  emit(w, { t: 'boss', id: m.id, on: false });
  emit(w, { t: 'bossdeath', id: m.id, type: m.type, x: m.x, z: m.z });
  w.boss = null; w.bossKills = w.bossKills ?? {}; w.bossKills[m.type] = (w.bossKills[m.type] ?? 0) + 1;
  w.hooks.bossDead(w, m, killer);
  return false;
}
// A rope rung: she staggers, the bell rings true, 12%, three end it.
export function ringRope(w, rope, h) {
  const m = w.boss?.m; if (!m) return;
  rope.used = true; const b = m.bossState; b.rings++; b.stagger = 2.5;
  m.invulnerable = false; m.hp -= m.maxHp * 0.12; m.invulnerable = true;
  if (m.hp <= 0) m.hp = 1;
  emit(w, { t: 'bell', true: true, n: b.rings }); emit(w, { t: 'shake', v: 1 }); emit(w, { t: 'flash', color: 'sand' }); emit(w, { t: 'sfx', id: 'bell_true' });
  emit(w, { t: 'rope', id: rope.id, used: true });
  emit(w, { t: 'vfx', kind: 'ring_bronze', x: m.x, z: m.z, r: 20 });
  say(w, 'malison', b.rings === 1 ? 'NO. NOT THAT NOTE. NOT THAT ONE!' : b.rings === 2 ? 'STOP IT. I WAS SINGING. I WAS STILL SINGING!' : 'A THOUSAND YEARS! A THOUSAND!');
  h.rung = (h.rung ?? 0) + 1;
  if (b.rings >= 3) { m.invulnerable = false; m.hp = 0; killMonster(w, m, h, { overkill: 1 }); }
}
