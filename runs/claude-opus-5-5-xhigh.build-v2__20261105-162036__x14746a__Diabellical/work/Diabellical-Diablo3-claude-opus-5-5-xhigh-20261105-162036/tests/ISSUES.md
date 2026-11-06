# Issues caught by tests (one line each: [critical|minor] what)
minor: Collection Plate spilled gold through a missing world.loot reference (sim campaign run)
minor: 'cells' room template doors opened into its own inner wall (bot softlock in the Ossuary)
critical: a hero blinked or shoved against a wall could never move again (soft lock, found by the bot campaign)
minor: novice waves and coffin waves could spawn monsters inside walls
critical: the hero's actor never appeared when a zone loaded right after the hero joined (screenshot of first play)
minor: bot stood idle when a boss it had walked away from was alive (playthrough stall)
minor: lint found a banned class word (monk, necromancer) in lore and model descriptions
critical: the Bursar's Foreclosure walls could lock a hero who had left the room out of the fight for good (balance run soft lock)
critical: Dusk Step and Gravewalk could blink through walls (same run)
minor: pad focus jumped to the wrong button when moving between wide buttons (New Hero test)
minor: exiting attract also fired the title's any-button (attract test)
critical: bot heroes never finished talking because their talk events were read before they happened (playthrough)
critical: the Drowned Pantry's door could be missing from the Causeway when its side room failed to attach (playthrough)
critical: a physics engine panic (wasm unreachable) after prop chunks from Breakables piled up in long sessions; replaced with own ballistic chunks (attract loop test)
critical: Bellfall or a blink next to a wall could land a hero inside the wall, stuck for good (playthrough stall)
critical: leaving a Knell Run for town left the run alive, which then tried to spawn monsters in town and threw (playthrough)
minor: a pad could not claim seat one from the stick alone (pad-only test)
minor: weapon trails built NaN vertices when a hand did not move between frames (screenshot run, console error)
minor: (screenshot) toasts ran over the minimap and player panels and piled up five deep: now a centre column, three at most, one elite notice at a time
minor: (screenshot) Malison stood off-screen from the arena door: the camera now pulls toward a huge boss and widens
minor: (screenshot) item labels on the floor cut names mid-word ("ROUND SHIELD OF ."): long names now drop their "OF" tail
minor: (screenshot) touch-only notice stacked over the attract title, HUD and keyboard prompts: one notice over the demo now
minor: (screenshot) attract DEMO block sat on the boss bar and told the watcher to press WASD: moved under the bar, prompts hidden
minor: (screenshot) keyboard "HOLD TO SKIP" prompt ran off the right edge in cutscenes
critical: (Last Bell playthrough) a Warden killed beside a wall put The Way Home inside the wall, leaving the run with no exit: runtime objects and drops now snap to open floor
minor: (screenshot) pause prompts sat on top of the HUD, elite packs stacked one label per body, salvage said 1 SHARDS
