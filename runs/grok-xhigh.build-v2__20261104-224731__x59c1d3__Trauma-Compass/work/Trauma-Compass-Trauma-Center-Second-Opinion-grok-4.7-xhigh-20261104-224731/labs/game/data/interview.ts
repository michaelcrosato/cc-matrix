/**
 * @file The exit interview. The About screen and exit-interview.json are this object, so they cannot disagree.
 * Usage is exactly the words the importer replaces.
 */

/** One About card. */
export interface AboutCard {
  kicker: string;
  title: string;
  body: string;
  usage?: boolean;
}

/** The catalogue and the four feedback blocks, in the shape TASK.md asks for. */
export const INTERVIEW = {
  sourceInformation: {
    date: '2026-11-04 22:47:31',
    source: 'Trauma Center: Second Opinion',
    plan: 'PLAN.md',
    genre: 'Surgical simulation',
    perspective: 'Close overhead, a fixed camera on the operating field',
    tech: 'my-3dge at 2dbd829, three.js 0.182.0 on WebGPU, Rapier 0.21.0, TypeScript 5.9, Vite 7.3, AI Hub session client 1.4.0',
    artDirection:
      'The engine’s native PBR look at full resolution: wet stylised tissue, teal drapes, brass and amber lamps',
    animation:
      'The engine’s animator for the surgeon. The sheet, breath, heartbeat and gloves are rewritten every frame',
    audio: 'Songs and effects written as chip voices. Voices are syllable gibberish. Music starts at 10%',
    online: 'AI Hub shared-world sessions only. Couch co-op for up to four devices on one screen. No other network',
    testing:
      'Headless sim tests, one verify command, Chromium from file://, Firefox and WebKit for the WebGPU message. No physical controller, touch screen, second person, or iPhone',
    research: 'The plan’s own research notes. No further research',
    environment: 'Grok CLI (headless); Linux',
    model: 'xAI, grok-4.7, reasoning effort xhigh',
    usage: 'added on import',
  },
  testingFeedback: [
    'Twenty issues were caught and written in labs/game/TESTING-LOG.md.',
    'Eleven were game-breaking: a restore stepped the wrong body, the gala flap never finished, Reverie left the surface early, Solace children stacked, the syringe bound the wrong target, stitches landed off the wound, co-op copies shared one point, an outline width the engine rejects, a sound id the engine already owns, a look and a song that used fields the engine does not have, and a hub round that never readied while the GPU was still warming up.',
    'The most helpful tests were the bot, which had to win every required case and seed, and the content walk that plays the whole shift to the credits.',
    'The least helpful was the voice-key equality check. It only shows that one line keeps the same syllable list. The starter gem tests had to stay green and do not cover an operation.',
  ],
  engineFeedback: [
    'Headless play, capture, settings that restart a scene in place, and the one-file build. A game can be proven without a screen.',
    'Yes. The live operation sat in a module, and capture restored only the world, so the next step used the body from before the rewind until the chart snapshot was adopted. A view setting cannot be read from the sim, so the radial-slow slider cannot change the hashed clock.',
    'The operation itself: tools, vitals, the five strains, ratings, the bot, the lockstep, and the campaign screens. The engine does not know what a surgery is.',
    'There is no scene hook after a restore, and no public way to rewrite a geometry the page kept. Both showed up as a mismatched hash and a mesh that could not be repainted.',
    'Nothing. The engine stayed read-only. Local engine patches is empty.',
    'A callback on the scene after restore, or a supported way to update a kept mesh, so a living sheet and a rewind do not depend on a private object.',
  ],
  promptFeedback: [
    'The plan named the rules, the files, the hub boot order, and the traps on this machine. The operation could be built from that.',
    'The sheet was specified very dense, while the same plan warned that four browser copies are killed when memory runs out. The source’s subtitle is banned as a title and allowed as an ordinary line, which is easy to mix up.',
    'Covering eight operations, the story, couch play, and the four-copy hub check on a machine that ends the largest browser.',
    'Split the four-copy hub check from the campaign-length walk, and name a sheet size that fits that check.',
  ],
  aiHub: {
    name: 'Trauma Compass',
    tagline: 'Keep the line, then close.',
    description:
      'A lamp-lit night at Harbor Light General. Eight operations, four surgeons at one table, and a patient who has to last until the last stitch.',
    type: 'Game',
    genre: 'Simulation',
    source: 'Trauma Center: Second Opinion',
    series: 'Trauma Center',
    players: '1–4',
    controls: 'Stick or mouse aims · R2 or click uses the tool · right stick or 1-8 picks a tool',
    tags: ['3d', 'co-op', 'story', 'boss fights', 'comedy'],
  },
} as const;

/** Source fields, then each feedback answer, then the credits. One card each. */
export function aboutCards(): AboutCard[] {
  const info = INTERVIEW.sourceInformation;
  const fields: [string, string][] = [
    ['Date', info.date],
    ['Source', info.source],
    ['Plan', info.plan],
    ['Genre and Perspective', `${info.genre}. ${info.perspective}.`],
    ['Tech', info.tech],
    ['Art Direction', info.artDirection],
    ['Animation', info.animation],
    ['Audio', info.audio],
    ['Online', info.online],
    ['Testing', info.testing],
    ['Research', info.research],
    ['Environment', info.environment],
    ['Model', info.model],
    ['Usage', info.usage],
  ];
  const cards: AboutCard[] = fields.map(([title, body]) => ({
    kicker: 'Source Information',
    title,
    body,
    usage: title === 'Usage',
  }));
  const questions = [
    'How many issues did testing catch?',
    'How many were critical?',
    'What helped most?',
    'What helped least?',
  ];
  INTERVIEW.testingFeedback.forEach((body, index) => {
    cards.push({ kicker: 'Testing Feedback', title: questions[index] ?? 'Testing', body });
  });
  const engineQuestions = [
    'What did you like most?',
    'Did you get stuck?',
    'What did you build yourself?',
    'What was hardest?',
    'What did you change?',
    'What would you change?',
  ];
  INTERVIEW.engineFeedback.forEach((body, index) => {
    cards.push({ kicker: 'Engine Feedback', title: engineQuestions[index] ?? 'Engine', body });
  });
  const promptQuestions = [
    'What did you like most?',
    'What was confusing?',
    'What was hardest?',
    'What would you change?',
  ];
  INTERVIEW.promptFeedback.forEach((body, index) => {
    cards.push({ kicker: 'Prompt Feedback', title: promptQuestions[index] ?? 'Prompt', body });
  });
  cards.push({
    kicker: 'Credits',
    title: 'Trauma Compass',
    body: 'Harbor Light General, Port Verity. Wren Tolliver, Odie Ferreira, Bram Achterberg, Sabine Oyelaran, Lucan Voss. Built on my-3dge. three.js, Rapier, and the AI Hub session client. Music and effects are written in code.',
  });
  return cards;
}
