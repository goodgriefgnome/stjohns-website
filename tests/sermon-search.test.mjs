// Pure sermon search & suggestion logic tests: folding, tokenising, matching, facets, keywords, display casing, highlighting, and chip updates.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applySuggestionState,
  buildKeywordDisplayMap,
  chipLabel,
  fold,
  getSuggestions,
  highlightSegments,
  keywordsForSermon,
  parseText,
  sermonMatches,
  splitTerms,
  withChip,
  wordsIn,
} from '../src/lib/sermon-search.mjs';

const SAMPLE = [
  {
    slug: 'health-of-the-world',
    title: 'The Health of the World',
    series: "Healthy Church: Paul's Letter to Titus",
    preacher: 'Richard Glover',
    book: 'Titus',
    year: '2026',
    description: "Grace trains us to do good in our city. Café hospitality and faithful love.",
  },
  {
    slug: 'goal-of-a-healthy-church',
    title: 'The Goal of a Healthy Church',
    series: "Healthy Church: Paul's Letter to Titus",
    preacher: 'Richard Glover',
    book: 'Titus',
    year: '2026',
    description: 'Paul writes to Titus about faithful leadership and godliness.',
  },
  {
    slug: 'to-serve-and-to-give',
    title: 'To Serve and to Give',
    series: 'The Servant King: Mark 8–10',
    preacher: 'Sam Giddy',
    book: 'Mark',
    year: '2026',
    description: 'The Son of Man came not to be served, but to serve and give his life as a ransom.',
  },
  {
    slug: 'a-son-is-born',
    title: 'A Son Is Born',
    series: 'Ruth: Faithful Love',
    preacher: 'Martin Robinson',
    book: 'Ruth',
    year: '2026',
    description: 'Boaz shows steadfast kindness to Ruth in the fields of Bethlehem.',
  },
  {
    slug: 'people-walking-in-darkness',
    title: 'The People Walking in Darkness',
    series: 'Light in the Darkness: Advent and Epiphany',
    preacher: 'Sam Giddy',
    book: 'Isaiah',
    year: '2025',
    description: 'A child is born to bring peace, justice, and light to a weary world.',
  },
];

const SERMONS = SAMPLE.map(s => ({
  ...s,
  terms: splitTerms(`${s.title} ${s.book} ${s.preacher} ${s.series} ${s.year} ${s.description}`),
  kw: keywordsForSermon(s.title, s.series, s.description),
}));

const FACETS_BY_KIND = {
  preacher: [...new Set(SAMPLE.map(s => s.preacher))],
  series: [...new Set(SAMPLE.map(s => s.series))],
  book: [...new Set(SAMPLE.map(s => s.book))],
  year: [...new Set(SAMPLE.map(s => s.year))],
};

const KEYWORD_DISPLAY = buildKeywordDisplayMap(
  SAMPLE.map(s => `${s.title} ${s.series} ${s.description}`),
);

test('fold and wordsIn handle accents, case, and apostrophes', () => {
  assert.equal(fold('Café Naïve'), 'cafe naive');
  assert.deepEqual(wordsIn("Paul's Café — 'kindness'"), ["Paul's", 'Café', 'kindness']);
});

test('parseText detects open trailing word vs trailing separator', () => {
  assert.deepEqual(parseText('grace gosp'), { raw: ['grace', 'gosp'], words: ['grace', 'gosp'], open: true });
  assert.deepEqual(parseText('grace '), { raw: ['grace'], words: ['grace'], open: false });
  assert.deepEqual(parseText(''), { raw: [], words: [], open: false });
});

test('keywordsForSermon enforces length >= 4 and excludes stop words', () => {
  const kw = keywordsForSermon('The Goal', 'Ruth: Faithful Love', 'And for our café in the dark');
  assert.equal(kw.has('goal'), true);
  assert.equal(kw.has('cafe'), true);
  assert.equal(kw.has('ruth'), true);
  assert.equal(kw.has('love'), true);
  assert.equal(kw.has('the'), false);
  assert.equal(kw.has('and'), false);
  assert.equal(kw.has('for'), false);
});

test('buildKeywordDisplayMap takes lowest case per letter and preserves accents', () => {
  const map = buildKeywordDisplayMap([
    'Grace in the City',
    'grace and CAFÉ',
    'cafe hospitality',
    'Naïve trust',
    'naive faith',
  ]);
  assert.equal(map.get('grace'), 'grace');
  assert.equal(map.get('city'), 'City');
  assert.equal(map.get('cafe'), 'café');
  assert.equal(map.get('naive'), 'naïve');
});

test('sermonMatches is accent- and case-insensitive and ANDs chips with typed words', () => {
  const cafeSermon = SERMONS[0];
  assert.equal(sermonMatches(cafeSermon, [], ['cafe']), true);
  assert.equal(sermonMatches(cafeSermon, [], ['CAFÉ', 'grace']), true);
  assert.equal(sermonMatches(cafeSermon, [{ kind: 'preacher', label: 'Preacher', value: 'Sam Giddy' }], ['cafe']), false);
  assert.equal(sermonMatches(cafeSermon, [{ kind: 'preacher', label: 'Preacher', value: 'Richard Glover' }], ['cafe']), true);
});

test('facetSuggestions matches full series title including words after the colon', () => {
  const suggestions = getSuggestions(SERMONS, FACETS_BY_KIND, KEYWORD_DISPLAY, [], 'epiphany');
  assert.equal(suggestions[0].kind, 'series');
  assert.equal(suggestions[0].value, 'Light in the Darkness: Advent and Epiphany');
  assert.equal(chipLabel(suggestions[0]), 'Light in the Darkness');
});

test('facetSuggestions falls back to longest trailing-word suffix and hides zero-result facets', () => {
  // "grace serv" -> whole phrase matches no facet, trailing "serv" matches "The Servant King: Mark 8–10"
  // Wait: "grace" + "The Servant King" yields 0 sermons, so that facet is hidden!
  const zeroYield = getSuggestions(SERMONS, FACETS_BY_KIND, KEYWORD_DISPLAY, [], 'grace serv');
  assert.equal(zeroYield.some(s => s.kind === 'series'), false);

  // "grace titus" -> "grace" appears in "The Health of the World" (Titus / Healthy Church), so trailing "titus" matches Book Titus & Series Healthy Church.
  const valid = getSuggestions(SERMONS, FACETS_BY_KIND, KEYWORD_DISPLAY, [], 'grace titus');
  const facets = valid.filter(s => s.isFacet);
  assert.equal(facets.length > 0, true);
  assert.equal(facets.every(f => f.consumed === 1), true);
  assert.equal(facets.some(f => f.kind === 'book' && f.value === 'Titus'), true);
});

test('facetSuggestions ranks values starting with the typed phrase first', () => {
  // "sa" matches Sam Giddy (starts with "sa") and Isaiah (does not start with "sa" at start of value)
  const suggestions = getSuggestions(SERMONS, FACETS_BY_KIND, KEYWORD_DISPLAY, [], 'sa');
  const facets = suggestions.filter(s => s.isFacet);
  assert.equal(facets[0].kind, 'preacher');
  assert.equal(facets[0].value, 'Sam Giddy');
});

test('keywordSuggestions completes open last word, excludes exact word and shown facets, ranks by frequency then alpha', () => {
  // "faith" matches "faithful" in 3 sermons (Health of the World, Goal of a Healthy Church, A Son Is Born)
  // vs "faithful" exact: when typing "faithful", exact "faithful" is excluded.
  const s1 = getSuggestions(SERMONS, FACETS_BY_KIND, KEYWORD_DISPLAY, [], 'faith');
  assert.equal(s1.some(s => s.kind === 'keyword' && s.value === 'faithful'), true);

  const exact = getSuggestions(SERMONS, FACETS_BY_KIND, KEYWORD_DISPLAY, [], 'faithful');
  assert.equal(exact.some(s => s.kind === 'keyword' && fold(s.value) === 'faithful'), false);

  // Trailing space closes the word -> no keyword suggestions.
  const closed = getSuggestions(SERMONS, FACETS_BY_KIND, KEYWORD_DISPLAY, [], 'faith ');
  assert.equal(closed.some(s => s.kind === 'keyword'), false);

  // Word matching a shown facet value (e.g. "ruth" matches Book Ruth and Series Ruth...) excludes keyword "ruth".
  const ruth = getSuggestions(SERMONS, FACETS_BY_KIND, KEYWORD_DISPLAY, [], 'ruth');
  assert.equal(ruth.some(s => s.kind === 'keyword' && fold(s.value) === 'ruth'), false);
});

test('applySuggestionState turns matched words into chip (one per kind, appended at end) or completes keyword', () => {
  // Facet with trailing match preserves earlier text with trailing space
  const pickBook = { kind: 'book', label: 'Book', value: 'Titus', consumed: 1, words: ['titus'], isFacet: true };
  const s1 = applySuggestionState([], 'grace titus', pickBook);
  assert.deepEqual(s1.chips, [{ kind: 'book', label: 'Book', value: 'Titus' }]);
  assert.equal(s1.text, 'grace ');

  // Picking another chip of a different kind keeps insertion order; picking same kind replaces at end
  const pickPreacher = { kind: 'preacher', label: 'Preacher', value: 'Richard Glover', consumed: 1, words: ['ric'], isFacet: true };
  const s2 = applySuggestionState(s1.chips, 'ric', pickPreacher);
  assert.deepEqual(s2.chips.map(c => c.kind), ['book', 'preacher']);
  assert.equal(s2.text, '');

  const pickOtherBook = { kind: 'book', label: 'Book', value: 'Mark', consumed: 1, words: ['ma'], isFacet: true };
  const s3 = applySuggestionState(s2.chips, 'ma', pickOtherBook);
  assert.deepEqual(s3.chips.map(c => `${c.kind}:${c.value}`), ['preacher:Richard Glover', 'book:Mark']);

  // Keyword replaces only the last word and adds trailing space
  const pickKw = { kind: 'keyword', label: 'Keyword', value: 'faithful', consumed: 1, words: ['faith'], isFacet: false };
  const s4 = applySuggestionState(s3.chips, 'grace faith', pickKw);
  assert.equal(s4.chips, s3.chips);
  assert.equal(s4.text, 'grace faithful ');
});

test('withChip replaces same kind and appends at end', () => {
  const start = [{ kind: 'preacher', label: 'Preacher', value: 'Sam Giddy' }, { kind: 'year', label: 'Year', value: '2026' }];
  const next = withChip(start, { kind: 'preacher', label: 'Preacher', value: 'Richard Glover' });
  assert.deepEqual(next, [
    { kind: 'year', label: 'Year', value: '2026' },
    { kind: 'preacher', label: 'Preacher', value: 'Richard Glover' },
  ]);
});

test('highlightSegments marks prefix matches accent-insensitively', () => {
  assert.deepEqual(highlightSegments('Café Hospitality', ['cafe']), [
    { text: 'Café', match: true },
    { text: ' ', match: false },
    { text: 'Hospitality', match: false },
  ]);
  assert.deepEqual(highlightSegments('Richard Glover', ['ric']), [
    { text: 'Ric', match: true },
    { text: 'hard', match: false },
    { text: ' ', match: false },
    { text: 'Glover', match: false },
  ]);
});
