// writes ../exit-interview.json from the same answers the About pages show (src/55-about.js, src/56-feedback.js)
import { boot } from '../test/lib.mjs';
import { writeFileSync } from 'node:fs';
const { D } = boot(), A = D.ABOUT;
const j = {
  sourceInformation: { date: A.date, source: A.source, plan: A.plan, genre: A.genre, perspective: A.perspective, tech: A.tech, artDirection: A.art, animation: A.animation, audio: A.audio, online: A.online, testing: A.testing, research: A.research, environment: A.environment, model: A.model, usage: A.usage },
  testingFeedback: A.testingFeedback, engineFeedback: A.engineFeedback, promptFeedback: A.promptFeedback,
  aiHub: { name: 'Cricket Kerfuffle', tagline: 'Over-the-top arcade cricket, with tea',
    description: 'Smash sixes through the pub window, bowl flaming yorkers and save the village green from Lord Thrumpton across five outrageous grounds. Up to four players on one screen, or a Super Over showdown in AI Hub sessions.',
    type: 'Game', genre: 'Sports', source: 'Cricket', series: '', players: '1–4',
    controls: 'Stick/WASD/mouse aim · Cross/J/click hit · Square/K/right-click loft · Circle/L defend · R1/Space run',
    tags: ['sports', 'arcade', 'comedy', 'versus', 'co-op', 'retro'] }
};
writeFileSync(new URL('../../exit-interview.json', import.meta.url), JSON.stringify(j, null, 2) + '\n');
console.log('wrote exit-interview.json');
