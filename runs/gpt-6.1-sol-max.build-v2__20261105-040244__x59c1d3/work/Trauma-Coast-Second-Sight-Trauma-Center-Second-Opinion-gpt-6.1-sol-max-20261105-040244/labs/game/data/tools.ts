/** @file Complete tool/target response matrix shared by play, the bot and the Handbook. */
import type { TargetKind, Tool } from './types';
export const TOOLS: Tool[] = ['Scalpel', 'Forceps', 'Suture', 'Drain', 'Laser', 'Syringe', 'Gel', 'Scanner'];
export const KINDS: TargetKind[] = [
  'pool',
  'shard',
  'wound',
  'incision',
  'mass',
  'nodule',
  'bleeder',
  'abrasion',
  'numb',
  'cocoon',
  'flap',
  'lull',
  'matron',
  'solace',
  'reverie',
  'decoy',
  'balm',
  'node',
  'mercy',
  'mote',
  'tendril',
  'binder',
];
export const HELP: Record<Tool, string[]> = {
  Scalpel: [
    'Hold at the first dot. Follow the cyan guide.',
    'Loop-cut a mass; divide large Solace.',
    'Healthy tissue tears. Cut only on a guide.',
  ],
  Forceps: [
    'Hold to grip; pull away slowly to extract.',
    'Glass, excised masses, cocoons and tendrils.',
    'Lift a flap above the clip line; release to clip.',
  ],
  Suture: [
    'Hold and weave across the wound, left to right.',
    'Each crossing places one stitch.',
    'Drain obscuring blood and clear Balm first.',
  ],
  Drain: [
    'Hold over a dark pool until it disappears.',
    'Blood hides targets beneath it.',
    'A lacquered wound needs Gel first.',
  ],
  Laser: [
    'Hold a steady beam on a nodule or tiny bleeder.',
    'Lull, motes and the smallest Solace burn.',
    'Six seconds of heat; two seconds to cool.',
  ],
  Syringe: [
    'Hold to fill. Release in the green band.',
    'Stabilizer restores vitals; F equips it quickly.',
    'Hold on a marked weak point to inject Binder.',
  ],
  Gel: [
    'Hold and paint the whole marked area.',
    'Seal stitched wounds; soothe numb tissue.',
    'Dissolves Balm. Cannot close an open wound.',
  ],
  Scanner: [
    'Hold to reveal hidden tissue in a three-metre ring.',
    'Reveals last six seconds. Decoys pop.',
    'Reverie must be scanned before the Laser.',
  ],
};
const preferred: Record<TargetKind, Tool> = {
  pool: 'Drain',
  shard: 'Forceps',
  wound: 'Suture',
  incision: 'Scalpel',
  mass: 'Scalpel',
  nodule: 'Laser',
  bleeder: 'Laser',
  abrasion: 'Gel',
  numb: 'Gel',
  cocoon: 'Forceps',
  flap: 'Forceps',
  lull: 'Laser',
  matron: 'Syringe',
  solace: 'Scalpel',
  reverie: 'Scanner',
  decoy: 'Scanner',
  balm: 'Gel',
  node: 'Syringe',
  mercy: 'Syringe',
  mote: 'Laser',
  tendril: 'Forceps',
  binder: 'Syringe',
};
export const RESPONSE: Record<Tool, Record<TargetKind, string>> = Object.fromEntries(
  TOOLS.map((tool) => [
    tool,
    Object.fromEntries(
      KINDS.map((kind) => [
        kind,
        tool === preferred[kind] ? 'effect' : `${tool} cannot treat ${kind}. Use ${preferred[kind]}, Doctor.`,
      ]),
    ),
  ]),
) as Record<Tool, Record<TargetKind, string>>;
for (const [tool, kinds] of [
  ['Forceps', ['mass']],
  ['Laser', ['solace', 'reverie', 'balm']],
  ['Scanner', ['mass', 'nodule', 'reverie']],
] as [Tool, TargetKind[]][])
  for (const kind of kinds) RESPONSE[tool][kind] = 'effect';
RESPONSE.Laser.solace = 'effect';
export const recommended = (kind: TargetKind): number => TOOLS.indexOf(preferred[kind]);
