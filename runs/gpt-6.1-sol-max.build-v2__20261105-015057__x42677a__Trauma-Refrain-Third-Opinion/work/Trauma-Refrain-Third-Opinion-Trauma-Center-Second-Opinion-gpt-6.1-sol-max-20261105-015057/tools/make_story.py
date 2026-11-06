import json
from pathlib import Path
before=[
('corridor','Mara','Bashir','''Bashir|The storm has moved the harbour indoors. Every stretcher smells of salt.
Mara|Where is Doctor Vale?
Bashir|Elbow-deep in a bus driver. This one is yours, Doctor.
Mara|Anton Deverell. Fifty-six. Fishing hooks and cable fragments in the forearm.
Bashir|He repairs the nets that bring this city its breakfast.
Mara|He asked whether he would lose his hand.
Bashir|What did you tell him?
Mara|That I would do everything I could.
Bashir|Then let us make that a considerable amount.
Teddy|His pressure is holding. Mine is doing something less professional.
Mara|My father tuned pianos. He said shaking hands could still find the right note.
Bashir|Your father was right. Forceps, Doctor.'''),
('gallery','Mara','Voss','''Voss|Doctor Quill. I have cleared my schedule to observe a routine appendectomy.
Mara|I did not know routine cases required an audience.
Voss|They require an absence of excuses. An audience helps.
Mara|Rosalind Pike. Harbour pilot. Acute appendicitis.
Voss|A pilot knows that a channel is never the same river twice.
Mara|Neither is an abdomen.
Voss|Good. You have read something besides your chart.
Teddy|She says the ferry is double-parked. Is that a medical emergency?
Bashir|Everything outside these doors can wait.
Mara|She brings people home through the fog.
Voss|Then bring her home through this.
Mara|Scalpel.'''),
('corridor','Mara','Teddy','''Teddy|The grain terminal. The whole east wall. There are people in the corridor I cannot count.
Mara|Then count one. The one on this table.
Teddy|Ivo Senn. Foreman. He went back for the youngest loader.
Bashir|And brought him out. That loader is in recovery.
Mara|Tell him when he wakes.
Teddy|The shrapnel is close to the pulmonary artery. I can see the pressure falling.
Mara|I can hear something else falling.
Bashir|Doctor?
Mara|Nothing. The monitor is sharp. Half a note sharp.
Teddy|It is a monitor, Mara. They do not have notes.
Mara|Tonight everything has a note.
Bashir|Then keep this one sounding.'''),
('gala','Mara','Vane','''Vane|Doctor Quill. Your chief says you have a remarkable ear.
Mara|She usually says I have a remarkable capacity to disappoint her.
Vane|Ottoline mistakes affection for an administrative defect.
Mara|The new wing is beautiful, Ms Vane.
Vane|Beauty is a promise. I prefer to fund promises that can be kept.
Bashir|Doctor. Theatre three is ready. The courier with the liver mass.
Vane|Elian Firth. He delivered our invitations in that dreadful rain.
Mara|You remember his name.
Vane|A city is only the people who carry it. Please take good care of him.
Mara|I intend to.
Vane|I know. That is why I wanted to meet you.
Bashir|Come, Doctor. The music upstairs can manage without us.'''),
('ward','Mara','Voss','''Voss|This lift has no button for the floor we are going to.
Mara|Then how do you call it?
Voss|With a debt. Mine is eleven years old.
Bashir|Welcome to the Night Ward, Doctor.
Mara|There are beds down here. People. How many?
Voss|Enough to require your hands and too many to permit your fear.
Mara|What was inside Elian?
Voss|Recombinant Enzymatic Quiescent Immuno-Evasive Microfilaria. R.E.Q.U.I.E.M.
Mara|That is a name someone chose.
Voss|Yes. The only organism engineered to keep time.
Mara|For what?
Voss|Rosalind Pike is back. Ask her lungs.'''),
('depot','Pet','Voss','''Pet|If you have come for an apology, the machine dispenses tea. It is equally bitter.
Voss|There is a resident at Mercy Harbor. She hears the rhythm.
Pet|Then buy her a piano.
Voss|She saved five people and collapsed before she could remove her gloves.
Pet|You always did know how to spend someone else.
Voss|Solomon Eke is on the table. Shattered femur. Something growing in the marrow.
Pet|I signed my retirement papers, Ottoline. You witnessed them.
Voss|And I have kept a clean pair of scrubs in your locker for nine years.
Pet|My right hand shakes.
Voss|Your left still terrifies everyone who has ever assisted you.
Pet|I have buried better surgeons than that resident, and liked them less.
Voss|Is that a yes, Perpetua?'''),
('scrub','Pet','Voss','''Pet|You have not stopped touching your sternum since I arrived.
Voss|A tiresome habit. Put it in my annual review.
Pet|How long?
Voss|Eleven years. I thought if I carried the first sample, I could keep it contained.
Pet|You helped build it.
Voss|We were going to put damaged hearts to sleep until we could mend them.
Pet|And someone taught the sleep to spread.
Voss|Someone paid. I let myself believe payment was the same thing as purpose.
Pet|You will name them when you wake.
Voss|If I die on your table, Perpetua, you will have to fill out the form.
Pet|I have been looking forward to it.
Bashir|Chief Voss has no pulse. Theatre one. Now.'''),
('ward','Mara','Pet','''Teddy|Bashir opened the flowers. One breath. That was all.
Mara|Where is he?
Pet|On your table. His heart is conducting all four movements.
Mara|He told me to count one patient. Just one.
Teddy|There is no scrub nurse. I can manage the monitor. I can try the instruments.
Mara|Scalpel.
Teddy|Right. Yes. The sharp one with the quiet handle.
Pet|Look at me, Mara. We cannot outplay it alone.
Mara|My hands have stopped shaking.
Pet|That is because they know whose life they are holding.
Mara|Bashir. If you can hear me, keep counting.
Pet|We will play the space between.''')]
after=[
('recovery','Mara','Bashir','''Bashir|Your hands were steady.
Mara|They were not. I was counting his heartbeats.
Bashir|That is one way to make them steady.
Mara|Will he mend nets again?
Bashir|He will complain about the stitches for a month. That is usually a good sign.
Teddy|He asked for his hooks back. I have recommended a different hobby.
Mara|One patient.
Bashir|And the night is young, Doctor.'''),
('gallery','Mara','Voss','''Voss|Adequate.
Mara|The artery ruptured. I controlled the bleed in twelve seconds.
Voss|I was watching, Doctor Quill.
Mara|She will live.
Voss|In my hospital, adequate is a kind of malpractice. Tonight I mean it as praise.
Bashir|Chief. The harbour sirens.
Voss|The grain terminal. Clear every theatre.
Mara|I am already scrubbed.'''),
('corridor','Mara','Bashir','''Bashir|You said now before the monitor changed.
Mara|I was lucky.
Bashir|Luck does not usually arrive precisely half a beat early.
Mara|Are you going to ask me how?
Bashir|No.
Mara|Thank you.
Bashir|But if you hear it again, Doctor, I would appreciate the warning.
Mara|So would I.'''),
('ward','Mara','Voss','''Voss|You will wash your hands.
Mara|What was that thing?
Voss|You will sign nothing. You will tell no one what you did not see in this room.
Teddy|The ECG was a waltz. There must be a form for that.
Voss|There is a lift below the morgue. Bashir has a key.
Mara|And if I refuse?
Voss|Then tomorrow you will hear that rhythm in another patient and have no name for it.
Mara|Give me the key.'''),
('ward','Mara','Voss','''Mara|She is breathing. Listen. There is no harmony underneath it.
Bashir|Doctor Quill, your fingers.
Mara|They will not open.
Teddy|Exhaustion. Or something exhaustion has never met before.
Mara|There are still patients. I can hear them through the walls.
Voss|You have done enough for one pair of hands.
Mara|I have not done enough for one city.
Voss|Then we need a second opinion.'''),
('scrub','Pet','Voss','''Bashir|Doctor Nwosu. For a moment there were two of you.
Pet|There were always two of me, young man. One of them retired.
Voss|You were magnificent.
Pet|Do not become sentimental. It makes your face look unfamiliar.
Voss|Perpetua, there is something I should have told you before you came back.
Pet|Ottoline?
Teddy|Her knees. Catch her!
Pet|No more secrets. Put her on the table.'''),
('recovery','Pet','Voss','''Voss|The Foundation. Cordelia Vane paid for the lab.
Pet|You knew she was turning a treatment into a weapon.
Voss|I knew too late. Then I made a career of believing late was the same as never.
Pet|You are alive. Start there.
Teddy|Someone has sent flowers to the operating staff.
Voss|Who signed the card?
Teddy|The Vane Foundation. Bashir has them.
Pet|Do not let him touch them.'''),
('recovery','Mara','Bashir','''Mara|You are in recovery. The surgery is over.
Bashir|How was the field?
Mara|Terrible. Your substitute scrub nurse nearly passed out.
Teddy|An exaggerated account. I sat down with unusual commitment.
Pet|The night is over, Bashir.
Bashir|And your hands, Doctor?
Mara|Still counting.
Bashir|Clean, Doctor.''')]
epilogue=('ship','Vane','','''Vane|Yes. I am already beyond the harbour lights.
Vane|No, leave the hospital alone. They have earned a little sleep.
Vane|A promising first movement.
Vane|Have them tune the orchestra.''')
def scene(v):
 st,left,right,lines=v
 out=[]
 for i,line in enumerate(lines.splitlines()):
  who,text=line.split('|',1)
  expr='alarmed' if any(w in text.lower() for w in ['no pulse','catch','moved','knees']) else 'stern' if who in ['Voss','Pet'] else 'soft' if any(w in text.lower() for w in ['thank','steady','alive','clean']) else 'neutral'
  out.append(dict(who=who,text=text,expr=expr,left=who if who not in [left,right] else left,right=right if who in [left,right] else left,set=st))
 return out
out={'before':[scene(v) for v in before],'after':[scene(v) for v in after],'epilogue':scene(epilogue)}
p=Path(__file__).resolve().parents[1]/'web/story.json';p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(sum(len(s) for k in ['before','after'] for s in out[k])+len(out['epilogue']))
