`PLAN.md` now covers everything `TASK.md` asks for, and I checked that line by line instead of relying on my own summary. The audit found no gaps across 98 clauses. It's a text check, so it shows each requirement is addressed in the plan, not how well a builder will carry it out.

**Added to the plan after your hook's objection:**
- **Source Information:** all 14 fields, in `TASK.md`'s order, each saying what to write. `Usage` stays exactly `added on import`, kept easy to find for the agent that imports the game.
- **Feedback questions:** all 14 Testing, Engine and Prompt questions, word for word and in order, plus a dev log kept from day one so the answers are real.
- **About/Credits:** a five-page layout that keeps to the 10-foot rules, with a browser test that every field and answer is present.
- **Exit interview and final reply:** the exact JSON shape, the allowed values, suggested `aiHub` values, and a template for the final chat reply.
- **Smaller gaps:**
  - a schedule of when the player first meets each feature
  - a rule that the game explains what can't be done
  - the WebKit iPhone test
  - the `uv` tip
  - the "never kill whatever holds a port" rule
- **Coverage table:** section 22 now lists every requirement in `TASK.md`'s order.

**What the audit compared, reading `TASK.md` directly:**

| Check | Result |
|---|---|
| Clauses checked in `TASK.md`'s order | 98, none missing |
| Source Information fields | 14 of 14, same order |
| Feedback questions, word for word | 4 of 4, 6 of 6, 4 of 4, same order |
| Exit interview JSON keys | identical to `TASK.md`'s |
| `aiHub` genres | all 16 listed |
| Suggested tags | all from `TASK.md`'s examples |
| `TASK.md`'s file and folder names in the plan | none |

**Two parts of the hook's objection I didn't act on, because `STAGE.md` rules them out:**
- **Building the game:** `STAGE.md` says other agents build from this plan, so there's still no game, by design.
- **The HTML file name:** `STAGE.md` says to leave out `TASK.md`'s file names, so the plan tells each builder to use the name in its own `TASK.md`.