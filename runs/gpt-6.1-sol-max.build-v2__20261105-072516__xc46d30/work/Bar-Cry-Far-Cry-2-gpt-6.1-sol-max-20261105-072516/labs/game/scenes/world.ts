/** @file The complete basin. Scene modes share one simulation so story, attract and co-op use the same mechanics. */
import {
  defineScene,
  addSiteBodies,
  physicsOf,
  addRagdolls,
  handOff,
  actOn,
  standUp,
  removeProp,
  removeActor,
  placeActor,
  daytimeOf,
  setDaytime,
  type Intents,
} from '../../../engine/sim-api';
import { campaign, players, mark, say, value, type GW, type Campaign } from './state';
import { SITE, ground, place, PLACES } from './map';
import { makeFuel, ignite, fireStep, windStep, cellAt } from './fire';
import { seats } from './seats';
import { arms, projectileStep, blast } from './arms';
import { activate, soldiers } from './ai';
import { healthStep, feverStep, buddyStep, escortStep } from './health';
import { spawnVehicle, vehicleForces, vehicleSeats, exitVehicle } from './vehicles';
import { storyStep, commandStep, command } from './story';
import { meleeStep } from './melee';
import { cargoStep } from './cargo';
import { useStep } from './use';
import { scenery } from './scenery';
import { spawnMerc, spawnSoldier, MERC_KEYS } from '../cast/mercs';
import { CONTRACTS } from './content';
import { loadSave, makeSave } from './save';
import './settings';
import '../props/world';
import { gun, registerGuns, CONTRACT_GUNS } from '../weapons/guns';

function rules(w: GW): void {
  const c = campaign(w);
  c.hour = daytimeOf(w) ?? c.hour;
  if (c.flags.dayMinutes !== value(w, 'day.minutes')) {
    c.flags.dayMinutes = value(w, 'day.minutes');
    setDaytime(w, { hour: c.hour, rate: 24 / (value(w, 'day.minutes') * 60) });
  }
  if (!c.flags.initialized) {
    c.flags.initialized = 1;
    ignite(w, c.mode === 'title' ? 575 : 302, c.mode === 'title' ? 650 : 828, 1);
    if (c.mode === 'story') {
      say(w, 'Lot Zero', 'The river carries everything here. Even the warrant.');
      mark(w, 'jam');
    }
  }
  for (const p of players(w)) {
    if (w.settings.get<boolean>('game.noclip')) {
      const m = p.seat!.data.wants.move ?? [0, 0],
        x = p.actor.x + m[0] * 0.3,
        z = p.actor.z + m[1] * 0.3;
      try {
        placeActor(w, p.id, [x, Math.max(ground(x, z), p.actor.y), z]);
      } catch {}
    }
    if (p.actor.x < 42 || p.actor.x > 1494 || p.actor.z < 42 || p.actor.z > 1494) {
      const x = Math.max(45, Math.min(1491, p.actor.x)),
        z = Math.max(45, Math.min(1491, p.actor.z));
      placeActor(w, p.id, [x, ground(x, z), z]);
      say(w, 'Field note', 'The road ends in the hills. Turn back.');
    }
    for (const site of PLACES)
      if (Math.hypot(p.actor.x - site.x, p.actor.z - site.z) < 120 && !c.discovered.includes(site.id)) {
        c.discovered.push(site.id);
        w.emit('discovered', { name: site.name });
      }
    if (p.motion?.mode === 'zipline') mark(w, 'ropeway');
  }
  if (c.flags.bitterFire === 1) {
    ignite(w, 537, 1060, 2);
    c.flags.bitterFire = 2;
  }
  for (const e of w.query('usable')) {
    const u = e.usable.data;
    if (u.kind !== 'explosive' || u.done) continue;
    if (c.fire[cellAt(u.x, u.z)] === 2) {
      u.done = true;
      blast(w, u.x, u.y, u.z, 160, 18);
      mark(w, 'tank explosion');
    }
  }
  if (c.contract === 6 && c.step === 3 && c.flags.endChoice === undefined) {
    c.flags.auctionChoice = 1;
  }
  if (c.flags.endChoice && !c.flags.auctionAftermath) {
    const a = [...w.query('usable', 'actor', 'health')].find((e) => e.usable.data.key === 'Auctioneer');
    if (a && c.flags.endChoice === 1) {
      a.health.hp = 0;
      handOff(w, a.id, { dead: true, push: [0, 0, -1] });
      w.emit('gunshot', {
        id: players(w)[0]?.id ?? -1,
        weapon: 'weapon:pistol-new-0',
        from: [a.actor.x + 2, a.actor.y + 1.5, a.actor.z],
        to: [a.actor.x, a.actor.y + 1.4, a.actor.z],
        normal: null,
        body: a.actor.body,
        target: a.id,
        hit: true,
      });
    }
    if (a && c.flags.endChoice === 2) removeActor(w, a.id);
    c.flags.auctionAftermath = 1;
  }
  const b = c.buddies.find((x) => x.fallen > 0);
  if (b) {
    const bp = w.get(b.entity);
    if (bp?.actor && (bp.health?.hp ?? 100) <= 0) {
      b.alive = false;
      b.fallen = 0;
      c.flags.invoiceResolved = 1;
      mark(w, 'mercy');
      mark(w, 'buddy death');
    }
  }
}
function fresh(w: GW): Campaign {
  const mode = w.settings.get<string>('game.mode'),
    fuel = makeFuel(),
    merc = w.settings.get<number>('game.merc');
  return {
    mode,
    contract: 0,
    step: 0,
    finished: [],
    flags: {},
    goal: CONTRACTS[0].steps[0].goal,
    message: '',
    speaker: '',
    saidAt: -99999,
    journal: [],
    coverage: {},
    front: 0,
    authority: 0,
    buddies: MERC_KEYS.filter((_, k) => k !== merc).map((key) => ({
      key,
      alive: true,
      debt: 0,
      entity: -1,
      fallen: 0,
      helped: false,
    })),
    discovered: ['barge', 'mission', 'town'],
    caches: [],
    tapes: [],
    owned: ['pistol', 'or7', 'sprayer', 'flare'],
    cleared: {},
    claimed: [],
    fire: fuel.map((f) => (f ? 1 : 0)),
    fuel,
    timers: Array(fuel.length).fill(0),
    regrow: Array(fuel.length).fill(0),
    grass: Array(fuel.length).fill(-1),
    flames: {},
    wind: Math.PI / 2,
    windTo: Math.PI / 2,
    windSpeed: 5,
    windNext: Math.round(value(w, 'wind.shiftMinutes') * 3600),
    rain: 0,
    hour: 17,
    ending: '',
    save: 0,
    survival: 0,
    run: 0,
    started: 0,
    extracted: [],
  };
}
function setup(w: GW): void {
  addSiteBodies(physicsOf(w), SITE);
  const c = fresh(w),
    start = c.mode === 'contract' ? [1010, 475] : c.mode === 'title' ? [535, 708] : [300, 882];
  registerGuns(c.mode === 'story' ? undefined : CONTRACT_GUNS);
  for (let n = 0; n < w.settings.get<number>('game.seats'); n++) spawnMerc(w, n, start[0] + n * 2.5, start[1]);
  scenery(w, c);
  addRagdolls(w);
  spawnVehicle(w, 'pickup', 345, 1153, 0);
  spawnVehicle(w, 'pickup', 1010, 465, Math.PI);
  spawnVehicle(w, 'jeep', 647, 550, 0);
  spawnVehicle(w, 'pickup', 1210, 660, 0);
  spawnVehicle(w, 'boat', 1130, 902, -Math.PI / 2);
  spawnVehicle(w, 'boat', 650, 902, Math.PI / 2);
  w.spawn({ campaign: { data: c } });
  w.systems.add('game.seats', seats, { phase: 'intents' });
  w.systems.add('game.activate', activate, { phase: 'ai' });
  w.systems.add('game.soldiers', soldiers, { phase: 'ai' });
  w.systems.add('game.escort', escortStep, { phase: 'ai' });
  w.systems.add('game.buddies', buddyStep, { phase: 'ai' });
  w.systems.add('game.arms', arms, { phase: 'ai' });
  w.systems.add('game.vehicle-forces', vehicleForces, { phase: 'ai' });
  w.systems.add('game.blades', meleeStep, { phase: 'rules' });
  w.systems.add('game.projectiles', projectileStep, { phase: 'rules' });
  w.systems.add('game.vehicle-seats', vehicleSeats, { phase: 'rules' });
  w.systems.add('game.cargo', cargoStep, { phase: 'rules' });
  w.systems.add('game.wind', windStep, { phase: 'rules' });
  w.systems.add('game.fire', fireStep, { phase: 'rules' });
  w.systems.add('game.health', healthStep, { phase: 'rules' });
  w.systems.add('game.fever', feverStep, { phase: 'rules' });
  w.systems.add('game.use', useStep, { phase: 'rules' });
  w.systems.add('game.story', storyStep, { phase: 'rules' });
  w.systems.add('game.rules', rules, { phase: 'rules' });
}

export const world = defineScene('game:world', {
  description: 'A warrant, a rusting rifle and an account with the wind.',
  site: 'site:basin',
  physics: true,
  setup,
  step: (w: GW, I: Intents) => commandStep(w, I),
  actions: {
    snapshot(w: GW) {
      const data = makeSave(w),
        e = w.query('gameSave')[0];
      if (e) e.gameSave.data = data as unknown as Record<string, unknown>;
      else w.spawn({ gameSave: { data: data as unknown as Record<string, unknown> } });
    },
    mode(w: GW, raw: unknown) {
      const mode = (raw as { mode: string }).mode;
      if (mode !== 'title' && mode !== 'attract') return;
      const c = campaign(w);
      c.mode = mode;
      c.flags.gameover = 0;
      c.ending = '';
      c.message = '';
      c.goal = mode === 'attract' ? 'Field demonstration · Follow the wind.' : CONTRACTS[0].steps[0].goal;
      for (const p of players(w)) {
        const s = p.seat!.data;
        if (s.vehicle >= 0) exitVehicle(w, p);
        if (s.actionProp >= 0) {
          removeProp(w, s.actionProp);
          s.actionProp = -1;
        }
        s.action = '';
        s.meleeNext = 0;
        s.meleeUntil = 0;
        s.down = 0;
        s.rescue = -1;
        s.fever = 0;
        s.feverNext = w.tick + 39600;
        s.map = false;
        s.carrying = '';
        s.wants = {};
        s.previous = [];
        s.released = [];
        p.health.hp = 100;
        actOn(w, p.id, (a) => a.stop());
        placeActor(w, p.id, [535, ground(535, 708), 708]);
        for (let k = 0; k < p.gunState.data.guns.length; k++) {
          const g = p.gunState.data.guns[k];
          g.broken = false;
          g.jam = false;
          g.condition = 0.9;
          g.reserve = 300;
          p.weapons.mags[k] = gun(g.key).mag;
        }
      }
      for (const b of c.buddies) {
        b.alive = true;
        b.fallen = 0;
        b.debt = 0;
        const friend = w.get(b.entity);
        if (friend?.health) friend.health.hp = 100;
        standUp(w, b.entity);
      }
      c.hour = 17;
      setDaytime(w, { hour: 17, rate: 24 / (value(w, 'day.minutes') * 60) });
    },
    place(w: GW, raw: unknown) {
      const a = raw as { x?: number; z?: number; y?: number; place?: string; seat?: number };
      const p = players(w).find((x) => x.seat!.data.n === (a.seat ?? 0));
      if (!p) return;
      const site = place(a.place ?? ''),
        x = a.x ?? site.x,
        z = a.z ?? site.z + 15;
      placeActor(w, p.id, [x, a.y ?? Math.max(ground(x, z), 0.15), z]);
    },
    ignite(w: GW, raw: unknown) {
      const a = raw as { x: number; z: number; radius?: number };
      ignite(w, a.x, a.z, a.radius ?? 1);
    },
    hurt(w: GW, raw: unknown) {
      const a = raw as { hp: number; seat?: number };
      const p = players(w).find((x) => x.seat!.data.n === (a.seat ?? 0));
      if (p) {
        p.health.hp = a.hp;
        p.health.hitAt = w.tick;
      }
    },
    fever(w: GW, raw: unknown) {
      const late = (raw as { late?: boolean } | null)?.late ?? false;
      for (const p of players(w)) {
        p.seat!.data.fever = (w.tick || 1) - (late ? 1900 : 0);
        p.seat!.data.feverNext = w.tick;
        mark(w, 'fever attack');
      }
    },
    give(w: GW, raw: unknown) {
      const a = raw as {
        stones?: number;
        pills?: number;
        syr?: number;
        condition?: number;
        jam?: boolean;
        broken?: boolean;
      };
      for (const p of players(w)) {
        const s = p.seat!.data;
        if (a.broken !== undefined) {
          for (const g of p.gunState.data.guns) g.broken = a.broken;
          if (a.broken) p.weapons.slot = -1;
        }
        if (a.stones !== undefined) s.stones = a.stones;
        if (a.pills !== undefined) s.pills = a.pills;
        if (a.syr !== undefined) s.syr = a.syr;
        if (a.condition !== undefined) for (const g of p.gunState.data.guns) g.condition = a.condition;
        if (a.jam !== undefined) for (const g of p.gunState.data.guns) g.jam = a.jam;
      }
    },
    story(w: GW, raw: unknown) {
      const a = raw as { contract: number; step?: number };
      const c = campaign(w);
      c.contract = Math.max(0, Math.min(CONTRACTS.length - 1, a.contract));
      c.step = a.step ?? 0;
      c.ending = '';
      c.goal = CONTRACTS[c.contract].steps[c.step].goal;
      c.flags.gameover = 0;
    },
    debt(w: GW, raw: unknown) {
      const a = raw as { key: string; debt: number; alive?: boolean };
      const b = campaign(w).buddies.find((x) => x.key === a.key);
      if (b) {
        b.debt = Math.max(-3, Math.min(3, a.debt));
        if (a.alive !== undefined) {
          b.alive = a.alive;
          b.fallen = 0;
          const friend = w.get(b.entity);
          if (friend?.health) friend.health.hp = a.alive ? 100 : 0;
          if (a.alive) standUp(w, b.entity);
          else handOff(w, b.entity, { dead: true });
        }
      }
    },
    standing(w: GW, raw: unknown) {
      const a = raw as { front: number; authority: number };
      campaign(w).front = a.front;
      campaign(w).authority = a.authority;
    },
    spawn(w: GW, raw: unknown) {
      const a = raw as { kind: string; key?: string; condition?: number };
      const p = players(w)[0];
      if (!p) return;
      if (a.kind === 'vehicle') spawnVehicle(w, a.key ?? 'pickup', p.actor.x + 5, p.actor.z);
      else if (a.kind === 'squad')
        for (let k = 0; k < 4; k++) spawnSoldier(w, p.actor.x + 20 + k * 3, p.actor.z - 15, 'front', 'dev');
      else if (a.kind === 'gun') {
        registerGuns([a.key ?? 'or7']);
        p.gunState.data.guns[1] = {
          key: a.key ?? 'or7',
          condition: a.condition ?? 1,
          jam: false,
          clear: 0,
          reserve: 180,
        };
        p.weapons.slot = 1;
      }
    },
    weather(w: GW, raw: unknown) {
      const a = raw as { hour?: number; wind?: number; rain?: boolean };
      const c = campaign(w);
      if (a.hour !== undefined) {
        c.hour = a.hour;
        setDaytime(w, { hour: a.hour, rate: 24 / (value(w, 'day.minutes') * 60) });
      }
      if (a.wind !== undefined) c.wind = c.windTo = a.wind;
      if (a.rain !== undefined) c.rain = a.rain ? 5400 : 0;
    },
    regrow(w: GW) {
      const c = campaign(w);
      for (let i = 0; i < c.fire.length; i++) if (c.fire[i] === 3) c.regrow[i] = w.tick + 1;
    },
    command,
    load: loadSave,
  },
});
export default world;
