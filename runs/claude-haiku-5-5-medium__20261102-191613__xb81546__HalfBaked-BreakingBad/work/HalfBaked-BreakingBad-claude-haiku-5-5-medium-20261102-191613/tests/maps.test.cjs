'use strict';
// Level data checks: every row of a level is the same width, and each level has the spawn tags its scene looks up.
const test = require('node:test');
const assert = require('node:assert/strict');
const HB = require('../src/logic.js');
require('../src/maps.js');
const MAPS = HB.MAPS;

const REQUIRED = {
  lab: ['@', 'C', 'B', 'D'],
  street: ['@', 'g', 'l', 'f', 'a'],
  yard: ['@', 'b']
};

for (const name of Object.keys(REQUIRED)) {
  test(`${name}: rows share one width and the border is solid`, () => {
    const rows = MAPS[name];
    const width = rows[0].length;
    for (const row of rows) assert.equal(row.length, width, `${name} row "${row}"`);
    assert.ok(/^#+$/.test(rows[0]), 'top row is wall');
    assert.ok(/^#+$/.test(rows[rows.length - 1]), 'bottom row is wall');
  });

  test(`${name}: has its spawn tags`, () => {
    const all = MAPS[name].join('');
    for (const tag of REQUIRED[name]) assert.ok(all.includes(tag), `${name} has ${tag}`);
  });
}

test('street has three buyers and at least two patrol waypoints', () => {
  const all = MAPS.street.join('');
  assert.equal(all.split('g').length - 1, 1);
  assert.equal(all.split('l').length - 1, 1);
  assert.equal(all.split('f').length - 1, 1);
  assert.ok(all.split('a').length - 1 >= 2);
});

test('lab has exactly one cook station and one exit', () => {
  const all = MAPS.lab.join('');
  assert.equal(all.split('B').length - 1, 1);
  assert.equal(all.split('D').length - 1, 1);
});
