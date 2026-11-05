// Builds the game. Concatenates the engine (engine/my-3d2dge.js, unmodified) and src/game.js, injects the About screen's
// lines from ../exit-interview.json (one source of truth), then writes:
//   build/index.html   the dev page (loads the same two scripts from the folder)
//   ../<GameTitle>-<SOURCE>-claude-haiku-5-5-medium-20261104-073543.html   the single-file deliverable, in the work root
// Run: node tools/build.mjs   (exits 1 if an inlined script would close its own <script> tag)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const dev = path.resolve(here, '..');
const workRoot = path.resolve(dev, '..');
const TITLE = 'EurophoriaFootball-EuropeanFootball-claude-haiku-5-5-medium-20261104-073543';
const DELIVERABLE = path.join(workRoot, TITLE + '.html');
const INTERVIEW = path.join(workRoot, 'exit-interview.json');

/** the About screen's lines: the source information and the credits, from the exit interview */
export function aboutLines() {
  const lines = ['EUROPHORIA FOOTBALL', 'A PLAYFUL RIFF ON EUROPEAN FOOTBALL. OVER THE TOP ARCADE STYLE.', ''];
  if (existsSync(INTERVIEW)) {
    const x = JSON.parse(readFileSync(INTERVIEW, 'utf8')), s = x.sourceInformation || {};
    lines.push('SOURCE INFORMATION');
    for (const [k, label] of [['date', 'Date'], ['source', 'Source'], ['plan', 'Plan'], ['genre', 'Genre'], ['perspective', 'Perspective'], ['tech', 'Tech'],
      ['artDirection', 'Art direction'], ['animation', 'Animation'], ['audio', 'Audio'], ['online', 'Online'], ['testing', 'Testing'],
      ['research', 'Research'], ['environment', 'Environment'], ['model', 'Model'], ['usage', 'Usage']]) lines.push(label + ': ' + (s[k] || 'unknown'));
  } else lines.push('SOURCE INFORMATION: unknown');
  lines.push('', 'CREDITS', 'Engine: my-3D2dge v0.85.2 (github.com/michaelcrosato/my-3d2dge), sports kit as the base.',
    'Music, sound effects and crowd: written in code, no audio files.', 'Thanks for playing. Kipperton can only get better.');
  return lines;
}

/** the game's source: the engine's and our own, with the About lines in place of the placeholder */
export function gameSource() {
  const game = readFileSync(path.join(dev, 'src', 'game.js'), 'utf8');
  return game.replace('__ABOUT__', JSON.stringify({ lines: aboutLines() }));
}

export function engineSource() { return readFileSync(path.join(dev, 'engine', 'my-3d2dge.js'), 'utf8'); }

const CSS = 'html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }';

function page(scripts, title) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="Europhoria Football: a broke seaside club gets into the continent's biggest cup because of a typo. Arcade football, one to four players.">
<style>${CSS}</style>
</head>
<body>
<canvas id="screen"></canvas>
${scripts}
</body>
</html>
`;
}

function main() {
  const eng = engineSource(), game = gameSource();
  for (const [name, src] of [['engine', eng], ['game', game]]) if (/<\/script/i.test(src)) { console.error('build: ' + name + ' contains "</script" and would close its tag'); process.exit(1); }
  mkdirSync(path.join(dev, 'build'), { recursive: true });
  writeFileSync(path.join(dev, 'build', 'game.js'), game);
  writeFileSync(path.join(dev, 'build', 'index.html'), page('<script src="../engine/my-3d2dge.js"></script>\n<script src="game.js"></script>', 'Europhoria Football (dev page)'));
  const inline = page(`<script>\n${eng}\n</script>\n<script>\n${game}\n</script>`, 'Europhoria Football');
  writeFileSync(DELIVERABLE, inline);
  console.log('built ' + path.relative(workRoot, DELIVERABLE) + ' (' + Math.round(inline.length / 1024) + ' KB)');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
