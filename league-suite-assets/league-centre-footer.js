// Generated from the main site's footer copy by sync-league-centre-shell.mjs.
const locations=[
  'grilling by the touchline', 'somewhere on the beach', 'lost in the mountains',
  'ankle-deep in the swamp', 'arguing with VAR', 'warming up since 4 PM',
  'at the back post—unmarked', 'checking the transfer market', 'on a tactical smoke break',
  'telling the kids how FIFA 12 did it', 'icing both knees', 'parked in the box',
  'explaining offside to someone who did not ask', 'waiting for one more to join the lobby',
  'checking the couch cushions for skill points', 'blaming input delay',
  'pretending that was a driven pass', 'by the corner flag catching his breath',
  'changing formation for the fifth time', 'requesting more stoppage time',
  'reading the patch notes two seasons late', 'calling next goal wins',
  'holding sprint since 2013', 'yelling man on to an empty room',
  'practicing green-timed finishes in warmups', 'in party chat saying just one more',
  'checking whether the keeper moved', 'drawing tactics on a napkin',
  'waiting for the captain to ready up', 'asking the concession stand for orange slices',
  'measuring the grass for a better excuse', 'looking for the Pro Clubs invite',
  'explaining that chemistry no longer works that way',
  'celebrating before the ball crossed the line', 'still loading into the lobby',
  'managing a hamstring from the recliner', 'insisting the pass was meant for someone else'
];
const reroll=()=>{const el=document.querySelector('#unc-location');if(el)el.textContent=locations[Math.floor(Math.random()*locations.length)];};
document.querySelector('#reroll-location')?.addEventListener('click',reroll);reroll();
