`PLAN.md` covers everything `TASK.md` asks for, and all its runnable code and commands now pass on the final logic. After the hook's feedback I re-checked its three claims: one was wrong, two were fair and are now fixed.

**1. "The plan still names `TASK.md`'s files and folders": not so.** I compared every file-like name in `TASK.md` against `PLAN.md`:
- The title template, `.html` name, `exit-interview.json`, model name and run date appear zero times.
- The only overlap is "About/Credits", which is a screen name, not a file.
- The plan refers to deliverables only by description, such as "the HTML file `TASK.md` names". My earlier statement that it doesn't name the exit interview file was correct.

**2. "The exit interview was only deferred": fair, now fixed.** The plan now contains the full JSON shape, with its own decisions filled in. I parsed that block and compared it with the JSON in `TASK.md`: same keys, order and types. Builders still write the file itself, because its answers describe a game that doesn't exist yet. `planner-exit-interview.json` is separate and follows the list shape in `STAGE.md`.

**3. "Commands weren't rerun": fair, now done.** In a fresh folder on engine v0.89.0, I extracted the pieces from `PLAN.md` and ran them:

| What ran | Result |
|---|---|
| Setup commands, exactly as written | work |
| Numbered engine facts, including screen sizes, input and glyphs (Chromium) | pass, after correcting one wrong test of mine |
| Page runs for 5 seconds in Firefox and WebKit | no errors |
| Touch notice on an iPhone profile | appears (Chromium, WebKit); Settings opens (Chromium) |
| Tissue and portrait painters under headless draw | no errors |
| Hub skeleton, four harness scenarios using the plan's own runner | all pass; also runs standalone |
| Plan's top-level config inside a live session | harness passes; world keeps running under the pause menu |
| `check.mjs`, `filmstrip.mjs`, `asset-find.mjs`, `asset-set.mjs` | all work |

The re-run also caught a real error: Fact 10 said all pause rows fit, but the game's menu has more rows than that, and the last one drops below the screen at 1080p. The plan now says so, and I confirmed that moving the focus scrolls to it. The help-text CSS also moved into the page head builders copy.

After those fixes I re-ran the affected checks and the Hub tests. The audit of the final text then found all 94 specific wordings, across 48 `TASK.md` lines. The remaining `TASK.md` lines are headings or plain facts about the computer. `STAGE.md`'s own rules also pass.

**Limits:**
- **Audit method:** it confirms the plan states each requirement, and I also read the plan through against `TASK.md` myself, before these last edits. Neither proves a builder will succeed.
- **Not tested:** cursor feel and balance are still my judgment, because they need a person holding a controller.
- **No game yet:** building it is the next stage's job.

I removed the scratch folder and committed nothing. Everything is in the work folder:
- `PLAN.md`
- `planner-exit-interview.json`