# Beauty and the Tall Tale

Small hero. Big bully. Very tall building.

Open the single HTML file in the parent directory directly in a browser. It contains the full engine, original procedural art, authored tower, animations, music, effects, character gibberish and the unmodified AI Hub client. Standalone play needs no server or downloads.

Use A/D or arrows to move, W/S or arrows to climb an open window, Space to jump and Escape to pause. A standard controller uses the stick/d-pad, Cross and Options. PlayStation glyphs are the default; Xbox glyphs are available in Controls. On touch devices, move/climb with the left thumb and tap the right half to jump; a contextual climb button appears within reach of an eligible opening.

Local co-op supports keyboard plus one controller or two separate controllers. Join through “Climb together” before starting. Players share spare chances, heart rush, score and the rescue. Online co-op is available when this HTML is loaded by AI Hub, using its lobby and shared-world transport.

The ten-second idle title demo uses a separate private run and never writes progress. Developer tools are in the standalone pause menu: live balance sliders, invulnerability, section warp, bot, collision overlays, hazard spawning, slow motion and paused single-step. Changed gameplay runs are marked unranked. Hub rounds expose inspection only.

## Rebuild and verify

```sh
npm run build
npm run --silent verify
```

The verifier captures subprocess diagnostics, reports only failures and one aggregate count, and stores details in `artifacts/`. It uses Node 24+, installed Python Playwright 1.63 and the existing Chromium/WebKit/Firefox browsers. It creates an owned loopback HTTP server on an OS-selected port for the Hub harness and closes it after the tests. No catalogue is modified.

The required `exit-interview.json` lives beside the shipping HTML. The bundler embeds it into the four in-game About/Credits pages, so feedback remains consistent with the hand-in. `../PROGRESS.md` records implementation and verification status.

## Dependencies and authorship

my-3D2dge full handoff v0.89.1, MIT, Michael Crosato: commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. One documented engine correction makes `Renderer.ppu` match actual projected zoom; see `artifacts/research.md`.

AI Hub protocol 1 / pristine session client 1.4.0: commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Reference README, shared-world arena and matching harness dependencies are retained under `vendor/ai-hub`.

Source inspiration: Imagic’s *Beauty and the Beast* (Intellivision, 1982), designed by Wendell Brown. Original manual, INTV Funhouse archive and sampled gameplay footage were inspected; reference links and an art bible are in `artifacts/research.md`. Source melody/synthesis parameters and human listening judgments are unknown. All shipped music, effects and voices are newly generated in code.

Authoring data and validation live in `content/tower.js`; the simulation is shared by standalone, couch co-op and Hub authority. No renderer code owns gameplay state. See the content authoring note for extending the tower.
