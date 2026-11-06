/** @file Deterministic scatter and readable landmarks, with one aggregate tree collider body. */
import {
  spawnProp,
  physicsOf,
  addLevelDoors,
  addLevelWindows,
  addZipline,
  addLadder,
  setDaytime,
  type ColliderSpec,
} from '../../../engine/sim-api';
import { type Campaign, type GW } from './state';
import { PLACES, ROADS, SITE, ground, roadDistance, WATER } from './map';
import { cellAt } from './fire';
import { addUsable } from './use';
import { TAPES } from './content';
import { spawnResident } from '../cast/mercs';

const put = (w: GW, prop: string, x: number, z: number, yaw = 0, y = ground(x, z)) =>
  spawnProp(w, { prop: `prop:field-${prop}`, at: [x, y, z], yaw });
export function scenery(w: GW, c: Campaign): void {
  const rng = w.rng('scatter'),
    detail = w.settings.get<number>('game.detail');
  put(w, 'water', 768, 902, 0, WATER);
  for (const road of ROADS)
    for (let k = 1; k < road.length; k++) {
      const a = road[k - 1],
        b = road[k],
        length = Math.hypot(b[0] - a[0], b[1] - a[1]),
        n = Math.ceil(length / 12),
        yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      for (let j = 0; j < n; j++) {
        const t = (j + 0.5) / n,
          x = a[0] + (b[0] - a[0]) * t,
          z = a[1] + (b[1] - a[1]) * t;
        put(w, 'road', x, z, yaw, ground(x, z) + 0.025);
      }
    }
  const colliders: ColliderSpec[] = [];
  for (const [x, z] of [
    [540, 660],
    [590, 650],
    [600, 700],
    [700, 680],
    [500, 620],
    [550, 715],
    [645, 685],
  ])
    put(w, 'thorn-1', x, z);
  for (const site of PLACES)
    for (let k = 0; k < 12; k++) {
      const a = k * 2.4,
        x = site.x + Math.sin(a) * (site.radius + 12),
        z = site.z + Math.cos(a) * (site.radius + 12);
      if (c.fuel[cellAt(x, z)] && roadDistance(x, z) > 5) c.grass[cellAt(x, z)] = put(w, 'grass', x, z);
    }
  for (let i = 0; i < Math.round(1200 * detail); i++) {
    const x = rng.range(60, 1476),
      z = rng.range(60, 1476);
    if (
      Math.abs(z - 902) < 28 ||
      roadDistance(x, z) < 8 ||
      PLACES.some((p) => Math.hypot(p.x - x, p.z - z) < p.radius + 9)
    )
      continue;
    c.flags[`tree-${cellAt(x, z)}`] = put(w, i % 13 === 0 ? 'bottle-tree' : `thorn-${i % 3}`, x, z, rng.range(0, 6.28));
    colliders.push({ shape: { type: 'capsule', radius: 0.27, height: 4 }, position: [x, ground(x, z) + 2, z] });
    c.fuel[cellAt(x, z)] = 3;
  }
  physicsOf(w).addBody({ type: 'fixed', group: 'world', colliders });
  for (let z = 56; z < 1480; z += 16)
    for (let x = 56; x < 1480; x += 16) {
      const i = cellAt(x, z);
      if ((c.fuel[i] !== 1 && c.fuel[i] !== 2) || rng.next() > detail) continue;
      c.grass[i] = put(w, 'grass', x, z, rng.range(0, 6.28));
    }
  for (let i = 0; i < 260 * detail; i++) {
    const x = rng.range(70, 1460),
      z = rng.range(70, 1460);
    if (roadDistance(x, z) < 8 || Math.abs(z - 902) < 25) continue;
    put(w, i % 3 ? 'rock' : 'termite', x, z, rng.range(0, 6.28));
  }
  for (const s of SITE.structures) {
    addLevelDoors(w, s.level, { at: s.at, turn: s.turn });
    addLevelWindows(w, s.level, { at: s.at, turn: s.turn });
  }
  for (const p of PLACES) {
    put(w, 'flag', p.x + 13, p.z + 5);
    if (p.type === 'post' || p.type === 'safehouse') {
      put(w, 'sandbags', p.x - 10, p.z + 8);
      put(w, 'sandbags', p.x + 10, p.z + 8);
      put(w, 'boom', p.x - 4, p.z + 12, Math.PI / 2);
    }
    if (p.type === 'safehouse' || p.id === 'mission') {
      addUsable(w, `bed-${p.id}`, 'bed', 'Sleep and save', p.x + 7, p.z + 15, 'bed', p.id);
      addUsable(w, `armoury-${p.id}`, 'armoury', 'Open armoury', p.x + 11, p.z + 15, 'armoury');
    }
    if (p.id === 'pump')
      for (let i = -1; i <= 1; i++) {
        put(w, 'tank', p.x + i * 15, p.z - 26);
        addUsable(w, `tank-${i}`, 'explosive', 'Fuel tank', p.x + i * 15, p.z - 26, 'barrel');
        for (let dx = -1; dx <= 1; dx++)
          for (let dz = -1; dz <= 1; dz++) c.fuel[cellAt(p.x + i * 15 + dx * 8, p.z - 26 + dz * 8)] = 4;
      }
    if (p.id === 'salt')
      for (let i = 0; i < 4; i++) put(w, 'salt-pan', p.x + ((i % 2) - 0.5) * 32, p.z + (Math.floor(i / 2) - 0.5) * 28);
    if (p.id === 'estate') for (let i = -1; i <= 1; i++) put(w, 'barn', p.x + i * 18, p.z - 25);
  }
  put(w, 'water-tower', 470, 642);
  put(w, 'barge', 300, 901, 0, -0.9);
  put(w, 'plane', 1230, 605, Math.PI / 3);
  put(w, 'railcar', 302, 315);
  for (let i = 0; i < 33; i++) put(w, 'pole', 400 + i * 22, 570 + i * 4);
  for (let i = 0; i < 30; i++) put(w, 'pipeline', 1024, 360 + i * 15);
  for (let k = 0; k < 8; k++) put(w, 'crate', 293 + (k % 3) * 3, 895 + Math.floor(k / 3) * 3, 0, 0.7);
  for (const [key, x, z] of TAPES) addUsable(w, key, 'tape', 'Play cassette', x, z, 'cassette');
  const caches = [
    [390, 840],
    [510, 600],
    [680, 480],
    [1060, 405],
    [1160, 695],
    [1090, 1085],
    [365, 1145],
    [355, 345],
  ];
  caches.forEach(([x, z], i) => addUsable(w, `cache-${i}`, 'cache', 'Open prospector’s tin', x, z));
  addUsable(w, 'ledger-km40', 'objective', 'Take the receipts ledger', 620, 538, 'crate');
  for (let k = 0; k < 3; k++)
    addUsable(w, `quinine-${k}`, 'crate', 'Lift quinine crate', 535 + k * 10, 1080 + k * 5, 'crate');
  addUsable(w, 'quinine-3', 'crate', 'Lift spare quinine crate', 565, 1098, 'crate');
  addUsable(w, 'boat-fuel', 'objective', 'Secure the boat fuel', 1140, 930, 'crate');
  spawnResident(w, 'Engineer', 1010, 341);
  addUsable(w, 'telephone', 'phone', 'Answer field telephone', 1005, 930, 'phone');
  for (const [key, x, z, body] of [
    ['Perpetua', 330, 1147, 'sister'],
    ['Cassius', 782, 817, 'civilian'],
    ['Naré', 744, 817, 'authority'],
    ['Lazare', 760, 816, 'civilian'],
    ['Ferreira', 1200, 647, 'civilian'],
    ['Auctioneer', 310, 327, 'civilian'],
  ] as const)
    spawnResident(w, key, x, z, body);
  for (const [k, b] of c.buddies.entries()) b.entity = spawnResident(w, b.key, 755 + k * 3, 826, b.key);
  for (let k = 0; k < 8; k++) spawnResident(w, `Resident ${k + 1}`, 726 + k * 8, 775 + (k % 3) * 7);
  addLadder(w, { foot: [373, ground(373, 300), 300], top: ground(373, 300) + 10, normal: [1, 0] });
  w.spawn({
    usable: {
      data: {
        key: 'mine-ropeway',
        kind: 'traverse',
        label: 'Climb to the ropeway',
        x: 373,
        y: ground(373, 300) + 1,
        z: 300,
        done: false,
        extra: '',
      },
    },
  });
  addZipline(w, { from: [373, ground(373, 300) + 10, 300], to: [315, ground(315, 300) + 3, 310] });
  setDaytime(w, { hour: c.hour, rate: 24 / (w.settings.get<number>('game.day.minutes') * 60) });
}
