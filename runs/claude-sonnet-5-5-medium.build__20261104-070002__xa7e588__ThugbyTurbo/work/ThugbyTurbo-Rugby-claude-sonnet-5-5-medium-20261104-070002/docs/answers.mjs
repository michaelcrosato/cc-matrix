// The one source for the About screen (src/11-about.js), exit-interview.json and the final reply. Run: node tools/gen-about.mjs
export const src = {
  date: '2026-11-04 07:00:02', source: 'rugby (over the top arcade style)', plan: 'PLAN.md (Thugby Turbo, written by claude-opus-5-5 at max effort)',
  genre: 'Arcade sports: rugby sevens, played for laughs (NBA Jam style turbo, big hits, power-ups)',
  perspective: 'TV broadcast camera, 40 degree pitch panning with the ball; switchable to a 55 degree three-quarter and a top-down view',
  tech: 'my-3D2dge v0.85.2 (Canvas 2D, Web Audio), AI Hub Session client 1.4.0, plain JavaScript in one IIFE, no other libraries, engine unmodified',
  artDirection: 'The engine\'s native HD pixel-art skeleton characters (E.Humanoid) dressed in team kits, procedural striped pitch with mud, stands with animated crowd, goalposts, sin-bin dumpster, venue weather and lights',
  animation: 'The engine\'s Humanoid rig and E.MOVES system, with new moves added for rugby: tackle, big hit, pass, kick, fend, spin and sidestep, plus poses for ruck, scrum, lineout lift, celebration and launched bodies',
  audio: 'All music, effects and voices are written in code with the engine\'s chip synth: layered match music, whistles, hooter, crowd bed, hits, and Animalese-style babble voices for commentators, coach and referee',
  online: 'AI Hub Session Protocol v1, parallel mode (each player plays their own match from the same seed, the hub ranks by points margin); couch play for 1 to 2 players',
  testing: 'Headless simulation tests (vm, fixed steps), scripted AI-vs-AI matches in all four venues, a scripted browser playthrough of the whole game, headless Chromium checks and the AI Hub harness; no subagents',
  research: 'PLAN.md, the engine README and API card plus engine source for Input.halfKeys, TileMap, Settings and audio, the AI Hub README, retrofit and session client; no web search',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium',
  usage: 'unknown'
};
export const testing = [
  'About eight: a stale phase handler running after a mid-step phase change (crash), CPU set pieces waiting for scripted seats (attract stall), the kick-off handed to the wrong player, invisible goalposts, missing font glyphs for arrows and ticks, an over-frequent interception and fumble rate, a lost-keypress test bug, and a test helper that left the ball in the kick-off.',
  'Two: the mid-step phase change crash (a try scored during the kick-off phase ran the kick-off handler against a try state) and the attract-mode stall where auto-piloted seats were treated as humans.',
  'Running whole AI-vs-AI matches headless in all four venues with a watchdog counter that fails on any stuck phase, together with a table of direct scenario checks (tackle to ruck, monster hit, try to conversion to kick-off, scrum, lineout, penalty, cards, hazards).',
  'The AI Hub harness runs: they confirmed protocol compliance but passed first time and caught nothing, and the static screenshot sweeps only caught look problems a human would also see.'
];
export const engine = [
  'Characters that are data-driven 3D skeletons: a new animation is one E.MOVES entry, and the pause, settings, controls and rebinding screens come free. The fixed-step game.advance made headless testing trivial.',
  'Yes: the pixel font has no arrow, tick or controller glyphs (so I drew badges with pixels), px.line with a width did not show for goalposts (rects did), Input.halfKeys hands out buttons in preset order, and the pointer coordinate space took a guess.',
  'The entire match simulation: phases, laws, set pieces, referee sight, ball physics with the oval bounce, CPU brains, plus a 10-foot menu system and glyph badges.',
  'Fitting a rules state machine with many mini-games onto per-tick input edges and depth-sorted drawing: edge presses had to be turned into intents, and every phase handler had to survive the phase changing mid-step.',
  'None: the engine is unmodified v0.85.2; the game adds its own view (broadcast) and E.MOVES entries from outside.',
  'Add controller button and arrow glyphs to the font, and a first-class team-sports phase kit (restarts, set pieces, a referee) so a rules-heavy sport is a data problem.'
];
export const prompt = [
  'The numbered plan with every rule and number written down: it turned design arguments into lookups, and the one-command, failures-only testing instruction was clear.',
  'The plan names different files and effort (opus max, 20261103) from the task (sonnet medium, 20261104) so I followed TASK.md; the plan also assumes a shared-world hub session while the task only says to follow the hub library; and the plan is sized well beyond a medium-effort build.',
  'Scope: fitting a plan for a max-effort build into one medium session, deciding which parts to simplify (mini-games for set pieces, parallel hub mode, no engine patches) while keeping every listed feature present.',
  'Tier the plan into must, should and could; give the file-name convention once; say which hub mode is expected; and say where usage numbers come from.'
];
export const aiHub = { name: 'Thugby Turbo', tagline: 'Pass backwards. Run forwards. Hit everything.', description: 'Over-the-top arcade rugby sevens on a TV broadcast camera: turbo, monster hits, supers, fans throwing power-ups, a short-sighted referee and a giant chicken. Story cup, exhibition, training and online match-ups.', type: 'Game', genre: 'Sports', source: 'Rugby', series: '', players: '1–2', controls: 'Stick run, R2 turbo, L1/R1 pass back, X tackle or sidestep, Square fend, O kick, Triangle super. Keys: WASD, Shift, Q/E, Space, F, C, R.', tags: ['3d', 'sports', 'arcade', 'comedy', 'versus', 'low-poly'] };
