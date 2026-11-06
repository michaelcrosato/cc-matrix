# Source reference and art bible

## Confirmed source

- Original manual: https://www.gamesdatabase.org/Media/SYSTEM/Mattel_Intellivision//Manual/formated/Beauty_And_The_Beast_-_Imagic.pdf
- Searchable manual inspected: https://manuals.plus/m/21333ac8a69bb75219c8a478f14b053f68de8de9a3658309e931b43a5334f5aa
- Illustrated archive: https://www.intvfunhouse.com/games/beas.php
- Gameplay footage inspected as a six-image, five-second-interval motion strip from the Games Database reference video: https://www.gamesdatabase.org/Media/SYSTEM/Mattel_Intellivision/Video/Formated/Beauty_And_The_Beast___Imagic.mp4
- Extracted reference contact sheet: `source-gameplay-strip.png`. It shows the original broad four-floor cream facade, one dark open window per floor, tiny yellow climber, oversized black Hank, sparse rolling yellow hazards, helping heart, and full-building overview/plane.
- The native adaptation deliberately compresses the original eleven sections to three authored sections plus a three-beat rooftop.
- Sound: no human audition was possible. The source melody and exact original sound synthesis parameters remain unknown; this game uses entirely new procedural compositions. No recorded audio is shipped.

## Art bible

- Lower tower: terracotta/coral brick, sandstone/cream cornices, cool teal shutters, warm amber interiors.
- Middle: dusty rose masonry and cool slate shade, awnings and washing.
- Upper/roof: desaturated slate/lavender masonry against dusk, cyan and amber action cues.
- Buford: seafoam cap/shirt, navy trousers, small plucky silhouette; partner: amber coat, ponytail and short scarf/cape, separate numbered marker.
- Hank: heavy oversized native bulky rig, maroon vest, blue trousers, expressive throw/hips/stumble actions. Mabel: rose dress, dark ponytail, waving and throwing gestures.
- Source-specific procedural art: layered masonry/quoins/corbels, recessed window assembly and moving louvers, faceted/cracked stones, bumper fixtures, heart, native rig based rats/birds/bats with custom tail/beak additions, two-wing biplane.
- Native lighting, pixel primitives, actor queues, projected Humanoid and Blob rigs remain the visual foundation. Generic pots, lamps, crate and barrel use the native asset library.

## Presentation verification observations

- Chromium direct-file art spike: no page errors or native game.errors; 640×480 native buffer rendered through 1920×1080 screenshot. Inspected `art-spike.png` for cast/ledge/window alignment.
- Detected zoom trap on first packaged title: native `r.ppu` multiplies zoom twice (`view.scale` already includes zoom). Renderer dimensions now use the actual `view.scale`, matching `r.w` positions. This was a presentation defect, not a physics failure.
- Procedural audio analyser spike: finite nonzero output (initial diagnostic native music .5 because isolated test omitted game settings; root application sets the requested .1). Offline 44,100-sample original triangle motif diagnostic: finite, peak 0.0293, RMS 0.00401 at music bus .1. No human listening claim.

## Minimal vendored engine fix

`Renderer.ppu` was changed from `(this.view.scale || 1) * (this.view.zoom || 1)` to `this.view.scale || 1`. `Game._applyView` constructs the active view with `base.scale * zoom`; multiplying again made native-coordinate rectangles disagree with projected positions whenever zoom differed from one. No internal code uses the getter except game-facing APIs, so this is a one-line API correction. The original upstream client and notices remain otherwise intact.

## Final presentation/audio evidence

- `tests/presentation.cjs`: six semantic integration checks passed: six zoom projection values, native rendering across all sections and ending states, draw independence, replica interpolation without authoritative mutation, audio event idempotence and voice slider application, and no activation in an unresolved Hub handshake/non-playing server.
- `window-motion-strip.png`: seven sequential native 0.12-second climbing frames from a real fresh simulation, driven by the normal semantic bot. Inspected hand-over-hand extension, continuous ascent and ledge exit. Initial recovery originally hid alternate frames; fixed to a translucent shimmer so the climber remains visible.
- `hank-motion-strip.png`: six sequential 0.15-second native throw frames. Inspected upward wind-up, forward commitment and held boulder attachment to the real rig hand.
- Final offline diagnostic now uses actual native `ChipAudio._note` and `_voice` methods for the original climb score and heart effect in an OfflineAudioContext. 88,200 finite samples; peak 0.1676; RMS 0.01578; music bus 0.1; native mute peak/RMS both zero.
- Live Chromium analyser after activation at music 0.1: nonzero finite peak 0.0348 and RMS 0.0149; native mute peak/RMS zero. These are measurements, not listening judgments.
- Presentation fixes found during integration: double-applied camera zoom via `r.ppu`; Hank drawn away from section-one's actual exit; initial recovery hiding the actor during the teaching climb; ground actors remaining after plane pickup. Voice slider originally needed an explicit game-specific native voice bus assignment, now applied.
- Accessibility: reduced-motion stops decorative time and removes power afterimages; high-contrast setting uses native bright hazard outline color; native flash/mute settings are honored.

## Final packaged review follow-up

- `tools/check-controls.py`: 17/17 passed against the actual final packaged file. Used real DOM input and CDP contacts, including a held contextual window climb and simultaneous left-stick motion/right-tap jump. Confirmed full normal ascent, useful jump apex, one-finger release preserving the other finger, solo mouse alignment/climb, and co-op pointer assistance confined to its own climber.
- Also verified native Reduce motion on/off, fresh-run balance UI/config agreement, blocked storage, malformed persisted checkpoint fallback, and credits starting at the top with working PageDown and emulated controller right-stick scrolling.
- `tools/check-audio.py`: 17/17 passed on the actual packaged game after real title/menu activation. Native authored music and jump effects produce finite nonzero output, Sound off produces zero, voice slider reaches native bus, pause holds the simulation/music clocks, failure disposes audio, checkpoint retry restores music, and returning to title then starting a fresh run restores music. Silent/dynamic server guards and pagehide disposal passed.
- Review identified and fixed five functional integration defects: standalone audio stayed stopped after title; reduced-motion code read the wrong native setting key; new-run dev slider values disagreed with actual defaults; short touch taps cut jumps too early; global pointer assistance also moved a co-op partner. Protocol-contact release ID correction was a test fix, not a game defect.
- Hub actor badges now use supplied seat colors and literal short player names through native bitmap text. Node presentation/audio suite expanded to 8/8 checks, including provided-label safety and real native comfort behavior.

## Plane-banner correction

Final ending review found that long biplane banners were clipped to the aircraft's native actor scratch buffer, leaving only the final letters visible. Banner fabric, rope and text now use an independent native world queue with dimensions from the actual font metrics, while the aircraft remains a native actor. The new regression checks complete text bounds against projected fabric bounds at zoom 0.75, 1 and 1.5; presentation/audio checks are now 9/9. A fresh actual packaged normal-intention route reached rescue/departure with no native or page errors; `departure-fixed.png` was inspected for complete readable banner text.
