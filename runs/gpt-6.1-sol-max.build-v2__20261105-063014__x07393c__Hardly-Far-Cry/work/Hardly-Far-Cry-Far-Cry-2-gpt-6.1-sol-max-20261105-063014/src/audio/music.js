const make=(bpm,notes,bass,drums=false)=>({bpm,stepsPerBeat:2,tracks:{lead:{wave:'triangle',attack:.01,decay:.4,volume:.13},bass:{wave:'sine',attack:.1,decay:1,volume:.15},pulse:{wave:'noise',decay:.045,volume:drums?.11:.015}},patterns:{a:{lead:notes,bass,pulse:drums?'C4 . C6 . C4 C6 . C6 C4 . C6 . C4 . C6 .':'C7 . . . . . . . C7 . . . . . . .'}},order:['a']});
export const SONGS={
 title:make(74,'D4 . A4 . C5 . A4 . G4 . . . E4 . D4 .','D2 - - - . . . . C2 - - - A1 - - -'),
 day:make(64,'D5 . . . A4 . . . G4 . E4 . D4 . . .','D2 - - - . . . . A1 - - - . . . .'),
 night:make(48,'A4 . . . . . . . D4 . . . . . . .','D2 - - - - - - - . . . . A1 - - -'),
 stalk:make(92,'D3 . D3 . E3 . D3 . A3 . G3 . E3 . . .','D2 . . . D2 . . . C2 . . . C2 . . .',true),
 fight:make(128,'D4 D4 . A4 G4 . D4 . C5 . A4 G4 E4 . D4 .','D2 . D2 . A1 . A1 . C2 . C2 . A1 . A1 .',true),
 fever:make(53,'D4 . Eb4 . A4 . Ab4 . G4 . Eb4 . D4 . . .','D2 - - - Eb2 - - - D2 - - - Ab1 - - -'),
 end:make(58,'D5 . . . C5 . A4 . G4 . . . E4 . D4 .','D2 - - - . . . . . . . . . . . .')
};
