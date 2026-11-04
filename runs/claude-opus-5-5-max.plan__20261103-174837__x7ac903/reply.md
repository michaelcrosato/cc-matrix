I've written `PLAN.md` (about 1,700 lines) in the work folder. Nothing is built or tested yet; this stage was planning only.

**Title:** I brainstormed 50 riffs on "Olympic Games" and picked one with Python's secure random generator (`secrets.randbelow(50)` → 16). The game is **Olympiyikes!**, tagline *Faster. Higher. Yikes.* The deliverable will be `Olympiyikes-OlympicGames-claude-opus-5-5-max-20261103-174837.html`.

**The game**
- **Premise:** an over-the-top arcade multi-event game. The Summer and Winter Games happen in the same fortnight, in one fictional twin city.
- **Events:** 12, alternating seasons day by day. Summer: 100m dash, javelin, 50m freestyle, 10m diving, archery, weightlifting. Winter: ski jump, downhill, two-man bobsled, figure skating, curling, ice hockey final. Each one teaches a different skill (mashing, timing, aiming, steering, rhythm, physics).
- **Camera:** each event uses the engine view that suits it: side-on lanes, pure side view, a road-style view from behind the skier, top-down and three-quarter.
- **Story and tone:** 8 fictional nations, each with a star athlete and a short "Up Close & Personal" profile. A loud rival, Max Overdrive, runs through the story. Two commentators speak in gibberish voices with subtitles. There are opening, medal and closing ceremonies, generated national anthems, and an ending that depends on your nation's final rank.
- **"Yikes" moments:** every event has at least one comic wipeout (belly flops, ski-jump tumbles, sleds on their roof). It also gives the athlete a little hype, so a comeback is always possible.

**What the plan specifies**
- **Engine and code:** built on the my-3D2dge v0.85.2 handoff, reusing its sports, road, rhythm and physics kits. All events share one event framework. Each event has exact controls, physics starting numbers, its sliders, scoring, world records, CPU behaviour and test targets.
- **Controls and screens:** designed for a controller on a TV, with native keyboard and mouse. PlayStation button glyphs are the default, with an Xbox option. Touch-only devices get the "Controller or keyboard required" screen and the attract mode still runs.
- **Required features:**
  - a dev mode from the pause menu, with live sliders and reset to defaults;
  - a 10-second attract mode that cycles through all 12 events;
  - 1–4 local players;
  - AI Hub online play in "ghost" mode: three events dealt per round, other players shown as see-through athletes in neighbouring lanes.
- **Build order:** 11 milestones. The 100m dash is built fully first as the reference event. Risky techniques (custom poses, the from-behind skier view, the hub harness) get early test prototypes.
- **Testing:** one command that prints only failures plus a one-line count. It includes a scripted playthrough of the whole campaign and the real AI Hub harness run in a headless browser.

**Engine problems the plan works around**
- The engine's pixel font has no ✕ ○ □ △, so they show as "?". The plan includes a button-icon renderer and adds those glyphs to the font.
- Animated characters and particles draw from the same random-number source the AI Hub seeds for each round. That breaks the hub's rule for the pre-round screen and makes tests unrepeatable. The plan gives cosmetics a separate random source; it is one of six small, listed engine edits.

**Housekeeping:** the machine's `/tmp` volume was completely full during this session (other agents are filling it). So I cloned the reference repos into `~/.cache/plan-x7ac903` instead, and deleted that folder when I finished. The plan tells builders to point `TMPDIR` at their own folder if installs fail for lack of space.