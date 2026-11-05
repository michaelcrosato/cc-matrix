// The load order shared by the bundler and the tests: the engine first, then the game's files in src/ by name.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const TITLE_FILE = 'OperationWolfpack-OperationWolf-claude-haiku-5-5-medium-20261103-185013';

export function loadOrder() {
  const engine = ['engine/my-3d2dge.js', 'engine/arcade.js'];
  const src = readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => 'src/' + f);
  return [...engine, ...src].map(f => path.join(root, f));
}
export const ROOT = root;
