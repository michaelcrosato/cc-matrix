// About / Credits: the Source Information block, shown in the About page. Kept in one place so the build can reuse it.
import DATA from './about_data.js';
const FALLBACK = {
  date: '2026-11-04 05:03:14', source: 'TrackMania (2003, Nadeo)', plan: 'PLAN.md', genre: 'Arcade racing (time attack), track-building puzzle', perspective: 'Third-person chase camera (far, close, bumper); top-down map in the editor',
  tech: 'my-3D2dge 2D engine v0.85.2 + 3D engine on three.js r182 (WebGPU/WebGL2) + Rapier 0.19.3; esbuild 0.25; single inlined HTML',
  art: "The engine's native low-res toon-shaded 3D with ink outlines; code-drawn cars, gates and pads; pixel UI font",
  animation: "The engine's vehicle tilt/steer animation and tweens; gates, pads and particles drawn each frame by code",
  audio: 'Chip-style music and effects synthesized with Web Audio (no audio files); engine hum from raw oscillators; Animalese-style gibberish voices',
  online: 'AI Hub session protocol v1, ghost mode: everyone time-attacks the same track for three minutes and sees the others as ghost cars',
  testing: 'Headless Node scripts (game.advance, bot drives of every track, UI and hub checks) behind one command; a few screenshots', research: 'Plan research on TrackMania (2003); engine and AI Hub docs read',
  environment: 'Claude Code CLI (headless); Linux; browser unknown', model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium', usage: 'unknown'
};
const SOURCE = FALLBACK;
export function aboutLines() {
  const S = SOURCE, D = DATA, si = D ? D.sourceInformation : null, L = ['# CRACKMANIA', 'Crack the clock. An original time-attack stunt racer after TrackMania (2003).', '', '# SOURCE INFORMATION'];
  if (si) Object.assign(S, { date: si.date, source: si.source, plan: si.plan, genre: si.genre, perspective: si.perspective, tech: si.tech, art: si.artDirection, animation: si.animation, audio: si.audio, online: si.online, testing: si.testing, research: si.research, environment: si.environment, model: si.model, usage: si.usage });
  for (const [k, v] of Object.entries({ Date: S.date, Source: S.source, Plan: S.plan, 'Genre and perspective': S.genre + '. ' + S.perspective, Tech: S.tech, 'Art direction': S.art, Animation: S.animation, Audio: S.audio, Online: S.online, Testing: S.testing, Research: S.research, Environment: S.environment, Model: S.model, Usage: S.usage }))
    wrap(k + ': ' + v, 58).forEach(l => L.push(l));
  if (D) for (const [h, list, qs] of [['TESTING FEEDBACK', D.testingFeedback, ['Issues caught', 'Critical issues', 'Most helpful test', 'Least helpful test']], ['ENGINE FEEDBACK', D.engineFeedback, ['Liked most', 'Stuck or guessed wrong', 'Built myself', 'Hardest part', 'Engine changes', 'One change']], ['PROMPT FEEDBACK', D.promptFeedback, ['Liked most', 'Confusing', 'Hardest thing', 'What to change']]]) { L.push('', '# ' + h); list.forEach((t, i) => wrap(qs[i] + ': ' + t, 58).forEach(l => L.push(l))); }
  L.push('', '# THANKS', 'Nadeo for the original. The my-3D2dge engine. AI Hub.');
  return L;
}
function wrap(s, n) { const out = []; let line = ''; for (const w of s.split(' ')) { if ((line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; } if (line) out.push(line); return out; }
