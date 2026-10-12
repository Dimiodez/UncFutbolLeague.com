// Original UNC recommendations for six or ten human outfield players in a full Clubs XI.
// Both formats use an AI goalkeeper. These are trial plans, not mandatory allocations.
export const modeTips={
  '3-5-2:':[
    'Three CBs; two holders; LM/RM; CAM; two strikers.',
    'Give a human the screening job and use wide players who recover. With six users, do not spend every slot ahead of the ball; an AI outside centre-back needs a nearby human covering the inside pass.',
    'Agree which holder slides towards a wide counter and which stays central. When a wide midfielder presses, the outside centre-back covers behind rather than both chasing. Let the striker pair alternate showing short.'
  ],
  '3-4-1-2:':[
    'Three CBs; two CMs; LM/RM; CAM; two strikers.',
    'A human central midfielder should hold while the CAM links the forwards. If both CMs are AI, bring a human forward back into build-up instead of expecting the AI pair to manage every transition alone.',
    'Call the supporting CM’s forward run before making it. The other CM stays underneath, and the far-side wide midfielder recovers early. Use the CAM as a link, not a third striker permanently on the last line.'
  ],
  '3-1-4-2:':[
    'Three CBs; one holder; two CMs; LM/RM; two strikers.',
    'Prioritise a human holder and at least one human CM to connect the AI with the forwards. When the AI has possession wide, move into a clear inside lane rather than demanding a pass through its marker.',
    'The two CMs should take turns supporting the strikers. On a turnover, the nearest CM recovers inside so the holder is not dragged towards the touchline and away from the centre.'
  ],
  '3-4-2-1:':[
    'Three CBs; two CMs; LM/RM; two advanced supports; one striker.',
    'Use a human CM to protect the space behind the two supporting forwards. If a wide midfielder is AI, the nearby human support player should offer a short angle and help recover, not assume an overlap will arrive.',
    'Coordinate each side’s support player and wide midfielder: one receives inside, the other holds width. When pressing, the near support player goes first while the far one screens a return route through midfield.'
  ],
  '3-4-3 and':[
    'Three CBs; two CMs; LM/RM; two wingers; one striker.',
    'With only six users, covering both wide pairs can leave the centre to AI. Keep a human central organiser and make each winger help their wide midfielder after losing the ball. Avoid asking an AI wide player to provide every overlap.',
    'Give each winger and wide midfielder different lanes. When one goes inside, the other stays outside. The central pair must name who protects the turnover before either joins the front three.'
  ],
  'Flat / base':[
    'Four defenders; three CMs; two wingers; one striker.',
    'Keep a human CM near the AI defenders as a safe outlet. Assign a deeper human job rather than leaving every midfield recovery to AI.',
    'Name a screening CM. Outside CMs alternate forward runs; the opposite full-back stays connected during an overlap. Keep midfield cover behind the front three’s press.'
  ],
  'Holding 4-3-3':[
    'Four defenders; one holder; two CMs; two wingers; one striker.',
    'Pair a human holder with a nearby human CM where possible. Wingers should offer AI teammates a safe pass before running behind.',
    'The near CM helps cover a full-back overlap while the holder protects the middle. Keep the far winger available for a switch.'
  ],
  'Defend 4-3-3':[
    'Four defenders; two holders; one CM; two wingers; one striker.',
    'Use a human holder and connector where possible. If both holders are AI, bring the human CM closer instead of leaving every short passing option vacant.',
    'Stagger the holders and let the CM connect forward. After a regain, the near winger shows short while the far winger offers depth.'
  ],
  'Attack 4-3-3':[
    'Four defenders; two CMs; one CAM; two wingers; one striker.',
    'Give a human CM the screening job behind the CAM. When a winger runs behind, another user must offer the AI full-back a return pass.',
    'One CM screens while the other supports. Separate winger and full-back lanes. On a turnover, call the midfield recovery instead of launching three unrelated presses.'
  ],
  '4-2-1-3':[
    'Four defenders; two holders; one CAM; two wingers; one striker.',
    'A human holder and CAM give the AI a midfield route. Have one winger show short rather than both sprinting behind; retain human transition cover.',
    'Use the holders to change angles when the CAM is screened. The near holder covers an overlap; the other protects the middle. Keep the CAM connected.'
  ],
  'Narrow 4-2-3-1':[
    'Four defenders; two holders; three CAMs; one striker.',
    'If four users fill the striker and CAM jobs, reserve human cover behind. An outside CAM can provide width without depending on a timed AI overlap.',
    'Vary the outside CAMs’ width and depth. Name the overlapping full-back and covering holder; keep the opposite flank protected rather than releasing both sides.'
  ],
  'Wide 4-2-3-1':[
    'Four defenders; two holders; LM/RM; one CAM; one striker.',
    'Use a human holder and CAM to connect the group. Wide users recover beside midfield and offer AI full-backs a return pass instead of remaining high.',
    'Separate wide midfielder and full-back heights. On a turnover, the far midfielder narrows while the holders protect the centre before chasing wide.'
  ],
  '4-4-2 Flat and':[
    'Four defenders; LM/RM; two CMs in Flat or deeper holders in Holding; two strikers.',
    'Prioritise a human central midfielder. If their partner is AI, stay close enough for a safe pass and avoid leaving that player alone behind the attack.',
    'Wide midfielders recover with full-backs. A striker drops against central overloads. In Holding, bring a forward closer rather than sending both deeper midfielders high.'
  ],
  '4-4-1-1 Midfield':[
    'Four defenders; two central and two wide midfielders; one advanced link; one striker.',
    'A human central midfielder and link player connect the AI to attack. Offer a pressured AI wide midfielder an inside pass, not a blocked forward request.',
    'The link player helps an outnumbered central pair before joining the striker. Wide midfielders track outside runners so full-backs are not left two against one.'
  ],
  '4-1-2-1-2 Narrow':[
    'Four defenders; one holder; two CMs; one CAM; two strikers.',
    'Six users can fill the diamond and strikers with an AI back four. Keep the holder disciplined; CMs provide wider angles without relying on AI overlaps.',
    'The near CM covers an overlap while the holder stays central. Keep the far full-back connected. Strikers separate their runs instead of crowding the CAM.'
  ],
  '4-1-2-1-2 Wide':[
    'Four defenders; one holder; LM/RM; one CAM; two strikers.',
    'Six users can fill midfield and attack. Both wide users must recover to support an AI defence; the holder cannot cover both wings alone.',
    'Recover the far midfielder inside. The CAM helps the holder escape pressure. Full-backs and wide midfielders agree who provides width rather than duplicating the same run.'
  ],
  '4-3-1-2':[
    'Four defenders; three CMs; one CAM; two strikers.',
    'Six users can fill the midfield and strikers. Assign a CM to screen the AI back four; outside CMs offer width before expecting AI overlaps.',
    'Stagger the CMs: one underneath, one alongside and one supporting forward. The near CM covers an overlap while the opposite full-back stays connected.'
  ],
  '4-1-3-2':[
    'Four defenders; one holder; LM/RM and one CM; two strikers.',
    'If six users fill midfield and attack, keep the holder central and CM connected. Offer AI defenders a simple outlet before requesting a difficult forward pass.',
    'Wide midfielders recover beside the CM. If the CM is marked, one striker shows short while the other keeps depth; do not withdraw both forwards together.'
  ],
  '4-2-2-2':[
    'Four defenders; two holders; two CAMs; two strikers.',
    'Six users can fill the holders, CAMs and strikers. Keep one holder screening the AI defence; a CAM creates width instead of relying only on AI overlaps.',
    'Stagger CAM and striker positions. When a full-back goes, the near holder covers the channel and the far holder protects the middle.'
  ],
  '4-3-2-1':[
    'Four defenders; three CMs; two advanced supports; one striker.',
    'Six users can fill midfield and attack. The deepest CM screens; outside CMs offer AI full-backs an angle. Forwards must not all request the same pass.',
    'Support forwards alternate short and deep movements. An outside CM covers full-back width; the deepest CM stays central instead of following every move towards the corner.'
  ],
  '4-1-4-1':[
    'Four defenders; one holder; two CMs; LM/RM; one striker.',
    'Six users can fill midfield and striker. The holder protects an AI back four; one CM supports forward. Keep a wide outlet available to the AI.',
    'Press together with the holder covering behind. Name the CM supporting the striker after a regain; the other remains available for a return pass and counter cover.'
  ],
  '4-5-1 Flat and':[
    'Four defenders; five midfielders; one striker. Attack moves two midfield supports higher.',
    'Use a human central organiser. Flat needs a midfield runner towards the striker; Attack needs deeper cover. Offer AI wide receivers a nearby pass.',
    'Flat: name the advancing and protecting midfielders. Attack: a higher support helps pressured build-up. Wide midfielders recover so the deeper player need not cover both flanks.'
  ],
  '4-2-4':[
    'Four defenders; two CMs; two wingers; two strikers.',
    'Six users can fill the midfield pair and four forwards. Keep human screening ahead of an AI back four, and have a forward show for short passes.',
    'One CM screens; one connects. Wingers recover against full-back overloads. If the midfield remains outnumbered, change the structure instead of expecting the pair to win every chase.'
  ],
  '5-2-1-2:':[
    'Three CBs; two wide defenders; two CMs; one CAM; two strikers.',
    'Prioritise a human CM and CAM as an exit route; spending five slots on forward jobs and width can leave the middle to AI. If a wide defender is AI, show for a safe pass rather than assuming a timed overlap.',
    'The central pair alternate covering the wide defenders. On a regain, the CAM comes towards the first pass and the strikers separate. Advance the far-side wide defender only after checking that the counter is covered.'
  ],
  '5-3-2:':[
    'Three CBs; two wide defenders; three CMs; two strikers.',
    'A human CM should link the AI back line to the forwards, while another protects counters. Your sixth slot can address the weakest link rather than automatically adding another attacker. If AI supplies width, keep an easy inside return available.',
    'One CM holds, one connects and one can arrive near the strikers. Wide defenders time their runs after the first pass is secure. The near striker shows short while the other maintains a forward outlet.'
  ],
  '5-3-2 Holding:':[
    'Three CBs; two wide defenders; one holder; two CMs; two strikers.',
    'A human holder plus a human CM gives the AI defence a clearer passing route. If both CMs are AI, bring a human striker short rather than leaving the holder as the only user available during build-up.',
    'Keep the holder central as the near CM helps a wide defender. The other CM remains available for a switch or late run. Do not let all three midfielders drop onto the centre-backs and disconnect the striker pair.'
  ],
  '5-2-3:':[
    'Three CBs; two wide defenders; two CMs; two wingers; one striker.',
    'Using three humans up front still leaves three slots for midfield and defensive support. Prioritise a human CM who stays connected to AI defenders. Have the near winger show short so the AI is not asked to clear forward every time.',
    'A wide defender overlaps only when the winger’s inside movement opens the lane. The near CM covers and the far defender stays connected. Coordinate the front three’s press so the midfield pair is not left chasing through open space.'
  ],
  '5-4-1 and':[
    'Three CBs; two wide defenders; two central and two wide midfielders; one striker.',
    'Give a human striker a human midfielder close enough for the next pass. With five AI players, sitting every user deep can leave no usable exit. A wide user should carry possession when safe while others recover into supporting lanes.',
    'Keep the two midfield lines connected without abandoning the striker. On a regain, name the wide or central runner joining the attack. One player presses the ball; the rest protect lanes rather than all collapsing around the same receiver.'
  ]
};

export const modeIntroduction='## UNC 6v6 and 10v10\n\nBoth divisions use the standard 11-player Clubs pitch and formation, not a six-a-side pitch or Rush. UNC 6v6 has six human outfield players, four AI outfield players and an AI keeper. UNC 10v10 has ten human outfield players and an AI keeper. None of the advice below requires a user goalkeeper.\n\nThe allocations are suggestions, not registration rules: you can use human defenders and leave other positions to AI. In 6v6, decide which human protects the centre, which connects possession and who stays available ahead. Offer AI teammates visible passing lanes instead of repeatedly asking for difficult passes. In 10v10, coordinate the whole outfield: name the player pressing, the cover behind and the runner tracking back.\n\nSmall-squad Clubs players discuss human midfield cover and wide recovery in [this formation discussion](https://www.reddit.com/r/fifaclubs/comments/1t5l3o3/pro_club_formations/) and [this recent tactics thread](https://www.reddit.com/r/fifaclubs/comments/1wshbds/what_formation_are_people_using/). [A community discussion about supporting AI](https://www.reddit.com/r/fifaclubs/comments/1qdg34y/its_not_the_ai_its_us/) offers ideas about passing options and team shape. These are player experiences, sometimes from earlier game versions, not controlled tests. Comments disagree about AI behaviour and settings; there is no universal depth value or guaranteed AI fix here. The formation-specific tips are our own coaching suggestions to test with your squad.\n\n';
