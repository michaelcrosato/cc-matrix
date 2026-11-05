/* ---- MATCH RULES AND SCORING (the arcade cut of the laws). applyBall(inn, rec) is a pure update of an innings from one
 * ball's record; every record is kept for the scorecard, the highlights and the Wisden-style report. ----
 * An over is 6 legal balls; wides and no-balls add 1 run and are re-bowled; a FREE HIT follows a no-ball (only run out
 * dismisses); the strike changes on odd runs run and at each over's end; an innings ends at its overs, its wickets or
 * (second innings) when the target is passed. A tie goes to a Super Over (1 over, 2 wickets each; boundaries break a
 * second tie). The Kerfuffle Method revises a rain-cut target from resources R(o, w) = (o / O)(1 - .07 w): the chasing
 * side's share is 1 - R(before) + R(after) of the first innings' runs. */
const Rules = {
  newInnings(batTeam, bowlTeam, o) {
    return { bat: batTeam, bowl: bowlTeam, runs: 0, wkts: 0, balls: 0, overs: o.overs, wicketsMax: o.wickets, target: o.target || null, extras: { wd: 0, nb: 0, b: 0, lb: 0 }, bonus: 0,
      cards: {}, bowlCards: {}, recs: [], striker: null, nonStriker: null, order: o.order.slice(), next: 2, freeHit: false, over: [], fours: 0, sixes: 0, partnership: 0, done: false, end: null, superOver: !!o.superOver };
  },
  card(inn, id) { return inn.cards[id] || (inn.cards[id] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: null }); },
  bcard(inn, id) { return inn.bowlCards[id] || (inn.bowlCards[id] = { balls: 0, runs: 0, wkts: 0, maidens: 0, overRuns: 0 }); },
  /** rec: { bowler, striker, nonStriker, runs (by the bat, a boundary's 4 or 6 included), ran (runs run), boundary,
   *  extras { wd, nb, b, lb }, wicket: null | { how, batter, fielder }, bonus, double (Golden Teapot) } */
  applyBall(inn, rec) {
    const ex = Object.assign({ wd: 0, nb: 0, b: 0, lb: 0 }, rec.extras || {});
    const legal = !ex.wd && !ex.nb;
    let batRuns = rec.runs || 0;
    if (rec.double && batRuns > 0) { rec.doubled = batRuns; batRuns *= 2; }
    const extraRuns = ex.wd + ex.nb + ex.b + ex.lb, bonus = rec.bonus || 0, total = batRuns + extraRuns + bonus;
    inn.runs += total; inn.bonus += bonus; inn.partnership += total;
    for (const k in ex) inn.extras[k] += ex[k];
    const sc = Rules.card(inn, rec.striker), bc = Rules.bcard(inn, rec.bowler);
    if (!ex.wd) sc.balls++;
    sc.runs += batRuns;
    if (rec.boundary === 4) { sc.fours++; inn.fours++; } if (rec.boundary === 6) { sc.sixes++; inn.sixes++; }
    bc.runs += batRuns + ex.wd + ex.nb; bc.overRuns += batRuns + ex.wd + ex.nb;
    if (legal) { bc.balls++; inn.balls++; }
    rec.legal = legal; rec.total = total; rec.freeHit = inn.freeHit;
    let wicket = rec.wicket;
    if (wicket && inn.freeHit && wicket.how !== 'run out') { rec.freeHitSaved = wicket.how; wicket = rec.wicket = null; }
    if (wicket) {
      inn.wkts++; inn.partnership = 0;
      Rules.card(inn, wicket.batter).out = wicket.how + (wicket.fielder ? ' (' + wicket.fielder + ')' : '');
      if (wicket.how !== 'run out' && wicket.how !== 'retired') bc.wkts++;
    }
    inn.freeHit = !!ex.nb;
    inn.over.push(rec.wicket ? 'W' : ex.wd ? 'wd' : ex.nb ? 'nb' : rec.boundary ? String(rec.boundary) : String(batRuns + ex.b + ex.lb || '•'));
    inn.recs.push(rec);
    // the ends: odd runs run swap them; a wicket's new batter takes the end the dismissed batter was at (or making for)
    let s = inn.striker, n = inn.nonStriker;
    if ((rec.ran || 0) % 2 === 1) { const t = s; s = n; n = t; }
    if (rec.wicket) {
      const out = rec.wicket.batter, survivor = out === rec.striker ? rec.nonStriker : rec.striker;
      const outEnd = rec.wicket.end || (s === out ? 'striker' : 'bowler');
      const nb = inn.wkts < inn.wicketsMax && inn.next < inn.order.length ? inn.order[inn.next++] : null;
      if (outEnd === 'striker') { s = nb; n = survivor; } else { n = nb; s = survivor; }
      rec.newBatter = nb;
    }
    inn.striker = s; inn.nonStriker = n;
    if (s) Rules.card(inn, s); if (n) Rules.card(inn, n);
    // over end: a maiden, the strike swaps
    rec.overEnd = false;
    if (legal && inn.balls % 6 === 0 && inn.balls > 0) {
      if (bc.overRuns === 0) { bc.maidens++; rec.maiden = true; }
      bc.overRuns = 0; rec.overEnd = true; inn.lastOver = inn.over; inn.over = [];
      const t = inn.striker; inn.striker = inn.nonStriker; inn.nonStriker = t;
    }
    // innings end
    if (inn.target !== null && inn.runs >= inn.target) { inn.done = true; inn.end = 'target'; }
    else if (inn.wkts >= inn.wicketsMax || !inn.striker || !inn.nonStriker) { inn.done = true; inn.end = 'allout'; }
    else if (inn.balls >= inn.overs * 6) { inn.done = true; inn.end = 'overs'; }
    return rec;
  },
  oversText(balls) { return Math.floor(balls / 6) + '.' + (balls % 6); },
  /** the result of a two-innings match: { winner (team id) | null, text, tie } */
  result(i1, i2, names) {
    // a revised target (the Kerfuffle Method) decides the match: the par score is the target less one
    const par = i2.target !== null && i2.target !== undefined ? i2.target - 1 : i1.runs;
    if (i2.runs > par) { const w = i2.wicketsMax - i2.wkts, left = i2.overs * 6 - i2.balls; return { winner: i2.bat, loser: i1.bat, text: names[i2.bat] + ' won by ' + w + ' wicket' + (w === 1 ? '' : 's') + (left > 0 ? ' (' + left + ' ball' + (left === 1 ? '' : 's') + ' to spare)' : ''), margin: { wkts: w, balls: left } }; }
    if (par > i2.runs) { const r = par - i2.runs; return { winner: i1.bat, loser: i2.bat, text: names[i1.bat] + ' won by ' + r + ' run' + (r === 1 ? '' : 's') + (i2.revised ? ' (Kerfuffle Method)' : ''), margin: { runs: r } }; }
    return { winner: null, tie: true, text: 'Match tied' };
  },
  /** a Super Over's result after two one-over innings: more runs, then more boundaries */
  superResult(s1, s2, names) {
    if (s1.runs !== s2.runs) { const w = s1.runs > s2.runs ? s1 : s2, l = w === s1 ? s2 : s1; return { winner: w.bat, loser: l.bat, text: names[w.bat] + ' won the Super Over', superOver: true }; }
    const b1 = s1.fours + s1.sixes, b2 = s2.fours + s2.sixes;
    if (b1 !== b2) { const w = b1 > b2 ? s1 : s2, l = w === s1 ? s2 : s1; return { winner: w.bat, loser: l.bat, text: names[w.bat] + ' won the Super Over on boundaries', superOver: true }; }
    return { winner: s2.bat, loser: s1.bat, text: names[s2.bat] + ' won the Super Over (chasing side, by the Kerfuffle convention)', superOver: true };
  },
  /** the Kerfuffle Method: a revised target when rain cuts the second innings from O to O2 overs at w wickets with o overs left before */
  kerfuffleMethod(firstRuns, O, oLeftBefore, oLeftAfter, w, current) {
    const R = o => (o / O) * (1 - .07 * w), res = 1 - R(oLeftBefore) + R(oLeftAfter);
    return { target: Math.max(current + 1, Math.floor(firstRuns * res) + 1), res, rb: R(oLeftBefore), ra: R(oLeftAfter) };
  }
};
K.Rules = Rules;
