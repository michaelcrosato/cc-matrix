#!/usr/bin/env node
// Balance report: minutes per zone, deaths, level at each zone, boss durations, drops by rarity.
import { playCampaign } from '../tests/headless/simplay.mjs';

const seeds = process.argv[2] ? process.argv[2].split(',').map(Number) : [11];
for (const seed of seeds) {
  for (const cls of ['bellwarden', 'lamplighter', 'sexton']) {
    const r = playCampaign(cls, { seed });
    const zones = Object.entries(r.zones).map(([k, v]) => `${k} ${(((v.last - v.first) / 3600)).toFixed(1)}m L${v.level}`).join(', ');
    const bosses = Object.entries(r.bosses).map(([k, v]) => `${k} ${v.toFixed(0)}s`).join(' ');
    const drops = Object.entries(r.drops).map(([k, v]) => `${k} ${v}`).join(' ');
    console.log(`${cls} seed ${seed}: ${r.finished ? 'finished' : 'NOT FINISHED'} ${r.minutes.toFixed(1)} min, level ${r.level}, deaths ${r.deaths}\n  zones: ${zones}\n  bosses: ${bosses}\n  drops: ${drops}${r.softlock ? `\n  SOFTLOCK ${JSON.stringify(r.softlock)}` : ''}`);
  }
}
process.exit(0);
