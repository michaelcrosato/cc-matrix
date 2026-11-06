# Bar Cry

A complete mercenary story in an original dry-season basin, inspired by Far Cry 2. A warrant brings you up the river. Guns seize, fever returns, fire follows the wind, and every rescue is entered in a ledger.

Open the bundled HTML in a WebGPU-enabled browser. Everything is included in the file, including the unmodified AI Hub session client; it also works from file URLs. The development page is `labs/game/index.html`.

## Play

Choose one of four mercenaries. The other three become your buddies. Lot Zero teaches the field kit; six subsequent contracts cross both factions, the quinine shipment, fuel depot, estate burn, salt pans and the final sale. Three endings leave the basin open for continued exploration.

WASD moves, the mouse looks after clicking the world, left/right mouse fire/aim, E uses, R reloads and clears jams, H heals or performs surgery, P takes quinine, M raises the paper map, B enables the locator, F draws a flare pistol, 1/2/3 select slots, X holsters, G throws, V uses the machete, L opens the ledger and Escape pauses. A standard controller uses the same screens with PlayStation glyphs by default, or Xbox glyphs in Settings.

Pickups, a jeep and patrol boats use suspension or buoyancy physics. Use enters/exits, triggers or WASD drive, and Q/Triangle operates the mounted gun. Hold use at a damaged bonnet to repair. Clear a safehouse, then use its bed to rest and save. Saves also occur at contract steps and medical milestones. Guns are replaced at armouries or Ferreira's airstrip counter. Pills come from the Mission. There is no fast travel or swimming.

The title and its menus start a looping field demonstration after ten seconds without input. Any key, pointer or pad activity returns to the title. Touch-only devices show the required controller/keyboard notice and Settings, with no touch game controls. WebKit without WebGPU can show the notice and settings; it cannot render this engine's world.

## Co-op

AI Hub opens directly into Contract Run: one to four mercenaries burn the depot, survive the counter-attack and extract together. The host sequences input; every copy runs the same deterministic rules. A dedicated host uses the native headless simulation. The game reports a team outcome, scores and awards, obeys time-up and stops on end.

Outside the hub, Co-op offers same-computer BroadcastChannel rooms and WebRTC invitation/reply codes. No game server is required. A solo contract uses the same objectives.

## Tools and content

Pause → Dev Mode exposes live balance groups, reset, cheats, place travel, weapon/vehicle/squad spawning, supplies, contract jumps, hour, rain, fire and regrowth. The field notebook records debts, standings, tapes, stones and mechanical limits. About/Credits reads the same JSON as the delivered exit interview.

Content lives in the typed tables and registry entries in `scenes/content.ts`, `scenes/map.ts`, `weapons/guns.ts` and `props/`. Contracts use ordered predicates, so a new contract or dealer item needs data rather than a new rule. The engine stays pinned and unchanged.

Procedural assets use the native low-poly grammar. Gun meshes are assembled from authored parts into single prop batches to make native GPU warm-up tractable, with three rust tiers and visible reload poses. Authored body actions and an eye-level body camera handle medical and repair moments. Music, effects and gibberish voices are entirely synthesized; music starts at ten percent.

## Verification

`npm run verify` runs all tiers; `npm run verify -- sim`, `page`, `hub` or `final` runs one tier. The command prints failures and a one-line count. `npm run check` runs types, lint, formatting, the asset rules and engine integrity. The tests include captures, a golden opening, systemic rules, physical travel through Receipts, later contracts through every ending, all-seat agreement, browser controls, audio and the hub harness. Screenshots and reports are kept in `out/`.

Software adapters use reduced vegetation and the engine's low quality preset; real adapters default to full vegetation and high quality. This changes presentation, not rules. The world uses a shallow river and a gridded fire model. Buildings use the native site/storey format; reloads use visible gun poses because the first-person hand rig is closed. Local engine changes: none.

Real GPUs, physical pads, speakers, cross-machine networking and iOS Safari require hardware not available in this run. WebKit iPhone profiles are an automated stand-in, not real iOS Safari.

## Calls made while building

The original title came from a cryptographic random pick among fifty candidates; the evidence is in `out/title-pick.json`. The world retains all fourteen planned places, seven story chapters, twelve guns, three buddies, six tapes and eight stone caches.

Burn regrowth is tuned to 180 game minutes by default (three minutes of real play at the default day rate). The shorter initial value could regrow fuel beneath an active fire; the longer interval leaves useful scars and ends individual fronts. The slider and Regrow tool remain live. Automated travel through the opening and Receipts raises sprint speed to shorten the headless run, then restores it; combat/balance checks use normal settings.

Medical moments use native full-body actions and visible tool props because the engine's first-person arm rig is closed. The paper map uses a diegetic SVG/CSS layer, with a controller pencil, waypoint marks and zoom. It never pauses the world. Title/attract mode reuse their simulation to avoid rebuilding the GPU stage each time a visitor presses a button. A waiting network lobby keeps its crew rather than being interrupted by the idle director.

Saves are small game records: seed, inventory, relationships, objective flags, burn runs, supplies and vehicles. A restored driver stands safely beside the saved vehicle. A dead buddy stays dead after a load. No full engine capture is used for persistence or networking.
