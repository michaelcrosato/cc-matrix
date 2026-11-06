# Jungle Hullabaloo

A complete four-chapter, one- or two-player arcade expedition inspired by Jungle Hunt's 1983 home releases.

Open the HTML one directory above this folder in a current browser. Three.js and optional online-room networking load from pinned CDNs, so the first launch needs internet access. Rapier and all game code, geometry, music, sound effects, and voices are inside the HTML. No build is needed to play. WebGPU is the primary renderer; WebGL2 is available automatically when unsupported or when the GPU device is lost, and explicitly through `?renderer=webgl`.

## Play

- Left stick or WASD/arrows: move; swim vertically in the river.
- Cross/A or Space: jump; release a vine. Grabbing the next vine is automatic.
- Square/X or E: swat crocodiles with closed jaws; ring a nearby bell or free Pip.
- Circle/B or S/down: duck below high boulders.
- Options or Esc: pause. Developer tools are in the pause menu.
- Player2: second pad, or IJKL + U to jump + O to interact.
- Touch: drag on the left; contextual action on the right; Ⅱ opens the menu.

Idle on the title for ten seconds to watch an AI expedition through all four chapters. Any input returns to the title. Five shared hearts and seven minutes; expedition assist raises survivability. Score and settings save locally.

Couch co-op shares one camera and route. For online co-op, host a room, share the six-character code, wait for the second explorer, then depart. Rooms use public PeerJS signaling and a direct WebRTC connection; restrictive NATs without a TURN relay may prevent joining. AI Hub shared-world sessions connect automatically, including dedicated servers.

## Development

`npm run build` bundles the development modules into the final root HTML. Source artwork, clips and sounds are code. `exit-interview.json` in the parent folder supplies About/Credits metadata.

`npm test --silent` is the single verification command. It runs model, scene, real browser, networking and AI Hub conformance tests sequentially and prints only failures plus one total count. It starts ephemeral localhost servers and closes the browsers and servers it owns. Browser tests use the existing Playwright Python environment documented for this workstation. Public-broker networking requires internet.

`research.md`, `hub-notes.md` and `title-selection.json` record research, integration details and the random title draw. `test-results.json` and `hub-test-results.json` record the latest automated results.
