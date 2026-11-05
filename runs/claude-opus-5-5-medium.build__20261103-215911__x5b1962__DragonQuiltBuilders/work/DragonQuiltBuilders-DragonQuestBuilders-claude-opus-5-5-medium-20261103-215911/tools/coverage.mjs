// Maps every TASK.md requirement to the named checks that cover it, from one --list run's output (stdin or a file).
// node tools/coverage.mjs run-output.txt  -> one line per requirement, then whether every requirement is covered.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = readFileSync(process.argv[2], 'utf8'), pass = out.split('\n').filter(l => l.startsWith('PASS ')), fail = out.split('\n').filter(l => l.startsWith('FAIL '));
const html = path.resolve(root, '..', path.basename(root) + '.html'), ei = path.resolve(root, '..', 'exit-interview.json');
const REQ = [
  ['Package: one bundled HTML in the folder root, works on its own', [/hub: standalone/], () => existsSync(html)],
  ['Genre and perspective: building RPG in an isometric voxel world, turning camera', [/01-voxel: pickScreen/, /03-input: E turns the camera/, /03-input: minus steps the zoom/]],
  ['Tech stack built on the engine (rigs, physics, rendering hooks)', [/01-voxel: a body standing on a run sorts/, /overlays: the frame with overlays drew its queue/]],
  ["Source's world and loop: gather, craft, build rooms, town levels, residents", [/16-playthrough: M3.5 a Bedroom built/, /16-playthrough: M4 a Workshop: town level 2/, /07-town: completing the pattern makes/, /08-npc: Wren goes to sleep in her bed/, /04-items: every recipe crafts/]],
  ['Combat, monsters, bosses, siege', [/09-monsters: a monster notices, chases and winds up/, /10-siege: two manned ballista hits Tangle him/, /16-playthrough: M11.2 Sir Buttonsworth defeated/, /16-playthrough: M13 three waves survived/, /16-playthrough: M14 Gnarlgrim unravels/]],
  ['Demo long enough to show all features, complete end to end', [/16-playthrough: every quest is done/, /16-playthrough: then free play/, /16-playthrough: no autopilot failures/, /16-playthrough: no errors/]],
  ['Infrastructure for later content: saves, story beats, stamps', [/12-save: load: the world hash matches/, /12-save: beat clear is consistent/, /13-dev: import the stamp elsewhere/]],
  ['Dev mode from the pause menu with standard test tools', [/13-dev: Dev Tools open/, /13-dev: God mode toggles on/, /13-dev: every warp lands/, /13-dev: spawn a monster/, /13-dev: the Debug tab toggles all 7 overlays/, /13-dev: loading the dev snapshot/, /overlays: every Debug overlay draws/]],
  ['Live balance sliders with reset to defaults', [/13-dev: a slider moves right/, /13-dev: reset one slider/, /13-dev: Reset all to defaults/, /02-builder: the walk slider changes speed live/, /11-time: the day length slider is live/, /09-monsters: Monster HP x2/]],
  ['Attract mode after 10 s idle, looping, any input exits', [/14-attract: no attract at 9.9/, /14-attract: attract starts after 10 s/, /14-attract: three full loops/, /14-attract: a key press returns/, /14-attract: moving the mouse returns/, /14-attract: .*never touches the saves/]],
  ['Multiplayer per the AI Hub protocol, and the game on its own', [/hub: 2 players/, /hub: 4 players, latency, loss/, /hub: host leaves/, /hub: server mode/, /18-net: every copy's world converges/, /17-bee: surviving the raid ends the round, won/, /17-bee: .*Knot Cutter/]],
  ['Controller first: PlayStation glyphs, Xbox option', [/03-input: gamepad prompt for swing is square/, /03-input: PlayStation glyphs are the default/, /03-input: the glyph setting switches to Xbox/]],
  ['Keyboard and mouse native; hover moves focus; prompts follow the last device', [/03-input: keyboard prompt/, /03-input: mouse prompt for swing/, /03-input: the mouse wheel steps the hotbar/, /features: mouse hover over a menu entry moves the focus/, /features: moving the mouse switches prompts/]],
  ['10-foot UI screens work by menu actions', [/04-items: the crafting screen crafts x5/, /04-items: L1\/R1 switch Satchel tabs/, /15-ui: the letter grid types a name with the pad/]],
  ['Touch-only: notice, settings button, no touch controls, attract runs', [/features: a real touch phone gets the/, /features: no touch controls on the phone/, /features: the attract mode runs on the phone/, /features: the corner settings\/menu button/, /15-ui: touch-only devices see/]],
  ['Audio all in code; Animalese voices', [/features: all 14 songs, 12 jingles/, /features: every speaker's Animalese voice is audible/, /features: the voices differ/, /features: no audio files/]],
  ['Narrative tone, font-safe text', [/03-input: every string table uses only the font/]],
  ['In-game About/Credits with the four sections', [/15-ui: About has Credits, Source Information/, /15-ui: Source Information lists every field/, /15-ui: the feedback pages answer every question/]],
  ['exit-interview.json parses and answers every field', [], () => { try { const d = JSON.parse(readFileSync(ei, 'utf8')); const empty = []; const w = o => { for (const k in o) { const v = o[k]; if (v && typeof v === 'object') w(v); else if (v === '' || v == null) empty.push(k); } }; w(d); return !empty.length; } catch (e) { return false; } }],
  ['Testing: one command, only failures and a count line', [], () => /^\d+ passed, 0 failed/m.test(out)]
];
let all = true;
for (const [req, pats, extra] of REQ) {
  const hits = pats.map(p => pass.find(l => p.test(l)));
  const ok = hits.every(Boolean) && (!extra || extra()) && !fail.length;
  if (!ok) all = false;
  console.log((ok ? 'COVERED  ' : 'MISSING  ') + req + '  [' + pats.length + ' named checks' + (extra ? ' + file check' : '') + ']' + (ok ? '' : ' missing: ' + pats.filter((p, i) => !hits[i]).join(' ')));
}
console.log(all ? 'every TASK.md requirement is covered by passing checks in this run (' + pass.length + ' passed, ' + fail.length + ' failed)' : 'NOT every requirement is covered');
process.exit(all ? 0 : 1);
