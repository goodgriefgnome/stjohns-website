// Small helpers for showing sermons: dates, lengths, books, series. Plain functions so tests can run them.

// A sermon's date is a calendar day (YYYY-MM-DD), not a moment, so it is formatted as the same day everywhere.
const at = (day) => new Date(`${day}T00:00:00Z`);
const format = (options) => new Intl.DateTimeFormat('en-AU', { ...options, timeZone: 'UTC' });
const monthShort = format({ month: 'short' });
const monthYearShort = format({ month: 'short', year: 'numeric' });
const monthYearLong = format({ month: 'long', year: 'numeric' });
const dayMonth = format({ day: 'numeric', month: 'short' });

/** "15 Nov" */
export const shortDay = (day) => dayMonth.format(at(day));

/** The months a series ran: "November 2026", "Sept – Nov 2026" or "Dec 2025 – Feb 2026". */
export function dateSpan(first, last) {
  const [a, b] = [at(first), at(last)];
  if (monthYearShort.format(a) === monthYearShort.format(b)) return monthYearLong.format(b);
  if (a.getUTCFullYear() === b.getUTCFullYear()) return `${monthShort.format(a)} – ${monthYearShort.format(b)}`;
  return `${monthYearShort.format(a)} – ${monthYearShort.format(b)}`;
}

/** 1851 seconds -> 31 */
export const minutes = (seconds) => Math.round(seconds / 60);

/** 1851 seconds -> "30:51" (or "1:02:03" for an hour or more) */
export function clock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const [h, m, s] = [Math.floor(whole / 3600), Math.floor(whole / 60) % 60, whole % 60];
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** "Healthy Church: Paul's Letter to Titus" -> "healthy-church-pauls-letter-to-titus" (used in ?series= links) */
export const seriesSlug = (name) =>
  name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** "Healthy Church: Paul's Letter to Titus" -> "Healthy Church" */
export const seriesShortName = (name) => name.split(':')[0].trim();

/** Drops a leading "Series short name: " from a title, e.g. "Healthy Church: Healthy Members" -> "Healthy Members". */
export function titleWithoutSeries(title, series) {
  const prefix = `${seriesShortName(series)}: `;
  return title.startsWith(prefix) && title.length > prefix.length ? title.slice(prefix.length) : title;
}

/** The first paragraph of a description, used as the one-line blurb. */
export const blurb = (description) => description[0] ?? '';

// The books in Bible order, for sorting the Book filter.
export const bibleBooks = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Songs', 'Isaiah',
  'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
  'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

/** "1 John 3:1–10" -> "1 John", "Psalm 121" -> "Psalms": the text before the chapter number. */
export function bookOf(scripture) {
  const text = scripture.trim();
  const book = (text.match(/^(.+?)\s+\d/)?.[1] ?? text).trim();
  return book === 'Psalm' ? 'Psalms' : book;
}

/** Sorts books in Bible order; any book not in the list goes last, in the order given. */
export function sortBooks(books) {
  const rank = (book) => { const i = bibleBooks.indexOf(book); return i === -1 ? Infinity : i; };
  return [...books].sort((a, b) => rank(a) - rank(b));
}

/**
 * Groups sermons into series, newest series first (by its latest sermon), each with its sermons newest first.
 * Expects sermons already sorted newest first.
 */
export function groupBySeries(sermons) {
  const groups = new Map();
  for (const sermon of sermons) {
    if (!groups.has(sermon.series)) groups.set(sermon.series, []);
    groups.get(sermon.series).push(sermon);
  }
  return [...groups].map(([name, items]) => ({
    name, slug: seriesSlug(name), sermons: items, first: items.at(-1).date, last: items[0].date,
    artwork: items.find((s) => s.artwork)?.artwork,
  })).sort((a, b) => b.last.localeCompare(a.last));
}
