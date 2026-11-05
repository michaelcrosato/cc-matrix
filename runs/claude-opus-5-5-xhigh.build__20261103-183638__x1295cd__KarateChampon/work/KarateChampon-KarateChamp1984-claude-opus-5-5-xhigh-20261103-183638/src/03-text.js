/* ---- TEXT: terse, ALL-CAPS arcade calls, as the source wrote them. Voices are gibberish; these are the subtitles ---- */
KC.CALLS = {
  begin: ['BEGIN!', 'HAJIME!'], stop: ['STOP!', 'YAME!'], white: ['WHITE!', 'SHIRO!'], red: ['RED!', 'AKA!'], half: ['HALF POINT!', 'WAZA-ARI!'],
  full: ['FULL POINT!', 'IPPON!'], nopoint: ['NO POINT!', 'TORIMASEN!'], aiuchi: ['AIUCHI!', 'AIUCHI!'], time: ['TIME!', 'SOREMADE!'],
  judges: ['JUDGES!', 'HANTEI!'], whiteWins: ['WHITE WINS!', 'SHIRO NO KACHI!'], redWins: ['RED WINS!', 'AKA NO KACHI!'], bow: ['BOW!', 'REI!'],
  decide: ['DECIDING ROUND!', 'SHOBU!'], forfeit: ['FORFEIT!', 'KIKEN!'], matchPoint: ['MATCH POINT!', 'MATCH POINT!'], perfect: ['PERFECT!', 'PERFECT!'],
  weak: ['WEAK!', 'WEAK!'], ready: ['READY!', 'YOI!']
};
// each call's rhythm: syllables and the stressed one (the referee's voice is fixed per call, so it is recognizable)
KC.CALL_RHYTHM = { begin: [3, 1], stop: [2, 0], white: [2, 0], red: [2, 0], half: [4, 2], full: [3, 0], nopoint: [3, 1], aiuchi: [3, 1], time: [2, 0], judges: [3, 1],
  whiteWins: [4, 0], redWins: [4, 0], bow: [1, 0], decide: [4, 2], forfeit: [3, 0], matchPoint: [4, 0], perfect: [3, 0], weak: [1, 0], ready: [2, 0] };
KC.call = id => { const c = KC.CALLS[id]; return c ? c[KC.settingsCalls() === 'jp' ? 1 : 0] : id; };
KC.settingsCalls = () => 'en';   // replaced once the game's settings exist (90-start.js)

/* cutscene scripts: [speaker, text] (speaker 'card' is a title card; a roster id or 'genkotsu' speaks with a portrait) */
KC.SCRIPTS = {
  prologue: [['card', 'NAGASAKI HARBOR. SPRING 1984.'], ['card', 'THE CHAMPON CUP RETURNS.'], ['card', 'THE PRIZE: THE GOLDEN BOWL.'],
    ['taro', 'I AM TARO MOYASHI. WHITE BELT.'], ['taro', 'I WILL BE CHAMP!'], ['negi', 'FIRST, YOU LEARN TO KICK.']],
  harborMei: [['mei', 'YOU ARE THE NEW ONE? YOU LOOK LIKE A BEAN SPROUT.'], ['taro', '...I AM A BEAN SPROUT.'], ['mei', 'EAT. THEN FIGHT.']],
  afterHarbor: [['mei', 'NOT BAD, MOYASHI.']],
  potsIntro: [['mei', "DON'T BREAK MY BOWLS! BLOCK TO CATCH!"]],
  marketMei: [['mei', "THE FINAL IS TOMORROW. DON'T BE LATE."]],
  finalEntrance: [['genkotsu', 'THE FINAL. THE CHAMPION ENTERS.'], ['mei', 'SURPRISE, MOYASHI. THE GOLDEN BOWL IS MINE.'], ['taro', '...YOU?'], ['mei', 'WHO DO YOU THINK MAKES THE BEST CHAMPON?']],
  ending: [['genkotsu', 'WHITE WINS! A NEW CHAMP!'], ['mei', 'A BEAN SPROUT BECAME A CHAMP.'], ['mei', 'NEXT YEAR I TAKE IT BACK.'], ['taro', 'OSU!'], ['card', 'YOU ARE THE KARATE CHAMPON.']],
  lessonEnd: [['negi', 'YOU ARE READY. FIGHT KAMABOKO.']],
  gameOver: [['genkotsu', 'TRAIN. RETURN.']]
};
KC.HINTS = ['THE REFEREE STOPS THE FIGHT AFTER EVERY CLEAN HIT.', 'FIRST TO 2 POINTS WINS THE ROUND.', 'CLEAN, FULL-REACH STRIKES SCORE FULL POINTS.',
  'HIT THEM DURING THEIR TECHNIQUE: DOUBLE POINTS!', "LOW KICKS AND SWEEPS CAN'T BE BLOCKED. JUMP THEM.", 'CROUCH UNDER HIGH KICKS.'];
KC.TEXT = {
  touchGate: 'CONTROLLER OR KEYBOARD REQUIRED', demo: 'DEMO - PRESS START', bonusBoards: 'BONUS STAGE! BREAK THE BOARDS!', bonusPots: 'BONUS STAGE! POTS AHOY!',
  bonusBull: 'BONUS STAGE! STOP THE BULL!', niceCatch: 'NICE CATCH!', mottainai: 'MOTTAINAI!', trampled: 'TRAMPLED!', tooMuch: 'TOO MUCH!',
  cont: 'CONTINUE?', getUp: 'GET UP, MOYASHI!', gameOver: 'GAME OVER', champon: 'YOU ARE THE KARATE CHAMPON.', kachinuki: 'KACHINUKI! WINNER STAYS ON.',
  kachiRule: 'FIRST TO 2 POINTS WINS A BOUT. MOST BOUTS WINS.', nextYou: 'NEXT: YOU', hostLeft: 'HOST LEFT', roundOver: 'ROUND OVER', watch: 'WATCH.', nowYou: 'NOW YOU.',
  good: 'GOOD!', sharp: 'SHARP!', watchAgain: 'NO. WATCH AGAIN.', lessonDone: 'LESSON COMPLETE.'
};
