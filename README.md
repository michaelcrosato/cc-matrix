# Matrix Dashboard

Run every combination of model × effort × prompt variant headless through Claude Code, Codex and Grok, then play, score and compare the results. No dependencies beyond Node 18+.

## Start
Put all files in one folder, then:

- **Ubuntu / macOS:** `./start-dashboard.sh`  (or `node dashboard.mjs --open`)
- **Windows PowerShell:** `.\start-dashboard.ps1`  (or `node dashboard.mjs --open`)

It opens http://localhost:4173. Options: `--port 5000`, `--config other.json`, `--out other-runs`.
`claude`, `codex` and/or `grok` must be installed and logged in on the same machine.

## Tabs
- **Setup** — models (CLI, model ID, effort levels, optional time limit), dimensions and their variants, the prompt, and per-CLI extra flags. Ctrl+S saves. Errors (like a `{{placeholder}}` with no dimension) block saving.
- **Run** — tick the model+effort pairs and variants you want. The count updates live and skips runs already finished. Preview shows the exact prompt. Start / Stop, with a live log.
- **Results** — filter by anything, group by any dimension to compare averages (time, cost, output tokens, score, delivered %). ▶ plays the game, reply shows the agent's Source Information and feedback. Score out of 10 and add notes while you play.

## Ultracode and /goal (Claude Code)
- **Ultracode:** write an effort as `high-uc` (any level + `-uc`), or press **+ UC** on a model in Setup to add one for every level. It's passed as `--settings {"ultracode":true}`; every other Claude run gets `{"ultracode":false}` so a global setting can't leak in. The `ultracode` column lets you compare on vs off.
- **/goal:** the `goal` dimension. An empty variant means no goal. With text, the prompt is saved as `TASK.md` in the run's work folder and Claude is sent `/goal Read TASK.md … Done when: <your text>`. A command only works at the very start of the message and everything after it becomes the condition (max 4,000 characters), so it can't simply sit inside the main prompt. Add "or stop after N turns" to cap it.
- Codex and Grok skip both: they only run plain efforts and the empty goal variant.

## Files
- `matrix.config.json` — everything the Setup tab edits (hand-editable too)
- `prompt-template.md` — your prompt. Each dimension fills its `{{name}}`; every run also fills `{{model}} {{effort}} {{lab}} {{environment}} {{stamp}} {{date}}`
- `runs/<run-id>/` — `work/` (the game; the bundled .html in its root), `prompt.md`, `reply.md`, `result.json`, `agent.out`, `agent.err`
- `runs/scores.json` — your scores and notes
- `runs/results.csv` — everything in one spreadsheet; `runs/index.html` is a static gallery

## Without the dashboard
```
node run-matrix.mjs --dry-run --pick opus:xhigh,opus:max --only testing=none,open
node run-matrix.mjs -j 3 --pick opus:max --budget 50
```
Same config, same `runs/` folder, same resume behaviour.

## Notes
- Finished runs are never redone unless you tick Retry failed or delete the run (✕ in Results). Stopping a batch discards only the runs still in progress.
- Agents run with permission prompts off. Use a dedicated machine, VM or container. The dashboard only listens on this computer (127.0.0.1).
- Your global `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md` still apply to every run; keep them neutral or the comparison is skewed.
- Cost is only what the CLI reports: Claude Code and Grok. Codex doesn't report cost, so it shows n/a; its tokens are a rough relative guide only. On a subscription, Claude Code's figure is the API-equivalent price.
- The budget only counts reported cost.
- Grok's JSON output isn't documented; after your first Grok run, check its cost column. If it's empty, adjust `parseGrok` in `run-matrix.mjs` to match `agent.out`.
- Grok gets the prompt as an argument (its docs don't mention stdin). On Windows, very long multi-line prompts can break through the shell; WSL avoids that.
