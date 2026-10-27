# Matrix Dashboard

Run every combination of model × effort × prompt variant headless through Claude Code, Codex, Grok, Antigravity (`agy`) and Muse Code, then play, score and compare the results. No dependencies beyond Node 18+.

## Start
Put all files in one folder, then:

- **Ubuntu / macOS:** `./start-dashboard.sh`  (or `node dashboard.mjs --open`)
- **Windows PowerShell:** `.\start-dashboard.ps1`  (or `node dashboard.mjs --open`)

It opens http://localhost:4173. Options: `--port 5000`, `--config other.json`, `--out other-runs`.
`claude`, `codex`, `grok`, `agy` and/or `muse` must be installed and logged in on the same machine.

## Tabs
- **Setup** — the **CLIs** card shows which CLIs are installed (version), the models each offers (click one to add it) and the global instruction files each loads. **Models**: one dropdown per row picks the model (Claude 5.5 family, GPT-6+ on Codex, Grok 4.7, Gemini 3.8 Flash and Gemini 4 Argon on agy, Muse Spark 1.3 and Muse Wonder 1.0; the list is `CATALOG` in `dashboard.html`, and Codex adds any newer GPT-6+ model it lists; only the newest of each GPT line is offered, e.g. gpt-6.1-sol and not gpt-6-sol), which sets the CLI, model ID and run name. **Custom** (bottom of that list, one per CLI) gives a box to type any model ID. Each effort level is its own dropdown holding only the levels that model takes ("+ effort" adds another to sweep; Claude Code also offers each level with Ultracode). Then an optional time limit, and **Test**: one tiny task through the real command line and parser, about a minute, to check install, login, model ID, flags and that results are read. Tick "Test with /goal" to test the goal loop too. Then dimensions and their variants, the prompt, and per-CLI commands and extra flags. Ctrl+S saves. Errors (like a `{{placeholder}}` with no dimension) block saving; warnings flag efforts or models a CLI won't take and CLIs that aren't installed.
- **Run** — tick the model+effort pairs and variants you want. The count updates live and skips runs already finished. Each model shows whether it works (passed a test or has finished runs). Runs take turns across CLIs, so parallel slots go to different services; **Max per CLI** caps one CLI to stay inside its plan's rate limits. Preview shows the exact prompt. Start / Stop, with a live log and how long each active run has been going. A CLI that isn't installed has its runs skipped (not failed).
- **Results** — filter by anything (including CLI), group by any dimension to compare averages (time, cost, output tokens, score, delivered %). ▶ plays the game, reply shows the agent's Source Information and feedback, failed runs show why, `out` shows the raw CLI output. Score out of 10 and add notes while you play.

## The CLIs
| CLI | Command per run | Prompt goes in | Cost | Efforts |
|---|---|---|---|---|
| Claude Code | `claude -p --output-format json --model M --effort E` | stdin | reported | low, medium, high, xhigh, max (+ `-uc`) |
| Codex | `codex exec --json -m M -c model_reasoning_effort=E -` | stdin | — | per model (`codex debug models`), e.g. low … max, ultra |
| Grok | `grok --prompt-file prompt.md --output-format streaming-messages-json --model M --reasoning-effort E` | file | reported | low, medium, high, xhigh |
| Antigravity | `agy -p PROMPT --output-format json --model M --effort E` | argument | — | per model (`agy models`), e.g. low, medium, high |
| Muse Code | `muse exec --json --model M --reasoning-effort E --prompt-file prompt.md` | file | — | minimal, low, medium, high, xhigh, max |

Plus each CLI's extra flags (Setup → Advanced). The defaults turn permission prompts off, which a headless run can't answer: `--dangerously-skip-permissions` (Claude Code, agy), `--yolo` (Codex: no prompts, no sandbox, runs outside a git repo), `--always-approve` (Grok), `--yolo` (Muse).
- **agy** model IDs are the base name, like `gemini-4-argon` or `claude-sonnet-5-5`, with the effort separate; `agy models` lists them with the effort appended (`gemini-4-argon-high`). It also serves Claude and GPT-OSS models; `{{lab}}` follows the model, not the CLI.
- **Muse** models: `muse-wonder-1.0` (default), `muse-spark-1.3`, `muse-spark-1.2`. It reports how much of the plan's allowance is used, not a cost.
- **Grok** models: `grok models`.

## Ultracode and /goal
- **Ultracode (Claude Code only):** write an effort as `high-uc` (any level + `-uc`), or press **+ UC** on a model in Setup to add one for every level. It's passed as `--settings {"ultracode":true}`; every other Claude run gets `{"ultracode":false}` so a global setting can't leak in. The `ultracode` column lets you compare on vs off. Other CLIs skip `-uc` efforts.
- **/goal:** the `goal` dimension. An empty variant means no goal. With text, the prompt is saved as `TASK.md` in the run's work folder and the agent is sent `/goal Read TASK.md … Done when: <your text>`. A command only works at the very start of the message and everything after it becomes the condition (max 4,000 characters), so it can't simply sit inside the main prompt. Add "or stop after N turns" to cap it.
- Claude Code, Grok, agy and Muse all run /goal headless, each with its own goal loop (Grok plans, builds and verifies with extra agents, so it takes longer and costs more). Codex has none, so it only runs the empty goal variant.

## Files
- `matrix.config.json` — everything the Setup tab edits (hand-editable too)
- `prompt-template.md` — your prompt. Each dimension fills its `{{name}}`; every run also fills `{{model}} {{effort}} {{lab}} {{environment}} {{stamp}} {{date}}`
- `runs/<run-id>/` — `work/` (the game; the bundled .html in its root), `prompt.md`, `reply.md`, `result.json`, `agent.out`, `agent.err`
- `runs/scores.json` — your scores and notes; `runs/.smoke.json` — the latest Test result per model
- `runs/results.csv` — everything in one spreadsheet; `runs/index.html` is a static gallery

## Without the dashboard
```
node run-matrix.mjs --dry-run --pick opus:xhigh,opus:max --only testing=none,open
node run-matrix.mjs -j 3 --pick opus:max --budget 50
node run-matrix.mjs -j 4 --per-cli 1 --pick grok:medium,gemini:medium,muse:medium
node run-matrix.mjs --smoke grok:medium [--smoke-goal]     # the Test button
```
Same config, same `runs/` folder, same resume behaviour.

## Notes
- Finished runs are never redone unless you tick Retry failed or delete the run (✕ in Results). Stopping a batch discards only the runs still in progress.
- Agents run with permission prompts off. Use a dedicated machine, VM or container. The dashboard only listens on this computer (127.0.0.1).
- Global instruction files apply to every run; keep them neutral or the comparison is skewed. The CLIs card lists the ones each CLI loads: `~/.claude/CLAUDE.md` (Claude Code, and also Grok and Muse), `~/.codex/AGENTS.md` (Codex, Muse), `~/.grok/AGENTS.md` (Grok), `~/.gemini/GEMINI.md` (agy). Add `--no-foreign-personal-context` to Muse's extra flags to stop it reading the Claude and Codex files.
- Cost is only what the CLI reports: Claude Code and Grok. Codex, agy and Muse don't report cost, so they show n/a; their tokens are a rough relative guide only. On a subscription, Claude Code's figure is the API-equivalent price.
- Tokens: input counts everything sent, cached included (agy's own `input_tokens` leaves cache reads out, so they're added). Output includes reasoning.
- Token breakdown: `uncachedInputTokens` + `cachedTokens` (cache reads) + `cacheWriteTokens` = `inputTokens`; `totalTokens` = input + output. Cache writes are only reported by Claude Code and Grok (blank otherwise). For Claude Code, `reasoningTokens` is its thinking count and `result.json` also has a per-model split (`models`, with cost) matching `/usage`. After changing a parser, `node run-matrix.mjs --reparse` refreshes these fields from each run's saved `agent.out`.
- The budget only counts reported cost.
- agy gets the prompt as an argument (its `-p` reads neither stdin nor a file). On Windows, very long multi-line prompts can break through the shell; WSL avoids that.
