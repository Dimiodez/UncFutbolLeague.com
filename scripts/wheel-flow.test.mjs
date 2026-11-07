import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWheelFlow, normalizeWheelMode, readCupEvent, saveCupEvent } from '../wheel-app/wheel-flow.mjs';

const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('wheel navigation excludes FUNC and legacy FUNC snapshots return to Cup Night', () => {
  assert.equal(normalizeWheelMode('func'), 'cup');
  assert.equal(normalizeWheelMode('invalid'), 'cup');

  const React = {
    useRef: value => ({ current: value }),
    useEffect: () => {},
    createElement: (type, props, ...children) => ({ type, props, children }),
  };
  const { Navigation } = makeWheelFlow(React);
  const buttons = element => element.type === 'button' ? element.children : element.children.flatMap(
    child => typeof child === 'object' ? buttons(child) : []
  );
  assert.deepEqual(buttons(Navigation({ mode: 'cup' })), ['Team Draws', 'Tournaments', 'Cup Night', 'Captain Draft', 'Fantasy Value Draft']);
  assert.deepEqual(buttons(Navigation({ mode: 'standings' })), ['Team Draws', 'Tournaments', 'Competitions', 'Live Group Draw', 'Aggregate BYOT']);

  const wheel = file('wheel-app/wheel.js');
  assert.doesNotMatch(wheel.slice(wheel.lastIndexOf('function Rn(){')), /FUNC Card Studio|children:\x60FUNC\x60|O===\x60func\x60/);
  assert.match(file('index.html'), /data-nav-hub="fun"[\s\S]*?<a href="\/func"/);
  assert.doesNotMatch(file('wheel-app/index.html'), /func-catalog/);
});

test('named Cup Night snapshots restore both draw rosters and bracket scores', () => {
  const records = new Map();
  const storage = { getItem: key => records.get(key), setItem: (key, value) => records.set(key, value) };
  const event = {
    name: 'Friday Cup',
    session: { teams: [{ id: 'red', playerIds: ['alice'] }], players: [{ id: 'alice' }], assignments: [] },
    bracket: { source: 'cup-night', teams: [{ id: 'red' }, { id: 'blue' }], scores: { 'W1-1': { homeScore: 2, awayScore: 0 } } },
  };
  assert.equal(readCupEvent(storage), null);
  saveCupEvent(event, storage);
  assert.deepEqual(readCupEvent(storage), event);
  assert.notEqual(readCupEvent(storage).session, event.session);
});
