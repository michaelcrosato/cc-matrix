# Original native art

`src/art.js` uses only the pinned engine's sharp `E.px` primitives, `E.tones`, native shape and sprite registries, and `E.ease`. There are no downloaded images, textures, fonts, or sound assets. The code-painted machinery is an original interpretation of UFO!'s sparse saucer and alternating cross motifs.

- Pilot one has a mint glass dome, one dark identification stripe and an aerial. Pilot two has amber glass, two stripes and two swept fins. The distinction survives grayscale viewing. Their raised glass domes, disk thickness, underside illumination, rim lights and velocity banking are procedural.
- Drifters have four copper arms, inset blue solar cells and a raised amber core. The silhouette rotates as a whole. Hunters expose two cores in one sharp, ringed mechanism. Gunships have a pointed rail body, twin outer cannons and exhaust.
- The command ship shares the disk hull, segmented cross mechanism, inset panels and gunship rails. Its command eye, rim lamps and movable component shutters distinguish phases; destroyed emitters become dark broken sockets. Components use absolute world positions supplied by simulation.
- Launch has a blue crescent and distant relay. The drift field has a broken orbital ring; signals has crossed aerials; command has a large incomplete reactor rim and red haze. Stars, nebula bands, planet crescents and distant props are code-drawn. Clouds and stars move slowly while the combat camera remains stable.

Rendering is read-only. Decorative scatter uses a pure fixed-coordinate hash and consumes no random generator. Time is supplied by the caller; reduced motion freezes backdrop drift, bank, decorative lamps and iris movement. Destruction, shield, real aiming bead, requested aim, lane tells, fusion tethers, collision indicators and chain effects belong to presentation, outside this art module.

`registerArt(E)` returns original native sprite icons and registers `cgRelay` / `cgWreck` shapes with `cgHull`, `cgEdge`, and `cgLamp` materials. `drawBackdrop` queues its screen-space pixels through `r.decal`, under depth-sorted actors; call it before queuing actors. The four drawing functions use screen x/y and explicit world-to-pixel k; actor callbacks can pass their native projected center directly.
