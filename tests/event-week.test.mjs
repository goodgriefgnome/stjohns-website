import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, comingSunday } from '../src/lib/event-week.mjs';

test('a weekday runs to the coming Sunday', () => {
  assert.equal(comingSunday('2026-12-18'), '2026-12-20'); // Friday
  assert.equal(comingSunday('2026-12-21'), '2026-12-27'); // Monday
  assert.equal(comingSunday('2026-12-19'), '2026-12-20'); // Saturday
});

test('on a Sunday the week runs to the next Sunday', () => {
  assert.equal(comingSunday('2026-12-20'), '2026-12-27');
});

test('the week crosses month and year ends', () => {
  assert.equal(comingSunday('2026-12-30'), '2027-01-03');
  assert.equal(addDays('2026-12-30', 21), '2027-01-20');
});
