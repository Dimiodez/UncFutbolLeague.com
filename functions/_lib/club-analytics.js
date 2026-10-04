export const HOUSE_CLUB_IDS = new Set(['43521', '96510']);

const maykop = {
  club: { id: '374656', name: 'UFL Maykop' },
  window: 10,
  matchByMatch: {
    players: ['IffyPopcorn3914', 'aaaa111aaaaa', 'Odez', 'Ilzoll', 'Schweinslap', 'Grazman420', 'Bruceybistro', 'Empyre7737'],
    metrics: {
      rating: { label: 'Match rating', suffix: '', series: [7.1, 7.4, 7.8, 7.6, 7.9, 7.7, 7.2, 8.1, 7.8, 7.6] },
      tackles: { label: 'Tackles made', suffix: '', series: [5, 8, 7, 9, 6, 7, 10, 5, 8, 7] },
      passing: { label: 'Pass accuracy', suffix: '%', series: [77, 81, 84, 80, 83, 85, 78, 86, 82, 84] },
      contributions: { label: 'Goal contributions', suffix: '', series: [0, 1, 2, 1, 3, 2, 0, 3, 2, 1] }
    }
  },
  formIndex: [
    { rank: 1, movement: 0, name: 'IffyPopcorn3914', goals: 4, assists: 4, rating: 7.6, score: 76, streak: '2L' },
    { rank: 2, movement: 2, name: 'Odez', goals: 4, assists: 2, rating: 7.8, score: 73, streak: '2L' },
    { rank: 3, movement: 0, name: 'aaaa111aaaaa', goals: 1, assists: 2, rating: 7.2, score: 64, streak: '2L' },
    { rank: 4, movement: 1, name: 'Empyre7737', goals: 0, assists: 0, rating: 7.6, score: 64, streak: '3W' },
    { rank: 5, movement: -3, name: 'Schweinslap', goals: 0, assists: 0, rating: 7.2, score: 58, streak: '2L' },
    { rank: 6, movement: 0, name: 'Bruceybistro', goals: 0, assists: 0, rating: 6.8, score: 56, streak: '2L' }
  ],
  defending: {
    cleanSheets: 5, cleanSheetRate: 50, concededPerGame: 1.3, totalConceded: 13,
    concededSeries: [0, 1, 0, 2, 1, 0, 0, 0, 5, 3],
    recent: { cleanSheets: '3/5', concededPerGame: 1.8 },
    full: { cleanSheets: '5/10', concededPerGame: 1.3 },
    pairing: { players: ['Empyre7737', 'Grazman420'], cleanSheetRate: 67, concededPerGame: 0.3, together: 3 }
  },
  filmRoom: [
    { name: 'D. Dezhimoviç', position: 'ST', games: 43, grade: 'A', strengths: [
      ['Goals per game', '0.77', 'Consistent finishing and strong movement into scoring areas.'],
      ['Assists per game', '0.56', 'Creates chances as well as finishing them.'],
      ['Shot accuracy', '50.0%', 'Converts a strong share of the chances taken.'],
      ['Average rating', '7.50', 'Reliable influence across the full match window.']
    ], focus: ['Pass accuracy', '71.0%', 'Keep the final-third passing simple and choose the decisive ball at the right moment.'] }
  ],
  passing: {
    accuracy: [
      ['TheAlphabetMan1', 'CB', 87.8, 'high volume'], ['Bruceybistro', 'ST', 86.0, 'high volume'],
      ['Empyre7737', 'CB', 83.8, 'moderate volume'], ['Grazman420', 'CB', 82.0, 'moderate volume'],
      ['IffyPopcorn3914', 'ST', 81.9, 'lower volume'], ['aaaa111aaaaa', 'CM', 81.3, 'lower volume'],
      ['Schweinslap', 'CM', 77.0, 'high volume'], ['Ilzoll', 'ST', 74.2, 'lower volume']
    ],
    volume: [['Schweinslap', 'CM', 15.7, 157], ['Empyre7737', 'CB', 11.6, 93], ['Ilzoll', 'ST', 11.5, 46], ['Grazman420', 'CB', 10.3, 41], ['Odez', 'ST', 10.1, 101]]
  },
  comparison: [
    { name: 'Schweinslap', position: 'CM', rating: 8.1, games: 51, goals: 7, assists: 28, pass: 78, tackles: 36 },
    { name: 'Odez', position: 'ST', rating: 7.8, games: 43, goals: 33, assists: 24, pass: 71, tackles: 18 },
    { name: 'IffyPopcorn3914', position: 'ST', rating: 7.9, games: 38, goals: 29, assists: 19, pass: 82, tackles: 14 },
    { name: 'Empyre7737', position: 'CB', rating: 7.6, games: 34, goals: 1, assists: 4, pass: 84, tackles: 50 }
  ]
};

export function analyticsForClub(clubId) {
  return String(clubId) === maykop.club.id ? maykop : null;
}
