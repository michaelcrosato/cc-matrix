/** @file Original basin geography, roads and buildings, shared by simulation and the paper map. */
import {
  defineTerrain,
  getTerrain,
  defineSite,
  getSite,
  defineLevel,
  terrainHeight,
  type TerrainHill,
} from '../../../engine/sim-api';

export const PLACES = [
  { id: 'town', name: 'Sainte-Aurore', x: 760, z: 790, radius: 65, faction: 'neutral', type: 'town' },
  { id: 'km40', name: 'Km-40', x: 620, z: 520, radius: 36, faction: 'front', type: 'post' },
  { id: 'bridge', name: 'Bridge Post', x: 1010, z: 790, radius: 30, faction: 'authority', type: 'post' },
  { id: 'ford', name: 'Ford Post', x: 560, z: 985, radius: 30, faction: 'front', type: 'post' },
  { id: 'pump', name: 'Pump Station', x: 1010, z: 360, radius: 48, faction: 'front', type: 'depot' },
  { id: 'salt', name: 'Salt Works', x: 1240, z: 260, radius: 52, faction: 'authority', type: 'salt' },
  { id: 'mine', name: 'Mine No. 6', x: 300, z: 300, radius: 55, faction: 'authority', type: 'mine' },
  { id: 'estate', name: 'Belvédère Estate', x: 1130, z: 1180, radius: 55, faction: 'authority', type: 'estate' },
  { id: 'mission', name: 'Mission Sainte-Claire', x: 330, z: 1120, radius: 40, faction: 'neutral', type: 'clinic' },
  { id: 'airstrip', name: 'Airstrip', x: 1200, z: 620, radius: 55, faction: 'neutral', type: 'dealer' },
  { id: 'tower', name: 'Water Tower', x: 470, z: 650, radius: 22, faction: 'front', type: 'safehouse' },
  { id: 'ferry', name: 'Ferry Shed', x: 640, z: 1040, radius: 22, faction: 'authority', type: 'safehouse' },
  { id: 'hangar', name: 'Hangar', x: 1240, z: 640, radius: 22, faction: 'front', type: 'safehouse' },
  { id: 'barge', name: 'Barge Wreck', x: 300, z: 900, radius: 15, faction: 'neutral', type: 'wreck' },
] as const;
export const place = (id: string) => PLACES.find((p) => p.id === id) ?? PLACES[0];
export const ROADS: number[][][] = [
  [
    [330, 1120],
    [560, 985],
    [620, 790],
    [760, 790],
    [1010, 790],
    [1200, 620],
    [1240, 640],
  ],
  [
    [300, 900],
    [470, 650],
    [620, 520],
    [300, 300],
  ],
  [
    [620, 520],
    [1010, 360],
    [1240, 260],
  ],
  [
    [1010, 790],
    [1010, 360],
  ],
  [
    [560, 985],
    [640, 1040],
    [1130, 1180],
    [1200, 620],
  ],
  [
    [470, 650],
    [620, 790],
  ],
];
export function roadDistance(x: number, z: number): number {
  let d = Infinity;
  for (const road of ROADS)
    for (let i = 1; i < road.length; i++) {
      const [a, b] = [road[i - 1], road[i]],
        dx = b[0] - a[0],
        dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      d = Math.min(d, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
    }
  return d;
}
const hills: TerrainHill[] = [];
for (let t = 0; t < 1536; t += 120)
  for (const at of [
    [t, 15],
    [t, 1520],
    [15, t],
    [1520, t],
  ] as [number, number][])
    hills.push({ at, radius: 160, height: 85 });
defineTerrain('terrain:basin', {
  size: [1536, 1536],
  cell: 4,
  seed: 1947,
  height: 10,
  scale: 180,
  octaves: 5,
  ridges: 0.3,
  hills: hills.map((h) => ({ ...h })),
  flats: [
    ...PLACES.map((p) => ({
      rect: [p.x - p.radius, p.z - p.radius, p.x + p.radius, p.z + p.radius],
      height: 3,
      margin: 24,
    })),
    { rect: [50, 884, 1486, 920], height: -1, margin: 18 },
  ],
  materials: ['material:savanna', 'material:laterite', 'material:ironstone'],
  high: 45,
});
export const TERRAIN = getTerrain('terrain:basin');
export const ground = (x: number, z: number): number => terrainHeight(TERRAIN, x, z) ?? 3;
export const WATER = 0.12;
const hut = `---\ntile: 1\ndescription: Mud-brick office with a shaded door and a tin roof.\n---\n---\nstorey: ground\nbase: 0\nheight: 3\nroof: flat\n---\n##########\n#........#\n:........:\n#........#\n#........#\n####++####\n`;
defineLevel('level:basin-office', {
  text: hut,
  file: 'labs/game/scenes/map.ts',
  materials: {
    'material:brick': 'material:mud',
    'material:stone': 'material:mud',
    'material:flagstone': 'material:laterite',
    'material:planks': 'material:tin',
  },
});
export const BUILDINGS = PLACES.filter((p) => p.type !== 'wreck').flatMap((p) => {
  const n = p.type === 'town' ? 12 : p.type === 'estate' ? 4 : 2;
  return Array.from({ length: n }, (_, i) => ({
    level: 'level:basin-office',
    at: [p.x + ((i % 4) - 1.5) * 18, 3, p.z + (Math.floor(i / 4) - 0.5) * 18] as [number, number, number],
    turn: 0,
    flatten: 3,
  }));
});
defineSite('site:basin', { terrain: 'terrain:basin', structures: BUILDINGS });
export const SITE = getSite('site:basin');
