SOURCE: Turok 2: Seeds of Evil

Game Title: A playful riff on SOURCE's name. Silently brainstorm 50 titles, then pick one with a real random number generator (e.g., run code).

Package: For ease of deployment and sharing provide a single html file [GameTitle-SOURCE-gpt-6.1-sol-max-20261029-0214.html]. Dependencies that can be downloaded do not have to be include in the html file if that is easier.

Tech Stack: Use Three.js R180, WEBGPU, no fallback, rapier 0.19.3 for physics, Gamepad API; The rest of the tech stack is yours to choose.

Art Direction: Use a stylized cel-shaded look for the game.

Animation: Animation technique and implementation is your choice

Audio: Use code written Music and sound effects and Animalese / Simlish” / gibberish voice acting for any "voice" work.

Online: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub

Working Environment and deliverable:
Create a subfolder called [GameTitle-SOURCE-gpt-6.1-sol-max-20261029-0214] here you can keep all your dev files. You can develop separate modules, then bundle into a single file [GameTitle-SOURCE-gpt-6.1-sol-max-20261029-0214].html in root when the goal has been completed. You may use external CDN dependencies. Do not read files outside what you need - other agents share this directory.

Performance: Treat it as unlimited. Add as much detail, enemies, effects, lights, and shadows as the scene needs. Out of scope (handled later): FPS targets, optimization.

Testing: Keep testing efficient and lightweight.

## Goal

Build an original spiritual successor to Turok 2: Seeds of Evil.

Scope

Create a feature-complete demo inspired by Turok 2: Seeds of Evil. Capture what makes the source distinctive while modernizing and improving its mechanics, pacing, and UX wherever it benefits the game. The demo must be long enough to show ALL features and gameplay mechanics so a player can clearly understand how the game plays and feels, and what they can and cannot do. Treat the demo as a complete, polished vertical slice / game engine. It should contain all the infrastructure, systems, and polish needed so the remainder of the game could later be built out with normal designer tools.

Attract Mode: After 10 seconds without input on the title/menu screen, start a looping AI-played demo or scripted replay (arcade/kiosk style); any input exits it. The AI (or replay) can be simple and may cheat freely (infinite health, ammo, abilities, no clip, etc). Its only job is to show as much of the demo as possible, the attract mode is not meant to balance the game. 

Multiplayer: Follow https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub for multiplayer integration into ai-hub as well as for the game on its own.

Narrative tone: Use a writing style similar to the Turok 2: Seeds of Evil.

## UI & UX: 10-Foot Controller-First Philosophy
Design all interfaces and interactions for a "10-foot experience" with a PS5-compatible controller as the primary input. Keyboard and mouse are secondary inputs that map to the controller's interaction model, not a separate desktop paradigm. Apply modern UX principles. Use your judgment to balance deep systemic information with clean, uncluttered presentation.

Common Issue (~10%): Gamepad horizontal/vertical input is intermittently inverted. As a quick fix, add toggles in Settings to invert horizontal and vertical axes.

Do not use overly dense, web-style data screens.

Touch-only devices: no touch controls; show "Controller or keyboard required" and the settings button.

## Done
No TODOs, placeholders, or stubbed features. The demo is complete.

## Source Information
CRTICAL: Put Source Information, Engine Feedback and Prompt Feedback in your chat reply, an in-game About/Credits screen, and an HTML comment at the top of the file. Write "unknown" for anything you can't confirm.
- Date: YYYY-MM-DD HH:MM
- Turok 2: Seeds of Evil
- Tech: stack, libraries/engines, with versions if applicable
- Art Direction: style used
- Animation: system used
- Audio: music, sound effects and voice used
- Online: network features used, or none
- Testing: testing parameters allowed
- Environment: Codex CLI (headless); Linux; browser unknown
- Model: OpenAI, gpt-6.1-sol, reasoning effort max
- Usage: the estimated API cost in USD, total number of tokens in K or M  (provide break down if available) and session time, only if estimates are available.

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
- If you had to remove or overhaul one thing from engine, what woudl that be?
- If you could change one thing about the engine, what would it be?

Prompt Feedback 

- What did you like most about this prompt?
- What was confusing? 
- What was the hardest thing to do? 
- If there was one test you could of run, what would that test be?
