SOURCE: {{source}}

## Goal
Build an original spiritual successor to {{source}}: a feature-complete demo that captures what makes the source distinctive while modernizing and improving its mechanics, pacing, and UX wherever it benefits the game.

- **Show everything:** The demo must be long enough to show ALL features and gameplay mechanics, so a player can clearly understand how the game plays and feels, and what they can and cannot do.
- **Build the foundation:** Treat the demo as a complete, polished vertical slice / game engine. It should contain all the infrastructure, systems, and polish needed so the remainder of the game could later be built out with normal designer tools.

## Game Design
- **Title:** A playful riff on SOURCE's name. Silently brainstorm 50 titles, then pick one with a real random number generator (e.g., run code).
- **Narrative tone:** Use a writing style similar to {{source}}.
- **Multiplayer:** Include the option to play the demo with up to 4 players.
- **Attract mode:** After 10 seconds without input on the title/menu screen, start a looping AI-played demo or scripted replay (arcade/kiosk style); any input exits it. The AI (or replay) can be simple and may cheat freely (infinite health, ammo, abilities, no clip, etc.). Its only job is to show as much of the demo as possible; it is not meant to balance the game.

## Tech & Presentation
- **Tech stack:** {{techStack}}
- **Art direction:** {{artDirection}}
- **Animation:** {{animation}}
- **Performance:** Treat it as unlimited. Add as much detail, enemies, effects, lights, and shadows as the scene needs. Out of scope (handled later): FPS targets, optimization.

## UI & UX: 10-Foot, Controller-First
Design all interfaces and interactions for a "10-foot experience" with a PS5-compatible controller as the primary input. Keyboard and mouse are secondary inputs that map to the controller's interaction model, not a separate desktop paradigm. Apply modern UX principles, and use your judgment to balance deep systemic information with clean, uncluttered presentation.

- **No dense screens:** Do not use overly dense, web-style data screens.
- **Known issue (~10%):** Gamepad horizontal/vertical input is intermittently inverted. As a quick fix, add toggles in Settings to invert the horizontal and vertical axes.
- **Touch-only devices:** No touch controls; show "Controller or keyboard required" and the settings button.

## Workspace & Deliverable
- **Dev folder:** `GameTitle-SOURCE-{{model}}-{{effort}}-{{stamp}}/` holds all your dev files. You can develop separate modules there.
- **Deliverable:** `GameTitle-SOURCE-{{model}}-{{effort}}-{{stamp}}.html` in the root. When the goal is complete, bundle everything into this single file for ease of deployment and sharing.
- **Dependencies:** You may use external CDN dependencies. Anything that can be downloaded doesn't have to be included in the HTML file if that is easier.
- **Shared directory:** Other agents share this directory. Do not read files outside what you need.

## Testing
{{testing}}

## Done
No TODOs, placeholders, or stubbed features. The demo is complete.

## Report
CRITICAL: Put the Source Information, Engine Feedback and Prompt Feedback in all three places:
1. Your chat reply
2. An in-game About/Credits screen
3. An HTML comment at the top of the file

Write "unknown" for anything you can't confirm.

### Source Information
- Date: YYYY-MM-DD HH:MM
- Source: {{source}}
- Tech: stack, libraries/engines, with versions if applicable
- Art direction: style used
- Animation: system used
- Testing: testing parameters allowed
- Environment: {{environment}}
- Model: {{lab}}, {{model}}, reasoning effort {{effort}}
- Usage: the estimated API cost in USD, total number of tokens in K or M (with a breakdown if available), and session time, only if estimates are available.

### Testing Feedback
- How many issues did testing catch?
- How many would be considered critical issues / game breaking?
- What was the most helpful test you ran?
- What was the least helpful test you ran?

### Engine Feedback
- What did you like most about the engine?
- Did you get stuck or guess wrong?
- What was the most important thing you had to build yourself?
- What was the hardest part about using the engine?
- If you had to remove or overhaul one thing from the engine, what would that be?
- If you could change one thing about the engine, what would it be?

### Prompt Feedback
- What did you like most about this prompt?
- What was confusing?
- What was the hardest thing to do?
- If there was one test you could have run, what would that test be?
