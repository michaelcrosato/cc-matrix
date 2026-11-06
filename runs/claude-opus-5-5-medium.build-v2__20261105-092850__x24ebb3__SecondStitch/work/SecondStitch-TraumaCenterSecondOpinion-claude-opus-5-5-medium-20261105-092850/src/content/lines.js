// Reaction pools. Keys are `who.what`. Display is uppercase; *word* marks a highlight colour.
export const LINES = {
  'reyes.mistake': [
    "That's the patient, Doctor. We were using him.",
    'Hands! *Whose hands are those?*',
    "I've seen cleaner work at the fish market.",
    "He's losing blood faster than this hospital loses money.",
    "We've discussed the sharp end, Doctor.",
  ],
  'reyes.clean': [
    "...Adequate. Don't let it go to your head. It's not attached to anything useful.",
    'Fine. Do it again, so I know it was not an accident.',
    'Hm. Someone taught you something.',
  ],
  'reyes.lowVitals': [
    "Vitals! He's going, Doctor! *Syringe!* {quick}!",
    'Pressure is in the basement! *Stabilize!*',
    "Don't you lose this one on my shift!",
  ],
  'reyes.wrongTool': [
    "Wrong instrument, Doctor. It's the one that isn't that one.",
    'That tool does not do that.',
    "Try the other tool. Any other tool.",
  ],
  'reyes.wrongOrder': ['*Not that one first!* Distal before proximal, Doctor!'],
  'reyes.magnet': ['Slowly! Magnets remember where they were!'],
  'reyes.rotate': ['Turn it first. Bone has a right way up. {rotate}.'],
  'reyes.noDoses': ['We are out. That was the last of it.'],
  'reyes.missedRing': ['The port, Doctor! You just stabilized the drape!'],
  'reyes.strainHit': ['It felt that. *Again!*', "It's running! Stitch what it tore!", 'Faster now. It learned something. So learn something.'],
  'reyes.eyesCrawl': ['The eyes are moving! Why are the eyes moving?!'],
  'reyes.stalk': ['That stalk! *Pull it! Do not let go!*'],
  'reyes.fib': ['Fibrillating! *Paddles!* Both hands!'],
  'reyes.eyeOpen': ['The eye! *Laser, between beats!*'],
  'false.cyst': ['That one was clean. That was healthy tissue, Doctor.'],
  'mimic.hit': ["It's copying your hands! *Stop doing what you just did!*"],
  'pem.low': ["Vitals are in the basement. I'd take the stairs, Doctor."],
};
