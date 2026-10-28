// bundle.mjs
// Bundles src/* into the standalone root HTML file with top-of-file metadata HTML comment

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SOURCE_AND_FEEDBACK_INFO } from './src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const css = fs.readFileSync(path.join(__dirname, 'src/styles.css'), 'utf8');

const moduleOrder = [
  'src/config.js',
  'src/audio.js',
  'src/input.js',
  'src/shaders.js',
  'src/tracks.js',
  'src/kart.js',
  'src/items.js',
  'src/ui.js',
  'src/main.js'
];

let combinedJS = `import * as THREE from 'three/webgpu';
import {
  color,
  float,
  vec3,
  normalLocal,
  positionLocal,
  normalWorld,
  positionWorld,
  cameraPosition,
  dot,
  max,
  step,
  mix,
  sin,
  cos,
  fract,
  uv,
  time
} from 'three/tsl';
import RAPIER from '@dimforge/rapier3d-compat';
\n`;

for (const relPath of moduleOrder) {
  let code = fs.readFileSync(path.join(__dirname, relPath), 'utf8');
  // Strip import statements (already imported at top of bundle)
  code = code.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  // Strip export keywords
  code = code.replace(/^\s*export\s+(class|function|const|let|var)\s+/gm, '$1 ');
  combinedJS += `\n// ==========================================\n// MODULE: ${relPath}\n// ==========================================\n` + code + '\n';
}

const topComment = `<!--
================================================================================
FLASH-O-KART 64 (SPIRITUAL SUCCESSOR TO MARIO KART 64 FOR N64)
================================================================================

## Source Information
${SOURCE_AND_FEEDBACK_INFO.sourceInfo.map(s => '- ' + s).join('\n')}

## Testing Feedback
${SOURCE_AND_FEEDBACK_INFO.testingFeedback.map(s => '- ' + s).join('\n')}

## Engine Feedback
${SOURCE_AND_FEEDBACK_INFO.engineFeedback.map(s => '- ' + s).join('\n')}

## Prompt Feedback
${SOURCE_AND_FEEDBACK_INFO.promptFeedback.map(s => '- ' + s).join('\n')}
================================================================================
-->`;

const html = `${topComment}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flash-O-Kart 64 — Super Cel-Shaded Grand Prix</title>
  <style>
${css}
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js",
      "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js",
      "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.tsl.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/",
      "@dimforge/rapier3d-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs"
    }
  }
  </script>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <div id="split-dividers"></div>
  <div id="lightning-flash"></div>
  <div id="hud-layer" class="hidden"></div>
  <div id="minimap-container">
    <canvas id="minimap-canvas" width="136" height="136"></canvas>
  </div>
  <div id="ui-layer"></div>

  <script type="module">
${combinedJS}
  </script>
</body>
</html>
`;

const outRootFile = path.join(rootDir, 'FlashOKart64-MarioKart64forN64-gemini-4-argon-high-20261027-1637.html');
const outDevFile = path.join(__dirname, 'index.html');

fs.writeFileSync(outRootFile, html, 'utf8');
fs.writeFileSync(outDevFile, html, 'utf8');
console.log('Bundled successfully to:', outRootFile, 'Size:', html.length, 'bytes');
