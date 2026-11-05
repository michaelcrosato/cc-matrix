// Checks the built data against PLAN.md's counts and system lists.
import fs from 'node:fs'; import { loadB } from './lint.mjs';
const B = loadB(fs.readdirSync('src').filter(f => /^(0|1|2)\d-/.test(f) || f === '72-bot.js').sort()); let bad = 0;
const chk = (c, m) => { console.log((c ? 'ok   ' : 'MISS ') + m); if (!c) bad++; };
chk(Object.keys(B.MONS).length === 16, 'monsters: 16 types (' + Object.keys(B.MONS).length + ')');
chk(Object.keys(B.SPELLS).length === 18, 'spells: 18 (' + Object.keys(B.SPELLS).length + ')');
chk(['f1', 'f2', 'f3', 'f4', 'rr'].every(f => B.FLOORS[f]), 'four floors and the Rat Run');
chk(Object.keys(B.RACES).length === 4 && Object.keys(B.CLASSES).length === 6, '4 races, 6 classes');
chk(['tamsin', 'durgan', 'veil'].every(n => B.NPCS[n]), '3 recruitable NPCs + Ysolde: ' + !!B.NPCS.ysolde);
const cells = new Set(), feats = new Set(); for (const f of Object.values(B.FLOORS)) { for (const r of f.rows) for (const c of r) cells.add(c); for (const x of f.features) feats.add(x.k); }
for (const [c, n] of [['+', 'door'], ['=', 'gate'], ['L', 'locked door'], ['M', 'magic seal'], ['H', 'secret wall'], ['I', 'illusory wall'], ['P', 'plate'], ['T', 'dart trap'], ['O', 'pit'], ['o', 'trapdoor'], ['^', 'teleporter'], ['S', 'spinner'], ['<', 'stairs up'], ['>', 'stairs down']]) chk(cells.has(c), 'cell: ' + n);
for (const k of ['lever', 'button', 'catch', 'alcove', 'plaque', 'candle', 'clock', 'undergate', 'greatLock', 'shrine', 'torch']) chk(feats.has(k), 'wall feature: ' + k);
chk(Object.values(B.FLOORS).some(f => f.plates && Object.values(f.plates).some(p => p.mode === 'hold')), 'hold plates');
chk(Object.values(B.FLOORS).some(f => Object.values(f.locks || {}).some(l => l.kind === 'warded')), 'warded lock');
chk(B.WALK && ['f1', 'f2', 'f3', 'f4'].every(f => B.WALK[f]), 'walkthrough data for every floor');
chk(Object.keys(B.ITEMS).length >= 50, 'items: ' + Object.keys(B.ITEMS).length);
for (const fn of ['cmdMove', 'cmdTurn', 'cmdUse', 'cmdPutDown', 'cmdThrow', 'cmdStrike', 'cmdHand', 'cmdCast', 'cmdCamp', 'cmdAbility', 'npcJoin', 'dismiss', 'raise', 'bossInit', 'startRace', 'serialize', 'deserialize']) chk(typeof B[fn] === 'function', 'sim: ' + fn);
console.log(bad ? bad + ' missing' : 'all PLAN counts and systems present'); process.exit(bad ? 1 : 0);
