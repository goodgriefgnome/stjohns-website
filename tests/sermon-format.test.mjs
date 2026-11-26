// The sermon display helpers: date spans, books, series names, groups.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blurb, bookOf, clock, dateSpan, groupBySeries, minutes, seriesSlug, shortDay, sortBooks, titleWithoutSeries } from '../src/lib/sermon-format.mjs';

test('dateSpan: one month, one year, two years', () => {
  assert.equal(dateSpan('2026-11-01', '2026-11-22'), 'November 2026');
  assert.equal(dateSpan('2026-09-06', '2026-11-22'), 'Sept – Nov 2026');
  assert.equal(dateSpan('2025-12-07', '2026-02-22'), 'Dec 2025 – Feb 2026');
});

test('shortDay, minutes and clock', () => {
  assert.equal(shortDay('2026-11-15'), '15 Nov');
  assert.equal(minutes(1851), 31);
  assert.equal(clock(1851), '30:51');
  assert.equal(clock(5), '0:05');
  assert.equal(clock(3723), '1:02:03');
});

test('bookOf: the text before the chapter, with Psalm made Psalms', () => {
  assert.equal(bookOf('Titus 2'), 'Titus');
  assert.equal(bookOf('1 John 3:1–10'), '1 John');
  assert.equal(bookOf('Psalm 121'), 'Psalms');
  assert.equal(bookOf('Psalms 120–134'), 'Psalms');
  assert.equal(bookOf('Song of Songs 2:1–7'), 'Song of Songs');
  assert.equal(bookOf('Jude'), 'Jude');
});

test('sortBooks: Bible order, unknown books last', () => {
  assert.deepEqual(sortBooks(['Titus', 'Mark', 'Ruth', 'Zebulon', 'Psalms']), ['Ruth', 'Psalms', 'Mark', 'Titus', 'Zebulon']);
});

test('seriesSlug, titleWithoutSeries, blurb', () => {
  assert.equal(seriesSlug("Healthy Church: Paul's Letter to Titus"), 'healthy-church-pauls-letter-to-titus');
  assert.equal(titleWithoutSeries('Healthy Church: Healthy Members', "Healthy Church: Paul's Letter to Titus"), 'Healthy Members');
  assert.equal(titleWithoutSeries('Easter Day', 'Easter 2026'), 'Easter Day');
  assert.equal(titleWithoutSeries('Ruth: ', 'Ruth: Faithful Love'), 'Ruth: ');
  assert.equal(blurb(['One', 'Two']), 'One');
  assert.equal(blurb([]), '');
});

test('groupBySeries: newest series first, newest sermon first inside', () => {
  const s = (date, series) => ({ date, series, title: date });
  const groups = groupBySeries([s('2026-11-22', 'B'), s('2026-11-15', 'A'), s('2026-11-08', 'B'), s('2026-11-01', 'A')]);
  assert.deepEqual(groups.map((g) => g.name), ['B', 'A']);
  assert.deepEqual(groups[0].sermons.map((x) => x.date), ['2026-11-22', '2026-11-08']);
  assert.equal(groups[0].first, '2026-11-08');
  assert.equal(groups[0].last, '2026-11-22');
});
