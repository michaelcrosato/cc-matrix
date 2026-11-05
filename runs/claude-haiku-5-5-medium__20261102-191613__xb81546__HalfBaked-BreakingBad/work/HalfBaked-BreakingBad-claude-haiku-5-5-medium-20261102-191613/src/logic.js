/*
 * HALF BAKED: pure game rules. No engine calls, no DOM, so the tests can run them in Node.
 * Loaded as a plain script; exposes window.HB (or globalThis.HB in Node).
 */
(function (root) {
  'use strict';
  var HB = {};

  // ---- Random numbers -------------------------------------------------------
  // mulberry32: a small seeded generator, so a shift is repeatable from its seed.
  HB.mulberry32 = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // ---- Cook: the three-stage timing bar ----------------------------------------
  HB.COOK_STAGES = [
    { name: 'DISSOLVE', target: 0.5, tol: 0.14, period: 1.5 },
    { name: 'HEAT', target: 0.35, tol: 0.1, period: 1.25 },
    { name: 'DRY', target: 0.7, tol: 0.08, period: 1.1 }
  ];

  // The marker sweeps 0 -> 1 -> 0 (a triangle wave) once every `period` seconds.
  HB.marker = function (t, period) {
    var p = (t / period) % 1;
    if (p < 0) p += 1;
    return p < 0.5 ? p * 2 : 2 - p * 2;
  };

  // 1 when the marker stops on the target, falling to 0 at `tol` away.
  HB.stageScore = function (pos, target, tol) {
    if (pos === null || pos === undefined) return 0;
    return Math.max(0, Math.min(1, 1 - Math.abs(pos - target) / tol));
  };

  // Purity 10..100 from the three stage scores. A missed stage costs most of its share.
  HB.purityFrom = function (scores) {
    var sum = 0;
    for (var i = 0; i < scores.length; i++) sum += scores[i];
    var avg = scores.length ? sum / scores.length : 0;
    return Math.round(10 + 90 * avg);
  };

  HB.cookGrade = function (purity) {
    if (purity >= 90) return 'BLUE';
    if (purity >= 70) return 'GOOD';
    if (purity >= 45) return 'CRUMBLY';
    return 'BAD';
  };

  // ---- Product, prices and offers ---------------------------------------------
  HB.unitsFor = function (purity) {
    return 4 + Math.floor(purity / 12);
  };

  HB.unitPrice = function (purity) {
    return Math.round(18 + purity * 1.4);
  };

  // A buyer's price for a batch. greed scales it; the total is always whole dollars.
  HB.offerFor = function (buyer, purity, units) {
    return Math.round(units * HB.unitPrice(purity) * buyer.greed);
  };

  // Haggling: `roll` is 0..1. About half the time the buyer comes up, else they insult you down.
  HB.haggle = function (offer, buyer, roll) {
    var better = roll < 0.45 + (1 - buyer.patience) * 0.1;
    if (better) return { amount: Math.round(offer * 1.15), ok: true };
    return { amount: Math.round(offer * 0.88), ok: false };
  };

  // ---- Heat: how close the Agent has come --------------------------------------
  HB.HEAT = { max: 100, climb: 42, decay: 7 };

  // `exposure` is 0..1 (how much of the player the guard can see). Heat climbs while it is seen and drains otherwise.
  HB.heatStep = function (heat, exposure, dt) {
    var h = heat;
    if (exposure > 0) h += HB.HEAT.climb * exposure * dt;
    else h -= HB.HEAT.decay * dt;
    return Math.max(0, Math.min(HB.HEAT.max, h));
  };

  HB.isBusted = function (heat) {
    return heat >= HB.HEAT.max;
  };

  // ---- Shift score (what the hub ranks: cash earned on the run) ----------------
  HB.shiftScore = function (cash) {
    return Math.max(0, Math.round(cash || 0));
  };

  // ---- Settings -----------------------------------------------------------------
  // Flip an axis when the player has set the Settings invert toggle (a fix for drift-inverted pads).
  HB.axis = function (value, inverted) {
    return inverted ? -value : value;
  };

  // ---- Button prompts ---------------------------------------------------------------
  // Each action's button on a PlayStation pad, its Xbox letter, and its keyboard default.
  HB.ACTION_GLYPHS = {
    confirm: { ps: 'cross', xbox: 'A', key: 'Enter' },
    cancel: { ps: 'circle', xbox: 'B', key: 'Esc' },
    attack: { ps: 'square', xbox: 'X', key: 'J' },
    skill: { ps: 'triangle', xbox: 'Y', key: 'E' },
    jump: { ps: 'cross', xbox: 'A', key: 'Space' },
    dash: { ps: 'r1', xbox: 'RB', key: 'Shift' },
    interact: { ps: 'cross', xbox: 'A', key: 'E' },
    pause: { ps: 'options', xbox: 'MENU', key: 'Esc' }
  };

  // The prompt for one action on the device last used.
  // device: 'gamepad' | 'keyboard' | 'mouse' | 'touch'; style: 'playstation' | 'xbox'.
  // Returns { kind: 'pad', name } for a pad glyph (drawn as a shape or a letter), { kind: 'text', text } for keys and mouse.
  HB.glyph = function (action, device, style, keyLabel) {
    var g = HB.ACTION_GLYPHS[action];
    if (!g) return { kind: 'text', text: '?' };
    if (device === 'gamepad') {
      if (style === 'xbox') return { kind: 'pad', style: 'xbox', name: g.xbox };
      return { kind: 'pad', style: 'playstation', name: g.ps };
    }
    if (device === 'mouse') return { kind: 'text', text: action === 'attack' ? 'LMB' : keyLabel || g.key };
    return { kind: 'text', text: keyLabel || g.key };
  };

  // ---- Device detection ----------------------------------------------------------------
  // Touch-only: a touch screen, no fine pointer (mouse) and no pad connected.
  HB.isTouchOnly = function (info) {
    return !!info.touch && !info.finePointer && !info.pads;
  };

  // ---- Attract mode -------------------------------------------------------------------
  HB.ATTRACT_IDLE = 10;

  // Which attract step plays after the last one: loop back to the title.
  HB.ATTRACT_ORDER = ['lab', 'street', 'yard'];

  // ---- Chapter order ---------------------------------------------------------------------
  HB.CHAPTERS = ['lab', 'street', 'yard'];
  HB.nextChapter = function (name) {
    var i = HB.CHAPTERS.indexOf(name);
    return i >= 0 && i + 1 < HB.CHAPTERS.length ? HB.CHAPTERS[i + 1] : null;
  };

  // ---- Boss ----------------------------------------------------------------------------
  HB.BOSS = { hp: 100, hitDamage: 9, heroHearts: 6, swipeRadius: 42 };

  HB.bossHit = function (hp, damage) {
    return Math.max(0, hp - damage);
  };

  root.HB = HB;
  if (typeof module !== 'undefined' && module.exports) module.exports = HB;
})(typeof globalThis !== 'undefined' ? globalThis : this);
