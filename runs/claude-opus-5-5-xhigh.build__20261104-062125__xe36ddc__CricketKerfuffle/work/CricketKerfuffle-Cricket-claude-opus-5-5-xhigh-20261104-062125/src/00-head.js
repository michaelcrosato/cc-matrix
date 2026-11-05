/* CRICKET KERFUFFLE: an over-the-top arcade cricket game on my-3D2dge v0.85.2 (modified: engine/CHANGES-KERFUFFLE.md).
 * The source files in src/ are concatenated in name order into one IIFE by tools/build.mjs:
 *   00-09 foundations (helpers, constants, tuning, randomness, the event bus, the profile)
 *   10-19 content as data (teams, grounds, deliveries, shots, specials, arcade items, story, lines, music)
 *   20-29 the match simulation (pure: fixed steps, seeded randomness, no drawing, no audio)
 *   30-45 presentation (ground, cast, animation, effects, camera, replays, audio, voice, commentary, glyphs, HUD, UI)
 *   50-60 scenes (title, attract, front end, story, match, results, nets, showdown, about, AI Hub)
 *   70-99 dev mode, the debug handle and the start */
const E = My3D2dge, { px, clamp, lerp } = E;
const K = {};                         // the game's namespace (tests reach it as window.__kerfuffle)
window.__kerfuffle = K;
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const sign = v => (v < 0 ? -1 : 1);
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const wrapAng = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const hyp = Math.hypot;
const fmt1 = v => (Math.round(v * 10) / 10).toFixed(1);
const pickW = (rnd, items, w) => { let s = 0; for (const it of items) s += w(it); let r = rnd() * s; for (const it of items) { r -= w(it); if (r <= 0) return it; } return items[items.length - 1]; };
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
K.util = { sign, approach, wrapAng, fill, pickW };
const scenes = {};   // the game's scenes, filled by the scene files (50-99)
K.scenes = scenes;
