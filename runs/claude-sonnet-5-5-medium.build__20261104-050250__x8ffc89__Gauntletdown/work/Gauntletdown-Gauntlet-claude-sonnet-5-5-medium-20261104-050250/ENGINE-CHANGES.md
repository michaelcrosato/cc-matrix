# Engine changes

None. Gauntletdown runs on my-3D2dge v0.85.2 exactly as handed over (`my-3d2dge.js` is byte-identical to the handoff copy).

What the game had to build around the engine (candidates for the engine):
- a multi-source `FlowField` (several heroes, one field): `Flow` in `game/src/20-world.js`;
- shots that bounce off walls and pierce: `shotsStep` in `21-sim.js`;
- a fake wall that draws like a wall and walks like a floor: `W.fakes` in `20-world.js` / `31-render.js`;
- Humanoid weapons for an axe, a bow and a shield (the rig knows sword, gun and staff);
- a pause-menu custom item that closes the pause menu (needed `game.resume()` in `90-main.js`).
