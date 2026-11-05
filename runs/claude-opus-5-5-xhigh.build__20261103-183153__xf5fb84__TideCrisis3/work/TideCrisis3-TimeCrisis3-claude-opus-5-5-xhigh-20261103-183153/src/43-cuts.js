/* 36-cuts: every story beat: Stage 1's briefing and objectives, and the stage intros and outros as cutscenes (camera
 * moves, actors, lines; press to advance, hold to skip). Original lines in the source's earnest B-movie style. */
const PZ = (x, y, z, yaw, pitch = 0, fov) => ({ x, y, z, yaw: yaw * DEG, pitch: pitch * DEG, fov: fov || 55 });
Object.assign(reg('stage', 1), {
  objectives: ['Land at Lantern Pier', 'Push through the fish market', 'Find Krake\'s signal', 'Stop the gunboat Stingray'],
  briefing: [['hale', 'Agents. Two hours ago the Black Current seized Port Lumen\'s harbor and the Tidewall.'], ['hale', 'Their leader is Silas Krake. A disgraced admiral with a grudge the size of an ocean.'], ['juno', "He'll open the floodgates at dawn. King tide. The whole city goes under."], ['hale', 'You have until 06:00. Land at Lantern Pier. Find his signal. End this.'], ['kai', 'Understood. CREST is on it.']]
});
CUT('c1-intro', [
  { music: 'harbor' }, { cam: { from: PZ(-760, -260, 70, 22, -6), to: PZ(-430, -40, 34, 8, -2), dur: 6 } },
  { actor: 'kai', at: [-318, -14, 0], facing: 0 }, { actor: 'rook', at: [-322, 12, 0], facing: 0, pose: 'hips' }, { actor: 'mari', at: [-306, 30, 0], facing: 340 },
  { fx: 'fireworks', at: [-260, 280, 60] },
  { say: ['mari', 'Hang on! Lumen Coast Guard express. Next stop, trouble!'] },
  { cam: { from: PZ(-262, 4, 28, 180, -4), to: PZ(-270, 2, 26, 180, -3), dur: 8 } }, { screen: true },
  { say: ['krake', 'Citizens of Port Lumen! Enjoy your lanterns. They are the last lights you will see.'] },
  { say: ['krake', 'At dawn the king tide comes, and I open every gate. The sea takes back what you stole!'] }, { screen: false },
  { say: ['rook', 'Charming guy.'] }, { actor: 'kai', expr: 'smile' }, { say: ['kai', "Let's make some waves."] }, { say: ['rook', 'Kid, you say that every mission.'] }
]);
CUT('c1-outro', [
  { cam: { from: PZ(5050, 240, 70, 205, -6), to: PZ(5120, 200, 60, 210, -4), dur: 8 } }, { fx: 'explosion', at: [5000, 120, 0] },
  { say: ['juno', "Krake's signal is coming from Lighthouse Point."] }, { say: ['mari', "Gull's Rest. They've held my father there since yesterday."] },
  { say: ['kai', "Then that's where we're going."] }, { say: ['rook', 'Into a storm. Naturally.'] }
]);
CUT('c2-intro', [
  { music: 'storm' }, { cam: { from: PZ(-320, 140, 60, -6, 14), to: PZ(-260, 90, 40, -4, 12), dur: 5 } }, { fx: 'flash' },
  { actor: 'kai', at: [-150, -16, 0], facing: 0 }, { actor: 'rook', at: [-156, 10, 0], facing: 0 }, { actor: 'mari', at: [-140, 26, 0], facing: 10 },
  { say: ['krake', 'Hammerhead. No one reaches the lamp.'] }, { say: ['hammerhead', 'NOBODY. PASSES. HAMMERHEAD.'] },
  { cam: { from: PZ(-110, 4, 26, 180, -4), to: PZ(-116, 2, 26, 180, -4), dur: 6 } },
  { say: ['rook', 'He talks in capital letters.'] }, { say: ['mari', 'Papa is up there. Let\'s move.'] }
]);
CUT('c2-outro', [
  { cam: { from: PZ(1600, 60, 570, 210, -6), to: PZ(1596, 50, 566, 214, -6), dur: 9 } },
  { actor: 'tejada', at: [1540, 8, 544], facing: 20 }, { actor: 'mari', at: [1548, 22, 544], facing: 200, pose: 'wave' }, { actor: 'kai', at: [1530, -14, 544], facing: 30 }, { actor: 'rook', at: [1522, 30, 544], facing: 0, pose: 'hips' },
  { say: ['tejada', 'The override is in the Tidewall control tower. At the peak, Krake opens every gate.'] },
  { say: ['juno', 'Forty minutes to dawn. The maintenance tram can get you there.'] }, { say: ['kai', "Then let's catch a ride."] }
]);
CUT('c3-intro', [
  { music: 'tidewall' }, { cam: { from: PZ(-420, -90, 46, 8, -4), to: PZ(-170, -40, 30, 4, -2), dur: 7 } },
  { actor: 'kai', at: [-60, -10, 0], facing: 0 }, { actor: 'rook', at: [-66, 12, 0], facing: 0 }, { screen: true },
  { say: ['krake', 'Look at the sea, CREST. It rises for me.'] }, { say: ['krake', 'At dawn, Port Lumen returns to the deep!'] }, { screen: false },
  { cam: { from: PZ(-20, 0, 26, 180, -4), to: PZ(-24, 0, 26, 180, -4), dur: 6 } },
  { say: ['kai', 'Not on our watch.'] }, { say: ['rook', 'Did you rehearse that?'] }, { say: ['kai', '...Maybe.'] }
]);
CUT('c3-outro', [
  { music: 'ending' }, { cam: { from: PZ(1420, 40, TW.roof + 40, 0, -4), to: PZ(1440, 30, TW.roof + 34, -10, -4), dur: 12 } },
  { actor: 'krake', at: [1560, -10, TW.roof], facing: 180, pose: 'kneel', expr: 'angry' }, { actor: 'mari', at: [1530, -20, TW.roof], facing: 0, point: true }, { actor: 'kai', at: [1520, 10, TW.roof], facing: 190 }, { actor: 'rook', at: [1512, 30, TW.roof], facing: 200, pose: 'hips' },
  { say: ['juno', 'All forty gates closing! You did it!'] }, { say: ['mari', "Silas Krake, you're under arrest by the Lumen Coast Guard."] },
  { say: ['krake', 'The tide will turn again.'] }, { say: ['rook', "Twice a day. It's called science."] },
  { say: ['hale', 'Outstanding work, agents. Port Lumen owes you its dawn.'] }, { actor: 'kai', expr: 'smile' },
  { say: ['kai', 'Tell the festival to save us some lanterns.'] }, { say: ['rook', 'Kid. No puns at the debriefing.'] }, { say: ['kai', 'No promises.'] }
]);
