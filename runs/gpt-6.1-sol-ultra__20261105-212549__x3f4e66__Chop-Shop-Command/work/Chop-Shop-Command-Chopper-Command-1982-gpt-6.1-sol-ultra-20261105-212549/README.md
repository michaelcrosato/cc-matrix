# Chop Shop Command

Open the HTML file in the parent folder directly in a current browser. The game, font, physics WASM and renderer are bundled into the file; standalone play needs no downloads or server. WebGPU is preferred, with WebGL 2 fallback.

Protect twelve medicine trucks through three sorties and defeat the command airship. Aim at enemies, dodge splitting missiles, and use the convoy shield when the road gets hot. The field manual contains all mechanics and controls.

- Keyboard: WASD/arrows fly, Space fire, mouse aim/fire, E shield, Shift boost, Esc pause.
- Controller: left stick fly, right stick aim, R2/Cross fire, Square/L1 shield, R1 boost, Options pause. Xbox prompts can be selected in Settings.
- Local co-op: first controller/keyboard flies P1; second controller or IJKL/N/M/U flies P2. Hull reserves and convoy protection are shared.
- Touch: drag on the left to fly, automatic aiming/fire, right-side touch to aim, contextual shield button.
- Idle on the title for ten seconds to watch the AI demonstration. Any primary input returns to the title.
- Pause → Dev flight deck provides live balance sliders, invulnerability, convoy protection, slow motion, supplies, wave skip and boss spawn. It is disabled during Hub competition.

AI Hub runs synchronized score competition for 1–4 pilots through the official embedded Session Protocol v1 client. Standalone multiplayer is local co-op.

Development: `npm run build` writes the single HTML file to this folder and its parent, plus the root exit-interview.json. `npm test --silent` runs all simulation, audio, input and official Hub harness checks, printing failures and one total count. It starts and stops its own localhost server on an OS-selected port. Python Playwright uses the workstation's existing environment.

See RESEARCH.md for source links and adaptation notes. Source Information and all three feedback sections are available in Credits. Third-party licenses are embedded in the deliverable and retained in vendor/.
