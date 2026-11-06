export const REPORT = {
  sourceInformation: {
    date: '2026-11-06 03:28:56',
    source: 'Stone Sling Smithereens - 1980',
    plan: 'PLAN.md',
    genre: 'Action / artillery strategy',
    perspective: 'Fixed side-on 2D',
    tech: 'my-3D2dge 0.89.1 (8ecc2f6), native Canvas 2D; AI Hub protocol 1, client 1.4.0 (35a1047); JavaScript / Web Audio; dependency-free offline HTML',
    artDirection:
      'Richly shaded pixel-crisp medieval toy theatre, native materials and original code-defined castles and catapults',
    animation:
      'Native E.Humanoid rigs with original hauling, tool and flag poses; state-driven winch, sling, recoil, reload and repair',
    audio:
      'Code-only lute march, percussion, impacts, fanfares and formant gibberish; separate music/effects/voice; music 10% default; acoustic quality unknown',
    online:
      'Two simultaneous local players; two-player authoritative AI Hub shared-world matches, including server host; no standalone matchmaking',
    testing:
      'Unlimited headless verification: deterministic ten-bout tour/replay, all courts/stones, Chromium file loading and pad stubs, WebKit phone/tablet pointer tests, OfflineAudioContext, six official Hub harness rounds and injected loss/jitter/retry. Physical hardware and acoustic quality unconfirmed',
    research:
      'Official Smithereens manual and archive/review; engine API/artillery/assets and Hub contract at pinned revisions. Archive year 1981 and manual copyright 1982 differ from supplied 1980 label.',
    environment: 'Codex CLI (headless); Linux',
    model: 'OpenAI, gpt-6.1-sol, reasoning effort max',
    usage: 'added on import',
  },
  testingFeedback: [
    'Testing found five game issues; all were fixed: invalid authored row width, title HUD leakage, TV menu overflow, pause input consumption and phone menu/score overlap.',
    'One was game breaking: charge cleanup consumed Escape before the native pause system handled it.',
    'The browser charge-to-Escape regression exposed the pause bug; the complete native-engine tour driver was the strongest integration check.',
    'Catalogue schema validation was least informative about game feel, while still checking import metadata.',
  ],
  engineFeedback: [
    'The native material renderer, humanoid rigs and shared headless/browser clock work well together.',
    'I initially cleared the native pause event too early; camera framing and menu integration required reading the actual APIs.',
    'Castle support graphs, simultaneous combat state and authoritative network reconciliation.',
    'Adapting fixed-world TV and portrait framing while preserving native pixel drawing.',
    'No vendor engine edits; added game-specific materials, shapes, poses and synth patches through extension APIs.',
    'A fixed-arena framing helper with portrait target inset support.',
  ],
  promptFeedback: [
    'The plan ties every system to readable charge timing and changing castle silhouettes.',
    'The supplied 1980 source label differs from the manual and archive; the supplied label is preserved.',
    'Integrating complete controls, authoring tools and authoritative multiplayer with the same combat rules.',
    'Separate essential gameplay acceptance from the large authoring and network verification matrix.',
  ],
  aiHub: {
    name: 'Smithereens Under Siege',
    tagline: 'A right royal demolition derby',
    description:
      'Wind, release, and reduce your rival to rubble in a ridiculous medieval tournament. Three stones, collapsing castles, a ten-bout solo tour, and simultaneous local or Hub duels.',
    type: 'Game',
    genre: 'Action',
    source: 'Stone Sling Smithereens - 1980',
    series: '',
    players: '1–2',
    controls:
      'Hold/release Cross, Space or mouse to sling; L1/R1 or Q/E change stone; Circle/C cancel; Options/Esc pause. P2: Right Shift, U/O. Touch: hold/release.',
    tags: ['2d', 'arcade', 'versus', 'pixel art', 'medieval', 'comedy'],
  },
};
