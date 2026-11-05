'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const HB = require('../src/logic.js');

test('marker is a triangle wave from 0 to 1 and back, every period', () => {
  assert.equal(HB.marker(0, 1), 0);
  assert.ok(Math.abs(HB.marker(0.5, 1) - 1) < 1e-9);
  assert.ok(Math.abs(HB.marker(1, 1)) < 1e-9);
  assert.ok(Math.abs(HB.marker(0.25, 1) - 0.5) < 1e-9);
  assert.ok(Math.abs(HB.marker(1.75, 1) - 0.5) < 1e-9);
  for (let t = 0; t < 5; t += 0.01) {
    const m = HB.marker(t, 1.3);
    assert.ok(m >= 0 && m <= 1, 'marker stays in 0..1 at t=' + t);
  }
});

test('stage score is 1 on target, 0 at or beyond tolerance, and null is 0', () => {
  assert.equal(HB.stageScore(0.5, 0.5, 0.1), 1);
  assert.equal(HB.stageScore(0.7, 0.5, 0.1), 0);
  assert.equal(HB.stageScore(0.9, 0.5, 0.1), 0);
  assert.ok(Math.abs(HB.stageScore(0.55, 0.5, 0.1) - 0.5) < 1e-9);
  assert.equal(HB.stageScore(null, 0.5, 0.1), 0);
});

test('purity runs 10..100 and rises with better stage scores', () => {
  assert.equal(HB.purityFrom([1, 1, 1]), 100);
  assert.equal(HB.purityFrom([0, 0, 0]), 10);
  assert.ok(HB.purityFrom([1, 1, 0]) > HB.purityFrom([1, 0, 0]));
  assert.equal(HB.cookGrade(95), 'BLUE');
  assert.equal(HB.cookGrade(75), 'GOOD');
  assert.equal(HB.cookGrade(50), 'CRUMBLY');
  assert.equal(HB.cookGrade(20), 'BAD');
});

test('batch size and price grow with purity, all whole numbers', () => {
  assert.equal(HB.unitsFor(10), 4);
  assert.equal(HB.unitsFor(100), 12);
  assert.ok(HB.unitPrice(100) > HB.unitPrice(10));
  assert.equal(HB.unitPrice(50), Math.round(18 + 50 * 1.4));
  const buyer = { greed: 1.1, patience: 0.5 };
  const offer = HB.offerFor(buyer, 80, 8);
  assert.equal(offer, Math.round(8 * HB.unitPrice(80) * 1.1));
  assert.equal(Number.isInteger(offer), true);
});

test('haggling sometimes raises the price and sometimes insults it down', () => {
  const buyer = { greed: 1, patience: 0.2 };
  const won = HB.haggle(1000, buyer, 0.01);
  const lost = HB.haggle(1000, buyer, 0.99);
  assert.equal(won.ok, true);
  assert.equal(won.amount, 1150);
  assert.equal(lost.ok, false);
  assert.equal(lost.amount, 880);
});

test('heat climbs while seen, drains when not, and is clamped 0..100', () => {
  let h = 0;
  h = HB.heatStep(h, 1, 1);
  assert.equal(h, HB.HEAT.climb);
  h = HB.heatStep(h, 0, 1);
  assert.equal(h, HB.HEAT.climb - HB.HEAT.decay);
  assert.equal(HB.heatStep(0, 0, 10), 0, 'never below zero');
  assert.equal(HB.heatStep(99, 1, 10), HB.HEAT.max, 'never above max');
  assert.equal(HB.isBusted(99.9), false);
  assert.equal(HB.isBusted(100), true);
});

test('partial exposure climbs heat more slowly than full exposure', () => {
  assert.ok(HB.heatStep(0, 0.5, 1) < HB.heatStep(0, 1, 1));
  assert.ok(HB.heatStep(0, 0.5, 1) > 0);
});

test('shift score is whole, non-negative cash', () => {
  assert.equal(HB.shiftScore(1234.6), 1235);
  assert.equal(HB.shiftScore(-5), 0);
  assert.equal(HB.shiftScore(undefined), 0);
});

test('invert toggles flip an axis and leave it when off', () => {
  assert.equal(HB.axis(0.8, true), -0.8);
  assert.equal(HB.axis(0.8, false), 0.8);
  assert.equal(HB.axis(-0.3, true), 0.3);
});

test('pad prompts follow the glyph style; keys and mouse show text', () => {
  assert.deepEqual(HB.glyph('confirm', 'gamepad', 'playstation'), { kind: 'pad', style: 'playstation', name: 'cross' });
  assert.deepEqual(HB.glyph('confirm', 'gamepad', 'xbox'), { kind: 'pad', style: 'xbox', name: 'A' });
  assert.deepEqual(HB.glyph('attack', 'gamepad', 'playstation'), { kind: 'pad', style: 'playstation', name: 'square' });
  assert.deepEqual(HB.glyph('attack', 'keyboard', 'playstation', 'J'), { kind: 'text', text: 'J' });
  assert.deepEqual(HB.glyph('attack', 'mouse', 'xbox', 'J'), { kind: 'text', text: 'LMB' });
  assert.equal(HB.glyph('nothing', 'keyboard', 'xbox').kind, 'text');
});

test('every action with a prompt has a PS and an Xbox name', () => {
  for (const [name, g] of Object.entries(HB.ACTION_GLYPHS)) {
    assert.ok(g.ps && g.xbox && g.key, name);
  }
});

test('touch-only means touch with no fine pointer and no pad', () => {
  assert.equal(HB.isTouchOnly({ touch: true, finePointer: false, pads: 0 }), true);
  assert.equal(HB.isTouchOnly({ touch: true, finePointer: true, pads: 0 }), false);
  assert.equal(HB.isTouchOnly({ touch: true, finePointer: false, pads: 1 }), false);
  assert.equal(HB.isTouchOnly({ touch: false, finePointer: false, pads: 0 }), false);
});

test('chapters run in order and end after the yard', () => {
  assert.equal(HB.nextChapter('lab'), 'street');
  assert.equal(HB.nextChapter('street'), 'yard');
  assert.equal(HB.nextChapter('yard'), null);
  assert.equal(HB.nextChapter('nowhere'), null);
});

test('seeded generator repeats its sequence and stays in 0..1', () => {
  const a = HB.mulberry32(42), b = HB.mulberry32(42);
  for (let i = 0; i < 200; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
  assert.notEqual(HB.mulberry32(1)(), HB.mulberry32(2)());
});

test('boss takes damage and never goes below zero', () => {
  assert.equal(HB.bossHit(100, 9), 91);
  assert.equal(HB.bossHit(4, 9), 0);
});
