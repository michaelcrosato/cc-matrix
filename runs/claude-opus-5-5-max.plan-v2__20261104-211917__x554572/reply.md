The hook was right: my coverage table was only my own claim, and when I checked it properly it had 29 gaps. `PLAN.md` now passes a line-by-line audit against TASK.md, and `planner-exit-interview.json` is updated. Nothing is committed, and I've deleted the audit script and throwaway game.

## The audit
I wrote a script that maps every non-empty line of TASK.md to a requirement quoted from that line, or to a stated reason it needs no plan content, such as a heading or machine fact. It then looks for each requirement in `PLAN.md`, leaving out the plan's own coverage table.

- **First run:** 29 of 95 requirements were unmet.
- **Last run:** all 95 are met and all 110 non-empty lines are mapped: 68 to requirements and 42 as information only. I read the matched plan text for each requirement and all 42 information-only lines.
- **Limit:** the script only proves the relevant text exists. Whether that text is good enough is my judgment from reading it.

## What the audit and testing changed
Most of the gaps were machine facts I had assumed builders would take from TASK.md; the plan now states them. These were the real problems:

| Problem | Fix in the plan |
|---|---|
| Nothing showed players "what they can and cannot do" | A Handbook screen, plus a spoken refusal whenever a tool can't affect a target, and a test that every tool and target pair has an effect or a refusal |
| Builders couldn't truthfully answer the Testing Feedback counts | An issue log kept from day one |
| Catalogue suggestions left out `tagline`, `description` and `controls` | Added |
| My no-WebGPU message could never appear in Firefox, because the bundle crashes at import before any game code runs | The check now goes in a classic inline script, placed before the bundle |
| I assumed Firefox and WebKit could be tested through the engine's Playwright | Builders use the system Python's Playwright for them instead |

## `npm run verify`
Builders write this command, because this stage has no game for it to test, so it has only run on the starter game, not on the real game. The plan now includes the skeleton I ran there, under the run's real long `TMPDIR`:

- **Clean run:** it printed only `verify: 8 passed, 0 failed`.
- **Forced failures:** with a broken test, a lint error and a failing browser check, it printed exactly those three `FAIL` lines and `verify: 9 passed, 3 failed`, then exited with status 1.

## Still unproven
- **Not tried at all:** the game's own pre-round card in the harness, a custom camera mode in play, transparent live meshes, more than 40,000 vertices, and whether lighting follows the current set. The plan tells builders to prove these early.
- **My reading of an ambiguous line:** I took multiplayer "on its own" to mean "runs normally, plus couch co-op". If you meant networked play outside AI Hub, section 16 of the plan needs changing.