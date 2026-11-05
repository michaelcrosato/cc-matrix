# Engine patches

1. **Button symbols** (`engine/my-3d2dge.js`, standard settings `glyphs`): default `playstation`, only PlayStation and Xbox offered. The game's prompts follow it.
2. `menu.items` already accepts a function (the pause builder calls `v()` on it), so no patch was needed to hide Dev Mode / Load / Quit in a hub session.
3. **Hub rule** (game code, not the engine): `game.pause` is wrapped so Options is ignored while Create is held in a session.
4. The build escapes `</script` and `<!--` inside the inlined engine files: the 3D engine's header comment contains `</script>` text, which ended the inline script early.
5. **Audio** (`engine/my-3d2dge.js`): `audio.bus('sfx'|'music'|'voice')` and `audio.sfx(name, { pan })` through a StereoPanner; the babble voices use the voice bus.
Beards are drawn by the game over dwarf portraits rather than patched into `E.Humanoid`.
