// Compiles the script format into E.Story nodes, and lays out the story's order. Adding a case: a script, a line here.
(() => {
const G = (window.GAME ||= {});
G.FLOW = []; for (let i = 1; i <= 11; i++) { G.FLOW.push({ k: 'story', id: 'c' + i + '_before' }); G.FLOW.push({ k: 'case', id: 'c' + i }); G.FLOW.push({ k: 'story', id: 'c' + i + '_after' }); if (i < 11) G.FLOW.push({ k: 'ward', map: i >= 6 && i <= 8 ? 'ship' : 'ward3', after: i }); } G.FLOW.push({ k: 'credits' });
G.compileStory = () => { const nodes = {}; for (const id in G.SCRIPT) { let cur = nodes[id] = [], extra = 0;
    for (const l of G.SCRIPT[id].split('\n').map(s => s.trim()).filter(Boolean)) {
      if (l[0] === '@') { const sp = l.indexOf(' '), k = l.slice(1, sp), v = l.slice(sp + 1); cur.push(k === 'stage' ? { event: 'stage', arg: v } : { event: k, arg: v, wait: true }); continue; }
      if (l[0] === '?') { const back = id + '#' + (extra++); const choices = l.slice(1).split('|').map((s, i) => { const [text, reply] = s.split('=>').map(q => q.trim()), n = back + 'r' + i; nodes[n] = [{ event: 'look', who: 'quill', expr: 'neutral' }, { who: 'quill', say: reply }, { goto: back }]; return { text, goto: n }; }); cur.push({ event: 'look', who: 'vale', expr: 'neutral' }, { who: 'vale', say: '...', choices }); cur = nodes[back] = []; continue; }
      const m = l.match(/^(\w+) (\w+): (.*)$/); if (!m) throw new Error('bad script line: ' + l); cur.push({ event: 'look', who: m[1], expr: m[2] }, { who: m[1], say: m[3] }); } }
  return nodes; };
G.WARD_LINES = {
  quill: ['Knit one. Purl one. Rest, Doctor. The next one is always worse.', 'I am making a scarf. It is for no one. It has been for no one since 1994.', 'Morale, Doctor. I have heard of it.'],
  odalys: ['Okay so I have a theory, and it has a corkboard. Donut?', 'The vending machine hums in B-flat. I checked. It is just a vending machine. I think.', 'I found your scan. You have nice bones, Immy. I mean that professionally.'],
  percy: ['The machine took my coin. It would not dare take a second one.', "Shouldn't you be labeling something, Vale? I have a resection to think about.", 'I have not had a tremor in months. It is all in the wrists.', 'It is odd. It has been so quiet in here lately.'],
  oyelaran: ['The door says Do Not Knock. It has said so for eleven years.', 'A dry cough, from behind the door: "Go and do something useful, Dr. Vale."', 'The cane is in the umbrella stand. That has never happened before.'],
  agnes: ['The grandchildren brought begonias. They are enormous. I said put them by the glass.', 'The heron is coming along. It has one leg so far. Herons do, mostly.', 'Are you eating, dear? You look like you are eating a very small amount.', 'That arm aches when the rain comes in. I rather like knowing the weather.'],
  slide: ['I practice with the mute in. Your nurse tells me it is an improvement.', 'I have had the cork mounted. It is on the bell of the horn. Very classy.', "Long notes hold now. Forty seconds. Don't tell my cardiologist."],
  tam: ['Tell you what, wee doctor. That crane is getting a stern talking to.', 'Morag brought the tea. It was late, but so was I.'],
  ned: ['I can feel the tide in this side now. It is a nuisance. Very reliable.', 'No more whistling. It hurts when I whistle. I whistle anyway.'],
  ilse: ['It hurts to hold the bow. I played for an hour. It was the worst hour. Listen to this.', 'Mother cried. I think I cried. I can tell now.'],
  yusuf: ['I have asked for a third sandwich. The doctora says it is a medical necessity.', 'The ship rolls and I feel it in the leg. Now I always know the weather.'],
  perpetua: ['I have not forgiven her. I would like you to tell her so.', 'Sit a moment, child. You look as though you have been holding something. Hand it here.'],
  crane: ['I keep putting my hand on my chest. There is only me in there now.', 'I would like to sign something. A confession, a petition. Anything.'],
};
G.WARD_PEOPLE = { 1: ['agnes'], 2: ['agnes', 'slide'], 3: ['agnes', 'slide', 'tam'], 4: ['slide', 'tam', 'ned'], 5: ['tam', 'ned', 'ilse'], 6: ['ned', 'ilse'], 7: ['yusuf'], 8: ['yusuf', 'perpetua'], 9: ['agnes', 'ilse', 'crane'], 10: ['agnes', 'slide', 'tam', 'ned', 'ilse', 'yusuf', 'crane'] };
})();
