# Notes

These are the same answers as the About screen and exit-interview.json.

## Source Information
- date: 2026-11-04 22:39:16
- source: Trauma Center: Second Opinion (Atlus, Wii, 2006)
- plan: PLAN.md
- genre: Surgical action game, with story scenes and a small walkable ward
- perspective: First-person top-down on the operative field; front-on portrait stages for story; three-quarter view for the ward and cinematics; side view for the title
- tech: my-3D2dge 0.89.1, AI Hub session client 1.4.0, plain JavaScript, Web Audio. Engine patches: the touch notice sits at the bottom with pointer-events on its Settings button so attract mode stays visible; one engine comment now says stand-in token so the shipped source stays clean.
- artDirection: The engine's pixel look at PS1 level: per-pixel wet tissue through hand-picked ramps with ordered dithering, flat-shaded bust portraits, all by code.
- animation: The engine's Humanoid rigs and continuous-value animation, with procedural organs, strains, and instruments.
- audio: All in code on Web Audio: synthesized effects, a parasite choir on the effects bus, Animalese-style gibberish voices, and original songs in the engine's notation. Music starts at 10 percent.
- online: AI Hub Session Protocol v1, shared world, 1 to 4 players; couch co-op on its own.
- testing: Headless scripts play the shipped sim and scenes, including a full New Game playthrough. One command prints only failures and a count. Screenshots only where a script cannot look. Playwright 1.63 on Chromium, Firefox, and WebKit. No second person, no physical pad, and no real phone: a scripted pad, phone profiles, and two frames stand in.
- research: Read PLAN.md, the cloned my-3D2dge 0.89.1 API, and the AI Hub session client 1.4.0 README.
- environment: Grok CLI (headless); Linux
- model: xAI, grok-4.7, reasoning effort xhigh
- usage: added on import

## Testing Feedback
1. Testing caught 9 issues: suture and scalpel measured the object center instead of the gesture point, a closed ring never completed, the IV fill was dropped, the Fermata eye window stuck shut, consult toggled every frame, a sonar hold blocked the forceps edge, a deep pull was dished before it came free, case 10's par sat above a clean score, and Second Look fired on a flag that never cleared.
2. Seven were critical. The reach bugs, the ring, the IV gate, the eye window, the consult toggle, the forceps edge, and the early dish each stopped a case. The par and the sticky rewind were serious and did not by themselves end the run.
3. The most helpful test was a perfect bot clearing every case on the shipped sim. It walked the real gestures, both gifts, and the strains until time and vitals were still up.
4. The least helpful was the Node warning about NO_COLOR and FORCE_COLOR. It comes from the environment and says nothing about a missed stitch.

## Engine Feedback
1. Story and Dialog, input.label, a headless Game, the TV-scale Shell, and one state the whole frame steps.
2. Yes. The gesture point is not the object center, Story skip does not pick a choice, and a pad stick resets every tick when no gamepad is connected, so the bot aims with the mouse.
3. The operation sim, the tissue field, the cursor, the eight tools, the strains, and the bot.
4. Keeping drawing and audio out of the state while Story events and the Hub card both drive the same operation.
5. The touch notice was moved to the bottom and its Settings button was given pointer-events, so the attract reel stays visible. One engine comment was reworded to stand-in token so a banned word would not ship.
6. A headless gamepad stick that survives the per-tick reset.

## Prompt Feedback
1. The appendices and the exact harness contract. The page head, the skeleton, and the four runs were enough to build against.
2. The intern clock multiplier is only a step divisor, and the tool text names the object while the gesture is a point on it. Both took a wrong first reading.
3. One bot clearing all eleven cases, including Fermata and the Cantor, without skipping an object.
4. A machine-readable table of gesture radii beside the tools.
