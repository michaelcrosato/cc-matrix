// about: the paged About / Credits holds the Source Information and the three sets of feedback; exit-interview.json
// parses, answers every field, and says the same as the pages
import { readFileSync } from 'node:fs';
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  const pages = B.About.pages(), names = pages.map(p => p[0]);
  check('six About pages', names.join('|') === 'About|Source Information|Testing Feedback|Engine Feedback|Prompt Feedback|Credits', names.join('|'));
  check('every page has words', pages.every(p => p[1].length >= 4 && p[1].every(l => typeof l === 'string' && l.length)), '');
  const q = l => l.filter(x => x.startsWith('# ')).length;
  check('the feedback pages answer 4, 6 and 4 questions', q(B.ABOUT.testing) === 4 && q(B.ABOUT.engine) === 6 && q(B.ABOUT.prompt) === 4, [q(B.ABOUT.testing), q(B.ABOUT.engine), q(B.ABOUT.prompt)].join(','));
  game.go('about', {}, { fade: 0 }); t.step(.2); for (let i = 0; i < 6; i++) { t.tap('right'); t.step(.1); } check('the About screen pages through', game.sceneName === 'about', game.sceneName);
  let J = null; try { J = JSON.parse(readFileSync(new URL('../../exit-interview.json', import.meta.url), 'utf8')); } catch (e) { J = null; }
  check('exit-interview.json parses', !!J, '');
  if (!J) return;
  const keys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
  check('it answers every Source Information field', keys.every(k => J.sourceInformation[k] && String(J.sourceInformation[k]).trim()), keys.filter(k => !J.sourceInformation[k]).join(','));
  check('its feedback matches the pages', JSON.stringify(J.testingFeedback) === JSON.stringify(B.ABOUT.testing.filter(l => !l.startsWith('# '))) && JSON.stringify(J.promptFeedback) === JSON.stringify(B.ABOUT.prompt.filter(l => !l.startsWith('# '))) && J.engineFeedback.length === 6, '');
  check('its AI Hub entry is complete', ['name', 'tagline', 'description', 'type', 'genre', 'source', 'players', 'controls'].every(k => J.aiHub[k]) && J.aiHub.tags.length >= 3 && J.aiHub.tags.length <= 6 && J.aiHub.genre === 'Stealth', '');
}
