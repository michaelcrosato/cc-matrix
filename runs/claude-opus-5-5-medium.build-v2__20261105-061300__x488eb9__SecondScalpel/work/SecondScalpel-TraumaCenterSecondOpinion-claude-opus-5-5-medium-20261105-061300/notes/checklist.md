# PLAN.md section 22, line by line, with the evidence (node tests/run.mjs unless noted)

**Source, genre, perspective, title**
- Original per the originality rule: test greps src/ for every forbidden name. Genre and perspective per section 2: op overhead, story portraits, ward threequarter, title side.
- Title by real RNG (Python secrets over 50 riffs), stored in `G.GAME_TITLE`. The page title and build read a literal: tests/hub.py checks the frame's title.

**Package and environment**
- One self-contained HTML at the root, from file:// (tests/browser.py loads it by file://). Dev files in the named subfolder. No other agent's folder read. Stopped only my own task; the memory hogs seen were other agents' and were left alone.

**Tech, art, animation**
- Engine v0.89.1, one patch noted (touch notice). Native look, new surgical art, three Kenney props. Native rigs plus poses: scrub, push, lean, pass, knit, paddles, maskdown, cane, sea legs (roll), defib arch.

**Audio**
- All in code, gibberish voices (browser: each voice not silent). Music 10%: test and browser test.

**Online**
- All four harness runs pass, client stroke lands on the host, standalone works (tests/hub.py). Couch co-op: test with the keyboard's right half and 1 to 4 bots.

**Performance, testing**
- No optimization pass. One command, failures and a count. Full playthrough passes.

**Scope**
- Mechanics of sections 5 to 9 in play: a test lists every object type and strain in the story; each tool, wrong gestures too. Data-driven: CONTENT.md, Dev Jump. Dev mode: every slider has a behavior test; Reset; each cheat. Attract: 10 s on title, menu; loops twice; key, mouse, click, stick, pad button exit; not on reading screens. Tone: section 10, line length tested.

**UI and UX**
- Controller-first (pad stub test), real keyboard and mouse test from first launch to a pulled shard; hover focus via E.Menu and the ward. Prompts follow the last device; Xbox option tested. Touch-only notice, Settings by tap, no touch buttons, attract behind: Chromium and WebKit phone profiles.

**Done and reporting**
- No TODO, placeholder or stub: test. About has all sections: browser test. Exit interview: shape test. Answers from notes/feedback.md.

# Balance targets (now tests in tests/run.mjs, so they cannot go stale)
- First-timer who retries: clears everything within 6 tries; Cases 1 and 2 first try; every winning try 3 to 6 minutes; Case 3 fails twice, Tremolo takes 3 tries, the Cantor 5 (tools/slow.mjs).
- Human-like bot: clears all on Intern and on Resident (plan: all on Intern, 70% on Resident).
- Perfect bot: every case won with at least 30% of the clock and 40 vitals.
- A first clear: measured by tools/firstclear.mjs, the whole game through its real scenes on game time.

# Cannot be done on this computer (TASK.md's list)
A person's hands, a physical DualSense, ears on the mix, a real iPhone, a real TV. Stand-ins used as TASK.md directs: pad stub, phone profiles, analyser levels, two harness frames, 1080p screenshots.

# Deliberate differences from the plan
- Clocks and object counts in most cases are above section 9's defaults (src/data/cases/extra.js), because the first-timer runs asked for it; section 9 calls its numbers defaults to balance.
- A few of section 19's files are merged (core/tools.js holds the tools; ui and scenes are grouped by flow).
