# PROGRESS (read this first after a compaction)

Dev folder: `TraumaBenderSecondOpinion-TraumaCenterSecondOpinion-claude-opus-5-5-xhigh-20261105-054007/` (call it DEV).
Deliverables at this `work/` root: `TraumaBenderSecondOpinion-TraumaCenterSecondOpinion-claude-opus-5-5-xhigh-20261105-054007.html`, `exit-interview.json`.
Title: **Trauma Bender: Second Opinion** (crypto.randomInt pick #35 of 50 silent candidates).

## How it is built
- Sources in DEV/src, listed in DEV/src/manifest.json (`sim` then `game` lists). `node tools/build.mjs` writes index.dev.html, the final HTML, notes/harness/game.html, and exit-interview.json (from src/about-data.json).
- Sim: src/core (state, score, tools, objects, op, cursor) + src/core/strains/*; S is JSON-safe; `G.Op.create/step`; `G.aux(S)` holds rewind data; registries G.OBJ (defObject), G.CASES (defCase), G.ACTIONS (defAction).
- Art: src/art (tissue, sites, pix, objects via defArt, instruments, bust, stages). Strain art beside its strain.
- Scenes: src/scenes (op, story, flow, title+menu+difficulty, chart+lightbox, results+lost, menus = casefiles/about/credits). Story data: G.defStory(id, steps); campaign order G.CAMPAIGN in src/data/story/campaign.js.
- UI: src/ui (hud, dev, attract). Audio: src/audio (sfx, babble, choir, music), songs in src/data/songs.js.
- Bot: src/bot/autosurgeon.js (Bot.plans by tool; object spec `bot`). tools/balance.mjs, tools/simrun.mjs.
- index.dev.html#op=caseId is a deep link for working.

## Status by milestone (PLAN.md section 21)
- [x] M0-M9 done. Final build written, exit interview written, node tests/run.mjs: 1875 checks, 0 failed (headless suites, three browsers, phones, audio, four Hub harness runs, client stroke). notes/tmp and node_modules cleaned up.
- The only step left after this file: the final chat reply with Source Information and the three feedback sections, from src/about-data.json.

Case ids used elsewhere: glasshouse, lowbrass, crane9, whistling, slur, bedside, forcenine, fromthetop, deadman, eloquent, lastnote, grandrounds, lab.

## Notes
- Never write `cat > file` without a heredoc (hung a command once). Use `timeout` on node runs.
- notes/feedback.md in DEV: running log for Testing/Engine/Prompt feedback (keep real counts).
