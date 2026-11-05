// 31-story.js: the story as data (plan 4.11, 5.9), in a B-movie register. The radio cue of each area, the stage intros
// and outros (modal, in a dialog box), and the briefing pages. Lines are original; the speakers' voices are the
// Animalese in 30-audio.js. Nothing here names the source's characters or places.

// The radio cue an area opens with. Non-modal: it plays over the action, with subtitles.
TC.CUES = {
  '1-1': { speaker: 'juno', line: 'Lantern Pier. Hostiles in the festival crowd. Keep your heads down, Kai!' },
  '1-2': { speaker: 'juno', line: 'Crane Row. Shield troopers fire over the top. Hold your cover.' },
  '1-3': { speaker: 'juno', line: 'Canal Gate. Orange vests carry ammo. Drop them for the specials.' },
  '1-B': { speaker: 'juno', line: 'The gunboat TIDEWHIP is coming in. Take out the turrets first.' },
  '2-1': { speaker: 'mari', line: "Gull's Rest. The storm is hiding their muzzle flashes. Watch the rooftops." },
  '2-2': { speaker: 'mari', line: 'Lighthouse stairs. Snipers. Long telegraphs, bad news. Move fast.' },
  '2-3': { speaker: 'juno', line: 'Water tower. Civilians on the walk. Hold your fire on them.' },
  '2-B': { speaker: 'mari', line: 'The lamp warden is up top. Shoot the lamps, then the lantern.' },
  '3-1': { speaker: 'juno', line: 'Sluice gate. The tide is at the wall. Every second counts.' },
  '3-2': { speaker: 'mari', line: 'Turbine hall. Those barrels are loaded. Shoot them from range.' },
  '3-3': { speaker: 'juno', line: 'Causeway. The Red Tide is out in force. Stay sharp.' },
  '3-B': { speaker: 'juno', line: 'LEVIATHAN. Admiral Krake is in the mech. Claws first, then the shell.' },
  R1: { speaker: 'juno', line: 'Drill one. Targets only. Breathe, then shoot.' },
  R2: { speaker: 'juno', line: 'Drill two. Duck on the threat rings. Reload in cover.' },
  R3: { speaker: 'juno', line: 'Drill three. Switch weapons. Grenades go over walls.' },
};
TC.cueFor = function (stageId, sceneId) {
  return TC.CUES[sceneId] || null;
};

// The modal stage intros (before the first area) and outros (after the boss).
TC.INTROS = {
  1: [
    { speaker: 'juno', line: 'Agents, this is CREST. The Black Current has taken the Port Lumen tidewall.' },
    { speaker: 'juno', line: 'The king tide peaks at dawn. If that gate goes, the whole harbor goes with it.' },
    { speaker: 'krake', line: 'Welcome to the lantern festival, CREST. Do enjoy the fireworks.' },
  ],
  2: [
    { speaker: 'mari', line: 'Gull\'s Rest, two in the morning. The storm signal is up, and the lamp is dark.' },
    { speaker: 'juno', line: 'Somebody shut the lighthouse. Find out who, and light it again.' },
  ],
  3: [
    { speaker: 'juno', line: 'Dawn. This is the last push to the tidewall.' },
    { speaker: 'krake', line: 'Your agents are very brave. Very late, too.' },
  ],
};
TC.OUTROS = {
  1: [{ speaker: 'juno', line: 'Tidewhip is down. Gate is still shut. Good work, both of you.' }],
  2: [{ speaker: 'mari', line: 'Lamp is lit. The whole coast can see it now.' }],
  3: [
    { speaker: 'juno', line: 'Leviathan is dead in the water. The tidewall holds. Sun is up.' },
    { speaker: 'krake', line: 'Until next tide, CREST.' },
  ],
};

// The briefing pages shown before a stage (the map pages, as text).
TC.BRIEFS = {
  1: { title: 'HARBOR LIGHTS', lines: ['Port Lumen Docks, 23:40.', 'The Lantern Festival is on the piers.', 'Hold the tidewall. Watch the crowd.'] },
  2: { title: 'STORM SIGNAL', lines: ["Gull's Rest and Lighthouse Point, 02:10.", 'A thunderstorm. The lamp is out.', 'Find the signal. Light it again.'] },
  3: { title: 'THE TIDEWALL', lines: ['The sluice locks, 05:20 to dawn.', 'The king tide is at the wall.', 'End the Leviathan before the sun.'] },
  range: { title: 'CREST RANGE', lines: ['Three drills. Every mechanic.', 'Duck, pop, shoot, reload.', 'Your best time is kept.'] },
};

// Modal dialog: one line at a time, typed out, with the engine's dialog box (E.Dialog). Confirm finishes a line, then
// turns the page. The play is frozen while it shows.
TC.Story = {
  // Open a sequence of lines. onDone runs when the last line closes.
  run(game, lines, onDone) {
    const talk = new E.Dialog(game, { speed: 60, lines: 3, place: 'bottom' });
    let i = 0;
    const next = () => {
      if (i >= lines.length) { talk.close(); if (onDone) onDone(); return; }
      const ln = lines[i++];
      const sp = TC.get('speaker', ln.speaker);
      talk.name = sp.name;
      talk.nameColor = sp.color;
      talk.voice = null;
      talk.say(ln.line, { name: sp.name, onDone: next });
      TC.animalese(game, ln.speaker, ln.line, Math.random);
    };
    talk.onDone = null;
    next();
    return talk;
  },
};
