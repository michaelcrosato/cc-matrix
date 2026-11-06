/** Filled from exit-interview.json by the build. Keep the two copies the same. */
export const ABOUT = {
  "sourceInformation": {
    "date": "2026-11-04 23:13:17",
    "source": "Wii Fit",
    "plan": "PLAN.md",
    "genre": "Physics-balance party sports with a daily ritual",
    "perspective": "Third person, with a framed stage camera in class and a chase camera on the island",
    "tech": "Three.js R180 (WebGPU, WebGL2 fallback, TSL toon and ink), Rapier 0.19.3, Web Audio, Gamepad API, esbuild 0.28.2, Playwright 1.63.0, Fredoka 5.3.0",
    "artDirection": "Cel-shaded ink over a wooden-toy island resort, models built in code",
    "animation": "AnimationMixer clips on jointed peg dolls, physics-driven lean, Rapier ragdolls on a fall",
    "audio": "Code-synthesised city-pop and bossa, effects, and gibberish voices. Music defaults to 10 percent. Every spoken line is also on screen",
    "online": "AI Hub Session Protocol v1 in ghost mode for 1-4 devices, plus 1-4 players on one screen",
    "testing": "Headless Playwright and one Node command that prints only failures. Simulated pads. No physical controller",
    "research": "PLAN.md, the installed Rapier 0.19 package, and the Three r180 TSL ink recipe",
    "environment": "Grok CLI (headless); Linux",
    "model": "xAI, grok-4.7, reasoning effort xhigh",
    "usage": "added on import"
  },
  "testingFeedback": [
    "Twenty-four issues. Testing caught a phantom first log rep, a second ragdoll on the plank, an Island Loop cadence that scored 26, plate bots that left the band, a key window that made the slow plate band unreachable, a clumsy plate wander that could not drop a plate, a Room Service tray at the wrong size, a raft that ignored skill, a raft whose balance wish never reached the joint, two check-in lean bugs, The Cairn latching zero stones, a Still Water guest stuck outside the calm, a log depth score that ignored near misses, mouse edges dropped before they were read, a parked stick that kept the last device, an attract demo that woke itself, fruit and stamp effects with no low end, About pages that did not turn, a hover that rebuilt the button under the pointer, shader comment URLs left in the bundle, a toon ramp whose three stops were too short for an RGBA upload, a hub slot that scored a finished class and then started it again, and a hub clock that stepped over the scoring window so a full class awarded nothing.",
    "Fifteen were critical. The plank could panic physics, Island Loop and the sharp plate bot scored as a failure, keys could not reach the slow band, plates could not be lost, Room Service could not deliver, the raft joint stayed at rest, The Cairn always reported zero stones, the check-in lean sign would publish the wrong Wobble Age, mouse confirm never fired, attract mode would not stay up, About could not leave its first page, the only touch control did not open, a hub slot scored the same class more than once, and a 6fps clock left a finished class with no score.",
    "The most helpful test was a sharp bot driving each event through the real pad path and reading that event's own result.",
    "The least helpful test was counting renderer frames without reading pixels. A lost device still increments the frame counter."
  ],
  "engineFeedback": [
    "One fixed step and one ball joint, plus the TSL ink pass, gave every event the same body and the same look on both backends.",
    "Yes. Rapier cuboids are half-extents, so a tray written as cuboid 0.3 was twice as wide as it looked. Removing two colliders in one step panics the wasm. TSL hash() takes one float.",
    "The ankle torque step, the fourteen events, the synthesised voices, and the ink scene.",
    "A Rapier panic is unrecoverable for the page, and the software WebGPU device stays lost unless the extra swiftshader flags are set.",
    "None. I did not change Three, Rapier, or the hub client.",
    "A signal that the device is actually drawing, not only that frames were requested."
  ],
  "promptFeedback": [
    "The measured numbers, and the instruction not to retune them.",
    "TASK.md's three WebGPU flags lose the device, and cuboid sizes look like full extents.",
    "Keeping one bot, one stick, and one joint honest across fourteen events.",
    "State that cuboids are half-extents, and put the working WebGPU flags in TASK.md."
  ],
  "aiHub": {
    "name": "Level Best",
    "tagline": "Hold still. The island is taking notes.",
    "description": "A wooden-toy balance party at a crooked island resort. Lean, step, and hold still through a week of classes, then come back when the island is level.",
    "type": "Game",
    "genre": "Sports",
    "source": "Wii Fit",
    "series": "",
    "players": "1–4",
    "controls": "Lean: stick, WASD or mouse. Feet: L2 R2, Q E or clicks. Flail: Square or F",
    "tags": [
      "3d",
      "comedy",
      "third-person",
      "versus",
      "arcade",
      "co-op"
    ]
  }
};
