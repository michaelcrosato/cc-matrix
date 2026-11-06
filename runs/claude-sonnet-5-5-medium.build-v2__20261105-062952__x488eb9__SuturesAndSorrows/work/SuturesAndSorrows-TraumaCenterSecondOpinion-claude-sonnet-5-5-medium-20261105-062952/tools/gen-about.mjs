// Bakes src/about-data.json into src/about-data.gen.js so the dev page, the tests and the bundler all see the same data.
import { readFileSync, writeFileSync } from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(path.join(root, 'src/about-data.json'), 'utf8'));
writeFileSync(path.join(root, 'src/about-data.gen.js'), `(window.GAME ||= {}).ABOUT = ${JSON.stringify(data)};\nGAME.ENGINE_VERSION = '0.89.1';\n`);
export default data;
