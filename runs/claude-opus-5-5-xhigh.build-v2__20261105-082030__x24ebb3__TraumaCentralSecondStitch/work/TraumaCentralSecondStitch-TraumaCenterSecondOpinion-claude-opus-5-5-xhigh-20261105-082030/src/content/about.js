// The About/Credits screen: paged, big text. Same words as the chat reply and exit-interview.json.
import { EXIT } from './exit.js';

const S = EXIT.sourceInformation;
export const ABOUT_PAGES = [
  { title: 'SOURCE INFORMATION', rows: [
    ['DATE', S.date], ['SOURCE', S.source], ['PLAN', S.plan], ['GENRE AND PERSPECTIVE', `${S.genre}. ${S.perspective}`], ['TECH', S.tech], ['ART DIRECTION', S.artDirection], ['ANIMATION', S.animation], ['AUDIO', S.audio], ['ONLINE', S.online], ['TESTING', S.testing], ['RESEARCH', S.research], ['ENVIRONMENT', S.environment], ['MODEL', S.model], ['USAGE', S.usage],
  ] },
  { title: 'TESTING FEEDBACK', rows: [
    ['HOW MANY ISSUES DID TESTING CATCH?', EXIT.testingFeedback[0]], ['HOW MANY WOULD BE CONSIDERED CRITICAL?', EXIT.testingFeedback[1]], ['MOST HELPFUL TEST', EXIT.testingFeedback[2]], ['LEAST HELPFUL TEST', EXIT.testingFeedback[3]],
  ] },
  { title: 'ENGINE FEEDBACK', rows: [
    ['WHAT DID YOU LIKE MOST ABOUT THE ENGINE?', EXIT.engineFeedback[0]], ['DID YOU GET STUCK OR GUESS WRONG?', EXIT.engineFeedback[1]], ['THE MOST IMPORTANT THING YOU BUILT YOURSELF', EXIT.engineFeedback[2]], ['THE HARDEST PART OF USING THE ENGINE', EXIT.engineFeedback[3]], ['WHAT DID YOU CHANGE IN THE ENGINE?', EXIT.engineFeedback[4]], ['ONE THING YOU WOULD CHANGE', EXIT.engineFeedback[5]],
  ] },
  { title: 'PROMPT FEEDBACK', rows: [
    ['WHAT DID YOU LIKE MOST ABOUT THIS PROMPT?', EXIT.promptFeedback[0]], ['WHAT WAS CONFUSING?', EXIT.promptFeedback[1]], ['THE HARDEST THING TO DO', EXIT.promptFeedback[2]], ['WHAT WOULD YOU CHANGE?', EXIT.promptFeedback[3]],
  ] },
  { title: 'CREDITS', rows: [
    ['THE GAME', 'All art and audio written in code: models, textures, tissue, music, sound effects and gibberish voices.'],
    ['PIXEL ENGINE', 'Pixel Engine 0.46.0, the riftlight engine kit, MIT licence.'],
    ['THREE.JS', 'three.js r186, MIT licence, inside the engine.'],
    ['RAPIER', 'Rapier physics, Apache-2.0, inside the engine.'],
    ['FURNITURE', 'Kenney Furniture Kit 2.0 by Kenney, CC0, recoloured to hospital steel.'],
    ['AI HUB', 'AI Hub Session Protocol v1, client 1.4.0, unmodified.'],
    ['AN ORIGINAL GAME', 'Inspired by the genre and feel of Trauma Center: Second Opinion (Atlus, 2006). No characters, names, levels, art or music from it.'],
  ] },
];
