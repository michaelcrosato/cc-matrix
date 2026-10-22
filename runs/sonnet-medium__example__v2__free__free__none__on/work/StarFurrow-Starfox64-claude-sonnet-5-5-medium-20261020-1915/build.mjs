// Bundles src/*.js + style.css into one self-contained HTML file (CDN deps via import map).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..');
const OUT = 'StarFurrow-Starfox64-claude-sonnet-5-5-medium-20261020-1915.html';
const files = fs.readdirSync(path.join(dir, 'src')).filter((f) => f.endsWith('.js')).sort();
const code = files.map((f) => `\n// ---------------- ${f} ----------------\n` + fs.readFileSync(path.join(dir, 'src', f), 'utf8')).join('\n');
const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
const about = fs.readFileSync(path.join(dir, 'src', '10_about.js'), 'utf8');
const { SRC_INFO, ENGINE_FEEDBACK, PROMPT_FEEDBACK } = new Function(about + '\n; return { SRC_INFO, ENGINE_FEEDBACK, PROMPT_FEEDBACK };')();
const clean = (s) => s.replace(/--/g, '- -');
const comment = clean(`
Star Furrow — an original spiritual successor to Starfox 64 (N64)

SOURCE INFORMATION
- Date: ${SRC_INFO.date}
- Source: ${SRC_INFO.source}
- Tech: ${SRC_INFO.tech}
- Art Direction: ${SRC_INFO.art}
- Animation: ${SRC_INFO.anim}
- Testing: ${SRC_INFO.testing}
- Environment: ${SRC_INFO.env}
- Model: ${SRC_INFO.model}
- Usage: ${SRC_INFO.usage}

ENGINE FEEDBACK
${ENGINE_FEEDBACK.map(([q, a]) => `- ${q}\n  ${a}`).join('\n')}

PROMPT FEEDBACK
${PROMPT_FEEDBACK.map(([q, a]) => `- ${q}\n  ${a}`).join('\n')}
`);
const CDN = 'https://cdn.jsdelivr.net/npm';
const importmap = {
  imports: {
    'three': `${CDN}/three@0.180.0/build/three.webgpu.js`,
    'three/webgpu': `${CDN}/three@0.180.0/build/three.webgpu.js`,
    'three/tsl': `${CDN}/three@0.180.0/build/three.tsl.js`,
    'three/addons/': `${CDN}/three@0.180.0/examples/jsm/`,
    '@dimforge/rapier3d-compat': `${CDN}/@dimforge/rapier3d-compat@0.19.3/rapier.mjs`,
  },
};
const html = `<!DOCTYPE html>
<!--${comment}-->
<html lang="en">
<head>
<meta charset="utf-8">
<title>Star Furrow</title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@700;800&display=swap" rel="stylesheet">
<style>
${css}
</style>
<script type="importmap">
${JSON.stringify(importmap, null, 2)}
</script>
</head>
<body>
<canvas id="gl"></canvas>
<div id="ui"></div>
<script type="module">
import * as THREE from 'three/webgpu';
import { positionLocal, normalLocal, pass, mix, smoothstep, uniform } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import * as RAPIER from '@dimforge/rapier3d-compat';
${code}
boot();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, OUT), html);
fs.writeFileSync('/tmp/starfurrow-module.mjs', `import * as THREE from 'three/webgpu';\n` + code);
console.log('wrote', OUT, (html.length / 1024).toFixed(0) + ' KB');
