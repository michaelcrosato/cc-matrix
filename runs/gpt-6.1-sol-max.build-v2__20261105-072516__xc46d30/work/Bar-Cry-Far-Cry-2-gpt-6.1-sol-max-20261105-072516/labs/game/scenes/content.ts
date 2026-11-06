/** @file Original contract, cassette, dealer and field-note data. Designers extend these registries without new rules. */
import { defineKind, def } from '../../../engine/sim-api';
import { GUNS } from '../weapons/guns';
export interface Step {
  goal: string;
  kind: string;
  key?: string;
  at?: [number, number];
  radius?: number;
  count?: number;
  seconds?: number;
}
export interface Contract {
  id: string;
  name: string;
  giver: string;
  faction: string;
  pay: number;
  brief: string;
  steps: Step[];
  alt: string;
}
defineKind('contract', {
  description: 'A contract is an ordered list of world predicates.',
  fields: {
    name: { type: 'string', required: true, description: 'Printed name.' },
    giver: { type: 'string', required: true, description: 'Person.' },
    faction: { type: 'string', required: true, description: 'Employer.' },
    pay: { type: 'number', required: true, minimum: 0, description: 'Rough stones.' },
    brief: { type: 'string', required: true, description: 'Briefing.' },
    steps: { type: 'array', items: { type: 'object' }, required: true, description: 'World predicates in order.' },
    alt: { type: 'string', default: '', description: 'Buddy pitch.' },
  },
});
export const CONTRACTS: Contract[] = [
  {
    id: 'zero',
    name: 'Lot Zero',
    giver: 'Lazare',
    faction: 'neutral',
    pay: 8,
    brief: 'You came up the river with a warrant. Somebody has set fire to the paperwork.',
    alt: '',
    steps: [
      { goal: 'Wade ashore. The north bank is clear.', kind: 'at', at: [330, 858], radius: 18 },
      { goal: 'Your rifle has seized. Hold R / □ to clear it.', kind: 'coverage', key: 'clear' },
      { goal: 'You are wounded. H / L1 uses a syrette.', kind: 'coverage', key: 'syrette' },
      { goal: 'The fever has come. Keep moving; someone is coming.', kind: 'flag', key: 'prologueRescue' },
      { goal: 'Speak to Sister Perpetua outside the clinic.', kind: 'talk', key: 'Perpetua' },
      { goal: 'Take the bitter pill. P / D-pad left.', kind: 'coverage', key: 'pill' },
      { goal: 'Find Lazare at the Hotel Splendide, Sainte-Aurore.', kind: 'talk', key: 'Lazare' },
    ],
  },
  {
    id: 'receipts',
    name: 'Receipts',
    giver: 'Cassius',
    faction: 'front',
    pay: 20,
    brief: 'The checkpoint keeps a ledger of confiscated goods. The Front would like to confiscate the ledger.',
    alt: 'Yaw: Burn the radio hut as well. They cannot call for what they cannot describe.',
    steps: [
      { goal: 'Meet Brother Cassius outside Cinema Rex.', kind: 'talk', key: 'Cassius' },
      { goal: 'Reach Km-40. A pickup waits at the Mission.', kind: 'at', at: [620, 520], radius: 42 },
      { goal: 'Take the ledger by the radio hut.', kind: 'use', key: 'ledger-km40' },
      { goal: 'Bring the ledger to Cassius in Sainte-Aurore.', kind: 'talk', key: 'Cassius' },
    ],
  },
  {
    id: 'bitter',
    name: 'Bitter',
    giver: 'Perpetua',
    faction: 'neutral',
    pay: 18,
    brief: 'Three crates of quinine sit in a field on the south road. Fire does not read the red cross.',
    alt: 'Ilse: Bring the fourth crate as well. I will remember who came for the medicine.',
    steps: [
      { goal: 'Ask Perpetua about the quinine shipment.', kind: 'talk', key: 'Perpetua' },
      {
        goal: 'Carry three aid crates to the clinic. Use lifts and drops.',
        kind: 'delivery',
        key: 'quinine',
        at: [330, 1147],
        radius: 15,
        count: 3,
      },
      { goal: 'Report to Perpetua. Pills are payment as well.', kind: 'talk', key: 'Perpetua' },
    ],
  },
  {
    id: 'reserve',
    name: 'The Reserve',
    giver: 'Naré',
    faction: 'authority',
    pay: 28,
    brief: 'The Authority has bought the fuel in those tanks. It is not interested in taking delivery.',
    alt: 'Tomás: Get the engineer out before you light it. He knows which pipes feed which men.',
    steps: [
      { goal: 'Receive the fuel warrant from Commissioner Naré.', kind: 'talk', key: 'Naré' },
      { goal: 'Reach the Pump Station. Check the wind on your map.', kind: 'at', at: [1010, 360], radius: 70 },
      {
        goal: 'Set the fuel depot alight. F draws your flare pistol.',
        kind: 'burn',
        at: [1010, 360],
        radius: 40,
        count: 10,
      },
      { goal: 'Return to Commissioner Naré.', kind: 'talk', key: 'Naré' },
    ],
  },
  {
    id: 'slash',
    name: 'Slash and Burn',
    giver: 'Cassius',
    faction: 'front',
    pay: 30,
    brief: 'Belvédère grows tobacco for a country that no longer exists. Burn what remains of the account.',
    alt: 'Mirela: Get the spare fuel from the landing. I will cover the river.',
    steps: [
      { goal: 'Hear Cassius at Cinema Rex.', kind: 'talk', key: 'Cassius' },
      { goal: 'Burn the drying barns at Belvédère Estate.', kind: 'burn', at: [1130, 1180], radius: 48, count: 14 },
      { goal: 'The wind is turning. Escape to the river boat.', kind: 'vehicle', key: 'boat' },
      { goal: 'Take the boat west past the broken rail bridge.', kind: 'at', at: [880, 902], radius: 45 },
    ],
  },
  {
    id: 'invoice',
    name: 'Second Invoice',
    giver: 'Buddy',
    faction: 'neutral',
    pay: 20,
    brief: 'A familiar voice on a bad radio. Salt Works. Bring something clean to put in the wound.',
    alt: '',
    steps: [
      { goal: 'Answer the field telephone at the river landing.', kind: 'use', key: 'telephone' },
      { goal: 'Find your buddy at Salt Works.', kind: 'at', at: [1240, 260], radius: 45 },
      { goal: 'Clear the salt pans. Bare ground will not burn.', kind: 'clear', key: 'salt' },
      { goal: 'Your buddy is down. Syrette, mercy, or leave.', kind: 'flag', key: 'invoiceResolved' },
    ],
  },
  {
    id: 'one',
    name: 'Lot One',
    giver: 'Lazare',
    faction: 'neutral',
    pay: 0,
    brief: 'Mine No. 6. Both sides are coming to bid. The man you want is keeping the minutes.',
    alt: '',
    steps: [
      { goal: 'Lazare has the address of the sale.', kind: 'talk', key: 'Lazare' },
      { goal: 'Reach Mine No. 6. Use the ropeway from the east ridge.', kind: 'at', at: [300, 300], radius: 55 },
      { goal: 'Listen to the last lot beside the rail car.', kind: 'use', key: 'tape-final' },
      { goal: 'The Auctioneer is waiting. Decide what the warrant is worth.', kind: 'choice', key: 'ending' },
    ],
  },
];
export const ALTS: Record<
  number,
  { goal: string; kind: string; key?: string; at: [number, number]; count?: number; buddy: string }
> = {
  1: {
    goal: 'Burn the Km-40 radio hut before returning the ledger.',
    kind: 'burn',
    key: 'km40',
    at: [620, 520],
    count: 3,
    buddy: 'yaw',
  },
  2: {
    goal: 'Bring the fourth quinine crate to the clinic as well.',
    kind: 'delivery',
    at: [565, 1098],
    count: 4,
    buddy: 'ilse',
  },
  3: {
    goal: 'Get the engineer south to the pipeline marker before the burn.',
    kind: 'escort',
    key: 'Engineer',
    at: [970, 430],
    buddy: 'tomas',
  },
  4: {
    goal: 'Secure the boat fuel from the river landing.',
    kind: 'use',
    key: 'boat-fuel',
    at: [1140, 930],
    buddy: 'mirela',
  },
};
for (const { id, ...spec } of CONTRACTS) def('contract', `contract:${id}`, spec);
export const TAPES = [
  [
    'tape-barge',
    300,
    874,
    'Lot fourteen. One rifle. Sold Tuesday, recovered Wednesday, sold again Thursday. The buyer always pays for the history.',
  ],
  [
    'tape-km40',
    635,
    542,
    'Lot twenty-two. One bridge, unfinished. The contractor was paid twice and shot once. Reserve not met.',
  ],
  [
    'tape-air',
    1185,
    648,
    'Lot thirty. One airstrip. Short enough to keep the honest pilots away. Long enough for the rest of us.',
  ],
  ['tape-mission', 347, 1144, 'Lot forty-one. A crate of medicine. Its destination is uncertain. Its price is not.'],
  [
    'tape-estate',
    1150,
    1201,
    'Lot fifty. A harvest, still standing. Insured against rain, theft, and the previous government. Fire was an extra.',
  ],
  [
    'tape-final',
    310,
    322,
    'The final lot. One mercenary, imported. Sound in limb, uncertain in conscience. The fever is included. Shall we begin?',
  ],
] as const;
export const FIELD_NOTES = [
  [
    'Reliability',
    'Guns wear, seize and eventually split. Hold reload to clear a jam. Guns cannot be repaired; replace them at Ferreira’s or an armoury.',
  ],
  [
    'The body',
    'Health recovers only to the top of its current segment. H / L1 uses a syrette. At critical health it performs field surgery instead, without consuming medicine.',
  ],
  [
    'The bitter ones',
    'P / D-pad left takes quinine. Fever slows you and eventually makes you collapse. Pills come from the Mission, never the dealer.',
  ],
  [
    'Fire and wind',
    'Fire runs fastest downwind. Roads, salt and water break the front; tree embers can jump them. Burned grass gives no concealment. Rain stops spread.',
  ],
  [
    'The ledger',
    'A rescue adds one debt. Three owed and a buddy stops coming. Help a buddy to pay it down. A dead buddy stays dead.',
  ],
  [
    'Vehicles',
    'E / □ enters or exits. W/S or triggers drive. Q / △ changes to the mounted gun. Hold use at the bonnet for three seconds to repair to sixty percent.',
  ],
  [
    'Stones',
    'B / D-pad down enables the tick-box. Faster clicks mean a cache is near; a steady lamp means within fifteen metres. Spend stones at the airstrip.',
  ],
  [
    'Grass',
    'C / ○ crouches. Unburned tall grass cuts a patrol’s sight. Gunshots carry much farther than footsteps. Smoke also blocks sight.',
  ],
  [
    'A truce',
    'Sainte-Aurore is a ceasefire town. Guns stay put. At a friendly checkpoint, holster and walk; drawing a weapon ends the courtesy.',
  ],
  [
    'Rest',
    'Clear a safehouse, then use its bed to sleep and save. A claimed safehouse stays yours. A cleared checkpoint eventually fills again.',
  ],
  [
    'The map',
    'M / D-pad up raises the map in your hands. The world keeps running. You can walk or drive with it raised. Click the paper to mark a route.',
  ],
  ['The river', 'Nobody swims here. Wade through the shallow channel or take a boat. There is no fast travel.'],
];
defineKind('stock', {
  description: 'Dealer catalogue entries.',
  fields: {
    name: { type: 'string', required: true, description: 'Item name.' },
    price: { type: 'number', required: true, description: 'Stone price.' },
    op: { type: 'string', required: true, description: 'Purchase operation.' },
    key: { type: 'string', required: true, description: 'Inventory key.' },
  },
});
export const STOCK = [
  ...GUNS.map((g) => ({ name: g.name, price: g.price, kind: 'gun', key: g.key })),
  { name: 'Reliability I', price: 18, kind: 'reliability', key: '1' },
  { name: 'Reliability II', price: 30, kind: 'reliability', key: '2' },
  { name: 'Syrette pouch · seven', price: 22, kind: 'capacity', key: '7' },
  { name: 'Repair kit', price: 8, kind: 'kit', key: '1' },
  { name: 'Camouflage smock', price: 16, kind: 'smock', key: '1' },
];
for (let i = 0; i < STOCK.length; i++) {
  const { kind, ...item } = STOCK[i];
  def('stock', `stock:${i}`, { ...item, op: kind });
}
