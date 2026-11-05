#!/bin/bash
# screenshots of the flow screens (visual QA)
cd "$(dirname "$0")/.."; export TMPDIR=$PWD/.tmp
M="OLY.newMeet('games',[{p:0,nat:'SUN'}],OLY.SCHEDULE,{qual:true})"
RES="(()=>{const m=$M;const ev=OLY.EV.sprint;const rows=OLY.resolve(m,ev,{0:{v:10.2}},false);OLY.award(m,ev,rows);return {ev:'sprint',rows,recs:[]};})()"
shot() { node tools/shots.mjs "index.html#scene/$1" .tmp/sc-$2 "wait:1200,eval:$3,wait:${4:-1500},shot:a" | grep -v ^eval; }
shot nations nations "0"
shot menu setup "OLY.go('gamesSetup',{},{fade:0})"
shot menu daycard "($M, OLY.go('daycard',{ev:'skijump'},{fade:0}))" 2200
shot menu eventcard "($M, OLY.go('eventcard',{ev:'swim'},{fade:0}))"
shot menu results "(()=>{const d=$RES;OLY.go('results',d,{fade:0});})()" 2500
shot menu podium "(()=>{const d=$RES;OLY.go('podium',d,{fade:0});})()" 4500
shot menu medals "(()=>{const d=$RES;OLY.go('medals',d,{fade:0});})()" 2500
shot menu torch "($M, OLY.go('torch',{ev:'sprint',failed:[0],out:false},{fade:0}))" 2500
shot menu records "OLY.go('records',{},{fade:0})"
shot menu howto "OLY.go('howto',{},{fade:0})"
shot menu about "OLY.go('about',{},{fade:0})"
shot menu single "($M, OLY.go('single',{},{fade:0}))"
shot menu opening "($M, OLY.go('opening',{},{fade:0}))" 7000
shot menu closing "($M, OLY.go('closing',{},{fade:0}))" 3000
