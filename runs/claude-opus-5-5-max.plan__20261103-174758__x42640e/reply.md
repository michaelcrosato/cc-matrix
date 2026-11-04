I've written `PLAN.md` in this folder: about 2,400 lines, enough for a builder working alone from TASK.md and the plan. I checked its tables and the 13 battle maps by script; nothing has been built yet.

**Title:** *Brigantime: The Legend of Forseasons*. I brainstormed 50 riffs on the source's name and Python's `secrets.randbelow(50)` picked #21.

**The design:**
- **Genre and view:** a turn-based campaign over a map of castles, with tactical hex battles. The campaign map is viewed from three-quarters above; battles use a tilted overhead view that turns in 60° steps.
- **What it keeps from the source:**
  - knights who lead troops of monsters, capped by a capacity stat;
  - castles that produce mana for summoning and upkeep, and quests;
  - organize and attack phases each turn, and up to 3 troops a side in battle;
  - a 12-turn limit on attackers;
  - a leader's fall routs the troop, and a ruler's fall routs the side;
  - monsters lose strength outside their knight's area, and die for good;
  - spells can't be cast after moving;
  - big monsters struggle to hit small ones.
- **What the title adds:** the seasons are the elements: Spring opposes Autumn and Summer opposes Winter. The current season boosts its element, and it changes the battlefield (spring floods, summer fires, autumn gales, frozen winter lakes). A candle counts down the last seasons. The final boss is weakened by holding four season dials on his map.
- **World:** everything is original, with Arthurian-style names. There are 4 playable realms, a usurping empire at the centre, 25 castles, 36 knights, 30 monster species with 3 forms each, about 40 story events, and 4 good endings plus 3 kinds of bad ending.
- **Modes:**
  - the campaign, for 1–4 players hot-seat;
  - a skirmish mode;
  - a 2–4 player online skirmish for AI Hub, where one player's copy runs the battle;
  - an attract mode after 10 seconds idle;
  - a dev mode from the pause menu, with live balance sliders and a reset.
- **Controls:** built for a controller at 10 feet, with PlayStation button symbols by default and an Xbox option in Settings. Keyboard and mouse work on the same screens.

**Architecture:** the battle and campaign rules run as self-contained, repeatable code that never touches the screen. The same code plays battles on screen, auto-resolves the ones the player hands off, drives the AI, runs the attract mode, keeps online play in sync, and powers the test bots. Four engine changes are planned and must be logged:
- a per-letter voice hook in the dialog box, for the gibberish voices;
- a shared sound-effects volume channel;
- a new rig module for four-legged beasts, dragons, birds and serpents;
- registering a custom camera view by name.

**Build order and risks:** 14 milestones (M0–M13). The two riskiest parts come first, because the engine only has square tiles and humanoid/blob characters:
1. the hex battlefield;
2. the beast rigs.

Testing sits behind one command that prints only failures and a count. It covers the rules, repeatability, both AIs, saves, story reachability, input-only UI flows, button prompts, attract mode, the touch-only notice and dev mode. It also includes a full scripted playthrough for each realm, plus one where the deadline runs out, and the AI Hub harness scenarios.

One thing on your machine: `/tmp` is a full 9.8 GB tmpfs (0 MB free), which made command output unreliable. I worked around it and deleted nothing there. The plan tells builders to point `TMPDIR` at the main disk.

Research sources: [Wikipedia: Brigandine (video game)](https://en.wikipedia.org/wiki/Brigandine_(video_game)) and [RPGFan's review](https://www.rpgfan.com/review/brigandine-the-legend-of-forsena).