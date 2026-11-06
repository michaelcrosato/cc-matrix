/**
 * @file The tool-and-target table. Every instrument meets every kind as either an effect or a refusal line.
 * The Handbook, the bot, and the "you cannot do that" bark all read this and nothing hand-maintained beside it.
 */
import { KINDS, TOOLS, type Effect, type Kind, type Tool } from './types';

/**
 * Effects that change the body. A missing key is a refusal. `slip` is a real result (a new wound, a lost chain),
 * not a refusal: the knife and the laser both punish bare tissue.
 */
const EFFECT: Readonly<Record<string, Effect>> = {
  'scalpel:guide': 'cut',
  'scalpel:solace': 'split',
  'scalpel:body': 'slip',
  'forceps:shard': 'grab',
  'forceps:mass': 'grab',
  'forceps:cocoon': 'grab',
  'forceps:tendril': 'grab',
  'forceps:flap': 'lift',
  'suture:wound': 'stitch',
  'drain:pool': 'drain',
  'laser:nodule': 'burn',
  'laser:bleeder': 'burn',
  'laser:lull': 'burn',
  'laser:solace': 'burn',
  'laser:mote': 'burn',
  'laser:reverie': 'burn',
  'laser:balmCell': 'burn',
  'laser:body': 'slip',
  'syringe:body': 'inject',
  'syringe:binder': 'bind',
  'syringe:matron': 'bind',
  'gel:abrasion': 'paint',
  'gel:numb': 'paint',
  'gel:wound': 'paint',
  'gel:balmCell': 'paint',
  'scanner:mass': 'reveal',
  'scanner:nodule': 'reveal',
  'scanner:reverie': 'reveal',
  'scanner:decoy': 'pop',
};

/** Display names. */
const NICE: Readonly<Record<Tool, string>> = {
  scalpel: 'The scalpel',
  forceps: 'The forceps',
  suture: 'The suture',
  drain: 'The drain',
  laser: 'The laser',
  syringe: 'The syringe',
  gel: 'The gel',
  scanner: 'The scanner',
};

/** What this pair does, and the line Odie uses when it does not. */
export function pairOf(tool: Tool, kind: Kind): { effect: Effect; line: string } {
  const effect = EFFECT[`${tool}:${kind}`] ?? 'refuse';
  return { effect, line: effect === 'refuse' ? refusalLine(tool, kind) : '' };
}

/** The instrument that can actually work on `kind`, skipping bare-tissue slips. */
export function rightTool(kind: Kind): Tool | null {
  for (const tool of TOOLS) {
    const effect = EFFECT[`${tool}:${kind}`];
    if (effect && effect !== 'slip') return tool;
  }
  return null;
}

/** A refusal that names the instrument that would work. */
export function refusalLine(tool: Tool, kind: Kind): string {
  const right = rightTool(kind);
  const name = NICE[tool];
  if (tool === 'laser' && kind === 'solace') return 'Laser will not touch that, Doctor. It likes the warmth.';
  if (!right) return `${name} has nothing to bite on there.`;
  return `${name} will not do that. ${NICE[right]} will.`;
}

/** True when every tool and every kind has a row (an effect or a refusal line). */
export function tableComplete(): boolean {
  for (const tool of TOOLS) {
    for (const kind of KINDS) {
      const row = pairOf(tool, kind);
      if (row.effect !== 'refuse' && row.effect !== EFFECT[`${tool}:${kind}`]) return false;
      if (row.effect === 'refuse' && row.line.length < 8) return false;
    }
  }
  return true;
}

/** Handbook cards built from the table, one per instrument, plus the gifts and the strains once named. */
export function handbookCards(): { title: string; body: string }[] {
  const cards: { title: string; body: string }[] = [];
  for (const tool of TOOLS) {
    const can: string[] = [];
    const cannot: string[] = [];
    for (const kind of KINDS) {
      const row = pairOf(tool, kind);
      if (row.effect === 'refuse') cannot.push(kind);
      else can.push(`${kind} (${row.effect})`);
    }
    cards.push({
      title: tool,
      body: `Can: ${can.join(', ') || 'nothing'}. Cannot: ${cannot.slice(0, 6).join(', ')}. ${refusalLine(tool, cannot[0] as Kind)}`,
    });
  }
  cards.push({
    title: 'Stillpoint',
    body: 'Three beats on the ECG. Field time slows to a quarter. Your hands do not. One charge, unless the case gives another.',
  });
  cards.push({
    title: 'Second Pulse',
    body: 'Three beats, then a frenzy. Vitals cannot fall. Clean work heals, and the chain counts double.',
  });
  cards.push({
    title: 'The Code',
    body: 'When the line goes flat, both paddles in the green band. Two tries. Land it and the vitals climb back to twenty-five.',
  });
  cards.push({
    title: 'Sites and flaps',
    body: 'Other sites keep bleeding while you are away. A flap lifts with the forceps and clips for eight seconds. Look under it.',
  });
  return cards;
}

/** Whether `tool` is a real instrument id. */
export function isTool(tool: string): tool is Tool {
  return (TOOLS as readonly string[]).includes(tool);
}
