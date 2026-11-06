# Corrected issue ledger

Count method: unique product issues caught by checks or integration review; repeated failures and test-fixture corrections are not added. No unfinished product issue is known in the validated scope.

Simulation/import/checkpoints (8): stale editable graph cache; fractional legal-floor acceptance; click route resuming after arrival; missing plant rejection while respawning; arbitrary-type import validation throwing; Retry clearing modified flag; Retry resurrecting a removed partner; corrupt-but-parseable saved actors accepted for later crash.

Hub adapter (5): clear event repeated during report; reliable plant during report lacked final rejection; old action-result eviction could permit replay; delayed same-actor actions could overwrite one another; short directional taps could be overwritten before the next heartbeat.

Art/audio (4): trail/junction sentry IDs rendered as opposite silhouettes; repeated unlock restarted music; portrait score under corner controls; object-form combo state prevented multiplier/expiry text from rendering.

Application integration/UI (13): join-screen title overlapping assignments; custom/report/reassignment menus could extend below logical viewport; denied-storage read ignored visit-memory fallback; life slider altered cap without changing current lives; Hub mouse route not forwarded by main; Hub contextual PLANT never enabled; long About text had no useful controller scrolling path (replaced with paged sections); Hub local UI/audio lifecycle needed explicit startup/end gating so it cannot show a standalone title before welcome or unlock sound after end; developer freeze/teleport flags persisted into fresh runs; persisted slider UI could differ from fresh simulation tuning; Retry retained a pending clear-report timer; developer world replacement retained clear outcome latches; workshop Load retained an old pending wrap placement.

Total:30 unique corrected product issues. One is classified potentially game-breaking: corrupt saved actor state could crash a later render/tick. No fresh-profile full-campaign blocker remained. Record-integrity issues are included above but not counted twice.

Test-fixture issues excluded from product count: using engine CommonJS return instead of its installed global; CSS uppercase headings compared case-sensitively; Input.feed gesture tests incorrectly expected to steer the native floating stick; old bot needed better head-on collision decisions at seed1982. Replaced stick test with actual Chromium multitouch events; improved bot input only, not gameplay difficulty.
