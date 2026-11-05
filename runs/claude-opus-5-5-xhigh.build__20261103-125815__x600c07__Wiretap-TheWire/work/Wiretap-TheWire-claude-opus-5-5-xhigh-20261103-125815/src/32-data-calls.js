/* 32-data-calls: the wire calls (App. D) as data: { session, t, line (or a list: the first live one), type N | P | T,
   turnAt, lines: [[speaker, text]], keys: [key line indices], unlock(W) (when a key line was logged), after(W), if() }. */
const C = (id, o) => def('calls', id, o);
const heardKey = c => (c.keys || []).some(k => k < c.li && !(c.min && k >= (c.minFrom || 0)));
const unlockMsg = (W, t) => { (W.unlocked = W.unlocked || []).push(t); Toast('Intel', t); };
// ---- Session 1 (Ep3, 16:00-23:00) ----
C('S1-1', { session: 's1', t: '16:05', line: 'P2', type: 'N', over: 'That\'s a boy and his grandmother, Detective.', lines: [['pigeon', 'Hey Grandma. I\'m at the library.'], ['odessa', 'Library closes at five on Tuesdays, Junior.'], ['pigeon', 'It\'s the study room. They got a study room now.'], ['odessa', 'Mm-hm. You eat?'], ['pigeon', 'I ate. I\'ll be home by the streetlights.'], ['odessa', 'You be home before them.']] });
C('S1-2', { session: 's1', t: '16:40', line: 'P1', type: 'T', turnAt: 3, keys: [3], lines: [['tee', 'You see the game?'], ['tavon', 'They ain\'t got no bullpen. None.'], ['tee', 'They got a bullpen. Bullpen just tired.'], ['tee', 'Tell your man the thing go down at the place where Dre messed up his ankle. Four o\'clock.'], ['tavon', 'Where Dre... oh. Yeah.'], ['tee', 'Don\'t "yeah" me. Be there.']],
  after: W => { const c = W.calls.find(x => x.id === 'S1-2'); if (!heardKey(c)) return; W.riddle = true; Talk.play([['hal', 'Where Dre messed up his ankle. Somebody told you about Dre, didn\'t they?']], () => riddle(W)); } });
C('S1-3', { session: 's1', t: '17:10', type: 'page', page: 'l1' });
C('S1-4', { session: 's1', t: '17:25', line: ['P3', 'P2'], type: 'P', keys: [3, 4], lines: [['dale', 'Usual?'], ['tee', 'Usual. But your count been light, my man.'], ['dale', 'Count is the count. I don\'t open the boxes.'], ['tee', 'Somebody opening them.'], ['dale', 'Four o\'clock. Don\'t make me wait, I got a route.']],
  unlock: W => { addFact('route:truck'); unlockMsg(W, 'The courier drives a route: a delivery truck.'); } });
C('S1-5', { session: 's1', t: '18:00', line: 'P2', type: 'N', lines: [['arnetta', 'I need a cab at Ridley and Gaither, the laundromat.'], ['cab', 'Forty minutes, ma\'am.'], ['arnetta', 'No, I am not waiting forty minutes. I have ice cream in this bag.'], ['cab', 'Forty minutes.']] });
C('S1-6', { session: 's1', t: '18:30', line: 'P1', type: 'N', lines: [['rook', 'I said I\'ma bring it.'], ['keisha', 'You said that Friday. He need shoes, Ricky. His toes out the front.'], ['rook', 'I got him. Tonight.']], after: () => addFact('rook:father', true) });
C('S1-7', { session: 's1', t: '19:05', line: 'P1', type: 'P', keys: [0], if: () => STATE.stats.made > 0, lines: [['tee', 'That lady on the bench Tuesday, leather coat?'], ['moe', 'She was reading the paper.'], ['tee', 'Nobody reads the paper on Ridley.']], unlock: W => { F().danaKnown = true; unlockMsg(W, 'They know your face. Heat note.'); } });
C('S1-7b', { session: 's1', t: '19:05', line: 'P1', type: 'P', keys: [0], if: () => STATE.stats.made === 0, lines: [['tee', 'Knockers came through twice. Nothing in the pockets, nothing on the corner.'], ['moe', 'We tight, Tee.'], ['tee', 'Stay tight.']], unlock: W => unlockMsg(W, 'Crew discipline: they keep the corner clean.') });
C('S1-8', { session: 's1', t: '19:40', line: ['P3', 'P2'], type: 'N', lines: [['mayfield', 'Sister Pauline, about the folding chairs for Sunday.'], ['pauline', 'Reverend, the folding chairs are in the basement where they always are.'], ['mayfield', 'The basement is flooded, Sister.'], ['pauline', 'Lord.']] });
C('S1-9', { session: 's1', t: '20:30', line: 'P2', type: 'P', keys: [1], lines: [['tavon', 'How we looking.'], ['dink', 'Light. Like nine hundred light.'], ['tavon', 'Nine hundred?'], ['dink', 'Testers was weak. Overtime ain\'t moving like last week.'], ['tavon', 'Don\'t tell Tee. I\'ll tell Tee.']], unlock: W => unlockMsg(W, 'The money flows through Dink.') });
C('S1-10', { session: 's1', t: '21:15', type: 'page', page: 'l2' });
C('S1-OT', { session: 's1', t: '22:10', line: 'P1', type: 'P', keys: [1], if: () => F().ops1 === 'ot', lines: [['tavon', 'Tee want it tight tonight. Extra man up on Harlow.'], ['dink', 'Package came in light, so we cutting the testers.'], ['tavon', 'Cut \'em. Ain\'t nobody gonna complain.']], unlock: W => unlockMsg(W, 'How they handle the product (overtime call).') });
// ---- Session 2 (Ep3 night, 20:00-01:00) ----
C('S2-1', { session: 's2', t: '20:10', line: ['P2', 'P1'], type: 'P', keys: [2, 4], lines: [['tee', 'Man took it right off the boy. Walked up like he was asking directions.'], ['rook', 'In a hearse? A hearse?'], ['tee', 'Hit me at the laundry later. Not this phone.'], ['rook', 'It\'s Sunday. Gotta be.'], ['tee', 'Don\'t say names on the phone.']],
  unlock: W => { addFact('name:sunday'); unlockMsg(W, 'The stick-up man is called Sunday.'); } });
C('S2-2', { session: 's2', t: '20:45', line: ['P3', 'P2'], type: 'P', keys: [0, 2], lines: [['rook', 'I need a hammer. Tonight.'], ['smokey', 'What kind of hammer?'], ['rook', 'The kind that finishes a job.'], ['smokey', 'Come by the shop at eleven. Cash.']],
  after: W => threat(W) });
C('S2-3', { session: 's2', t: '21:20', line: 'P2', type: 'N', lines: [['odessa', 'Hello? Is this the laundromat phone? Is my grandson out there? Junior Hollis. Little red hoodie.'], ['man1', 'Ain\'t nobody here, ma\'am.'], ['odessa', 'If you see him, you tell him his grandmother is waiting up.']] });
C('S2-4', { session: 's2', t: '21:50', type: 'page', page: 'flip' });
C('S2-5', { session: 's2', t: '22:30', line: ['P1', 'P2'], type: 'P', keys: [2], lines: [['lonnie', 'He wants to see you.'], ['tee', 'Tonight?'], ['lonnie', 'You know where. Mama B\'s. The back.'], ['tee', 'I\'m coming.'], ['lonnie', 'And Terrence. Come by yourself.']],
  unlock: W => { addFact('boss:?'); addFact('place:mamab'); unlockMsg(W, 'Somebody above Tee. The money tier: Boss ?, Mama B\'s.'); } });
C('S2-6', { session: 's2', t: '23:10', line: 'P2', type: 'N', lines: [['girl1', 'Marcus said that? Marcus said that about me?'], ['girl2', 'I\'m just telling you what Keyonna told me.'], ['girl1', 'And where is my jacket, Tasha. The white one.'], ['girl2', 'Why you always gotta bring up the jacket.']] });
C('S2-7', { session: 's2', t: '23:50', line: ['P3', 'P2'], type: 'P', keys: [2], lines: [['tavon', 'Tee say we gotta be easy for a minute. No more phones on Ridley after Friday.'], ['man2', 'Then what we using?'], ['tavon', 'He gonna get us something. Throwaways.']], unlock: W => { addFact('throwaways'); unlockMsg(W, 'After Friday: throwaway phones.'); } });
C('S2-8', { session: 's2', t: '00:30', line: ['P1', 'P2'], type: 'N', lines: [['drunk', 'I\'m not calling about you. I\'m calling about Biscuit.'], ['ex', 'It\'s twelve thirty, Lyle.'], ['drunk', 'Does he still sleep on the radiator? He used to sleep on the radiator.'], ['ex', '...He sleeps on the radiator.'], ['drunk', 'Okay. Okay. That\'s all.']] });
C('S2-OT', { session: 's2', t: '00:50', line: 'P2', type: 'P', keys: [1], if: () => F().ops1 === 'ot', lines: [['dink', 'Tee got scared of phones. Say after Friday nobody talk on these no more.'], ['tavon', 'Then how I\'m supposed to reach the stash?'], ['dink', 'He say he got a plan. Everybody getting a new number.']], unlock: W => unlockMsg(W, 'The burner switch, confirmed (overtime call).') });
// ---- Session 3 (Ep4, the burners, 22:00-01:00) ----
C('S3-1', { session: 's3', t: '22:05', line: 'B2', type: 'P', keys: [0], lines: [['lonnie', 'Thursday. After close. Same as always.'], ['tee', 'Same as always.'], ['lonnie', 'He says bring it counted this time. Counted twice.']], unlock: W => { addFact('count:thursday'); unlockMsg(W, 'The count: Thursdays after close.'); } });
C('S3-2', { session: 's3', t: '22:30', line: 'B3', type: 'N', lines: [['tavon', 'Your cousin still doing the cookout Saturday?'], ['teen', 'If it don\'t rain. He bought forty pounds of chicken.'], ['tavon', 'Forty pounds?'], ['teen', 'He don\'t do nothing small.']] });
C('S3-3', { session: 's3', t: '23:00', line: 'B4', type: 'P', keys: [1, 3], lines: [['dale', 'Friday, the truck, nine o\'clock.'], ['tee', 'Not the gas station. The new place.'], ['dale', 'Which new place?'], ['tee', 'The garage behind the Courts. Pull in off Harlow.']], unlock: W => { addFact('garage:friday'); unlockMsg(W, 'Friday, nine: the garage behind the Courts.'); } });
C('S3-4', { session: 's3', t: '23:25', line: 'B5', type: 'N', over: 'That\'s a fourteen-year-old and his grandmother. Minimize.', lines: [['pigeon', 'Grandma? I\'m okay. I\'m at Tavon\'s.'], ['odessa', 'It\'s near midnight, Junior.'], ['pigeon', 'I know.'], ['pigeon', 'I don\'t wanna do this no more.'], ['odessa', 'Then come home, baby.']] });
C('S3-5', { session: 's3', t: '23:50', line: 'B1', type: 'P', keys: [0], lines: [['tee', 'That detective. Whitlock. She grew up on Ridley. Her mother still stays over by the church.'], ['lonnie', 'He ain\'t gonna like you saying that on a phone. Or at all.']], after: W => mother(W) });
C('S3-6', { session: 's3', t: '00:20', line: 'B2', type: 'P', keys: [0], if: () => STATE.meters.heat >= 70, lines: [['lonnie', 'Count\'s moving to Saturday. He\'s feeling something.'], ['tee', 'Saturday.']], unlock: W => unlockMsg(W, 'The count moved to Saturday: they feel the heat.') });

/* ---- decisions inside a shift ---- */
function riddle(W) {
  Notebook.open('map', { mustPick: true, pickPlace: id => {
    if (id === 'gas') { addFact('reup:gas'); F().reupSpot = 'gas'; casePoint('obs', 'Re-up spot: Arundel Gas'); unlockMsg(W, 'The re-up: Arundel Gas, four o\'clock.'); Talk.radio('hal', 'The old gas station. Pockets earns his twenty.', 3); }
    else { Talk.radio('hal', 'Not there. Think about where Dre broke his ankle.', 3); game.after(.4, () => riddle(W)); }
  } });
}
function threat(W) {
  Talk.play([['hal', 'A hammer. That\'s a gun, and that\'s a threat to life. We have to do something with it.'], { who: 'lou', text: 'Wall him off: a patrol stops his car for a taillight, finds the gun, the wire never comes up. Or we let it ride and keep our ears.', choices: [
    { label: 'Wall-off stop (Rook arrested, Brass +15, Heat +5)', do: () => { F().wallOff = true; F().rookFree = false; Meters.stat('brass', 15, 'Rook Batts, gun charge, taillight stop'); Meters.add('heat', 5, 'The corner lost its muscle'); unlockMsg(W, 'Patrol stopped Rook\'s Monte Carlo. A gun under the seat.'); } },
    { label: 'Let it ride', do: () => { F().wallOff = false; F().rookFree = true; unlockMsg(W, 'Rook goes shopping. You keep listening.'); } }] }]);
}
function mother(W) {
  Talk.play([{ who: 'hal', text: 'He said your mother\'s name, Dana. Go call her. I\'ve got the line.', choices: [
    { label: 'Call your mother', do: () => { F().momSafe = true; return [['gloria', 'Dana? It\'s midnight.'], ['dana', 'Mama, go to Aunt Ruth\'s for a while. Tomorrow. Don\'t argue with me.'], ['gloria', '...All right, baby. All right.']]; } },
    { label: 'Stay on the wire', do: () => { F().momSafe = false; return [['dana', 'Later. Stay on it.']]; } }] }]);
}
/* ---- the three shifts ---- */
const WIRE_SESSIONS = {
  s1: { from: '16:00', to: '23:00', intro: [['hal', 'Tuesday, four o\'clock. Coffee\'s bad and the line\'s live. Let\'s go to work.']],
    wrap: W => { if (!hasFact('reup:gas')) { addFact('reup:gas'); F().reupSpot = 'gas'; Meters.add('fund', -20, 'Twenty to Pockets at the bus stop'); unlockMsg(W, 'You missed it on the wire. Pockets, for twenty: "The old gas station. Same as always."'); } } },
  s2: { from: '20:00', to: '01:00', intro: [['hal', 'Night shift. They talk more at night. People think dark is private.']],
    wrap: W => { if (!hasFact('place:mamab')) { addFact('place:mamab'); addFact('boss:?'); unlockMsg(W, 'Ren followed Tee\'s car to Mama B\'s back door. Somebody above him.'); } if (!hasFact('flip:solved')) { addFact('flip:solved'); unlockMsg(W, 'Hal worked out the new code overnight: the pad turns the other way now.'); } if (F().wallOff === null || F().wallOff === undefined) F().wallOff = false; } },
  s3: { from: '22:00', to: '01:00', intro: [['hal', 'Five throwaways. Same rules, the judge says. Same rules.']],
    wrap: W => { if (!hasFact('count:thursday')) { addFact('count:thursday'); unlockMsg(W, 'Missed on the wire; Pigeon\'s grandmother mentions Thursdays at church. The count.'); } if (!hasFact('garage:friday')) { addFact('garage:friday'); unlockMsg(W, 'Ren clocked the Harstad truck idling behind the Courts. Friday.'); } } }
};
