/* ---------- the About / Credits pages (Source Information and the three feedback sections are the same text as the exit interview) ---------- */
const ABOUT_PAGES = [
  { title: 'CRICKET KERFUFFLE', items: [
    ['', 'An over-the-top arcade cricket game. Tea, cake, drizzle, a vicar for an umpire and a cow at deep midwicket, delivered in the voice of the commentary box and then turned up to eleven: flaming bats, golden balls, sixes through the pub window.'],
    ['Modes', 'Story (three chapters), Quick Match, Super Over (high scores, and the AI Hub parallel round), Versus (two players, one screen), and an attract mode after ten idle seconds on the title.'],
    ['Dev mode', 'Pause during a match and choose Dev mode: live sliders for every balance variable, a reset, and quick tools (score a six, take a wicket, spawn a cow, rain, golden ball, god mode, slow motion).'],
    ['Source', 'cricket (over the top arcade style).'],
  ] },
  { title: 'SOURCE INFORMATION', items: [] },
  { title: 'TESTING FEEDBACK', items: [] },
  { title: 'ENGINE FEEDBACK', items: [] },
  { title: 'PROMPT FEEDBACK', items: [] },
];
(function fillAbout() {
  const F = FEEDBACK, S = F.sourceInformation, labels = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
  ABOUT_PAGES[1].items = Object.keys(labels).map(k => [labels[k], S[k]]);
  const qa = (qs, ans) => qs.map((q, i) => ['', 'Q: ' + q + ' A: ' + ans[i]]);
  ABOUT_PAGES[2].items = qa(['Issues caught?', 'Game breaking?', 'Most helpful test?', 'Least helpful test?'], F.testingFeedback);
  ABOUT_PAGES[3].items = qa(['Liked most?', 'Stuck or guessed wrong?', 'Built myself?', 'Hardest part?', 'Changed in the engine?', 'Change one thing?'], F.engineFeedback);
  ABOUT_PAGES[4].items = qa(['Liked most?', 'Confusing?', 'Hardest thing?', 'What to change?'], F.promptFeedback);
})();
