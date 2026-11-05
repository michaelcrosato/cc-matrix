/* 21-rules: the referee. Rally scoring to pointsToWin, win by 2, a hard cap at pointsToWin + 4; best of 1 or 3 sets;
 * at most three touches a side (a block counts, as on the beach), no player twice in a row (except straight after her
 * own block); faults; serve rotation (on a side-out the receiving team serves, with the player who didn't serve last for
 * it); and the stats each player and match keep. */
G.CALLS = {
  in: ['IN!', 'ball'], out: ['OUT!', 'ball'], net: ['NET!', 'ball'], four: ['4 TOUCHES', 'ball'], double: ['DOUBLE TOUCH', 'ball'], antenna: ['ANTENNA', 'ball'],
  ace: ['ACE!', 'star'], kill: ['KILL!', 'star'], block: ['BLOCK!', 'star'], nettouch: ['NET TOUCH', 'ball'], servefault: ['SERVE FAULT', 'ball'], under: ['UNDER THE NET', 'ball']
};
G.Rules = class Rules {
  constructor(o = {}) {
    this.toWin = o.pointsToWin || 7; this.sets = o.sets || 1; this.cap = this.toWin + 4;
    this.score = [0, 0]; this.setsWon = [0, 0]; this.setNo = 1; this.over = false; this.winner = null; this.history = [];
    this.serveSide = o.firstServe === undefined ? 0 : o.firstServe; this.lastServer = [null, null]; this.server = null;
    this.rallies = 0; this.longest = 0;
  }
  /** who serves next on a side: the one who didn't serve last for that side */
  nextServer(side, players) {
    const two = players.filter(p => p.side === side), last = this.lastServer[side];
    const s = !last ? two[0] : two.find(p => p !== last) || two[0];
    this.lastServer[side] = s; this.server = s; return s;
  }
  /** a point to side s: returns { setOver, matchOver, sideOut } */
  point(s, why, rallyTouches) {
    this.score[s]++; this.rallies++; this.longest = Math.max(this.longest, rallyTouches || 0);
    this.history.push({ side: s, why, score: this.score.slice(), set: this.setNo });
    const sideOut = s !== this.serveSide; this.serveSide = s;
    const [a, b] = this.score, lead = Math.abs(a - b), top = Math.max(a, b);
    let setOver = (top >= this.toWin && lead >= 2) || top >= this.cap;
    let matchOver = false;
    if (setOver) {
      this.setsWon[s]++;
      if (this.setsWon[s] > this.sets / 2) { matchOver = true; this.over = true; this.winner = s; }
    }
    return { setOver, matchOver, sideOut };
  }
  nextSet() { this.setNo++; this.score = [0, 0]; this.serveSide = (this.setNo + 1) % 2; }
  /** the side at set point or match point now, or -1 */
  gamePoint() {
    for (const s of [0, 1]) { const me = this.score[s], them = this.score[1 - s]; if ((me + 1 >= this.toWin && me + 1 - them >= 2) || me + 1 >= this.cap) return s; }
    return -1;
  }
  matchPoint() { const s = this.gamePoint(); return s >= 0 && this.setsWon[s] + 1 > this.sets / 2 ? s : -1; }
};
G.newStats = () => ({ serves: 0, aces: 0, serveFaults: 0, digs: 0, perfectPasses: 0, sets: 0, kills: 0, attackErrors: 0, blocks: 0, points: 0, touches: 0, perfects: 0 });
