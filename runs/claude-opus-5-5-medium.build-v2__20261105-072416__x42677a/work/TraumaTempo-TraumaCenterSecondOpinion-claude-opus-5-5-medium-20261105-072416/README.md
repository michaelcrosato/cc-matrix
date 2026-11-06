# Trauma Tempo: the dev folder

`engine/` is the Pavilion engine with the game in it (`crates/pav_core/src/games/surgery/`, with its
text content and designer guide in `content/README.md`). `tests/run_all.py` is the one test command:
it prints failures and a count. `tools/build_web.sh` builds the single file into the parent folder;
`tools/cb.sh` is cargo with few jobs, waiting for memory and retrying if a compiler gets killed.

Build `pav` first: `cd engine && cargo build -p pav_tools --bin pav`. Then `pav balance`, `pav case_check`,
`pav capture scene=surgery/case/3` and the rest run from `engine/`.
