# Release feedback

The source-of-truth answers are the root `exit-interview.json`, embedded at build time into the game's About/Credits. The four required categories are Source Information, Testing Feedback, Engine Feedback and Prompt Feedback.

The issue ledger contains 25 distinct findings, including 1 critical (canvas CSS sizing). Five were exposed by initially failing automated checks (S-001, C-001, I-001, I-002, U-001); 20 came from focused code/visual review. Multiple symptoms of the canvas bug count once. Final passing verification replaces earlier failing snapshots; previous counts are retained in PROGRESS.md for history.

Whole-campaign evidence is from ordinary legal player intents with unchanged default speeds, normal five starting lives, actual moving food, damage rules, clear delays and transitions. No food-mask edits, teleportation, stage skips or attract cheats are completion evidence. Efficient bots completed the final built HTML solo in 177.43 simulated seconds and co-op in 127.81 seconds in the recorded browser trace. First-human 12–18 minute pacing is unconfirmed. Human listening quality and physical hardware behavior remain unknown; specified browser/controller/touch stand-ins were used.

The native engine/client are pinned and unmodified. New systems are the graph-based authoritative simulation, original content/creature details, editor, procedural note/event data, compact network authority adapter and targeted Shell/input composition. Rendering uses the full engine, native pixel helpers, palette tones, actor sorting, Blob squash-and-stretch, shadows, fixed-step Game, TV Shell, Settings, rebinding and audio buses.
