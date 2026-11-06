// Scripted bosses. Every big attack telegraphs and can be rolled through.
import { STORY_LINES } from '../data/dialog.js';
import { MONSTERS } from '../data/monsters.js';
import { DT, dist, ev, say, setCellOpen, slide, toast, walkable } from './core.js';
import { hurtHero } from './hero.js';
import { dropGold, dropItem, goldAt, makeRolledItem, spawnDrop } from './loot.js';
import { facingOf, monsterSpeed, nearestHero, openSpot, spawnMonster, killMonster } from './monsters.js';
import { spawnEnemyArea, spawnWave, telegraphLine, telegraphRing } from './hazards.js';
import { addObject, setObjectState } from './objects.js';
import { onBossKilled, onEventide } from './quests.js';

export function startBoss(w, type, x, z, o = {}) {
  const def = MONSTERS[type];
  const m = spawnMonster(w, type, x, z, { state: 'chase', knellPts: 0, ...o });
  m.bossState = { phase: 1, t: 0, audit: 4, sweep: 8, adds: 12, lash: 2.5, wave: 5, taunt: 8, swing: 0, round: 1, ...(o.state0 ?? {}) };
  w.boss = m;
  ev(w, { t: 'boss', id: m.id, name: def.title, song: def.song ?? '', phases: PHASES[def.boss] ?? [], k: type, intro: o.noIntro ? 0 : 1 });
  bossScripts[def.boss]?.init?.(w, m, m.bossState);
  return m;
}

export const PHASES = { malison: [0.6, 0.25], bursar: [0.3], ambrose: [], warden_sexton: [0.5], warden_chorister: [0.5], warden_jaw: [0.5], cellarer: [] };

function chase(w, m, t, mul = 1, stopAt = 0.5) {
  const dx = t.x - m.x, dz = t.z - m.z, l = Math.hypot(dx, dz) || 1;
  m.facing = facingOf(dx, dz);
  if (l <= m.r + stopAt) return false;
  const speed = monsterSpeed(m) * mul * DT;
  let ux = dx / l, uz = dz / l;
  if (!w.zone.nav.lineOfSight(m.x, m.z, t.x, t.z)) {
    const out = [0, 0];
    if (w.zone.navs[t.navIndex ?? 0]?.flowDirection(m.x, m.z, out)) { ux = out[0]; uz = out[1]; }
  }
  slide(w, m, ux * speed, uz * speed, Math.min(m.r, 0.8));
  m.moving = true;
  return true;
}

function taunt(w, m, b, lines, who, every = 22) {
  b.taunt -= DT;
  if (b.taunt <= 0) { b.taunt = every; say(w, who, w.rng.pick(lines)); }
}

function melee(w, m, b, t, r = 3, windup = 0.7, mul = 1) {
  b.swing -= DT;
  if (b.swing <= 0 && dist(m.x, m.z, t.x, t.z) < m.r + r) {
    b.swing = windup + 1.2;
    ev(w, { t: 'mcast', id: m.id, clip: m.def.clipAttack ?? 'Slam', sp: 0.6 / windup });
    const fx = Math.sin(m.facing), fz = Math.cos(m.facing);
    telegraphRing(w, m.x + fx * m.r, m.z + fz * m.r, r, windup, m.dmg * mul, { src: m, vfx: 'dust_ring', sfx: 'stone_hit', shake: 0.3 });
    return true;
  }
  return false;
}

const bossScripts = {
  // THE BURSAR -----------------------------------------------------------------------------
  bursar: {
    step(w, m, b) {
      const t = nearestHero(w, m);
      if (!t) return;
      taunt(w, m, b, STORY_LINES.bursar_lines, 'bursar');
      if (b.wait > 0) { b.wait -= DT; return; }
      chase(w, m, t, 1, 1.5);
      melee(w, m, b, t, 3.2, 0.8, 1.1);
      b.audit -= DT;
      if (b.audit <= 0) {
        b.audit = 9;
        ev(w, { t: 'mcast', id: m.id, clip: 'CastBig', sp: 0.7 });
        say(w, 'bursar', 'AUDIT!');
        for (const h of w.heroes) {
          if (h.dead || h.gone) continue;
          telegraphRing(w, h.x, h.z, 2.5, 2, m.dmg * 1.6, { src: m, vfx: 'ledger_slam', sfx: 'coffin_slam', shake: 0.4, knock: 1 });
        }
      }
      b.sweep -= DT;
      if (b.sweep <= 0) {
        b.sweep = 14;
        const l = Math.hypot(t.x - m.x, t.z - m.z) || 1;
        const dx = (t.x - m.x) / l, dz = (t.z - m.z) / l;
        ev(w, { t: 'mcast', id: m.id, clip: 'Slash3', sp: 0.7 });
        telegraphLine(w, m.x, m.z, dx, dz, 10, 5, 1, m.dmg * 0.9, {
          src: m, vfx: 'sweep', sfx: 'coins', shake: 0.3,
          onHit: (h) => {
            const take = Math.floor(h.gold * 0.1);
            if (take <= 0) return;
            h.gold -= take;
            const piles = Math.min(12, take);
            for (let i = 0; i < piles; i++) {
              const p = openSpot(w, h.x, h.z, 4);
              spawnDrop(w, { kind: 'coin', amount: Math.max(1, Math.round(take / piles)), x: p.x, z: p.z, owner: h.seat });
            }
            say(w, 'bursar', 'COLLECTIONS!');
          },
        });
      }
      b.adds -= DT;
      if (b.adds <= 0) {
        b.adds = 18;
        say(w, 'bursar', 'A SMALL ADJUSTMENT!');
        ev(w, { t: 'mcast', id: m.id, clip: 'RaiseHands', sp: 0.8 });
        for (let i = 0; i < 4; i++) { const p = openSpot(w, m.x, m.z, 5); spawnMonster(w, 'rattlebones', p.x, p.z, { state: 'chase', from: 'ground', noXp: true, summoned: true, name: 'CLERK' }); }
      }
      if (!b.foreclosed && m.hp < m.maxHp * 0.3) {
        b.foreclosed = true;
        b.closing = 0;
        b.ring = 0;
        b.closed = [];
        say(w, 'bursar', 'FORECLOSURE!');
        ev(w, { t: 'mcast', id: m.id, clip: 'Shout', sp: 0.7 });
      }
      if (b.foreclosed) {
        b.closing -= DT;
        // Anyone outside the walls (a death, a walk home) gets the room back: it never locks you out.
        const room = w.zone.rooms.find((r) => r.tpl?.boss === 'bursar');
        const outside = room && w.heroes.some((h) => !h.gone && !h.dead && !(h.x >= room.x && h.x < room.x + room.w && h.z >= room.y && h.z < room.y + room.h));
        if (outside) { if (b.closed.length) { reopenAll(w, b); b.ring = 0; } b.closing = 4; }
        else if (b.closing <= 0 && b.ring < 5) { b.closing = 4; closeRing(w, m, b); }
      }
    },
    died(w, m, b) { reopenAll(w, b); },
  },

  // BISHOP AMBROSE -------------------------------------------------------------------------
  ambrose: {
    step(w, m, b) {
      if (b.buried > 0) {
        b.buried -= DT;
        if (b.buried <= 0) {
          const t = nearestHero(w, m);
          let px = m.x, pz = m.z;
          for (let i = 0; i < 16 && t; i++) { const p = openSpot(w, b.cx, b.cz, 8); if (dist(p.x, p.z, t.x, t.z) > 4) { px = p.x; pz = p.z; break; } }
          m.x = px; m.z = pz;
          m.hidden = false; m.invuln = false;
          ev(w, { t: 'unhide', id: m.id, x: px, z: pz });
          ev(w, { t: 'fx', k: 'grave_burst', s: 'coffin_slam', sh: 0.5, wv: 1, x: px, z: pz, r: 3 });
          ev(w, { t: 'mcast', id: m.id, clip: 'GetUp', sp: 1 });
          say(w, 'ambrose', b.round === 2 ? 'ONE LEARNS TO KEEP A SPADE IN THE COFFIN.' : 'TWICE MORE. I HAVE PRACTISED.');
        }
        return;
      }
      const t = nearestHero(w, m);
      if (!t) return;
      taunt(w, m, b, STORY_LINES.ambrose_lines, 'ambrose', 18);
      chase(w, m, t, 1, 3);
      melee(w, m, b, t, 2.4, 0.6, 0.9);
      b.lash -= DT;
      if (b.lash <= 0) {
        b.lash = 4 - b.round * 0.5;
        ev(w, { t: 'mcast', id: m.id, clip: 'CastWeapon', sp: 1 });
        for (const h of w.heroes) {
          if (h.dead || h.gone) continue;
          const l = Math.hypot(h.x - m.x, h.z - m.z) || 1;
          telegraphLine(w, m.x, m.z, (h.x - m.x) / l, (h.z - m.z) / l, Math.min(14, l + 3), 1.1, 0.8, m.dmg * 0.8, { src: m, vfx: 'chain_line', sfx: 'chain', root: 1 });
        }
      }
      b.wave -= DT;
      if (b.wave <= 0) {
        b.wave = 7;
        ev(w, { t: 'mcast', id: m.id, clip: 'CastBig', sp: 1 });
        for (const h of w.heroes) {
          if (h.dead || h.gone) continue;
          telegraphRing(w, h.x, h.z, 2.4, 1, m.dmg * 0.5, { src: m, vfx: 'poison_burst', sfx: 'burst_wet', pool: { kind: 'poison_pool', r: 2.4, life: 5, tick: 0.5, dps: m.dmg * 0.25 } });
        }
      }
      if (b.round >= 2) {
        b.adds -= DT;
        if (b.adds <= 0) {
          b.adds = 13;
          say(w, 'ambrose', 'COME, PENITENTS. COME AND BE FORGIVEN.');
          for (let i = 0; i < 2 + w.heroes.length; i++) { const p = openSpot(w, m.x, m.z, 6); spawnMonster(w, 'penitent', p.x, p.z, { state: 'chase', from: 'ground', noXp: true, summoned: true }); }
        }
      }
      if (b.round >= 3) {
        b.ring = (b.ring ?? 3) - DT;
        if (b.ring <= 0) {
          b.ring = 6;
          ev(w, { t: 'mcast', id: m.id, clip: 'Shout', sp: 1 });
          spawnWave(w, m.x, m.z, { speed: 6, maxR: 16, thick: 0.8, dmg: m.dmg * 1.1, el: 'flame', gapA: w.rng.range(-3.14, 3.14), gapW: 0.9 });
        }
      }
    },
    damaged(w, m, b) {
      if (m.hp > 0 || b.round >= 3) return;
      b.round++;
      m.hp = m.maxHp;
      m.dmg *= 1.25;
      m.invuln = true;
      m.hidden = true;
      m.status = {};
      b.buried = 2.2;
      b.cx = m.x; b.cz = m.z;
      ev(w, { t: 'hide', id: m.id, x: m.x, z: m.z, coffin: 1 });
      ev(w, { t: 'obj_fall', k: 'coffin', x: m.x, z: m.z });
      ev(w, { t: 'fx', k: 'dust_ring', s: 'coffin_slam', sh: 0.6, wv: 1, x: m.x, z: m.z, r: 3 });
      ev(w, { t: 'boss_round', id: m.id, round: b.round });
    },
  },

  // MALISON --------------------------------------------------------------------------------
  malison: {
    init(w, m, b) {
      b.cx = m.x; b.cz = m.z;
      b.pillars = (w.zone.pillars ?? []).map((p) => ({ x: p.x, z: p.z, hp: 2, col: Math.floor(p.x), row: Math.floor(p.z) }));
      b.toll = 15; b.crumble = 6; b.lash = 3; b.wave = 6; b.adds = 16; b.pits = [];
    },
    step(w, m, b) {
      const t = nearestHero(w, m);
      if (!t) return;
      const pct = m.hp / m.maxHp;
      if (b.phase === 1 && pct <= 0.6) enterPhase2(w, m, b);
      if (b.phase === 2 && pct <= 0.25) enterPhase3(w, m, b);
      b.ropeSway = (b.ropeSway ?? 0) + DT;
      m.facing = facingOf(t.x - m.x, t.z - m.z);
      if (b.stagger > 0) { b.stagger -= DT; return; }
      taunt(w, m, b, STORY_LINES.malison_lines, 'malison', 24);
      if (b.phase < 3) {
        // Hold the middle, near enough, and work.
        chase(w, m, { x: b.cx, z: b.cz, navIndex: 0 }, 0.5, 1);
        b.lash -= DT;
        if (b.lash <= 0) {
          b.lash = b.phase === 1 ? 3.2 : 2.6;
          ev(w, { t: 'mcast', id: m.id, clip: 'lash', sp: 1 });
          for (const h of w.heroes) {
            if (h.dead || h.gone) continue;
            const base = Math.atan2(h.z - m.z, h.x - m.x);
            for (const off of [-0.45, 0, 0.45]) {
              const a = base + off;
              telegraphLine(w, m.x, m.z, Math.cos(a), Math.sin(a), 18, 1.3, 1, m.dmg * 0.9, { src: m, vfx: 'rope_lash', sfx: 'whip', shake: 0.15, knock: 1.5 });
            }
          }
        }
        b.wave -= DT;
        if (b.wave <= 0) {
          b.wave = b.phase === 1 ? 7 : 9;
          ev(w, { t: 'mcast', id: m.id, clip: 'scream', sp: 1 });
          ev(w, { t: 'sfx', k: 'bell_cracked', x: m.x, z: m.z });
          spawnWave(w, m.x, m.z, { speed: 6.5, maxR: 20, thick: 0.8, dmg: m.dmg * 1.2, el: 'sound', gapA: w.rng.range(-3.14, 3.14), gapW: 1.1 });
        }
        b.adds -= DT;
        if (b.adds <= 0) {
          b.adds = 16;
          for (let i = 0; i < 3; i++) { const p = openSpot(w, m.x, m.z, 10); spawnMonster(w, 'rattlebones', p.x, p.z, { state: 'chase', from: 'ground', noXp: true, summoned: true }); }
          const q = openSpot(w, m.x, m.z, 10);
          spawnMonster(w, 'penitent', q.x, q.z, { state: 'chase', from: 'ground', noXp: true, summoned: true });
        }
      }
      for (let i = (b.pitTimers?.length ?? 0) - 1; i >= 0; i--) {
        const p = b.pitTimers[i];
        p.t -= DT;
        if (p.t > 0) continue;
        for (const [col, row] of p.cells) setCellOpen(w, col, row, true);
        ev(w, { t: 'obstx', id: p.id, x: p.x, z: p.z });
        b.pitTimers.splice(i, 1);
      }
      if (b.phase === 2) {
        b.crumble -= DT;
        if (b.crumble <= 0) {
          b.crumble = 6;
          crumbleCell(w, m, b, t);
        }
        b.toll -= DT;
        if (b.toll <= 2.5 && !b.tollWarned) {
          b.tollWarned = true;
          ev(w, { t: 'toll_warn', d: 2.5 });
          toast(w, 'THE BELL TOLLS. GET BEHIND A PILLAR', 'red', { big: 1 });
        }
        if (b.toll <= 0) {
          b.toll = 15;
          b.tollWarned = false;
          bellToll(w, m, b);
        }
      }
      if (b.phase === 3) {
        chase(w, m, t, 1.1, 0.6);
        // Her touch is terrible.
        b.touch = (b.touch ?? 0) - DT;
        if (b.touch <= 0) {
          for (const h of w.heroes) {
            if (h.dead || h.gone) continue;
            if (dist(m.x, m.z, h.x, h.z) < m.r + 1.2) {
              b.touch = 1.2;
              hurtHero(w, h, m.dmg * 2.2, { src: m, knockFrom: m, knock: 3 });
              ev(w, { t: 'fx', k: 'dust_ring', s: 'stone_hit', sh: 0.4, x: h.x, z: h.z, r: 2 });
              break;
            }
          }
        }
        b.lash -= DT;
        if (b.lash <= 0) {
          b.lash = 4;
          for (const h of w.heroes) {
            if (h.dead || h.gone) continue;
            const l = Math.hypot(h.x - m.x, h.z - m.z) || 1;
            telegraphLine(w, m.x, m.z, (h.x - m.x) / l, (h.z - m.z) / l, 16, 1.4, 1, m.dmg * 0.8, { src: m, vfx: 'rope_lash', sfx: 'whip', shake: 0.15 });
          }
        }
      }
    },
    damaged(w, m, b) {
      // In the last phase only the bell can finish her.
      if (b.phase === 3 && (b.rings ?? 0) < 3 && m.hp < m.maxHp * 0.02) m.hp = m.maxHp * 0.02;
    },
    died(w, m, b) { reopenAll(w, b); },
  },

  // THE CELLARER ---------------------------------------------------------------------------
  cellarer: {
    step(w, m, b) {
      const t = nearestHero(w, m);
      if (!t) return;
      chase(w, m, t, 1, 1);
      melee(w, m, b, t, 2.6, 0.7, 1);
      b.adds -= DT;
      if (b.adds <= 0) {
        b.adds = 12;
        say(w, 'cellarer', 'THE HERRING HAS TURNED!');
        for (let i = 0; i < 4; i++) { const p = openSpot(w, m.x, m.z, 5); spawnMonster(w, 'peatwalker', p.x, p.z, { state: 'chase', from: 'ground', noXp: true, summoned: true }); }
      }
      b.audit -= DT;
      if (b.audit <= 0) {
        b.audit = 7;
        ev(w, { t: 'mcast', id: m.id, clip: 'Slam', sp: 0.8 });
        telegraphRing(w, t.x, t.z, 2.4, 1, m.dmg, { src: m, vfx: 'poison_burst', sfx: 'burst_wet', pool: { kind: 'poison_pool', r: 2.4, life: 5, tick: 0.5, dps: m.dmg * 0.25 } });
      }
    },
    died(w, m) {
      addObject(w, 'book', m.x + 1, m.z, { lore: null, key: 'overdue_book', label: 'THE OVERDUE BOOK', announce: true });
    },
  },

  // KNELL WARDENS ---------------------------------------------------------------------------
  warden_sexton: {
    step(w, m, b) {
      const t = nearestHero(w, m);
      if (!t) return;
      if (b.phase === 1 && m.hp < m.maxHp * 0.5) { b.phase = 2; say2(w, m, 'THE PLOT THICKENS.'); }
      chase(w, m, t, 1, 1);
      melee(w, m, b, t, 2.8, 0.7, 1.1);
      b.adds -= DT;
      if (b.adds <= 0) {
        b.adds = 10;
        ev(w, { t: 'mcast', id: m.id, clip: 'RaiseHands', sp: 1 });
        ev(w, { t: 'sfx', k: 'raise', x: m.x, z: m.z });
        for (let i = 0; i < 5; i++) { const p = openSpot(w, m.x, m.z, 7); spawnMonster(w, 'rattlebones', p.x, p.z, { state: 'chase', from: 'ground', noXp: true, summoned: true, knellPts: 0 }); }
      }
      if (b.phase === 2) {
        b.audit -= DT;
        if (b.audit <= 0) {
          b.audit = 5;
          for (let i = 0; i < 5; i++) { const p = openSpot(w, t.x, t.z, 6); telegraphRing(w, p.x, p.z, 1.8, 1, m.dmg, { src: m, vfx: 'dust_ring', sfx: 'coffin_slam', shake: 0.15 }); ev(w, { t: 'obj_fall', k: 'coffin', x: p.x, z: p.z, delay: 0.7 }); }
        }
      }
    },
  },
  warden_chorister: {
    step(w, m, b) {
      const t = nearestHero(w, m);
      if (!t) return;
      if (b.phase === 1 && m.hp < m.maxHp * 0.5) { b.phase = 2; say2(w, m, 'AND AGAIN, FROM THE TOP.'); }
      chase(w, m, t, 0.9, 5);
      b.wave -= DT;
      if (b.wave <= 0) {
        b.wave = b.phase === 2 ? 3.5 : 5;
        ev(w, { t: 'sfx', k: 'sour_note', x: m.x, z: m.z });
        spawnWave(w, m.x, m.z, { speed: 6, maxR: 16, thick: 0.8, dmg: m.dmg, el: 'sound', gapA: w.rng.range(-3.14, 3.14), gapW: 1.1 });
      }
      b.adds -= DT;
      if (b.adds <= 0) {
        b.adds = 11;
        for (let i = 0; i < 4; i++) { const p = openSpot(w, m.x, m.z, 6); spawnMonster(w, 'choir_skull', p.x, p.z, { state: 'chase', noXp: true, summoned: true, knellPts: 0 }); }
      }
      b.lash -= DT;
      if (b.lash <= 0) {
        b.lash = 3;
        for (const h of w.heroes) {
          if (h.dead || h.gone) continue;
          telegraphRing(w, h.x, h.z, 2, 1, m.dmg * 0.8, { src: m, vfx: 'ring_bronze', sfx: 'bell_small' });
        }
      }
    },
  },
  warden_jaw: {
    init(w, m, b) { b.charge = 3; b.state = 'walk'; },
    step(w, m, b) {
      const t = nearestHero(w, m);
      if (!t) return;
      if (b.phase === 1 && m.hp < m.maxHp * 0.5) { b.phase = 2; ev(w, { t: 'sfx', k: 'roar', x: m.x, z: m.z }); }
      if (b.state === 'roar') {
        b.t -= DT;
        if (b.t <= 0) { b.state = 'charge'; b.left = 14; }
        return;
      }
      if (b.state === 'charge') {
        const step = (b.phase === 2 ? 13 : 10) * DT;
        const x0 = m.x, z0 = m.z;
        slide(w, m, b.dx * step, b.dz * step, 0.8);
        b.left -= step;
        for (const h of w.heroes) {
          if (h.dead || h.gone) continue;
          if (dist(h.x, h.z, m.x, m.z) < m.r + 0.5 && (h.jawT ?? 0) <= w.time) { h.jawT = w.time + 1; hurtHero(w, h, m.dmg * 1.4, { src: m, knockFrom: m, knock: 3 }); }
        }
        if (Math.hypot(m.x - x0, m.z - z0) < step * 0.5) {
          ev(w, { t: 'fx', k: 'dust_ring', s: 'stone_hit', sh: 0.5, wv: 1, x: m.x, z: m.z, r: 3 });
          m.status.stun = 2.5; b.state = 'walk';
        } else if (b.left <= 0) b.state = 'walk';
        return;
      }
      chase(w, m, t, 1, 1);
      melee(w, m, b, t, 2.8, 0.7, 1);
      b.charge -= DT;
      if (b.charge <= 0 && dist(m.x, m.z, t.x, t.z) > 4) {
        b.charge = b.phase === 2 ? 4 : 6;
        b.state = 'roar'; b.t = 1;
        const l = Math.hypot(t.x - m.x, t.z - m.z) || 1;
        b.dx = (t.x - m.x) / l; b.dz = (t.z - m.z) / l;
        m.facing = facingOf(b.dx, b.dz);
        ev(w, { t: 'sfx', k: 'roar', x: m.x, z: m.z });
        ev(w, { t: 'mcast', id: m.id, clip: 'roar', sp: 1 });
        telegraphLine(w, m.x, m.z, b.dx, b.dz, 14, 3, 1, 0, { silent: true });
      }
      b.audit -= DT;
      if (b.audit <= 0 && b.phase === 2) {
        b.audit = 8;
        telegraphRing(w, t.x, t.z, 2.2, 0.8, m.dmg * 0.4, { src: m, vfx: 'bone_rise', sfx: 'bone_hit', entomb: 3 });
      }
    },
  },
};

const say2 = (w, m, text) => ev(w, { t: 'sub', who: 'warden', name: m.def.name, text });

function closeRing(w, m, b) {
  // The room's walls of coffins, one ring tighter each time. Never closer than 5 m from the middle.
  const room = w.zone.rooms.find((r) => r.tpl?.boss === 'bursar');
  if (!room) return;
  const k = b.ring + 1;
  const cells = [];
  const x0 = room.x + k, x1 = room.x + room.w - 1 - k, y0 = room.y + k, y1 = room.y + room.h - 1 - k;
  if (x1 - x0 < 10 || y1 - y0 < 8) { b.ring = 99; return; }
  for (let x = x0; x <= x1; x++) { cells.push([x, y0], [x, y1]); }
  for (let y = y0; y <= y1; y++) { cells.push([x0, y], [x1, y]); }
  const closed = [];
  for (const [cx, cz] of cells) {
    if (!w.zone.nav.isOpen(cx, cz)) continue;
    setCellOpen(w, cx, cz, false);
    closed.push([cx, cz]);
  }
  b.closed.push(...closed);
  b.ring++;
  ev(w, { t: 'obst', id: w.nextId++, k: 'coffin_wall', x: m.x, z: m.z, cells: closed, life: 999 });
  ev(w, { t: 'sfx', k: 'coffin_slam', x: m.x, z: m.z });
  // Anyone caught in the closing wall steps inward.
  const cx = room.x + room.w / 2, cz = room.y + room.h / 2;
  for (const h of w.heroes) {
    if (walkable(w, h.x, h.z)) continue;
    const l = Math.hypot(cx - h.x, cz - h.z) || 1;
    for (let d = 1; d < 8; d += 0.5) {
      const px = h.x + ((cx - h.x) / l) * d, pz = h.z + ((cz - h.z) / l) * d;
      if (walkable(w, px, pz)) { h.x = px; h.z = pz; break; }
    }
  }
  for (const o of w.monsters) if (!walkable(w, o.x, o.z)) { o.x = cx; o.z = cz; }
}

function reopenAll(w, b) {
  for (const [cx, cz] of b.closed ?? []) setCellOpen(w, cx, cz, true);
  for (const [cx, cz] of b.pits ?? []) setCellOpen(w, cx, cz, true);
  if (b.closed?.length || b.pits?.length) ev(w, { t: 'obst_clear' });
  b.closed = []; b.pits = [];
}

function enterPhase2(w, m, b) {
  b.phase = 2;
  b.toll = 8; b.crumble = 3;
  ev(w, { t: 'boss_phase', id: m.id, phase: 2 });
  say(w, 'malison', 'THE CRACKED HOUR. COUNT WITH ME.');
  ev(w, { t: 'fx', k: 'dust_ring', s: 'bell_cracked', sh: 0.6, wv: 1, x: m.x, z: m.z, r: 6 });
}

function enterPhase3(w, m, b) {
  b.phase = 3;
  b.rings = 0;
  ev(w, { t: 'boss_phase', id: m.id, phase: 3 });
  say(w, 'malison', 'EVENTIDE. THE LAST TOLL IS MINE. ALL OF IT.');
  ev(w, { t: 'dark', on: 1 });
  reopenPits(w, b);
  // Three ropes at the rim.
  const r = 11;
  [Math.PI / 2, (Math.PI * 7) / 6, (Math.PI * 11) / 6].forEach((a, i) => {
    let x = b.cx + Math.cos(a) * r, z = b.cz + Math.sin(a) * r;
    for (let d = r; d > 2 && !walkable(w, x, z); d -= 0.5) { x = b.cx + Math.cos(a) * d; z = b.cz + Math.sin(a) * d; }
    addObject(w, 'rope', x, z, { key: 'rope', hold: 2, announce: true, r: 1.2, ropeIndex: i, id: 1500000 + i });
  });
  toast(w, 'HOLD A BELL ROPE TO RING OLD CLEMENCY', 'sand', { big: 1 });
  onEventide(w);
}

function reopenPits(w, b) {
  for (const [cx, cz] of b.pits ?? []) setCellOpen(w, cx, cz, true);
  b.pits = [];
  b.pitTimers = [];
  ev(w, { t: 'obst_clear' });
}

export function ringRope(w, h, rope) {
  const m = w.boss;
  if (!m || m.def.boss !== 'malison') return;
  const b = m.bossState;
  b.rings = (b.rings ?? 0) + 1;
  b.stagger = 2.5;
  m.hp = Math.max(m.maxHp * 0.03, m.hp - m.maxHp * 0.12);
  ev(w, { t: 'ring_bell', n: b.rings, x: m.x, z: m.z });
  ev(w, { t: 'fx', k: 'ring_bronze', s: 'bell_true', sh: 1, wv: 1, x: m.x, z: m.z, r: 8 });
  ev(w, { t: 'mcast', id: m.id, clip: 'stagger', sp: 1 });
  ev(w, { t: 'hit', id: m.id, a: Math.round(m.maxHp * 0.12), c: 1, el: 'sound', s: h.seat, x: m.x, z: m.z, big: 1 });
  if (b.rings >= 3) {
    say(w, 'malison', 'NOT THE BELL. NOT TRUE. NOT TRUE...');
    killMonster(w, m, h, { big: true });
  }
}

function crumbleCell(w, m, b, t) {
  const cx = Math.floor(t.x + w.rng.range(-3, 3)), cz = Math.floor(t.z + w.rng.range(-3, 3));
  const cells = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const col = cx + i, row = cz + j;
    if (!w.zone.nav.isOpen(col, row)) continue;
    if (Math.hypot(col + 0.5 - b.cx, row + 0.5 - b.cz) < 3) continue;
    cells.push([col, row]);
  }
  if (!cells.length) return;
  telegraphRing(w, cx + 0.5, cz + 0.5, 2.1, 1.4, m.dmg * 0.6, {
    src: m, vfx: 'floor_crumble', sfx: 'stone_hit', shake: 0.3,
    then: (w2) => {
      const closed = [];
      for (const [col, row] of cells) {
        if (w2.heroes.some((h) => Math.floor(h.x) === col && Math.floor(h.z) === row)) continue;
        setCellOpen(w2, col, row, false);
        closed.push([col, row]);
      }
      b.pits.push(...closed);
      const id = w2.nextId++;
      ev(w2, { t: 'obst', id, k: 'pit', x: cx, z: cz, cells: closed, life: 24 });
      // The floor knits back after a while, so the arena is never cut in two for long.
      b.pitTimers = b.pitTimers ?? [];
      b.pitTimers.push({ t: 24, id, cells: closed, x: cx, z: cz });
      // Monsters standing there go with the floor.
      for (const o of w2.monsters) if (!o.def.boss && !walkable(w2, o.x, o.z)) killMonster(w2, o, null, { silent: true });
    },
  });
}

function bellToll(w, m, b) {
  const bx = b.cx, bz = b.cz;
  ev(w, { t: 'fx', k: 'ring_bronze', s: 'bell_cracked', sh: 1, wv: 1, x: bx, z: bz, r: 22 });
  ev(w, { t: 'toll', x: bx, z: bz });
  for (const h of w.heroes) {
    if (h.dead || h.gone) continue;
    const safe = !w.zone.nav.lineOfSight(bx, bz, h.x, h.z);
    if (safe) {
      // The pillar that sheltered you takes the blow.
      let best = null, bd = 9;
      for (const p of b.pillars) {
        if (p.hp <= 0) continue;
        const d = dist(p.x, p.z, h.x, h.z);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) {
        best.hp--;
        ev(w, { t: 'pillar', x: best.x, z: best.z, hp: best.hp });
        if (best.hp <= 0) setCellOpen(w, best.col, best.row, true);
      }
      continue;
    }
    if (h.state === 'dodge' || h.invuln > 0 || h.state === 'leap') { ev(w, { t: 'dodged', id: h.id }); continue; }
    hurtHero(w, h, h.stats.maxHp * 0.6 / Math.max(0.2, 1 - (h.stats.armorTotal / (h.stats.armorTotal + 50 * m.level))) * (w.tuning.monsterDamage), { src: m, el: 'sound' });
  }
}

export function stepBoss(w, m) {
  const script = bossScripts[m.def.boss];
  if (!script) return;
  script.step(w, m, m.bossState);
}

export function bossDamaged(w, m, o) { bossScripts[m.def.boss]?.damaged?.(w, m, m.bossState, o); }

export function bossDied(w, m) {
  bossScripts[m.def.boss]?.died?.(w, m, m.bossState);
  if (w.boss === m) w.boss = null;
  ev(w, { t: 'boss_dead', id: m.id, k: m.type, x: m.x, z: m.z });
  // Everything the boss raised goes with it.
  for (const o of w.monsters) if (o !== m && o.summoned && !o.dead) killMonster(w, o, null, { silent: true });
  const L = m.level;
  for (const h of w.heroes) {
    if (h.gone || h.companion) continue;
    for (let i = 0; i < 10; i++) dropGold(w, h, goldAt(L) * 3 * w.diffDef.reward * w.tuning.goldRate, m.x, m.z, 3);
    dropItem(w, h, makeRolledItem(w.lootRng, h, 'reliquary', L + 1), m.x, m.z, 2);
  }
  onBossKilled(w, m);
}
