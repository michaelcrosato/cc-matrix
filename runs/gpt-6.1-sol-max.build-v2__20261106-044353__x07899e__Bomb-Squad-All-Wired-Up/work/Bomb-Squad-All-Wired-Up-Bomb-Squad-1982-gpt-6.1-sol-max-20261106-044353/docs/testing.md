# Observed issue ledger

Each row is a unique defect discovered and fixed during this build. Counts in the exit report come from this ledger.

| ID | Severity | Found by | Defect and fix |
| --- | --- | --- | --- |
| D001 | high | Seeded content validator | Distractor spare for one component was also a correct match for a later job. Generate a distractor outside all required identities and add the distinct diamond chip silhouette. |
| D002 | high | 1920×1080 title screenshot | Native shell padding plus long title wrapped the title beyond the viewport; an uninitialized custom HUD was visible over it. Explicitly size the title panel and initialize HUD as hidden. |
| D003 | critical | 1920×1080 workbench screenshot | A depth-sorted table occluded the board and first row of parts; a city overlay hid the diorama. Use native decals for backgrounds and explicit low sorting bias for the PCB/traces. |
| D004 | critical | Hub lifecycle source audit | Cleanup left `ended` true before Hub initialization. Reset it explicitly on Hub connect so authority can advance. |
| D005 | high | Four-seat repair playthrough | Shared jumper tray supplied one physical jumper for multiple ordered jobs. Add explicit quantities; availability now counts installed copies. |
| D006 | medium | Exact-deadline simulation check | Floating point residue left 1e-10 seconds at the deadline. Resolve expiry at a 1e-7 epsilon and clamp the displayed fuse to zero. |
| D007 | critical | Fresh full-campaign input driver | The code dial retained the previous case's digit index. Three-digit entry started in the wrong column, and replaying a shorter code could extend the array. Reset the cursor whenever a new dial opens. |
| D008 | medium | Attract lifecycle audit | Prior mouse activity could immediately wake a newly started demo. Capture the pointer clock on attract entry and reset title idle on genuine pointer motion. |
| D009 | high | Native quit flow audit | The standard Quit action entered the title scene without rebuilding the game's title shell or closing its peer. The scene now dispatches the full owned cleanup/title path. |
| D010 | high | Real-input campaign and Hub repair driver | Making the large instruction strip clickable let it cover the spare tray. Restrict its pointer handling to touch; desktop clicks now reach the native tray. |
| D011 | high | 110-second native headless attract playlist | A playlist transition cleared the demo before audio read it. Guard the read; the extended proof now observes every mechanic and multiple loops without errors. |
| D012 | high | Actual two-frame Hub repair playthrough | A guest could receive an acknowledgment before the changed board chunk, then act on the old phase. Prioritize acknowledged boards, send each acknowledgment with its board, and request full snapshots only when needed. |
| D013 | high | Live-tuning and editor browser workflow | Custom Back callbacks called the native Back method recursively, trapping developer submenus. Pop the owned screen through the native default path and restore the correct layout on resume. |
| D014 | medium | Controller dial/source review | Native same-screen refresh lost focus because it reused an already-cleared focus field. A small E.Shell.show patch preserves the active widget during refresh; tested by repeated pad digit increments and complete pad disposal. |
| D015 | medium | Timed real Hub disposal | The six-board relay workload exhausted the short dispatch fuse in the sequential acceptance run. Author a four-board/two-digit dispatch with complete stencil coverage, retain diagnosis and fire recovery, and validate all party sizes. The ordinary-input Hub disposal now succeeds within its advertised round. |
| D016 | high | Crew replay / disconnect / rejoin browser test | Custom HUD buttons remained above the native pause screen and blocked Quit. Hide the custom HUD while native modal menus own input, including while solo simulation is paused. |
| D017 | high | Shared-evidence menu audit / peer regression | Sector buttons and the code-entry gate were captured only when the evidence screen opened. Refresh that native screen when claims, hazards or completion change, preserving focus; a waiting teammate now gets automatic code unlock. |
| D018 | high | Elapsed-authority deadline regression | An incoming online command could use the previous render frame's fuse time. Advance the single monotonic authority clock before commands and through a bounded network wake timer; render stalls no longer admit a late cut or stall shared time. |
| D019 | medium | Editor visual-preview audit | The board-preview early return skipped the mask-preview branch. Draw the selected component and actual paint mask together through native primitives before returning. |
| D020 | medium | Controller-first audio audit | Custom audio activation listened to DOM keyboard/pointer gestures but missed polled gamepad input. The native input hook now requests audio activation on the first gamepad action; controller acceptance verifies the soundscape is active. Browser autoplay permission remains browser-controlled. |
| D021 | high | Editor exit-path audit | Closing the editor could leave its scratch preview over the live case. Restrict scratch drawing to editor screens and clear it when the native menu closes; the browser test verifies the original board remains intact before scratch playtest. |

Validation evidence is under `evidence/`. Physical controller/touch hardware, real iOS/TV, listening, human first-time pacing and arbitrary NAT/TURN paths are unknown; emulated checks are labeled.
