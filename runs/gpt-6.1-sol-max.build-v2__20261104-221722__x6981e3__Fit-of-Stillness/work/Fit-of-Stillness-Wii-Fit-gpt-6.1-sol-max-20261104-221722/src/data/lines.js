// Results are indexed by stars, then first visit and repeat visit.
export const LINES = {
 tree:['You are a shrub. We will begin there.','A promising sapling. Please remain planted.','A tree with useful intentions.','Rooted. The island has taken notes.','You are a tree. Trees do not check phones.','We remember your branch work.'],
 heron:['The heron has made alternative plans.','One leg has accepted the assignment.','A bird of considerable patience.','Kevin is quietly reconsidering his career.','The raised knee is not a storage shelf.','Your previous heron has been archived.'],
 warrior:['Peace has been declared early.','A small, diplomatic skirmish.','Your stance has a clear position.','A formidable negotiator. Very civil.','No actual conflict will be required.','The knees remember this meeting.'],
 chair:['The chair is currently theoretical.','Seating arrangements are improving.','A dependable piece of furniture.','I would sit on that. Metaphorically.','There is no chair. There are expectations.','The furniture has requested your return.'],
 fold:['An extension has been granted.','Some paperwork remains outstanding.','A very orderly submission.','Filed. On time. In triplicate.','Please fold along the dotted intentions.','The same tax year. A new perspective.'],
 plank:['The floor has done most of the work.','A bridge with occasional interruptions.','Structurally quite reassuring.','Load bearing. In the nicest possible way.','The floor is your friend. It never lets go.','Your horizontal ambitions continue.'],
 squat:['The floor remains a distant relative.','An introduction has been made.','A thoughtful conversation with gravity.','The knees have unanimously approved.','We go down. We reconsider. We come back.','Your last regrets have been filed.'],
 lunge:['An apology has been drafted.','The apology has reached one knee.','A sincere and well balanced apology.','Both knees accept. No further questions.','Step forward. Take responsibility.','The floor would like a word again.'],
 press:['The ceiling remains untroubled.','A small investment in overhead space.','A sound repayment schedule.','The mortgage is paid. Keep the dumbbells.','Lift your obligations. Set them down.','Interest has accrued since your last visit.'],
 hoop:['The market has corrected itself.','One hoop is considering reinvestment.','A diversified circle of commitments.','A thriving circular economy.','Circle gently. The hoop has dependants.','Past rotations do not guarantee returns.'],
 step:['Your feet submitted separate reports.','Several beats have been accounted for.','A punctual pair of feet.','Precisely on time. How unsettling.','Left. Right. We try to keep those separate.','The floor remembers your last appointment.'],
 header:['Dennis feels unusually safe.','A few coconuts have been redirected.','An effective head of correspondence.','Dennis has requested a transfer.','Coconuts: yes. Footwear: no.','Dennis says he is ready. He has said that.'],
 slack:['The water knows you by name now.','The far shore is a legitimate achievement.','A crossing with minimal correspondence.','The lagoon is feeling rather neglected.','Forward is a choice. So is stopping.','The line has asked after you.'],
 tray:['The filing system has become colourful.','Some colours are where they belong.','An orderly cabinet of small decisions.','Everything in its place. Even the blue.','Tilt gently. The colours have addresses.','Please respect the existing filing system.'],
 jog:['Coach has finished her crossword.','A pleasant tour of the immediate vicinity.','An admirably conversational pace.','Coach has had to put her crossword away.','Alternate feet. The island will pass by.','The route remains the same. You may differ.'],
 pier:['The water accepted you without reference.','A modest but sincere departure.','A well considered splash.','The judges have damp clipboards.','Tuck. Wait for the lip. Then commit.','The pier has renewed your application.'],
 long:['You stood. Sort of.','You remained approximately present.','The island tried. You stayed.','Still. After everything. Thank you.','Stand. This is the whole prescription.','The island has prepared new distractions.']
};
export const BARKS = [
 'Your left side is doing very well.', 'I will let your right side know.', 'Thank you. I have written that down.', 'The circle has no personal agenda.',
 'A small correction is still a correction.', 'That wobble was between us.', 'Your knees have been copied in.', 'Please collect your wandering ankle.',
 'The floor is reliably below you.', 'Gravity has perfect attendance.', 'We have pencilled in your progress.', 'A useful amount of effort.',
 'The sea is calm. Consider its methods.', 'Coach has blinked once this morning.', 'Marguerite arrived early. Again.', 'Dennis has signed the form sideways.',
 'Kevin has never attended orientation.', 'The jar does not accept excuses.', 'Today has been properly numbered.', 'Your posture has entered the conversation.',
 'No hurry. We have a calendar.', 'A bench is available for reflection.', 'The volcano is resting its knees.', 'The bridge is also a dumbbell.',
 'Please leave the sea where it is.', 'The towel is not an achievement. Yet.', 'We noticed your return.', 'The island starts at zero. Every morning.',
 'All records are kept gently.', 'You cannot disappoint a circle.', 'We train both sides of the argument.', 'A pause can be very constructive.',
 'Nothing has fallen off the clipboard.', 'The sun has no recorded complaints.', 'A little less. Yes. That much.', 'Remain politely upright.',
 'You have brought all the required ankles.', 'The palm trees are doing their best.', 'This is a calm place to reconsider.', 'Excellent. Compared with yesterday.',
 'The next number will be delivered gently.', 'A moment of stillness has been received.', 'The gulls have no appointment system.', 'Your mat has been expecting you.',
 'There is no last place in a circle.', 'We will discuss the wobble later.', 'You are allowed to begin again.', 'Please keep your dignity on the mat.'
];
export const ALL_LINES = [...Object.values(LINES).flat(), ...BARKS];
