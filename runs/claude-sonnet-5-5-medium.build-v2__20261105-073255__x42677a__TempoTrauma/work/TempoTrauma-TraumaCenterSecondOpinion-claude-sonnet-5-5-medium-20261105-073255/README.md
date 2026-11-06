# Tempo Trauma: dev folder

An original surgical-action drama on the Pavilion engine (the shardfall repository, commit 49ef2ba).
The title lives in one constant, `pav_core::games::surgery::TITLE`.

- `engine/` the engine with the game added: `crates/pav_core/src/games/surgery/` (sim, bot, cases, story, tuning),
  `crates/pav_view/src/surgery/` (operative field, instruments, paper theatre), `crates/pav_ui/src/surgery/`
  (shell, HUD, glyphs), `crates/pav_audio/src/{cues,voice,music}.rs`, `crates/pav_app/src/{product,hook}.rs`
  (the game's own frame path, test hook, AI Hub bridge), `web/{hub_shim.js,hub_tags.html}`, `scripts/pack_single_html.py`.
- `tests/run_all.py` one command, prints only failures and a count (`--rust`, `--web`, `--hub`); `tests/browser/` Playwright
  tests and screenshot script; `tests/hub/` the AI Hub harness; `tests/out/` screenshots.
- `exit-interview.json`, `make_about.py` (regenerates the About screen's data from it), `about-data.json`.
- Content guide: `engine/crates/pav_core/src/games/surgery/content/README.md`.

Build the single file (needs Rust 1.98.1 with the wasm32 target and wasm-bindgen 0.2.129):

    cd engine && CARGO_BUILD_JOBS=3 scripts/build-web.sh --single-file --scene surgery/title --title "Tempo Trauma" \
      --description "..." --theme-color "#0a1a1e" --about ../about-data.json --out ../<name>.html

Tools: `pav play scene=surgery/campaign bot=true seeds=10`, `pav capture scene=surgery/case/3 ticks=600 out=a.png`,
`pav case_check`, `pav balance seeds=10`.
