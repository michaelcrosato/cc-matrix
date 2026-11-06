# Hockey Ruckus

Original cel-ink arcade sports game inspired by Activision's Ice Hockey (1981), Alan Miller.

- Fixed elevated orthographic rink. Two skaters per team; automatic closest-player control and manual switch; goalkeeper support; no penalties/offside.
- Possession with oscillating stick handling; 32 forward shot angles, charge/release shots, assisted passes, body checks, elastic board rebounds.
- Guided practice; three-arena Ruckus Cup; 180-second exhibition with regular/turbo action; local versus; AI Hub and standalone online versus.
- Controller-first large menus, reactive PS/Xbox/keyboard prompts, mouse ice aiming, invisible touch steering and contextual shooting.
- Native Three.js AnimationMixer skating/action clips; procedural cel-shaded geometry and ink outlines; entirely coded Web Audio music/SFX/gibberish.
- Pause/settings/developer sliders, defaults, puck reset, goal and time tools; title attract demo after ten seconds.
- Deliver one bundled self-contained HTML at root, JSON exit interview, reproducible build and one-command tests in development folder.

Research: original manual https://atariage.com/manual_html_page.php?SoftwareLabelID=241 ; Atari screenshot references https://www.atarimania.com/game-atari-2600-vcs-ice-hockey_7344.html ; 1983 sound/mechanics description https://www.ataricompendium.com/archives/magazines/video_games/video_games_jun83.pdf ; AI Hub lib/hub README/session client from GitHub. The source has a single rink, blue/yellow teams, no enemies beyond opposing skaters, regular/high speed options, a three-minute clock, automatic nearest-skater switching, checks, stick oscillation with 32 angles, and board passing. Its sparse percussive audio is interpreted with procedural skate, stick and board impacts; original music and gibberish announcer are additions.

Title: 50 candidates, cryptographically random selection recorded in title-selection.json.
