# Much Ado About Rings

Two heroes. Four rings. One way out.

Open the HTML beside this development folder directly in a browser. It includes the complete native engine, game, original procedural assets, music, sounds, voices, and the unchanged AI Hub session client. It makes no runtime downloads and requires no server for standalone play.

Play solo with a companion, or press Options on a spare standard controller to join couch co-op at a safe transition. Two pads and keyboard plus pad are supported. Online shared-world co-op is supplied by AI Hub when the file is launched inside a Hub session; standalone matchmaking is not included.

WASD or arrows move. Mouse or right stick aims. Click/R2 uses the primary action; right click/L2 uses class power; Space/Cross evades; E/Triangle interacts, passes to a willing partner, or holds to revive, bind and extract. Q/R1 asks the companion to help with the objective or follow. Tab/Square opens the objective map. Escape/Options opens the menu. Controls are rebindable. Hero 2 can press Square at a board waystone to change their own hero.

Touch uses an invisible left stick and right aiming zone, assisted primary actions, and temporary Power, Evade and Interact buttons. The menu button is always available. Music defaults to 10%; master, music, effects and gibberish voice levels are independent.

The safe courtyard leads to the mandatory Hollow Keep. After recovering its ring, choose the Crystal Caverns, Inferno and Shifting Halls in any order, with two optional caches. Every castle has two authored rooms. Carry each ring back through its golden arch; four recovered rings open the deathless dragon’s four binding stations. A standing carrier can rescue a fallen partner through extraction. Killing every guard is unnecessary.

Dread advances once per site entry and once per retry, capped at six. Continue restores the safe room checkpoint without another entry charge. Continuing after a wipe reopens Retry, which charges its single retry step. Abandoning an unfinished castle discards its temporary room progress and keeps secured rings. Each secured ring visibly opens a named golden route on the board and an inner entry waystone at its next linked site. Cache rewards are immediate, single-use team benefits. A finale wipe resets bindings and retains all four campaign rings.

Dev Mode is in Pause. It offers authored-room jumps, checkpoint restart, heal/revive, invulnerability, valid enemy/hazard spawning, navigation/collision overlays, AI/director inspection and thirteen live tuning controls. World mutations mark the run assisted; visual inspection does not. New expeditions restore default tuning. Only the Hub authority can mutate shared state; clients can inspect and change local visual settings.

Build and verify from this folder:

```sh
node tools/build.mjs
node tools/test.mjs
```

The test command prints failures and one result count. Optional suites use the same command: `sim`, `browser`, `browser-input`, `hub`, `hub-gameplay`, `visual`, and `assets`. It rebuilds the HTML before checking it. Browser checks use the installed Python Playwright environment. The native asset-sheet tool uses the pinned development-only Node Playwright dependency. Existing browsers are reused. Hub tests create and shut down an HTTP server bound to 127.0.0.1 on an OS-assigned port.

Development modules are under `src/`. Content definitions and the tuning registry are in `src/content/content.js`; the deterministic simulation is in `src/sim/world.js`. Renderer, Shell UI, audio and network ownership are separate. `docs/content-schema.md` explains authoring another room. `docs/research.md` records provenance. `docs/issues.json` records actual repaired findings. Detailed test runs, ordinary-action playthrough histories, conformance reports, native asset sheets and visual captures are in `evidence/`.

The first-player 20–30 minute duration is a design target, not a measured human result. The automated ordinary-action driver takes a direct route. Physical controllers, real touch hardware, real iOS devices, a television, remote human players and human listening were unavailable; the evidence names their stand-ins.
