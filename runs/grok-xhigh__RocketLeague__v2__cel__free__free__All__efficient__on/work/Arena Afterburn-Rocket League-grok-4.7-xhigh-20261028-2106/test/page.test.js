import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dev = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(dev, '..');
const fileName = 'Arena Afterburn-Rocket League-grok-4.7-xhigh-20261028-2106.html';

test('the shipped page is WebGPU-only soccar with a real join path', () => {
  const html = readFileSync(join(root, fileName), 'utf8');
  assert.match(html, /three@0\.180\.0\/build\/three\.webgpu\.js/);
  assert.match(html, /new THREE\.WebGPURenderer/);
  assert.match(html, /_getFallback = null/);
  assert.doesNotMatch(html, /WebGLRenderer/);
  assert.doesNotMatch(html, /forceWebGL/);
  assert.match(html, /rapier3d-compat@0\.19\.3/);
  assert.match(html, /AudioContext/);
  assert.match(html, /getGamepads/);
  assert.match(html, /RTCPeerConnection/);
  assert.match(html, /MeshToonNodeMaterial/);
  assert.match(html, /location\.protocol === ["']file:["']/);
  assert.match(html, /python3 -m http\.server 8080/);
  assert.match(html, /KICKOFF/);
  assert.match(html, /GOAL/);
  assert.match(html, /OVERTIME/);
  assert.match(html, /Controller or keyboard required/);
  assert.match(html, /Source Information/);
  assert.match(html, /Testing Feedback/);
  assert.match(html, /Engine Feedback/);
  assert.match(html, /Prompt Feedback/);
  assert.match(html, /what woudl that be/);
  assert.match(html, /could of run/);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.indexOf('<!--') < html.indexOf('<script'));
});

test('sources and the page do not mark unfinished work', () => {
  const banned = new RegExp(['TO', 'DO', '|FIX', 'ME', '|place', 'holder|st', 'ub'].join(''), 'i');
  const html = readFileSync(join(root, fileName), 'utf8');
  assert.equal(banned.test(html), false);
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(js|mjs|html|css)$/.test(entry.name)) files.push(path);
    }
  };
  walk(dev);
  for (const path of files) {
    const text = readFileSync(path, 'utf8');
    assert.equal(banned.test(text), false, path);
  }
});
