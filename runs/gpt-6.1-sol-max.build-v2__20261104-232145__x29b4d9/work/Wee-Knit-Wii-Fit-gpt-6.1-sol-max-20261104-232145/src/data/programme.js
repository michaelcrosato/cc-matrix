export const DAYS=[
 {name:'Arrival',tests:['stand','match','step'],events:['poses','fruit']},
 {name:'The second day, which is harder',tests:['stand','match','quick'],events:['log','step','cairn']},
 {name:'Service with a wobble',tests:['foot','match','step'],events:['service','plates','plank']},
 {name:'A little damp',tests:['quick','foot','stand'],events:['spring','water','loop']},
 {name:'Level Day',tests:['stand','match','step'],events:['raft','tug','grand']}
];
export const TOTAL_STEPS=DAYS.reduce((n,d)=>n+d.events.length+1,0);
export const age=(mean,day)=>Math.max(18,Math.min(99,Math.round(18+81*Math.pow(1-Math.max(0,Math.min(1,mean)),1.3)+([24,16,8,3][day-1]||0))));
export const medal=form=>form>=97?'Suspicious':form>=85?'Exemplary':form>=65?'Pleasant':form>=40?'Adequate':'Attended';
export function payout(seconds,form,first,rate=2){return Math.max(2,Math.floor(seconds/60*rate))+([1,2,3,5][Math.max(0,['Adequate','Pleasant','Exemplary','Suspicious'].indexOf(medal(form)))])+ (first?2:0);}
export function nextTier(best){return (best[1]||0)>=85?3:(best[0]||0)>=65?2:1;}
export const restTilt=steps=>9*Math.max(0,1-steps/TOTAL_STEPS);
