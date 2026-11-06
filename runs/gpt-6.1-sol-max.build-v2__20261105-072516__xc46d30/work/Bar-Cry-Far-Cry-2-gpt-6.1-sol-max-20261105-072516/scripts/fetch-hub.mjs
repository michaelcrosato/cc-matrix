/** @file scripts/fetch-hub.mjs: downloads the hub's client, harness and protocol into .cache/hub/, where lint and format can't touch them. */
import { mkdirSync, writeFileSync } from 'node:fs';

const base = 'https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/';
mkdirSync('.cache/hub', { recursive: true });
for (const name of ['session.js', 'harness.html', 'bridge.js', 'round.js', 'README.md']) {
  const reply = await fetch(base + name);
  if (!reply.ok) throw new Error(`${name}: ${reply.status}`);
  writeFileSync(`.cache/hub/${name}`, Buffer.from(await reply.arrayBuffer()));
}
