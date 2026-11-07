import test from 'node:test';
import assert from 'node:assert/strict';
import { signupCandidates, uniquePlayerNames, voiceRows } from '../wheel-app/player-ocr.mjs';

test('numbered signup candidates ignore headings and times and preserve name spelling', () => {
  assert.deepEqual(signupCandidates('Signups (4)\nName\n1. Red Runner\n2) Blue_Player\n@blue_player\n• Gold Fox\n12:34'), [
    'Red Runner', 'Blue_Player', 'Gold Fox',
  ]);
  assert.deepEqual(uniquePlayerNames('Blue_Player\nGold Fox\n gold  fox \nGreen  Owl', ['blue_player']), ['Gold Fox', 'Green Owl']);
});

test('voice rows use the aligned name column, excluding title, timer, and tall avatar words', () => {
  const word = (text, x0, y0, height = 18) => ({ text, bbox: { x0, x1: x0 + 25, y0, y1: y0 + height } });
  const lines = [
    { text: 'Voice room 57:12', words: [word('Voice', 91, 13), word('57:12', 359, 13)] },
    { text: 'av FirstPlayer UFL', words: [word('av', 47, 57, 37), word('FirstPlayer', 98, 64), word('UFL', 189, 64)] },
    { text: 'AV SecondPlayer', words: [word('AV', 49, 104, 36), word('SecondPlayer', 97, 113)] },
  ];
  const rows = voiceRows(lines);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => [row.box.x0, row.plain]), [[98, undefined], [97, 'SecondPlayer']]);
});
