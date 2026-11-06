(() => {
const G=window.GAME;
const N=(id,stage,lines)=>G.stories[id]={id,stage,lines:lines.map(([who,say,expr='neutral'])=>({who,say,expr}))};
N('pre1','scrub',[
 ['quill','Theatre Three. Night shift. Your patient is Agnes Pellow.'],
 ['vale','My first solo. She fell through her greenhouse?','shock'],
 ['quill','She was fixing the roof. At seventy-four.'],
 ['vale','Of course she was. Are her grandchildren here?'],
 ['quill','Outside, guarding a begonia and a very stern opinion of ladders.'],
 ['vale','Okay. Sorry. I keep saying sorry when I am nervous.'],
 ['quill','Save your breath for the patient, Doctor. Call the tool.'],
 ['vale','Forceps. Let us get every piece.','smile']]);
N('post1','ward',[
 ['vale','She is awake. She asked whether we kept the blue glass.','smile'],
 ['quill','Bagged, labeled, and strictly not for the grandchildren.'],
 ['vale','My hands will not stop shaking.'],
 ['quill','They stop around year thirty, Doctor. I am told.'],
 ['percy','A superficial forearm. Quite a debut.','smile'],
 ['vale','A person, Percy. It was a person.'],
 ['quill','And she is still one. There is tea in the ward.']]);
N('pre2','radiology',[
 ['percy','Desmond Achebe. Abdominal bulge. Hernia. Obviously.','smile'],
 ['odalys','Slide Achebe? He played my parents\' wedding.'],
 ['vale','His band is waiting outside. They brought the mute.'],
 ['percy','They can wait. My chart is clear.'],
 ['odalys','The film is clearer. Look at the bright edge under the ribs.'],
 ['vale','That is not a hernia. There is something inside the mass.'],
 ['percy','You are arguing with a chart?'],
 ['vale','I am listening to a patient. Turn on the lightbox.']]);
N('post2','office',[
 ['quill','One trombone spit-valve cork. I will label it.'],
 ['vale','He says he swallowed it in 1987.','shock'],
 ['odalys','He wondered where it went. For thirty-nine years.'],
 ['oyelaran','A surgeon who argues with a chart. How tiresome.'],
 ['vale','Chief, I can explain the film.'],
 ['oyelaran','Do it again, Doctor. Every time the chart is wrong.'],
 ['quill','Your tea has become a geological sample.'],
 ['vale','Then it can wait a little longer.','smile']]);
N('pre3','harbor',[
 ['odalys','Crane Nine is down. The whole harbor heard it.','shock'],
 ['quill','Tam Rennie. Foreman. He sent his crew home first.'],
 ['vale','Where is the Chief?'],
 ['quill','Across the river. The bridge is closed.'],
 ['vale','Then call another surgeon. Any surgeon.'],
 ['quill','I did, Doctor. You answered.'],
 ['vale','He has a pulse. We have a theatre. We begin.'],
 ['quill','There you are. I wondered when you would arrive.']]);
N('post3','scrub',[
 ['vale','The rain stopped. I could see every drop.','shock'],
 ['quill','How long did it feel, Doctor?'],
 ['vale','A minute. More.'],
 ['quill','Eleven seconds. We do not discuss it in the lift.'],
 ['oyelaran','There is an old word in theatre. The Steady.'],
 ['vale','You knew this could happen?'],
 ['oyelaran','I hoped it would not have to.'],
 ['quill','The foreman is asking whether his crew made it home.']]);
N('pre4','theatre',[
 ['vale','There is a fishing gaff through his side. Why is he whistling?','shock'],
 ['quill','Captain Harrow wants his discharge before high tide.'],
 ['percy','Superficial injury. The patient reports no pain.'],
 ['odalys','Okay, do not panic, but your X-ray is humming.'],
 ['vale','That edge moved. Odalys, play the last frame again.'],
 ['quill','Doctor. You heard it too?'],
 ['vale','Something under the tissue. Singing.'],
 ['odalys','That is going to make a terrible search query.']]);
N('post4','office',[
 ['vale','They jumped. The things inside him jumped.'],
 ['odalys','Not in any database. I checked the embarrassing ones too.'],
 ['oyelaran','Not a word until I have spoken to the Foundation.'],
 ['vale','Their clinic gave him Lull. The new analgesic.'],
 ['oyelaran','I know who pays for this wing, Doctor.'],
 ['quill','And who pays for the old one?'],
 ['oyelaran','That will be all, Bartholomew.'],
 ['vale','He cannot feel his stitches. He cannot feel anything.']]);
N('pre5','chapel',[
 ['vale','Ilse plays the violin. The left hand is her whole life.'],
 ['patient','It stopped hurting. For the first time, I was happy.','smile'],
 ['vale','But you cannot feel the strings.'],
 ['patient','Do you know what it is like to practice until your fingers bleed?'],
 ['quill','Something is moving along the tendons, Doctor.'],
 ['vale','I will protect the nerve. Every millimeter.'],
 ['patient','If it hurts again, will you stay?'],
 ['vale','Yes. I will stay.']]);
N('post5','ward',[
 ['patient','It hurts. Oh, it hurts. Thank you.','sad'],
 ['vale','You can feel your hand?'],
 ['patient','Every terrible finger. Will you bring my violin?'],
 ['odalys','Every patient. Every one of them visited an Anodyne clinic.'],
 ['percy','You have been up for forty hours.'],
 ['vale','That does not make the records disappear.'],
 ['percy','You think pain makes us better?'],
 ['vale','I think it tells us when something is wrong.']]);
N('pre6','gala',[
 ['hale','A life without pain. Not a dream. A duty.','smile'],
 ['oyelaran','Keep smiling, Imogen. He paid for the roof.'],
 ['vale','Chief? Your hand. It is shaking.'],
 ['oyelaran','It always shakes. That is why I take...'],
 ['quill','Marguerite!','shock'],
 ['vale','Her pulse is falling. Clear the table. Call Theatre Three.'],
 ['hale','I have the finest specialists. Let me help.'],
 ['vale','Then get out of the doorway.','angry']]);
N('post6','ward',[
 ['oyelaran','HUSH. Hyperplastic Undifferentiated Synaptic Hive.'],
 ['vale','The disease has a name? You knew?'],
 ['oyelaran','I took the money to keep these doors open. I took Lull for my hands.'],
 ['quill','And now, Doctor?'],
 ['oyelaran','Sokolova. On Samaritan\'s Wake. Find her.'],
 ['quill','Yevgenia?','shock'],
 ['hale','I hear Dr. Oyelaran is recovering. Wonderful.','smile'],
 ['vale','Turn the television off. We are going to sea.']]);
N('pre7','ship',[
 ['sokolova','You are late, Bartholomew.'],
 ['quill','Thirty-one years, Yevgenia.'],
 ['vale','You two know each other?'],
 ['sokolova','Later. The winch has eaten a deckhand.'],
 ['quill','Yusuf Demir. His daughter is seven on Sunday.'],
 ['vale','The ship is rolling too hard. The needle will...'],
 ['sokolova','No. Again.'],
 ['vale','That just un-happened.','shock'],
 ['sokolova','At my age, dear, everything happens twice.']]);
N('post7','ship',[
 ['vale','You can take a moment back. Exactly as it was.'],
 ['sokolova','A second look. Never a second patient. Remember that.'],
 ['quill','She used to make me repeat the tea too.'],
 ['sokolova','You used to oversteep it.'],
 ['vale','The power failed. You did not even stop.'],
 ['sokolova','There are other ways to see. Other things to listen to.'],
 ['quill','The deckhand wants a telephone. And a cake shop.'],
 ['sokolova','Let him have both. We have more work.']]);
N('pre8','chapel',[
 ['patient','Sister Perpetua. I run the hospice by the breakwater.'],
 ['sokolova','I remember your soup. A crime against vegetables.'],
 ['patient','My people had never been happier. Then they began to die.'],
 ['vale','Did they take Lull?'],
 ['patient','I gave it to them myself. They were hurting.'],
 ['quill','Three lobes on the film. Repeating.'],
 ['sokolova','Then we finish the phrase before it starts again.'],
 ['patient','You would give them back their pain?']]);
N('post8','ship',[
 ['patient','You would give them back their pain?'],
 ['sokolova','I would give them back their choice.'],
 ['patient','I only wanted them to rest.'],
 ['vale','They can rest. And still be here when they wake.'],
 ['quill','Someone at the gangway. A man with a hand over his heart.'],
 ['sokolova','That is usually where they keep it.'],
 ['quill','He says his is wired to a bomb.'],
 ['sokolova','Fetch the other forceps.']]);
N('pre9','ship',[
 ['patient','Hollis Crane. I helped build it. HUSH.'],
 ['vale','Your pacemaker is sending two signals.'],
 ['patient','If my heart stops, the ship goes. If you force the can, the ship goes.'],
 ['quill','An unusually thorough consent form.'],
 ['patient','Circle, triangle, square. I think. That was the prototype.'],
 ['sokolova','We are doctors. We read the patient in front of us.'],
 ['vale','Sonar can read the traces through the board.'],
 ['sokolova','Then let us have a real second opinion.']]);
N('post9','harbor',[
 ['patient','It began with his daughter. Clementine. She was nine.'],
 ['vale','What happened to her?'],
 ['patient','Chronic pain. He tried everything. Then he made something new.'],
 ['sokolova','And sold it to a city.'],
 ['patient','Everything is singing to her. Every strain. One choir.'],
 ['quill','Port Anselm ahead, Doctor.'],
 ['vale','Turn the ship toward the hospital.'],
 ['sokolova','It already is.']]);
N('pre10','radiology',[
 ['percy','It is finally quiet.','smile'],
 ['vale','Percy? Look at me.'],
 ['quill','He has been taking Lull. The bottle is in his coat.'],
 ['odalys','His chart. In his own handwriting. Migraine.'],
 ['sokolova','Pride is a dreadful anesthetic.'],
 ['vale','I need your hands on this one.'],
 ['sokolova','You have them. Consult whenever you need.'],
 ['vale','Stay with us, Percy. You still owe me an apology.']]);
N('post10','ward',[
 ['percy','Your stitches are crooked.'],
 ['vale','You are awake.','sad'],
 ['percy','I was afraid I would fall behind. Everyone expected...'],
 ['sokolova','Rest. You can be insufferable tomorrow.'],
 ['odalys','The clinics are calling. Every clinic. All at once.','shock'],
 ['quill','There is a man at the door. Carrying a young woman.'],
 ['hale','I only wanted her not to hurt.','sad'],
 ['vale','Bring her to Theatre Three.']]);
N('pre11','theatre',[
 ['hale','Her name is Clementine. She likes the sea. She used to like the sea.'],
 ['vale','I can hear them. All of them.'],
 ['oyelaran','The gallery is ready. Whitlock, monitor. Odalys, film.'],
 ['percy','I have her pulse. Seventy.'],
 ['sokolova','Two doctors. One pair of seconds.'],
 ['quill','Your instruments, Doctor. All of them.'],
 ['hale','Pain is the last disease. I only asked you to stop defending it.'],
 ['vale','Pain is information. And your daughter is still here.'],
 ['quill','Do not let it go quiet.']]);
N('post11','theatre',[
 ['quill','...Doctor.'],
 ['clementine','My hands. My hands!','shock'],
 ['vale','You can feel them?'],
 ['clementine','It hurts. It is wonderful.','smile'],
 ['hale','Clementine. I am so sorry.','sad'],
 ['clementine','Stay. Please, just stay.'],
 ['oyelaran','The emergency room is filling. They are all waking up.'],
 ['percy','A man outside says he has a headache.'],
 ['sokolova','Wonderful. Send him in.']]);
N('ending','ward',[
 ['odalys','The city has never been this loud.','smile'],
 ['oyelaran','Nor this alive. We have a great deal to answer for.'],
 ['quill','Hale went with the police. Very quietly.'],
 ['sokolova','Let him. We have had enough quiet.'],
 ['vale','Agnes brought begonias. Slide brought the entire brass section.'],
 ['quill','A regrettable turn for the acoustics.'],
 ['vale','Look at my hands.'],
 ['quill','They have stopped shaking, Doctor.'],
 ['vale','No. They have not.'],
 ['quill','Good.','smile']]);
G.stories.pre1.lines[5].choices=[{text:'I am ready.',set:{tone:'ready'}},{text:'I am afraid.',set:{tone:'afraid'}}];
G.wardLines={
 agnes:['They replaced my greenhouse roof. I am banned from helping.','The grandchildren brought begonias. The ward needed a little color.'],
 slide:['I found the cork. Now I have lost the mute. Such is jazz.','Would a quiet solo improve the ward? Quill said no.'],
 tam:['Every one of the crew made it home. Every one.','The harbor can build another crane. Thank you for remembering that.'],
 harrow:['First tide after discharge. I promise I will wear the life jacket.','The sea sounds different when you can feel it again.'],
 ilse:['Five minutes of scales today. Five dreadful, wonderful minutes.','My fingers hurt. My fingers work. I can live with both.'],
 oyelaran:['I mistook keeping the doors open for keeping people safe.','Listen to the patient. Even when the patient is me.'],
 yusuf:['My daughter said the cake was crooked. She ate two pieces.','The deck is steady. I am still finding my sea legs.'],
 perpetua:['They are asking for the soup again. I suppose that is hope.','Choice is heavier than kindness. I am learning to carry it.'],
 hollis:['I can hear my own heartbeat. Only my own.','I will give them the records. Every page.'],
 percy:['If you quote my migraine chart, I shall deny it.','Your stitches held. I wanted you to know that.'],
 quill:['Morale, Doctor. A clinical necessity.','Next case is through that door. Your tea is here when you return.'],
 odalys:['The lightbox is never wrong. People standing beside it, occasionally.','I am keeping the humming film. For professional reasons.']};
})();
