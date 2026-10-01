export const SCHWEIN_OPENINGS = Object.freeze({
  1: 'MAMA MIA... YOU’RE BACK?',
  2: 'COME ON BABY, CLIMB THAT MOUNTAIN!',
  3: 'YOU REALLY WANNA DO THIS AGAIN, RIGHT GUYS?',
  4: 'SUCK MY ASS, I’M NOT COMING DOWN!',
  5: 'HOW MANY TIMES DO I GOTTA THROW BALLS AT THIS DICKHEAD?',
  6: 'MAMA MIA, THIS REF DOESN’T FUCKING QUIT.',
  7: 'ALRIGHT DICKHEAD... LET’S DO THIS.',
  8: 'YOU WANT THE SUMMIT? COME TAKE IT, BABY!',
  9: 'I’M THE MVP — MOST VALUABLE PIG. SHOW SOME RESPECT!',
  10: 'COME ON THEN, REF. BRING THAT LITTLE RED CARD UP HERE.',
});

export const SCHWEIN_BALL_LINES = Object.freeze([
  'SUCK MY ASS!',
  'HERE COMES ANOTHER ONE, DICKHEAD!',
  'CATCH THIS WITH YOUR FACE!',
  'BALL COMING! DUCK... OR DON’T!',
  'MAMA MIA, LOOK AT THIS FUCKIN’ GUY.',
  'RIGHT DOWN THE MOUNTAIN, BABY!',
  'YOU LIKE BALLS, REF? HERE’S ANOTHER ONE!',
  'THAT ONE’S GOT YOUR NAME ON IT!',
  'COME ON BABY WITH YOUR JUICY... WAIT, WRONG GAME.',
  'GO FETCH THAT, DICKHEAD!',
  'KEEP CLIMBING! I GOT MORE!',
  'OH YOU’RE FUCKED NOW, RIGHT GUYS?',
  'THIS ONE’S GOT SOME STANK ON IT!',
  'SUCK MY ASS AND WATCH YOUR HEAD!',
  'YOU BETTER HOPE THAT BOUNCES LEFT!',
]);

export const SCHWEIN_SALMON_LINES = Object.freeze([
  'EAT A FAT SALMON, YOU REFEREE SCUM!',
  'SALMON TEARS COMING TO A REFEREE NEAR YOU!',
  'FRESH CATCH, DICKHEAD!',
  'MAMA MIA, THAT’S A FAT SALMON!',
  'HERE COMES THE FISH, BABY!',
  'YOU WANT PROTEIN? CATCH THIS!',
  'SUCK MY ASS AND EAT YOUR SALMON!',
  'FISH INCOMING! RIGHT GUYS?',
]);

export const SCHWEIN_TANTRUM_LINES = Object.freeze([
  'I’M THE MVP — MOST VALUABLE PIG! HOW DARE YOU!',
  'ALRIGHT DICKHEAD, NOW I’M PISSED!',
  'MAMA MIA! THIS IS MY FUCKING MOUNTAIN!',
  'WHO KEEPS LETTING THIS REF BACK UP HERE?!',
  'SUCK MY ASS! ALL OF YOU!',
  'I BUILT THIS MOUNTAIN!... I THINK. RIGHT GUYS?',
  'YOU DON’T COME INTO MY PIG PEN AND DISRESPECT ME LIKE THIS!',
]);

export const SCHWEIN_FALL_LINES = Object.freeze([
  'LONG WAY DOWN, REF!',
  'MAMA MIA... THAT’S A LONG FUCKIN’ WAY DOWN!',
  'SUCK MY ASS! SEE YOU AT THE BOTTOM!',
  'RIGHT BACK DOWN YOU GO, DICKHEAD!',
  'YOU ALMOST HAD IT, RIGHT GUYS?',
  'MAMA MIA... GRAVITY’S A BITCH!',
]);

export const SCHWEIN_BRUCE_SWEAT_LINE = 'MAN, I BET YOU HOPE THAT’S SWEAT, HUH?... IT’S NOT.';

export const SCHWEIN_BALL_HIT_LINES = Object.freeze([
  Object.freeze({ line: 'SUCK MY ASS', chance: 0.70 }),
  Object.freeze({ line: 'THAT’S WHY I’M THE MVP!', chance: 0.15 }),
  Object.freeze({ line: 'LONG BALL RIGHT ON TARGET, DICKHEAD!', chance: 0.15 }),
]);

export const SCHWEIN_SUMMIT_LINES = Object.freeze([
  'YOU CLIMBED ALL THAT JUST TO CARD ME? SUCK MY ASS.',
  'OH COME ON, DICKHEAD. I LIVE UP HERE!',
  'CAN’T WE TALK ABOUT THIS, RIGHT GUYS?',
  'I’M THE MVP! YOU CAN’T CARD THE MVP!',
  'COME ON BABY, WE CAN WORK THIS OUT.',
  'YOU REALLY CLIMBED AN ENTIRE FUCKING MOUNTAIN FOR THIS?',
  'HOW ABOUT YOU JUST TURN AROUND AND WE NEVER SPEAK OF THIS AGAIN?',
  'I HAVE A FAMILY!... RIGHT GUYS?',
  'YOU’RE REALLY GONNA SEND OFF A PIG? THAT’S FUCKED UP.',
]);

export const SCHWEIN_RED_CARD_LINES = Object.freeze([
  'MAMA MIA... WHY’S THAT CARD RED?',
  'ALRIGHT, DICKHEAD.',
]);

export const BRUCE_SUMMIT_LINES = Object.freeze([
  'WAIT... WHERE AM I? HOW DID I GET HERE?',
  'THIS ISN’T THE KITCHEN... WHERE DID MY SANDWICH GO?',
  'WHO MOVED THE LAUNDRY ROOM?',
  'I CAME UP HERE TO GET SOMETHING... DOES ANYBODY REMEMBER WHAT IT WAS?',
  'DO YOU GUYS DO SOCK SOCK, SHOE SHOE... OR SOCK SHOE, SOCK SHOE?',
]);

export const BIZZIE_REVEAL_LINE = "You're not getting through me!";

export const LEVEL_SIX_CUTSCENE = Object.freeze({
  referee: 'Stop telling me to suck my ass!',
  schwein: "Mama Mia, suck a big'a fat cock'a",
});

export const LEVEL_TEN_CUTSCENE = Object.freeze([
  Object.freeze({ speaker: 'schwein', line: 'MAMA MIA... YOU ACTUALLY MADE IT.' }),
  Object.freeze({ speaker: 'referee', line: 'This ends now.' }),
  Object.freeze({ speaker: 'schwein', line: 'COME ON BABY, LET’S NOT DO ANYTHING CRAZY.' }),
  Object.freeze({ speaker: 'referee', line: 'You’ve thrown soccer balls at me, salmon at me, and told me to suck your ass about fifty times.' }),
  Object.freeze({ speaker: 'schwein', line: 'FIFTY? THAT SEEMS HIGH, RIGHT GUYS?' }),
  Object.freeze({ speaker: 'referee', line: 'Turn around.' }),
  Object.freeze({ speaker: 'schwein', line: 'WHY?' }),
  Object.freeze({ speaker: 'referee', line: 'Red card.' }),
  Object.freeze({ speaker: 'schwein', line: 'MAMA MIA... WHY’S THAT CARD RED?' }),
  Object.freeze({ speaker: 'referee', line: 'Get off the mountain.' }),
  Object.freeze({ speaker: 'schwein', line: 'ALRIGHT, DICKHEAD.' }),
]);

export const GAMEPLAY_NOTICES = Object.freeze({
  bruceEntry: 'BRUCE HAS ENTERED THE PREMISES!',
  blackIce: 'BLACK ICE — GOOD LUCK STOPPING!',
  salmonSlip: 'YOU STEPPED ON A FUCKING SALMON!',
  bruceCollision: 'BRUCE FORGOT YOU WERE STANDING THERE!',
  brucePuddle: 'BRUCE RESIDUE DETECTED!',
  tantrumKnockdown: 'YOU HAVE LOST AN ARGUMENT WITH THE MOUNTAIN!',
  sabotage: 'SCHWEIN ADDED CHAOS TO THE MOUNTAIN!',
});

export function pickLine(lines, random = Math.random) {
  return lines[Math.min(lines.length - 1, Math.floor(random() * lines.length))];
}

export function openingLineForLevel(level) {
  return SCHWEIN_OPENINGS[level] || SCHWEIN_OPENINGS[1];
}

export function ballHitLine(random = Math.random) {
  const roll = random();
  let cumulative = 0;
  for (const entry of SCHWEIN_BALL_HIT_LINES) {
    cumulative += entry.chance;
    if (roll < cumulative) return entry.line;
  }
  return SCHWEIN_BALL_HIT_LINES.at(-1).line;
}
