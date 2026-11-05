# Skiller7 (dev folder)

Source for `../Skiller7-Killer7-claude-sonnet-5-5-medium-20261104-023141.html`: an original game inspired by Killer7, on my-3D2dge v0.85.2.

- `src/` systems (sim, combat, meta, audio, UI, presenter, bot, hub, scenes), `content/` data (personas, enemies, areas, story, About text).
- `engine/` the engine handoff copy; our changes are marked `// S7 PATCH:`.
- `node tools/build.mjs` builds the single HTML file; `node tests/run.mjs [--browser]` runs every suite and prints only failures and a one-line count.
- `tools/validate-content.mjs` checks the data's references.
