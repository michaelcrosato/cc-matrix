(function (root) {
  'use strict';
  const B = root.BU = root.BU || {};
  B.CONTENT_VERSION = 'bomb-union-1';
  B.GLYPHS = [
    ['0110','1001','1001','1001','0110'],
    ['0010','0110','0010','0010','0111'],
    ['1110','0001','0110','1000','1111'],
    ['1110','0001','0110','0001','1110'],
    ['1001','1001','1111','0001','0001'],
    ['1111','1000','1110','0001','1110'],
    ['0111','1000','1110','1001','0110'],
    ['1111','0001','0010','0100','0100'],
    ['0110','1001','0110','1001','0110'],
    ['0110','1001','0111','0001','1110'],
  ].map(rows => rows.join('').split('').map(Number));
  B.COLORS = {
    amber: { label:'AMBER / BARS', pattern:'bars', hex:'#f4bd55' },
    coral: { label:'CORAL / DOTS', pattern:'dots', hex:'#ff786d' },
    cyan: { label:'CYAN / CROSS', pattern:'cross', hex:'#6de3e2' },
  };
  B.DEFAULTS = Object.freeze({
    timeScale:1, fuseScale:1, solderMin:0.48, solderMax:1.05,
    heatGain:32, cooling:8, recoveryWindow:8, penalty:10,
    fireIntensity:1, extinguishTime:0.8, hintDelay:8,
    precision:1, toolTravel:1, maxHold:5, testCost:2,
  });
  B.TUNING_RANGES = {
    timeScale:[0.1,4], fuseScale:[0.25,3], solderMin:[0.15,1.2],
    solderMax:[0.35,2.5], heatGain:[5,80], cooling:[1,24],
    recoveryWindow:[3,20], penalty:[0,40], fireIntensity:[0.25,3],
    extinguishTime:[0.2,2.5], hintDelay:[0,30], precision:[0.4,2],
    toolTravel:[0.25,3], maxHold:[2,8], testCost:[0,5],
  };
  B.CONTENT = {
    training: {
      id:'training', title:'First day, last wire', subtitle:'Guided workbench',
      theme:'workshop', digits:1, boardCount:1, components:1, duration:180,
      partyDurations:[180,150,150,150],
      brief:'Welcome to the union. We fix the little things before they become very large things. This training fuse is safe. Repair one board, read its stencil, and deliberately confirm the code.',
      intro:'PIP: Two cuts. Grip the old part. Fit a jumper. Solder both ends. Tea comes after continuity.',
      taunts:['DR. TICK: Even your practice bomb has excellent taste.'],
      success:'PIP: Certified! You can now be nervous professionally.',
      failure:'The training buzzer sounds. Nobody is hurt. The kettle is disappointed.',
      mechanics:['cut','grip','place','solder','evidence','confirm'],
      sectorNames:['Practice loop'],
      ending:'Your municipal response van rolls toward the waterfront. The city has three appointments with trouble.',
    },
    waterfront: {
      id:'waterfront', title:'The waterfront job', subtitle:'Case 01 · Saltwater & short circuits',
      theme:'waterfront', digits:1, boardCount:4, components:1, duration:300,
      partyDurations:[300,240,210,200],
      brief:'A suspicious parcel is holding the ferry terminal hostage. Four evidence sectors hide one digit. Repair two sectors before trying a code; more evidence buys certainty. Wrong cuts can be resoldered for eight seconds.',
      intro:'PIP: One digit between this harbour and a very abrupt low tide. Start with any free sector.',
      taunts:['DR. TICK: My parcel is waterproof. Is your confidence?','DR. TICK: Take your time. I have thoughtfully provided less of it.','DR. TICK: The ferry service has never been this punctual.'],
      success:'PIP: Harbour safe! The ferry captain says the next round of biscuits is on him.',
      failure:'A stylized pressure wave splashes the harbour. The response crew retreats behind the van. The parcel wins this round.',
      mechanics:['jumper','recovery','early-submission'],
      sectorNames:['Dock lights','Ferry bell','Tide gauge','Beacon loop'],
      ending:'Warm lights ripple across the water. The crew applauds with gloved hands. Dispatch has another call.',
    },
    relay: {
      id:'relay', title:'A little power struggle', subtitle:'Case 02 · The municipal relay',
      theme:'relay', digits:2, boardCount:6, components:2, duration:420,
      partyDurations:[420,330,290,260],
      brief:'The relay is feeding a two-digit device. Each board accepts replacements by shape OR color identity. The test socket reveals the rule for two fuse seconds. Bars, dots, and crosses duplicate the colors. Keep the iron in its safe band; extinguish established fires.',
      intro:'PIP: Test a spare against the marked example. A board keeps the same rule. Also: that warm-looking loop really is warm.',
      taunts:['DR. TICK: I matched these parts by artistic temperament. Good luck with your little meter.','DR. TICK: Smoke is simply electricity expressing an opinion.','DR. TICK: The city requested a power cut. I am being extremely accommodating.'],
      success:'PIP: Power restored. Please tell me that was the last smoking component.',
      failure:'The relay flashes, then the district dims. Emergency lights guide the crew to safety. There is still time to learn and retry.',
      mechanics:['shape','color','diagnosis','wrong-part','heat','fire'],
      sectorNames:['North feeder','West busbar','Fan controller','East feeder','Meter bridge','Safety loop'],
      ending:'Amber windows return one block at a time. From the hill, the city looks like a circuit learning to breathe.',
    },
    central: {
      id:'central', title:'The last municipal minute', subtitle:'Case 03 · Central Exchange',
      theme:'central', digits:3, boardCount:9, components:2, duration:480,
      partyDurations:[480,390,340,310],
      brief:'Dr. Tick has wired the Central Exchange clock into a three-digit lock. Nine sectors mix ordered work, matching rules, heat and recovery. Divide the evidence by digit, keep an eye on distant hazards, and make the final decision together.',
      intro:'PIP: Three digits. One city. Absolutely no pressure beyond the normal, considerable pressure.',
      taunts:['DR. TICK: You have reached my flagship product. The warranty expires shortly.','DR. TICK: Such tidy soldering. I almost regret the whole exploding part.','DR. TICK: The clock tower and I have creative differences about the ending.'],
      success:'PIP: Disarmed. All three digits. All those people. You did it. Now we can shake.',
      failure:'The clock tower blooms with a theatrical orange flash. The skyline falls quiet, and emergency beacons answer. The crew is safe; the city needs a better ending.',
      mechanics:['ordered-work','shape','color','heat','recovery','three-digits'],
      sectorNames:['Clock drive','Tram signal','Civic line','Bell motor','Tower lamp','Square relay','Chime bank','Main breaker','Exchange core'],
      ending:'The tower strikes the hour. A ferry answers from the water. Dr. Tick’s radio gives one small, offended click. BOMB UNION: clocking out, city intact.',
    },
  };
})(globalThis);
