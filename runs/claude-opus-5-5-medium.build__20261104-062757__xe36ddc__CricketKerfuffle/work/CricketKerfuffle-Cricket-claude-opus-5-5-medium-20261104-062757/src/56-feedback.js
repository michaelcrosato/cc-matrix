// ---- the builder's answers (the chat reply, exit-interview.json and the About pages carry the same words)
ABOUT.testingFeedback = [
  'About 41 issues: 25 gameplay or logic bugs, 7 visual or layout problems, 6 balance problems (wides, a passive CPU batter, a slow sandy outfield) and a few test-harness mistakes of my own.',
  '8 were game breaking: a dead ball that never ended (a review timer below zero), two scenes that could only finish once (stale flags), a misnamed dead-ball handler, the camera pointed thousands of units away (radians read as degrees), an engine floor-bake crash at the low broadcast pitch, long throws counted as overthrows (15-second balls), and a commentary crash in CPU-only matches.',
  'The forced-outcome scenarios (sim-field, sim-arcade, attract): they drive the real delivery director end to end, and found most of the logic bugs and all the stuck-ball ones.',
  'The solved-delivery accuracy check: it mostly measured the 1/120 s step quantization of the pitching point, not a game bug.'
];
ABOUT.engineFeedback = [
  'The Humanoid rig: a dressed, lit, animated cricketer from one options object, and solvePose open to wrapping, so bat swings and a bowling windmill could be added by IK.',
  'Yes: a custom View keeps its pitch in radians (pitchDeg holds the degrees), which put the camera thousands of units away; and a long press on a click kept clicked() null in a headless test.',
  'Cricket itself: the ball physics and predictor, the delivery director, fielding and running, the umpiring and reviews, plus the forced-outcome layer the attract mode and dev mode share.',
  'Framing a strongly foreshortened broadcast camera: the chunked floor bake broke at a low pitch, and the far end needed a painted panorama.',
  'A cricket bat weapon, batting pads, moustaches/beards/glasses, PlayStation glyphs by default with Xbox as the option, Create + Options left to the hub, ten cached floor bakes, and a fix for the chunked floor cache trim.',
  'A perspective (telephoto) camera option for ground views, so a TV-style sports camera needs no painted far-end panorama.'
];
ABOUT.promptFeedback = [
  'The clear, testable definition of done, and the freedom to change the engine.',
  'How much of a very large plan is binding when TASK.md says it wins on disagreement, and what "follow" means for the plan versus the AI Hub protocol.',
  'Fitting a full cricket simulation, five grounds, a story, local and online multiplayer, an attract mode and a dev mode into one session with honest testing.',
  'Give a target scope (minutes of play, number of modes) and say which plan features are required versus optional.'
];
aboutPages();
