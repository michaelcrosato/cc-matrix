const ABOUT = {
  sourceInformation:{
    date:'2026-11-05 10:34:38',source:'Diablo 3',plan:'PLAN.md',genre:'Action RPG with loot and co-op',perspective:'Fixed isometric',
    tech:'JavaScript; my-3D2dge v0.89.1; AI Hub session client 1.4.0; one offline HTML file.',
    artDirection:'Native pixel-art puppets; original gothic bronze, wax, bone and stained glass. All assets drawn in code.',
    animation:'Native Humanoid, Blob and E.MOVES; custom weapons, beasts, moth wings, bells, evades and launched corpses.',
    audio:'Original Web Audio synthesis: bells, choir, organ, strings, drums, lute, weather and gibberish voices. No audio files. Music defaults to 10%.',
    online:'AI Hub Session Protocol v1 shared world, 1-4 online players; standalone 1-4 couch co-op.',
    testing:'Headless state tests, full scripted campaign and Vigil, emulated pads, offline audio, touch profiles, Chromium, Firefox, WebKit and the Hub harness. Screenshots used for visual checks.',
    research:'Read the provided plan, engine API and asset guide, engine source, Emberdeep algorithms and the official Hub protocol and example.',
    environment:'Codex CLI (headless); Linux, Ubuntu 26.04 on WSL2. No physical controller, TV or real iOS device.',
    model:'OpenAI, gpt-6.1-sol, reasoning effort max',usage:'added on import'
  },
  testingFeedback:['Testing caught 10 tracked game defects; all were fixed.','Four could block gameplay: the town exit, input-hook signature, summoned archer source and portal glow call.','The complete campaign bot for all four heroes, including the final held interaction and a Vigil clear.','Static title screenshots exposed fewer consequential defects than the state-driven playthrough.'],
  engineFeedback:[
    'The native rigs, custom weapon hooks and pixel lighting make a coherent scene from code.',
    'Yes. Hook callbacks receive dt, and glow helpers require a canvas argument. Runtime and render tests corrected those guesses.',
    'The deterministic multiplayer world, skill verbs, progression and quest director.',
    'Coordinating input, hit-stop and paused panels across native menus and the canvas interface.',
    'None. Added game-specific materials, shapes, weapons, hats and draw hooks through public registries.',
    'Provide a small shared-world action-RPG starter with authoritative snapshots and a tested panel kit.'
  ],
  promptFeedback:[
    'The original bell-world, concrete combat feel and explicit acceptance tests gave the game a strong direction.',
    'The 45-75 minute campaign and extensive endgame exceed the usual scope of a vertical slice.',
    'Making the complete campaign, multiplayer, controller UI and procedural presentation work together.',
    'Separate essential demo acceptance criteria from optional full-production content counts.'
  ],
  aiHub:{name:TITLE,tagline:'Every soul counted. Except yours.',description:'Four uncounted parishioners carry a talking abbess into a world of hungry bells. Break the dead, gather Relics and ring through three chapters or an endless co-op Vigil.',type:'Game',genre:'RPG',source:'Diablo 3',series:'Diablo',players:'1–4',controls:'WASD/stick move; click/F or Cross attack; RMB/G, 1-4 or Square/Triangle/Circle/R1/R2 skills; Space/RS evade; Q/L1 potion; E/L2 interact; Esc/Options pause.',tags:['co-op','fantasy','pixel art','boss fights','story','isometric']}
};
const CREDITS=[
 'Narrative and game design: the provided PLAN.md. Implementation, additional writing, original procedural art and score: this build.',
 'my-3D2dge engine: Michael Crosato, MIT. Native Humanoid and Blob rigs, shapes and pixel renderer.',
 'Emberdeep: Michael Crosato, MIT. Consulted for combat architecture, corpse motion and the data registry pattern; no game fork.',
 'AI Hub session client and harness: Michael Crosato. Client included unmodified.',
 'No external image, font, music, audio, motion-capture or CC0 asset packs are required.',
 'WebKit phone profiles stand in for iOS Safari. Controller tests use standard-mapping emulation.'
];
function aboutPages(){
  const pages=[{title:'The parish',rows:[['The game',ABOUT.aiHub.tagline+' '+ABOUT.aiHub.description],['Scope','Three complete chapters, four heroes, three bosses and the Long Vigil. Campaign spaces are condensed for this demo.'],['Omissions','No motion-capture clips or optional WebGPU lighting. Canvas lighting works offline in all three browser engines.']]}];
  const entries=Object.entries(ABOUT.sourceInformation);for(let i=0;i<entries.length;i+=2)pages.push({title:'Source information',rows:entries.slice(i,i+2)});
  for(const [title,answers,labels] of [['Testing feedback',ABOUT.testingFeedback,['Issues caught','Game-breaking issues','Most helpful test','Least helpful test']],['Engine feedback',ABOUT.engineFeedback,['Liked most','Stuck or guessed wrong','Built ourselves','Hardest part','Engine changes','Suggested improvement']],['Prompt feedback',ABOUT.promptFeedback,['Liked most','Confusing','Hardest work','Suggested change']]])for(let i=0;i<answers.length;i+=2)pages.push({title,rows:answers.slice(i,i+2).map((a,j)=>[labels[i+j],a])});
  for(let i=0;i<CREDITS.length;i+=2)pages.push({title:'Credits',rows:CREDITS.slice(i,i+2)});
  return pages;
}
