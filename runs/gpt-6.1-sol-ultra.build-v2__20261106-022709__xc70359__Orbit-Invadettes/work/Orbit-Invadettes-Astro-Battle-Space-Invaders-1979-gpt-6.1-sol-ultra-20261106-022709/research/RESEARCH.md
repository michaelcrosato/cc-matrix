# Source inspection — Orbit Invadettes

Research performed 2026-11-06. These files are reference evidence only; no commercial sprites, ROMs, music, or samples are used in the game.

## Interpretation

TASK.md names “Astro Battle Space Invaders - 1979.” We interpret this as Bally’s Astrocade Space Invaders, subsequently titled Astro Battle, rather than Sidam’s arcade game. This is the project’s working interpretation, not a newly established release-history fact. The inspected renamed manual itself prints a 1981 Astrovision copyright.

## Manual, including actual scan

- [HTML manual](https://ballyalley.com/cart_manuals/html_manuals/astro_battle.htm), read in full.
- [Five-page manual scan](https://ballyalley.com/cart_manuals/pdf_manuals/Astro_Battle.pdf), downloaded as `Astro_Battle.pdf`; rendered locally. Personally inspected image pages indexed 2 and 3 (printed pages 2 and 3), retained as `Astro_Battle-2.png` and `Astro_Battle-3.png`.

The scan confirms horizontal joystick movement and trigger fire, four difficulty selections, cover damaged by both bombs and friendly shots, faster surviving invaders, and lower replacement formations. A crossing parent ship is a bonus target and drops no bombs. Row values are 40/30/20/10 from top to bottom; parent ships award 100/200/300. The player starts with an active base and two spares, earns a single extra at 1,000 points, and wins by clearing six formations. The manual supplies mechanics rather than sprite illustrations.

## Representative gameplay actually inspected

- [Cartridge-video archive](https://ballyalley.com/astrocade_videos/cartridge_videos/cartridge_videos.html), Astro Battle entry.
- Its embedded [Nice and Games — Astro Battle (Astrocade)](https://www.youtube.com/watch?v=LSYrGZm0I9Q), listed by the archive as published January 29, 2010.
- The direct browser fetch was throttled. yt-dlp retrieved metadata and the 490×360 video-only format successfully. Retained `video-info.json` and `representative-play.mp4` (353 seconds). No audio track was downloaded.
- Extracted samples at 30, 60, 90, 120, 180 and 240 seconds. Personally inspected 60, 90 and 120 seconds and `play-motion-90.png`, a sequential 90–93 second filmstrip at four samples/second. This is sampled visual inspection, not a claim of watching or hearing the complete video.

Observed black combat field inside a bright pink/orange screen border, bases/score across the top, four bright alien rows, four orange arch-shaped bunkers and a small yellow bottom cannon. Upper enemies have pointed saucer silhouettes; lower rows include compact pink and rounded blue/crab-like forms. The sequential samples show discrete formation steps with alternating poses and downward bombs while the base slides horizontally. Both friendly shots and bombs visibly remove bunker chunks. The later 120-second sample has very few, lower survivors and heavily damaged cover. No exact cadence, physics, or original collision-mask measurements were established.

## Contemporary comparison actually inspected

- [Video Games, October 1982, “The $300 Question: Astrocade or Intellivision?”](https://ballyalley.com/articles_and_news/Video_Games_October_1982.pdf), Roger Dionne.
- Downloaded six-page extract and rendered every page. Personally inspected images indexed 1–5; the relevant Astro Battle vs. Space Armada discussion is image 3, printed page 66, with continuation on image 4, printed page 80.

The comparison describes colorful, crustacean-like marching invaders and a red bonus saucer with portholes. It characterizes march sounds as squishy and the saucer as beeping. These are the article’s descriptions, not a human listening test by this builder. The article discusses repairable persistent shields under Intellivision’s Space Armada; that should not be misreported as an Astro Battle mechanic.

## Design consequences and honest limits

Use original compact comic silhouettes, a clear top HUD, readable dark sky, four arches, pose-synchronized steps, distinctive shot sounds, and shrinking safe cover. The new co-op, salvage repairs, specialists, three locations, and hostile two-phase flagship are original additions. Keep the source bonus saucer nonattacking and visually distinct from that finale. Do not borrow Astro Fighter fuel/docking or Galaga diving behavior.

Exact source sound timbres, note frequencies, controller feel, hardware colors, complete six-wave footage and original release chronology remain unknown. Native procedural sound should evoke short contrasting electronic events without pretending to reproduce heard source audio. Human listening, physical controller, actual TV-distance, and real iOS behavior cannot be verified on this machine.
