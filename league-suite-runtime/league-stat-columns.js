const COLUMNS=[['goals','Goals'],['assists','Assists'],['shots','Shots'],['shotsOnTarget','On target'],['passes','Passes'],['passesCompleted','Completed'],['tackles','Tackles'],['tacklesWon','Won'],['interceptions','Interceptions'],['saves','Saves'],['yellowCards','Yellow'],['redCards','Red'],['manOfTheMatch','MOTM']];
// A complete known zero is real data. Unknown totals must not create empty columns.
export function visibleStatColumns(rows){return COLUMNS.filter(([key])=>rows.some(row=>row.known[key]===true));}
