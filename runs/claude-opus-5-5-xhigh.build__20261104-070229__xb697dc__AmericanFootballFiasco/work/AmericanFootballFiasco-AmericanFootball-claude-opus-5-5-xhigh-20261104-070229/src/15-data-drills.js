// The tutorial and practice drills: what each teaches, the coach's line, the instruction card's steps with their chips.
(() => {
'use strict';
const FF = window.FF;
FF.data.drills = [
  { id: 'cones', n: 1, title: 'RUN THE CONES', teaches: 'Moving and turbo', coach: 'First drill: run the cones. Then hit the turbo like it owes you money!',
    steps: [{ text: 'Run past every cone in order', chips: ['move'] }, { text: 'Hold turbo and cross the gate in 9 seconds', chips: ['turbo'] }] },
  { id: 'handoff', n: 2, title: 'HIKE & HANDOFF', teaches: 'Hike, handoff, running', coach: 'Hike it! The ball goes to the man in the backfield, not the man in the stands!',
    steps: [{ text: 'Hike the ball', chips: ['b1'] }, { text: 'The RB takes it: run for 10 yards', chips: ['move', 'turbo'] }] },
  { id: 'moves', n: 3, title: 'MOVES', teaches: 'Spin, stiff arm, hurdle, dive', coach: 'Spin, stiff arm, hurdle! Like a ballerina with anger issues!',
    steps: [{ text: 'Spin past the first tackler', chips: ['b3'] }, { text: 'Stiff-arm the second', chips: ['b2'] }, { text: 'Hurdle the diver', chips: ['b4'] }, { text: 'Dive into the end zone', chips: ['b1'] }] },
  { id: 'passing', n: 4, title: 'PASSING', teaches: 'Receiver buttons, the Rocket Pass', coach: 'See the button over his head? Press it! Football is easy!',
    steps: [{ text: 'Complete 2 passes: press a receiver\'s button', chips: ['recv'] }, { text: 'Then a Rocket Pass to a covered man', chips: ['turbo'] }] },
  { id: 'catching', n: 5, title: 'CATCHING', teaches: 'The jump catch, the target marker', coach: 'Jump at the top! The ball\'s shadow tells you where!',
    steps: [{ text: 'Run to the marker under the ball', chips: ['move'] }, { text: 'Jump to catch 2 of 3', chips: ['b4'] }] },
  { id: 'defense', n: 6, title: 'DEFENSE', teaches: 'Switch, tackle, Big Hit, recovery, interception', coach: 'Defense wins championships! Offense wins... also championships. Hit somebody!',
    steps: [{ text: 'Switch to the man nearest the ball and tackle', chips: ['b2', 'b1'] }, { text: 'Big Hit to knock it loose, then fall on it', chips: ['turboB1'] }, { text: 'Jump to intercept a pass', chips: ['b4'] }] },
  { id: 'kicking', n: 7, title: 'KICKING', teaches: 'The kick meter, the Kick Cam', coach: 'Three taps, son. Power, then aim. Don\'t kick the holder. AGAIN.',
    steps: [{ text: 'Make a 37-yard field goal', chips: ['b1'] }, { text: 'Kick off 50 yards or more', chips: ['b1'] }] },
  { id: 'playcall', n: 8, title: 'PLAY CALL', teaches: 'Play calling, cards, the Hot Streak', coach: 'Pick a play. Flip it. And Pearl\'s hot sauce? That\'s for emergencies.',
    steps: [{ text: 'Pick a PASS play and flip it', chips: ['b3', 'b1'] }, { text: 'Arm HOT SAUCE and run it BLAZING', chips: ['b4'] }] },
  { id: 'scrimmage', n: 9, title: 'SCRIMMAGE', teaches: 'All of it together', coach: 'One drive. Score, and you\'re my quarterback.',
    steps: [{ text: 'One drive from your 30', chips: ['b1'] }, { text: 'Score a touchdown', chips: ['move'] }] }
];
FF.data.drillById = Object.fromEntries(FF.data.drills.map(d => [d.id, d]));
})();
