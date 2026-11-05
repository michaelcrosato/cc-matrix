`PLAN.md` and `planner-exit-interview.json` are written and saved in this folder, and the plan covers everything `TASK.md` asks for; section 16 maps each requirement to the part that handles it. The game itself isn't built yet, so its design and balance numbers are untested starting points. The exit interview parses as valid JSON with all four questions answered.

**The game in the plan:** a surgical action game in pixel art, with a melodramatic hospital story between operations. As the brief asks, it uses an original world and cast rather than the source's:
- **Story:** a clumsy resident at a rain-soaked port hospital, a terrifying nurse in his ear, and a hospice charity whose painkilling cure is the real disease.
- **Operations:** ten story operations plus a co-op one, using eight instruments and two different doctor abilities (slow time, rewind time). The four boss surgeries include a fight on a beating heart that runs on its rhythm, and one where the nurse is the patient and your guidance goes silent.
- **Multiplayer:** 1–4 players, either on one TV or through AI Hub sessions.
- **Left to builders:** the title, the file and folder names, and the final dialogue. The plan gives story beats and sample lines to write from.

**Tested on this machine:** I built small throwaway prototypes on engine 0.46.0, and the plan marks each tested fact with ✔.
- **Packaging:** the single-file HTML boots from `file://` in about a second, even on software WebGPU.
- **AI Hub:** a prototype using the planned multiplayer setup passed the hub's own test harness in every scenario I ran: 1, 2 and 4 players, a poor network, the host leaving, and a server copy with no renderer.
- **Art:** I mocked up the operating view, talking-head portraits and animated surgeon figures, and they look good enough to build on. The plan includes the recipes.
- **Traps it warns builders about:**
  - The bundled hero is a plumber, so it can't be shown as a surgeon.
  - The mouse wheel zooms the "fixed" camera unless it's locked.
  - Default music volume is 60%, not the required 10%.
  - The HUD font has no em dash.

**Not tested:** a real controller or rumble, a real TV, and sound quality by ear, since this machine can't check them.

**One judgement call:** "for the game on its own" could mean the game only has to run outside a session, or that it needs its own multiplayer. I planned for both by adding couch co-op, and flagged the wording in the exit interview.

I deleted my scratch prototypes after moving what builders need into the plan, and committed nothing. The folder is untracked in git, along with its `STAGE.md` and `TASK.md`.

Sources:
- [Trauma Center: Second Opinion (Wikipedia)](https://en.wikipedia.org/wiki/Trauma_Center:_Second_Opinion)
- [GUILT (Giant Bomb)](https://giantbomb.com/wiki/Concepts/GUILT)
- [Trauma Center fan wiki: Kyriaki](https://cosimoquiche.github.io/tc-wiki/diseases/GUILT/Kyriaki.html)
- [Trauma Center fan wiki: Second Opinion](https://cosimoquiche.github.io/tc-wiki/games/so/SO.html)
- [AI Hub Session Protocol](https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md)
- [Riftlight engine kit](https://github.com/michaelcrosato/riftlight/releases/latest/download/pixel-engine.zip)