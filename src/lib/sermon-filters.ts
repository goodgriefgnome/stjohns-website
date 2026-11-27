// The sermons archive search bar, chip facets, single-row suggestions, and URL sync (markup: SermonArchive.astro).
// Pure matching/suggestion logic lives in sermon-search.mjs; this module wires DOM events, overflow dropping, and history.replaceState.
import { faBookOpen, faCalendar, faLayerGroup, faUser, faXmark } from '@fortawesome/free-solid-svg-icons';
import { sortBooks } from './sermon-format.mjs';
import {
  applySuggestionState, buildKeywordDisplayMap, chipLabel, FACETS, getSuggestions,
  highlightSegments, keywordsForSermon, parseText, sermonMatches, splitTerms, withChip,
} from './sermon-search.mjs';

type FacetKind = 'preacher' | 'series' | 'book' | 'year';
type Chip = { kind: FacetKind; label: string; value: string };
type Suggestion = { kind: FacetKind | 'keyword'; label: string; value: string; consumed: number; words: string[]; isFacet: boolean };

const ICONS: Record<FacetKind | 'xmark', typeof faUser> = {
  preacher: faUser, series: faLayerGroup, book: faBookOpen, year: faCalendar, xmark: faXmark,
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...children: (Node | string)[]) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

function svgIcon({ icon: [w, h, , , d] }: typeof faUser) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of [['class', 'archive-fa-svg'], ['viewBox', `0 0 ${w} ${h}`], ['aria-hidden', 'true'], ['focusable', 'false']]) svg.setAttribute(k, v);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', Array.isArray(d) ? d[0] : d);
  svg.append(path);
  return svg;
}

const facetIcon = (cls: string, kind: FacetKind, label: string) =>
  el('span', { class: cls, title: label }, svgIcon(ICONS[kind]), el('span', { class: 'visually-hidden' }, `${label}: `));

const highlighted = (text: string, words: string[]) =>
  highlightSegments(text, words).map(s => (s.match ? el('mark', {}, s.text) : s.text));

function suggestionLabel(item: Suggestion): (Node | string)[] {
  const cut = item.kind === 'series' ? item.value.indexOf(':') : -1;
  if (cut === -1) return highlighted(item.value, item.words);
  return [
    ...highlighted(item.value.slice(0, cut), item.words),
    el('span', { class: 'archive-ac-sep', 'aria-hidden': 'true' }),
    el('span', { class: 'archive-ac-subtitle' }, el('span', { class: 'visually-hidden' }, ': '), ...highlighted(item.value.slice(cut + 1).trim(), item.words)),
  ];
}

export function startSermonFilters(archive: HTMLElement) {
  const [shell, box, tokens, input, clearBtn, popover, empty] = [
    '.archive-search-shell', '[data-search-box]', '[data-tokens]', '[data-search-input]', '[data-clear-btn]', '[data-suggestions]', '.archive-empty',
  ].map(s => archive.querySelector(s)) as [HTMLElement, HTMLElement, HTMLElement, HTMLInputElement, HTMLButtonElement, HTMLElement, HTMLElement];
  if (!shell || !box || !tokens || !input || !clearBtn || !popover || !empty) return;

  // Derive series slugs, facets, searchable terms, and keywords directly from the rendered list.
  const seriesToSlug = new Map<string, string>(), kwTexts: string[] = [];
  const rowsByGroup = [...archive.querySelectorAll<HTMLElement>('.archive-series')].map(group => {
    const slug = group.dataset.seriesGroup ?? '', series = group.querySelector('.archive-strip > span')?.textContent ?? '';
    if (series && slug) seriesToSlug.set(series, slug);
    const records = [...group.querySelectorAll<HTMLElement>('li')].map(row => {
      const { preacher = '', book = '', year = '', search = '' } = row.dataset;
      const meta = row.querySelector('.sermon-meta')?.textContent ?? '';
      kwTexts.push(`${search} ${series}`);
      return { el: row, series, preacher, book, year, terms: splitTerms(`${search} ${meta} ${series} ${year}`), kw: keywordsForSermon(search, series) };
    });
    return { group, records };
  });
  const slugToSeries = new Map([...seriesToSlug].map(([name, slug]) => [slug, name]));
  const allSermons = rowsByGroup.flatMap(g => g.records);
  const keywordDisplay = buildKeywordDisplayMap(kwTexts);
  const unique = (vals: string[]) => [...new Set(vals.filter(Boolean))];
  const facets: Record<FacetKind, string[]> = {
    preacher: unique(allSermons.map(s => s.preacher)).sort((a, b) => a.localeCompare(b)),
    series: [...seriesToSlug.keys()],
    book: sortBooks(unique(allSermons.map(s => s.book))),
    year: unique(allSermons.map(s => s.year)).sort((a, b) => b.localeCompare(a)),
  };

  let chips: Chip[] = [], suggestions: Suggestion[] = [], activeIndex = -1;
  const params = new URLSearchParams(location.search);
  for (const { kind, label } of FACETS as { kind: FacetKind; label: string }[]) {
    const raw = params.get(kind), value = kind === 'series' ? slugToSeries.get(raw ?? '') : raw;
    if (value && facets[kind].includes(value)) chips = withChip(chips, { kind, label, value });
  }
  let text = (input.value = params.get('q') ?? '');

  function updateSelection() {
    const options = [...popover.children] as HTMLElement[];
    options.forEach((opt, idx) => opt.setAttribute('aria-selected', String(idx === activeIndex)));
    if (activeIndex >= 0 && options[activeIndex]) input.setAttribute('aria-activedescendant', options[activeIndex].id);
    else input.removeAttribute('aria-activedescendant');
  }

  function renderPopover() {
    suggestions = getSuggestions(allSermons, facets, keywordDisplay, chips, text);
    if (activeIndex >= suggestions.length) activeIndex = suggestions.length ? 0 : -1;
    popover.replaceChildren(...suggestions.map((item, idx) => el(
      'button',
      { type: 'button', id: `archive-option-${idx}`, class: 'archive-ac-option', role: 'option', 'data-idx': String(idx), 'aria-selected': String(idx === activeIndex) },
      ...(item.kind !== 'keyword' ? [facetIcon('archive-ac-icon', item.kind, item.label)] : []),
      el('span', {}, ...suggestionLabel(item)),
    )));
    // One line only: drop pills that overflow and exclude them from keyboard navigation.
    const limit = popover.getBoundingClientRect().right;
    if (limit > 0) {
      const pills = [...popover.children] as HTMLElement[];
      const fit = pills.findIndex(p => p.getBoundingClientRect().right > limit + 0.5);
      if (fit !== -1) {
        pills.slice(fit).forEach(p => p.remove());
        suggestions = suggestions.slice(0, fit);
        if (activeIndex >= fit) activeIndex = fit ? 0 : -1;
      }
    }
    input.setAttribute('aria-expanded', String(suggestions.length > 0));
    updateSelection();
  }

  function render() {
    for (const node of tokens.querySelectorAll('.archive-chip')) node.remove();
    chips.forEach((chip, idx) => {
      const displayVal = chipLabel(chip);
      const removeBtn = el('button', { type: 'button', class: 'archive-chip-remove', 'aria-label': `Remove ${chip.label.toLowerCase()} ${displayVal}` }, svgIcon(ICONS.xmark));
      removeBtn.addEventListener('click', event => { event.stopPropagation(); chips.splice(idx, 1); render(); input.focus(); });
      tokens.insertBefore(el('span', { class: 'archive-chip' }, facetIcon('archive-chip-icon', chip.kind, chip.label), el('span', { class: 'archive-chip-val' }, displayVal), removeBtn), input);
    });
    clearBtn.hidden = !chips.length && !text.trim();
    input.placeholder = chips.length ? 'Add another filter or search…' : 'Search sermons, preachers, books, series…';

    renderPopover();

    const { words } = parseText(text);
    let shown = 0;
    for (const { group, records } of rowsByGroup) {
      let matches = 0;
      for (const rec of records) { const match = sermonMatches(rec, chips, words); rec.el.hidden = !match; if (match) matches++; }
      shown += matches;
      group.hidden = matches === 0;
    }
    empty.hidden = shown > 0;

    const next = new URLSearchParams();
    for (const chip of chips) { const val = chip.kind === 'series' ? seriesToSlug.get(chip.value) : chip.value; if (val) next.set(chip.kind, val); }
    if (text.trim()) next.set('q', text.trim());
    const query = next.toString();
    // Preserve history.state used by sermon-swap.ts.
    history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
  }

  function applySuggestion(item: Suggestion) {
    ({ chips, text } = applySuggestionState(chips, text, item));
    input.value = text;
    activeIndex = -1;
    render();
    input.focus();
  }

  shell.hidden = false;
  box.addEventListener('click', () => input.focus());
  input.addEventListener('input', () => { text = input.value; activeIndex = 0; render(); });
  input.addEventListener('keydown', event => {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
      event.preventDefault();
      activeIndex = event.key === 'ArrowDown' ? (activeIndex + 1) % suggestions.length : (activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1);
      updateSelection();
    } else if (event.key === 'Enter' && activeIndex >= 0 && suggestions.length) { event.preventDefault(); applySuggestion(suggestions[activeIndex]); }
    else if (event.key === 'Escape' && activeIndex >= 0) { event.preventDefault(); activeIndex = -1; updateSelection(); }
    else if (event.key === 'Backspace' && input.value === '' && chips.length) { chips.pop(); render(); }
  });
  popover.addEventListener('mousedown', event => {
    const btn = (event.target as Element).closest<HTMLElement>('.archive-ac-option');
    if (!btn) return;
    event.preventDefault();
    const item = suggestions[Number(btn.dataset.idx)];
    if (item) applySuggestion(item);
  });
  clearBtn.addEventListener('click', event => { event.stopPropagation(); chips = []; text = input.value = ''; activeIndex = -1; render(); input.focus(); });

  let resizeRaf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => { if (suggestions.length || text.trim()) renderPopover(); });
  });

  render();
}
