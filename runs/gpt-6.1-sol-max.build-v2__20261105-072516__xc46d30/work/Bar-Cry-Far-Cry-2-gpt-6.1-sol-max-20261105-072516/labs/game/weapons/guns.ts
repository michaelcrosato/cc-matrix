/** @file Original firearms, with condition tiers and three visible reload poses for the engine's first-person rig. */
import { defineWeapon, defineProp, type PropPart, type PropDefinition, type WeaponSpec } from '../../../engine/sim-api';
import { box, cone } from '../props/kit';

export const GUNS = [
  {
    key: 'pistol',
    name: 'Mle. 50',
    slot: 0,
    damage: 18,
    rate: 5,
    mag: 8,
    wear: 1,
    jam: 1,
    price: 5,
    auto: false,
    kind: 'bullet',
  },
  {
    key: 'revolver',
    name: 'Veteran .38',
    slot: 0,
    damage: 34,
    rate: 2,
    mag: 6,
    wear: 0.5,
    jam: 0,
    price: 8,
    auto: false,
    kind: 'bullet',
  },
  {
    key: 'coach',
    name: 'Coach gun',
    slot: 0,
    damage: 62,
    rate: 2,
    mag: 2,
    wear: 1,
    jam: 0.5,
    price: 10,
    auto: false,
    kind: 'shotgun',
  },
  {
    key: 'flare',
    name: 'Flare pistol',
    slot: 0,
    damage: 5,
    rate: 1,
    mag: 1,
    wear: 0.5,
    jam: 0,
    price: 6,
    auto: false,
    kind: 'flare',
  },
  {
    key: 'or7',
    name: 'OR-7',
    slot: 1,
    damage: 16,
    rate: 10,
    mag: 30,
    wear: 1.2,
    jam: 1.5,
    price: 12,
    auto: true,
    kind: 'bullet',
  },
  {
    key: 'fr2',
    name: 'FR-2 bullpup',
    slot: 1,
    damage: 18,
    rate: 12,
    mag: 25,
    wear: 0.6,
    jam: 0.5,
    price: 24,
    auto: true,
    kind: 'bullet',
  },
  {
    key: 'pump12',
    name: 'Pump 12',
    slot: 1,
    damage: 70,
    rate: 1.2,
    mag: 6,
    wear: 0.8,
    jam: 0.7,
    price: 18,
    auto: false,
    kind: 'shotgun',
  },
  {
    key: 'hunter',
    name: 'Hunter .308',
    slot: 1,
    damage: 90,
    rate: 0.8,
    mag: 5,
    wear: 0.6,
    jam: 0.5,
    price: 25,
    auto: false,
    kind: 'bullet',
  },
  {
    key: 'whisper',
    name: 'Whisper SMG',
    slot: 1,
    damage: 12,
    rate: 13,
    mag: 30,
    wear: 1,
    jam: 1,
    price: 20,
    auto: true,
    kind: 'bullet',
  },
  {
    key: 'mother',
    name: 'Mother belt gun',
    slot: 2,
    damage: 20,
    rate: 11,
    mag: 100,
    wear: 1.5,
    jam: 1.5,
    price: 30,
    auto: true,
    kind: 'bullet',
  },
  {
    key: 'sprayer',
    name: 'Crop sprayer',
    slot: 2,
    damage: 6,
    rate: 12,
    mag: 80,
    wear: 1,
    jam: 0.5,
    price: 26,
    auto: true,
    kind: 'flame',
  },
  {
    key: 'postman',
    name: 'Postman launcher',
    slot: 2,
    damage: 150,
    rate: 0.4,
    mag: 1,
    wear: 0.5,
    jam: 0.2,
    price: 36,
    auto: false,
    kind: 'rocket',
  },
] as const;
export const gun = (key: string) => GUNS.find((g) => g.key === key) ?? GUNS[0];
export const GUN_MESHES: Record<string, Partial<PropPart>[]> = {};
export const weaponId = (key: string, condition: number, pose = 0) =>
  `weapon:${key}-${condition > 0.66 ? 'new' : condition > 0.33 ? 'worn' : 'rusted'}-${pose}`;

const RECIPES: { key: string; id: string; prop: PropDefinition; weapon: WeaponSpec }[] = [];
for (const g of GUNS)
  for (const [tier, tint] of [
    ['new', '#41484a'],
    ['worn', '#686552'],
    ['rusted', '#975b35'],
  ])
    for (let pose = 0; pose < 4; pose++) {
      const long = g.slot > 0,
        length = long ? 0.72 : 0.22;
      let parts = [
        box('grip', [0.038, 0.12, 0.05], [0, -0.09, 0], '#302c22', [0.2, 0, 0]),
        box('receiver', [0.06, 0.075, length * 0.45], [0, 0.015, length * 0.2], tint),
        cone('barrel', g.kind === 'rocket' ? 0.065 : 0.014, length * 0.52, [0, 0.055, length * 0.4], tint, undefined, [
          Math.PI / 2,
          0,
          0,
        ]),
        box('rear-sight', [0.028, 0.016, 0.024], [0, 0.09, 0.005], '#171b1b'),
        box('front-sight', [0.008, 0.033, 0.012], [0, 0.065, length * 0.82], '#1b2221'),
      ];
      if (long)
        parts.push(
          box('stock', [0.045, 0.09, 0.23], [0, -0.015, -0.18], '#685037'),
          box('handguard', [0.065, 0.065, 0.22], [0, 0.01, 0.28], '#71533a'),
        );
      if (pose !== 2) parts.push(box('magazine', [0.036, 0.15, 0.07], [0, -0.13, 0.12], tint, [-0.2, 0, 0]));
      if (g.key === 'revolver')
        parts.push(cone('cylinder', 0.035, 0.06, [0, 0.025, 0.055], tint, undefined, [Math.PI / 2, 0, 0]));
      if (g.key === 'hunter')
        parts.push(cone('scope', 0.032, 0.22, [0, 0.13, 0.03], '#252a27', undefined, [Math.PI / 2, 0, 0]));
      if (g.key === 'sprayer') parts.push(cone('fuel-can', 0.085, 0.18, [0, -0.16, 0.25], '#aa7839'));
      if (g.key === 'coach')
        parts.push(cone('second-barrel', 0.02, 0.21, [0.032, 0.055, 0.08], tint, undefined, [Math.PI / 2, 0, 0]));
      if (g.key === 'whisper')
        parts.push(cone('suppressor', 0.028, 0.25, [0, 0.055, 0.57], '#292e2a', undefined, [Math.PI / 2, 0, 0]));
      if (pose)
        parts = parts.map((p) => ({
          ...p,
          position: [
            p.position![0] + (pose === 2 ? 0.07 : 0),
            p.position![1] - 0.07 * pose,
            p.position![2] - 0.055 * pose,
          ],
          rotation: [(p.rotation?.[0] ?? 0) - 0.22 * pose, ...(p.rotation ?? [0, 0, 0]).slice(1)],
        }));
      const id = `${g.key}-${tier}-${pose}`;
      const geometry = `geometry:field-gun-${g.key}-${pose}`;
      if (!GUN_MESHES[geometry]) GUN_MESHES[geometry] = parts;
      const prop: PropDefinition = {
        description: `${g.name}, ${tier}, hand pose ${pose}.`,
        parts: [{ name: 'assembled', geometry, material: 'material:field-gun', tint }],
        body: { type: 'none' },
      };
      const weapon: WeaponSpec = {
        rate: g.rate,
        auto: g.auto,
        damage: g.damage,
        range: g.key === 'hunter' ? 240 : 140,
        magazine: g.mag,
        spread: { hip: g.kind === 'shotgun' ? 3 : 1.5, move: 1.6, ads: g.key === 'hunter' ? 0.01 : 0.15 },
        recoil: [[g.slot ? 0.45 : 1, 0.08]],
        reload: { tactical: long ? 2.2 : 1.4, empty: long ? 2.8 : 1.8 },
        zoom: g.key === 'hunter' ? 25 : 58,
        sights: 0.18,
        draw: 0.28,
        muzzle: [0, 0.055, length * 0.92],
        prop: `prop:gun-${id}`,
        sound: 'sfx:field-shot',
      };
      RECIPES.push({ key: g.key, id, prop, weapon });
    }

const registered = new Set<string>();
export const CONTRACT_GUNS = ['pistol', 'or7', 'sprayer', 'flare', 'hunter', 'postman', 'mother'];
/** Register complete native models before a scene uses them; story uses the whole catalogue. */
export function registerGuns(keys: readonly string[] = GUNS.map((g) => g.key)): void {
  for (const r of RECIPES)
    if (keys.includes(r.key) && !registered.has(r.id)) {
      defineProp(`prop:gun-${r.id}`, r.prop);
      defineWeapon(`weapon:${r.id}`, r.weapon);
      registered.add(r.id);
    }
}
