`PLAN.md` is written in this folder, about 1,750 lines. It covers the title, architecture, every system and mechanic, the content, the build order and testing for everything `TASK.md` asks for. As `STAGE.md` instructs, I planned only and built nothing.

**Title: *OutBloom 2006: Coast 2 Coast*.** I brainstormed 50 riffs on the source's name and Python's `secrets.randbelow(50)` drew #49. "Bloom" means three things the design leans on: flowers (the world), love in bloom (the passenger), and the glary bloom lighting of 2000s games (the look).

**The game:** an arcade road racer on the engine's pseudo-3D road, from a chase camera behind the car. You drive an open-top car across the invented island of Bellafiore, from the sunrise coast to the sunset coast in one day.
- **World:** 15 stages arranged in a five-row pyramid. The road forks at every checkpoint, giving 16 routes and 5 goals. Each goal has an ending in three moods.
- **Driving:** a countdown clock extended at checkpoints, lane traffic, drifting (brake tap, down-up shift, or a drift button), slipstreaming with a slingshot, near misses, and a style multiplier.
- **Modes:**
  - **Arcade Run.**
  - **Love in Bloom:** three original passengers, 14 request types, petals and grades E to AAA.
  - **Coast 2 Coast Tour:** 14 postcard missions, including drift duels, a knockout and a rival-couple duel. You earn seeds to unlock cars, songs and outfits in a garden.
  - **Time Trial** with ghosts.
  - **Local split-screen Versus.**
  - **AI Hub online races** in ghost mode, with the game's own pre-round card.
- **Required extras:** a radio of original songs, gibberish voices (all audio synthesised in code), a dev mode with live sliders and reset, a 10-second attract demo, the touch-only notice, and PlayStation glyphs with an Xbox option.
- **Originality:** fictional "Fioretti" cars and an original cast, places, music and mode names, with a list of rules against copying the source.

**Architecture and build order:**
- **Engine changes:** eight listed changes to the engine copy, chiefly road forks, road dressing, analog triggers and a richer synth.
- **Code layout:** about 30 source files over a pure, deterministic simulation and an event bus.
- **Milestones:** ten, M0 to M9, each with done-criteria. The riskiest piece goes first: forks and handling feel in M1.
- **Risks:** twelve, each with its mitigation.
- **Testing:** one command (`node tests/run.mjs`) that prints only failures and a count. It covers 24 headless suites, including a bot driving all 16 routes and every mission, and six browser suites, including the official AI Hub harness.

**Notes for the builders:**
- The plan takes model and timestamp names from the builder's own `TASK.md`, since a different model may build it.
- It warns that `/tmp` on this machine is a nearly full ramdisk. My first clone failed for that reason.
- The AI Hub repo is over 5 GB, so the plan fetches only its four needed files.
- I deleted the scratch clones I made for research (5.5 GB in `~/.cache`).

**Sources:**
- [OutRun 2006: Coast 2 Coast on Wikipedia](https://en.wikipedia.org/wiki/OutRun_2006:_Coast_2_Coast)
- [moegamer retrospective](https://moegamer.net/2017/08/01/outrun-2006-gone-but-not-forgotten/)
- [forceforgood.co.uk review](https://forceforgood.co.uk/racing/outrun-2006-coast-2-coast/)
- [Kikizo review](https://games.kikizo.com/reviews/xbox/outrun2006_coast2coast.asp)
- [GamesRadar review](https://www.gamesradar.com/outrun-2006-coast-2-coast-18/2)