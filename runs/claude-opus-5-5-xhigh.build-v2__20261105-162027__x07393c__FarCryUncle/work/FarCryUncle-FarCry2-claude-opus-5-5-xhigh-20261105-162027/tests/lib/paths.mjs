import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = join(ROOT, '..', `${basename(ROOT)}.html`);
