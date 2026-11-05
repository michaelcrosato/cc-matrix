# NOTES (for me, if context is lost)
Task: ../TASK.md + ../PLAN.md (Ice Hoc-Kaboom). Build file name: IceHoc-Kaboom-IceHockey-claude-sonnet-5-5-medium-20261104-055058.html in ../ (work root).
Dev folder = this folder. engine/ (patched: font glyphs + create/options rule, see ENGINE-CHANGES.md), vendor/ (session.js etc.), src/*.js concatenated by tools/build.mjs.
Scoped decisions: sticks/pads/numbers drawn by game over Humanoid (r.queue), no solvePose wrapping; babble/horn/organ via audio.ctx directly.
Always set TMPDIR=$PWD/.tmp before playwright/npm. Never use /tmp. Don't kill other processes.
Final reply must contain: Source Information, Testing Feedback, Engine Feedback, Prompt Feedback sections; write ../exit-interview.json.
