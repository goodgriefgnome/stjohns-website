# Styles: where does this go?

Files are sorted by **blast radius**: the file you're editing tells you how much of the site the edit can change.

```
tokens.css        raw values: colours, the size and weight scales, widths, radii, band spacing, and the --screen flag
roles.css         what values are FOR (--text-*, --photo-scrim, --font-*, --weight-*) and the five band palettes
base.css          bare element defaults: @font-face, :root, body, img, a, headings, p
patterns/         layout of the page: page-grid, band, columns, cards, media, gallery, photo-backdrop, wrap
components/       small pieces: action (buttons), icon, accordion, date
```

Imported in that order by `Site.astro`. Astro components that live in one file (navigation, Events, Sermons, SermonEpisode, ConcertProgram, Page, Site, index.astro) keep their own scoped `<style>` block, but use tokens and roles, never raw values.

## Rules

1. **Dependencies point down only.** components → patterns → base → roles → tokens. A file never names a class owned by another pattern or component. (Known exceptions: `page-grid.css` places `.band-outer` and `.gallery`, which are its direct children; `cards.css` styles its own `.col` children.)
2. **Each fact lives in one place.** Raw colours only in `tokens.css`. Palette names are listed in `src/lib/palettes.mjs` (for editor autocomplete) and checked against `roles.css`. Each width breakpoint is written once.
3. **Patterns expose knobs**, local custom properties documented in a comment at the top of the pattern's file. Nobody restyles a pattern's insides from outside.
4. **Flat, low-specificity selectors.** Single classes, no nesting under `.page-content` (only `page-grid.css` and `accordion.css` mention it). Use `:where()` when a default must be easy to override.
5. **Class prefix tells you the layer.** `band-*`, `cols`/`col`/`cards`, `media`, `gallery`, `page-*` are patterns; `action*`, `icon*`, `accordion`, `date` are components.
6. **No cascade layers** (decided in 82c5eae; revisit if specificity fights appear).

## Breakpoints: two questions

Nothing writes a width except `tokens.css` and `band.css`. Ask a named question instead, narrow layout first:

- **Window width** (header, hero, footer, gallery): `@container style(--screen: wide) { … }`, or `style(--screen: medium) or style(--screen: wide)` for "wider than narrow". `tokens.css` sets `--screen` to narrow (up to 42rem), medium (up to 56rem) or wide.
- **Band width** (columns, cards, media, events list): `@container style(--band-size: wide) { … }`. Every band is two boxes, `.band-outer` (measured) and `.band-inner` (carries `--band-size`). A style query reads the *parent's* flag, so a rule can't style the element that sets the flag: put the layout on a child of `.band-inner`. Always make both boxes together; `check-styles` fails if markup makes a `band-outer` without a `band-inner`.

42rem is deliberately `--reading-width`; change them together.

## Where does a new style go?

- *A new brand colour:* a raw value in `tokens.css`; a role in `roles.css` if it has a job.
- *Make all dates a bit bolder:* the role it uses (`--weight-label`?) in `roles.css`, or `components/date.css` if it's only dates.
- *A new kind of layout inside a band (say a timeline):* a new file in `patterns/` with knobs documented at the top, asking `--band-size`; import it in `Site.astro`.
- *A one-off tweak to the events list:* the scoped `<style>` in `Events.astro`, using roles for any size or colour. If you need a size that no role has, snap to the nearest role or add a general role.

## Knobs

| Pattern | Knobs |
|---|---|
| page-grid | `--page-measure` |
| band | `--band-measure`, `--band-size` (set for you) |
| columns | `--column-count` (set by the directive) |
| cards | `--column-count`, `--card-height`, `--scrim` |
| photo-backdrop | `--scrim` |
| action | `--action-bg`, `--action-text` (from the band's palette) |

## Commands

- `npm run check-styles` fails on: a palette missing from `palettes.mjs` or the CSS, a raw colour outside `tokens.css`, a `font-size`/`font-weight` that isn't a `--font-*`/`--weight-*` role (or `inherit`/`1em`), a width query outside `tokens.css`/`band.css`, a `band-outer` with no `band-inner`. It runs at the start of `npm run build`.
- `npm run visual-diff` compares every page (390 and 1280px) against `HEAD` and lists pages that changed. A pure refactor should report none.

## Glossary

- **token**: a raw value with a name (`--navy`, `--size-lg`).
- **role**: what a token is for (`--text-muted`, `--font-body`); change it to restyle every use.
- **palette**: a band's background, text and button colours.
- **band**: a full-width stripe of the page with its own palette (`.band-outer` around `.band-inner`).
- **pattern**: a reusable layout (columns, cards, media, gallery).
- **component**: a small reusable piece (button, icon, accordion).
- **knob**: a custom property a pattern reads so you can adjust it from outside without touching its insides.
