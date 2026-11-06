import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
export default function (t) {
  const sha = createHash('sha256').update(readFileSync(new URL('../../pixel-engine.js', import.meta.url))).digest('hex');
  const want = readFileSync(new URL('../../vendor/pixel-engine.sha256', import.meta.url), 'utf8').split(/\s+/)[0];
  t.eq(sha, want, 'pixel-engine.js is byte-identical to the kit');
  const sess = readFileSync(new URL('../../vendor/hub/session.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../../WhyFit-WiiFit-claude-sonnet-5-5-medium-20261105-012138.html', import.meta.url), 'utf8');
  t.ok(html.includes(sess), 'the built html carries session.js unmodified');
}
