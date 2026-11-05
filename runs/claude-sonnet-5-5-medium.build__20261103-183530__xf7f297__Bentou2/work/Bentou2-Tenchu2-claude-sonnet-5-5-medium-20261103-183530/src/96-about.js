/* ---- ABOUT / CREDITS: the Source Information and the three feedback sections (filled from exit-interview.json at build time) ---- */
const EXIT = typeof __EXIT__ !== 'undefined' ? __EXIT__ : null;
const QS = {
  testingFeedback: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  engineFeedback: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'],
  promptFeedback: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?']
};
const SRC_LABEL = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
B.ABOUT_PAGES = () => {
  const pages = [
    ['About', 'BENTOU 2: BIRTH OF THE LUNCHBOX ASSASSINS is an original isometric ninja stealth-action game inspired by Tenchu 2: Birth of the Stealth Assassins (Acquire / Activision, 2000). It is not affiliated with it. No names, characters, levels, music or art are taken from it.\nKasugai Province, the Sengoku era. The granaries are full and the people starve. You play one of the two apprentices of the Jubako-ya, a shop that sells two-tier lunchboxes to the lord: Sojiro with his katana, or Kaede with her twin blades.'],
    ['How to play', 'Stay in the dark, in tall grass and in water. Light and noise give you away. Walk or crouch to stay quiet; sprinting is loud.\nSneak up on a guard from behind and press ' + lbl('attack') + ' for a Silent Cut. Cut from above, from the side, from the water, or from the front when the guard is asleep or stunned.\nThe Ki Gauge (bottom left) shows how near and how aware the nearest guard is. Hold ' + lbl('ki') + ' for Ki Focus.\n' + lbl('interact') + ' throws the kaginawa to a roof, or hold it to drag a body. ' + lbl('use') + ' uses the bento tool, ' + lbl('cycle') + ' changes it. ' + lbl('block') + ' guards and parries. Earn ranks to unlock tools.']
  ];
  if (EXIT) {
    const si = EXIT.sourceInformation; pages.push(['Source Information', Object.keys(SRC_LABEL).map(k => SRC_LABEL[k] + ': ' + (si[k] || 'unknown')).join('\n')]);
    for (const [k, t] of [['testingFeedback', 'Testing Feedback'], ['engineFeedback', 'Engine Feedback'], ['promptFeedback', 'Prompt Feedback']]) pages.push([t, QS[k].map((q, i) => '- ' + q + '\n' + ((EXIT[k] || [])[i] || 'unknown')).join('\n')]);
  }
  pages.push(['Credits', 'Built by Anthropic claude-sonnet-5-5 (reasoning effort medium) in Claude Code, from PLAN.md written by claude-opus-5-5.\nEngine: my-3D2dge v0.85.2 (michaelcrosato/my-3d2dge).\nMultiplayer: AI Hub Session Protocol v1, client 1.4.0 (unmodified).\nAll art, music, sound effects and voices are generated in code. Voices are Animalese-style babble.']);
  return pages;
};
