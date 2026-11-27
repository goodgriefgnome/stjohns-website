// Pure sermon search & suggestion logic (DOM-free for browser filtering and Node unit tests).
import { seriesShortName } from './sermon-format.mjs';

export const FACETS = ['preacher', 'series', 'book', 'year'].map(kind => ({ kind, label: kind[0].toUpperCase() + kind.slice(1) }));
export const STOP_WORDS = new Set(
  'the and for with from that this into not but his her our you your all are was were only every about why who what when where how came come shows'.split(' '),
);

const SPLIT_RE = /[\s,.;:!?()[\]{}"/]+/;
const TERM_RE = /[\s,.;:!?()[\]{}"/·–—-]+/;
const isKeyword = (w) => w.length >= 4 && !STOP_WORDS.has(w);

/** Accent- and case-folded string ("Café" -> "cafe"). */
export const fold = (str) => str.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
/** Letter words (incl. accents, trimming outer apostrophes) for the keyword index. */
export const wordsIn = (str) => [...str.matchAll(/[\p{L}'’]+/gu)].map(m => m[0].replace(/^['’]+|['’]+$/g, '')).filter(Boolean);
/** Folded searchable terms split on whitespace/punctuation. */
export const splitTerms = (str) => fold(str).split(TERM_RE).filter(Boolean);
/** Chip label: series chips show only the short name before the colon. */
export const chipLabel = (chip) => (chip.kind === 'series' ? seriesShortName(chip.value) : chip.value);
/** Append `next`, replacing any existing chip of the same facet kind. */
export const withChip = (chips, next) => [...chips.filter(c => c.kind !== next.kind), next];
/** Folded keyword set for one sermon from title, full series title, and description. */
export const keywordsForSermon = (title, seriesFull, descriptionText = '') =>
  new Set(wordsIn(`${title} ${seriesFull} ${descriptionText}`).map(fold).filter(isKeyword));

/** Parse typed input into raw/folded words and whether the last word is still open. */
export function parseText(text) {
  const raw = text.split(SPLIT_RE).filter(Boolean);
  return { raw, words: raw.map(fold), open: raw.length > 0 && !SPLIT_RE.test(text.slice(-1)) };
}

/** Lowest-case, accent-preserving display form per keyword across all archive texts. */
export function buildKeywordDisplayMap(texts) {
  const map = new Map();
  for (const text of texts) {
    for (const word of wordsIn(text)) {
      const key = fold(word);
      if (!isKeyword(key)) continue;
      const chars = [...word.normalize('NFC')];
      const prev = map.get(key);
      if (!prev) { map.set(key, chars); continue; }
      if (prev.length !== chars.length) continue;
      map.set(key, prev.map((a, i) => {
        const b = chars[i];
        const base = a.normalize('NFD').length > 1 ? a : b.normalize('NFD').length > 1 ? b : a;
        return (a === a.toLowerCase() || b === b.toLowerCase()) ? base.toLowerCase() : base.toUpperCase();
      }));
    }
  }
  return new Map([...map].map(([k, chars]) => [k, chars.join('')]));
}

/** True if every word in phrase `q` prefix-matches consecutive terms in `terms`. */
export function matchesTerm(terms, q) {
  const p = splitTerms(q);
  return !p.length || terms.some((_, i) => p.every((w, j) => terms[i + j]?.startsWith(w)));
}

/** True if a sermon passes both active chips and typed words (AND). */
export const sermonMatches = (sermon, chips, words) =>
  chips.every(c => sermon[c.kind] === c.value) && words.every(w => matchesTerm(sermon.terms, w));

/** Facet matches: try the full text first, then the longest matching trailing-word run; starts-with ranked first. */
export function facetSuggestions(sermons, facetsByKind, chips, words) {
  for (let start = 0; start < words.length; start++) {
    const used = words.slice(start), rest = words.slice(0, start), phrase = used.join(' '), out = [];
    for (const { kind, label } of FACETS) {
      for (const value of facetsByKind[kind] ?? []) {
        if (chips.some(c => c.kind === kind && c.value === value)) continue;
        const terms = splitTerms(value);
        if (!used.every(w => terms.some(t => t.startsWith(w)))) continue;
        const nextChips = withChip(chips, { kind, label, value });
        if (!sermons.some(s => sermonMatches(s, nextChips, rest))) continue;
        out.push({ kind, label, value, consumed: used.length, words: used, starts: fold(value).startsWith(phrase), isFacet: true });
      }
    }
    if (out.length) return out.sort((a, b) => Number(b.starts) - Number(a.starts));
  }
  return [];
}

/** Keyword completions for an open last word, from passing sermons, ranked by count desc then alpha. */
export function keywordSuggestions(sermons, keywordDisplay, chips, words, open, facets) {
  if (!open || !words.length) return [];
  const last = words.at(-1), earlier = words.slice(0, -1), counts = new Map();
  for (const s of sermons) {
    if (!sermonMatches(s, chips, earlier)) continue;
    for (const w of s.kw) if (w.startsWith(last) && w !== last) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const facetVals = new Set(facets.map(f => fold(f.value)));
  return [...counts]
    .filter(([w]) => !facetVals.has(w))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([w]) => ({ kind: 'keyword', label: 'Keyword', value: keywordDisplay.get(w) ?? w, consumed: 1, words: [last], isFacet: false }));
}

/** Combined ordered suggestions: up to 5 facets then keywords, capped at 8. */
export function getSuggestions(sermons, facetsByKind, keywordDisplay, chips, text) {
  const { words, open } = parseText(text);
  if (!words.length) return [];
  const facets = facetSuggestions(sermons, facetsByKind, chips, words);
  return [...facets.slice(0, 5), ...keywordSuggestions(sermons, keywordDisplay, chips, words, open, facets)].slice(0, 8);
}

/** Split `text` into `{ text, match }` segments to bold prefix-matched words accent-insensitively. */
export function highlightSegments(text, words) {
  const segments = [];
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    const w = words.find(q => fold(part).startsWith(q));
    if (!w) { segments.push({ text: part, match: false }); continue; }
    let acc = '', cut = 0;
    for (const ch of part) { acc += fold(ch); cut += ch.length; if (acc.length >= w.length) break; }
    if (cut > 0) segments.push({ text: part.slice(0, cut), match: true });
    if (cut < part.length) segments.push({ text: part.slice(cut), match: false });
  }
  return segments;
}

/** Apply a picked suggestion: facet replaces trailing consumed words with a chip; keyword replaces the last word. */
export function applySuggestionState(chips, text, item) {
  const { raw } = parseText(text);
  const nextChips = item.isFacet ? withChip(chips, { kind: item.kind, label: item.label, value: item.value }) : chips;
  const joined = (item.isFacet ? raw.slice(0, raw.length - item.consumed) : [...raw.slice(0, -1), item.value]).join(' ');
  return { chips: nextChips, text: joined ? `${joined} ` : '' };
}
