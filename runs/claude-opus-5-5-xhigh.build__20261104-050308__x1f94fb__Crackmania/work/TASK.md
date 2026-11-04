SOURCE: TrackMania 2003

Genre: Pick the game genre(s) that best fit the source and would make the best game.

Perspective: Pick the camera perspective(s) that best fit the genre and source and would make the best game.

Game Title: A playful riff on SOURCE's name. Silently brainstorm 50 titles, then pick one with a real random number generator (e.g., run code).

Research: Whether and how much to research is your choice.

Package: For ease of deployment and sharing provide a single html file [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261104-050308.html]. Dependencies that can be downloaded do not have to be included in the html file if that is easier.

Tech Stack: Build on https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff. You may change anything in it, the engine included, and add whatever systems, art assets and animations the game needs. The rest of the tech stack is your choice.

Art Direction: Use the engine’s native style as the base. Make new art assets for whatever makes the game feel like the source; the engine’s asset library is fine for generic props.

Animation: Use the engine’s native animation system as the base. Make new animations for whatever makes the game feel like the source.

Audio: All music, sound effects and voices are written in code, with no audio files. Voices are Animalese/Simlish-style gibberish.

Online: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub

Working Environment and deliverable:
Create a subfolder called [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261104-050308] to keep all your dev files in. You can develop separate modules, then bundle into a single file [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261104-050308].html in root when you’re done. You may use external CDN dependencies. Do not read files outside what you need - other agents share this directory. They share this machine’s ports and processes too. Prefer file:// and the engine’s headless tools. If you need a server (the AI Hub harness does), bind 127.0.0.1 on a port the OS picks (`python3 -m http.server 0 --bind 127.0.0.1` prints it) and confirm the page is your game before trusting a result. Stop only processes you started, by their PID: never pkill, killall, fuser -k, or kill whatever holds a port.

Performance: Treat the performance budget as unlimited. Add as much detail, enemies, effects, lights, and shadows as the scene needs. Out of scope (handled later): FPS targets, optimization.

Testing: Test as much as you like with headless tools: scripts that play the game and check its state (the engine’s game.advance and game.debug, as in game/test.mjs), including a scripted playthrough of the whole game. Keep them behind one command that prints only failures and a one-line count, and rerun it only after changing the code it covers. Use screenshots only for what a script can’t check. Don’t use subagents or workflows to debate, review, judge or audit.

Effort: Spend effort however you see fit.

## Goal

Build an original game inspired by the source.

Scope

Create a feature-complete demo. Capture what makes the source distinctive (its world, characters, themes and tone) and turn it into the mechanics, pacing and UX of a great game. The demo must be long enough to show ALL features and gameplay mechanics so a player can clearly understand how the game plays and feels, and what they can and cannot do. Treat the demo as a complete, polished vertical slice. It should contain all the infrastructure, systems, and polish needed so the remainder of the game could later be built out with normal designer tools.

Include a dev mode, reachable from the pause menu, with the standard tools for testing the game quickly. Balance is key, so expose the most important gameplay variables as live sliders, with a reset to defaults.

Attract Mode: After 10 seconds without input on the title/menu screen, start a looping AI-played demo or scripted replay (arcade/kiosk style); any input exits it. The AI (or replay) can be simple and may cheat freely (infinite health, ammo, abilities, no clip, etc). Its only job is to show as much of the demo as possible, the attract mode is not meant to balance the game. 

Multiplayer: Follow https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub for multiplayer integration into ai-hub as well as for the game on its own.

Narrative tone: Use a writing style similar to the source’s.

## UI & UX: 10-Foot Controller-First Philosophy
Design the game around a PS5 DualSense (or any pad the browser reports in its standard mapping) played on a TV at 10 feet. With keyboard and mouse it's the same game on the same screens, not a separate desktop layout, but they should feel native, not like stand-ins for controller buttons. The keyboard uses the keys PC players expect for the genre. The mouse aims, looks, and clicks menu items and things in the world (hover moves the focus) wherever the genre uses it. On-screen prompts follow the input used last: PlayStation glyphs for the controller (with a Settings option to show Xbox glyphs, A B X Y, instead), keys and mouse buttons for keyboard and mouse.

Do not use overly dense, web-style data screens.

Touch-only devices: no touch controls; show "Controller or keyboard required" and the settings button. Let the attract mode run.

## Done
No TODOs, placeholders, or stubbed features. The demo is complete.

## Source Information
CRITICAL: Put Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in your chat reply and an in-game About/Credits screen. Write "unknown" for anything you can't confirm.
- Date: 2026-11-04 05:03:08
- Source: the work it's based on
- Plan: the file name of the plan you were given to build from, or none
- Genre and Perspective: genre and camera perspective used
- Tech: stack, libraries/engines, with versions if applicable
- Art Direction: style used
- Animation: system used
- Audio: music, sound effects and voice used
- Online: network features used, or none
- Testing: testing parameters allowed
- Research: research done, or none
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-opus-5-5, reasoning effort xhigh
- Usage: the estimated API cost in USD, total number of tokens in K or M (provide break down if available) and session time, only if estimates are available.

Exit interview: before you finish, also save these answers as exit-interview.json in this folder's root, beside the game's .html: one JSON object in exactly the shape below, every value filled in ("unknown" for anything you can't confirm). Tools read it (the game's run record and the AI Hub catalogue), so write plain text, and check that the file parses as JSON.
{
  "sourceInformation": {"date": "", "source": "", "plan": "", "genre": "", "perspective": "", "tech": "", "artDirection": "", "animation": "", "audio": "", "online": "", "testing": "", "research": "", "environment": "", "model": "", "usage": ""},
  "testingFeedback": ["your answer to each Testing Feedback question, in order"],
  "engineFeedback": ["your answer to each Engine Feedback question, in order"],
  "promptFeedback": ["your answer to each Prompt Feedback question, in order"],
  "aiHub": {
    "name": "the game's title, as on its title screen",
    "tagline": "a few words to go under the title",
    "description": "one or two sentences for the catalogue",
    "type": "Game, Tech demo or Tool",
    "genre": "one of Action, Adventure, Fighting, Flight, Horror, Kids & Learning, Life Sim, Platformer, Puzzle, Racing, RPG, Shooter, Simulation, Sports, Stealth, Strategy",
    "source": "the work it's based on, e.g. Moby-Dick",
    "series": "its franchise, e.g. Star Fox, or empty",
    "players": "how many can play: 1, 1–2 or 1–4",
    "controls": "the controls, in one line",
    "tags": ["3 to 6 lowercase tags, e.g. 2d, 3d, arcade, story, co-op, versus, first-person, third-person, top-down, side-scrolling, pixel art, low-poly, retro, sci-fi, fantasy, comedy, vehicles, boss fights, exploration"]
  }
}

Testing Feedback

- How many issues did testing catch?
- How many would be considered critical issues / game breaking?
- What was the most helpful test you ran?
- What was the least helpful test you ran? 

Engine Feedback

- What did you like most about the engine?
- Did you get stuck or guess wrong?
- What was the most important thing you had to build yourself?
- What was the hardest part about using the engine?
- What did you change in the engine, and why? (none if nothing)
- If you could change one thing about the engine, what would it be?

Prompt Feedback 

- What did you like most about this prompt?
- What was confusing?
- What was the hardest thing to do?
- What would you change in this prompt?
