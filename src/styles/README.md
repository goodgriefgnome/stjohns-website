# Styles: where does this go?

Files are sorted by **blast radius**: the file you're editing tells you how much of the site the edit can change.

```
screen.css        the --screen flag (narrow/medium/wide), the one breakpoint definition (code, so it stays in src/styles)
theme/tokens.css  raw values: colours, the size, weight, spacing, line and radius scales, widths, section spacing
theme/roles.css   what values are FOR (--text-*, --photo-scrim, --font-*, --weight-*, hero and menu sizes) and the five section palettes
base.css          bare element defaults: @font-face, :root, body, img, a, headings, p
patterns/         layout of the page: page-grid, section, photo-backdrop, wrap
theme/layouts/    one file per layout block (columns, cards, media, gallery), wrapped in @scope by the build
theme/behaviours/ shared switches a layout or author turns on (cycle), site-wide CSS
components/       small pieces: action (buttons), icon, accordion, date, label
```

`theme/` is the editor-facing look (tokens and roles); everything else here is code. Imported in that order by `Site.astro`. Astro components that live in one file (navigation, Events, Sermons, SermonEpisode, ConcertProgram, Page, Site, index.astro) keep their own scoped `<style>` block, but use tokens and roles, never raw values.

## Rules

1. **Dependencies point down only.** components → patterns → base → roles → tokens. A file never names a class owned by another pattern or component. (Known exception: `page-grid.css` places `.section-outer`, which is its direct child.)
2. **Each fact lives in one place.** Raw colours only in `tokens.css`. Palette names are listed in `theme/palettes.mjs` (for editor autocomplete) and checked against `roles.css`. Each width breakpoint is written once.
3. **Patterns expose CSS variables**, local custom properties documented in a comment at the top of the pattern's file. Nobody restyles a pattern's insides from outside. A layout declares its variables and options in its header comment, and `check-styles` verifies them (see `theme/layouts/README.md`).
4. **Flat, low-specificity selectors.** Single classes, no nesting under `.page-content` (only `page-grid.css` and `accordion.css` mention it). Use `:where()` when a default must be easy to override.
5. **Class prefix tells you the layer.** `section-*`, `page-*` are patterns; `layout`, `layout-item`, `layout-figure`, `layout-body` are the contract every layout block shares (made by the Markdown plugin, styled by the layout files); `action*`, `icon*`, `accordion`, `date` are components.
6. **No cascade layers** (decided in 82c5eae; revisit if specificity fights appear).

## Sizes, spacing, lines and corners

- **No loose numbers.** Every length is a token, a role, or a formula built from them. Spacing uses `--space-3xs … --space-xl`, line thickness `--line-thin/medium/thick/bar`, corners `--radius-sm/md/round/pill`. Derived values are written as the formula (`calc(50% - var(--dot-size) / 2)`), never as a constant.
- A measurement that must stay exact (a button's padding, a drawn size such as the menu button or logo) is a **role** in `roles.css`. A value used by one component only is a **local CSS variable**: a custom property at the top of that component's style block with a one-line comment (`--burger-gap: 9px` in `SiteNavigation.astro`). Custom properties are the only place a raw number may appear outside `tokens.css` and `roles.css` (and layout files may not use raw numbers even there: they use tokens and roles).
- **Headings are sized by level**, wherever they sit: h1 `--font-title` (the biggest), every `##` `--font-heading`, every `###` `--font-h3`. Don't resize a heading because of where it is; footer headings are the one exception (labels, `--font-subheading`).
- **Every page has a hero** (class `.hero`, one look, styled by `patterns/hero.css`): Markdown pages write it as `::hero` (or get `defaultHero` from `imported/church.json` plus the title); pages in Astro use `Hero.astro`, which emits the same markup. Don't call it "header", which means the site header (logo and menu).

## Content: sections, layouts and widths

- `---` in a page starts a **section** (`.section-outer` around `.section-inner`, made by `src/lib/remark-layouts.mjs`). `::section{palette, align, text}` sets its look; `::banner` is a centred navy section. Section splitting is its own pass in the plugin, so a per-page switch that turns `---` back into a plain rule can be added later.
- **A section is always wide and each child picks its own width.** Ordinary text sits in a centred column of `--section-measure` (`--reading-width`, or `--layout-width` with `text="wide"`). Layout blocks fill the section. A page with `width: reading` caps everything at the reading width through `--page-measure`.
- `:::name` is a **layout block** from `theme/layouts/name.css`: columns, cards, media, gallery. Inside it `---` starts an item; items are `ul`/`li` holding the blocks in the order written (the first block, then a `.layout-body`). The build wraps each layout file in `@scope ([data-layout="name"])` (`src/lib/vite-theme-css.mjs`). Layouts are written against the contract in `theme/layouts/README.md`; authors read `content/README.md`.
- `theme/behaviours/` holds shared switches such as `cycle` (`--images: cycle`).
- Still directives of their own: `:::accordion` (one list: first paragraph of each item is the title, the rest is the body) and `:::center` (and `align="center"`: both set `data-align`, one CSS rule).
- A gallery is a layout written as a list.

## Breakpoints: two questions

Nothing writes a width except `screen.css` and `section.css`. Ask a named question instead, narrow layout first:

- **Window width** (header, hero, footer, gallery): `@container style(--screen: wide) { … }`, or `style(--screen: medium) or style(--screen: wide)` for "wider than narrow". `screen.css` sets `--screen` to narrow (up to 42rem), medium (up to 56rem) or wide.
- **Section width** (columns, cards, media, events list): `@container style(--section-size: wide) { … }`. Every section is two boxes, `.section-outer` (measured) and `.section-inner` (carries `--section-size`). A style query reads the *parent's* flag, so a rule can't style the element that sets the flag: put the layout on a child of `.section-inner`. Always make both boxes together; `check-styles` fails if markup makes a `section-outer` without a `section-inner`.

42rem is deliberately `--reading-width`; change them together.

## Where does a new style go?

- *A new brand colour:* a raw value in `tokens.css`; a role in `roles.css` if it has a job.
- *Make all dates a bit bolder:* the role it uses (`--weight-label`?) in `roles.css`, or `components/date.css` if it's only dates.
- *A new kind of layout inside a section (say a timeline):* one file `theme/layouts/timeline.css` with a header comment declaring its variables and options, asking `--section-size`. Nothing else to edit (see `theme/layouts/README.md`).
- *A new shared switch (say a slow zoom):* `theme/behaviours/zoom.css`, listening for a flag such as `@container style(--images: zoom)`; keep animations inside `prefers-reduced-motion: no-preference`.
- *A one-off tweak to the events list:* the scoped `<style>` in `Events.astro`, using roles for any size or colour. If you need a size that no role has, snap to the nearest role or add a general role.

## CSS variables

| Pattern | CSS variables |
|---|---|
| page-grid | `--page-measure` |
| section | `--section-measure`, `--section-image-max-height`, `--section-size` (set for you) |
| photo-backdrop | `--scrim` |
| hero | `--hero-fade`, `--photo-shadow-tight`, `--photo-shadow-wide` (roles in `roles.css`) |
| action | `--action-bg`, `--action-text` (from the section's palette) |
| columns, cards, media, gallery | each declares its own in its header comment in `theme/layouts/` |
| cycle | `--cycle-time` (a role in `roles.css`) |

## Commands

- `npm run check-styles` fails on: a palette missing from `theme/palettes.mjs` or the CSS, a raw colour outside `tokens.css`, a raw length (rem, px, em, vw…) in any property outside `theme/tokens.css`/`theme/roles.css`/custom properties, a `font-size`/`font-weight` that isn't a `--font-*`/`--weight-*` role (or `inherit`/`1em`), a width query outside `screen.css`/`section.css`, a `section-outer` with no `section-inner`, and the rules for layout and behaviour files (header comment; declared variables prefixed with the file's name, all used, nothing undeclared read; no `!important`, `@import`, `url()`, `@keyframes`, `@media`, `position: fixed` or `html`/`body`/`:root` selectors; behaviours may animate only inside `prefers-reduced-motion: no-preference`). It runs at the start of `npm run build`, followed by `npm test` (the layout contract snapshot and each author-facing error message).
- `npm run visual-diff` compares every page (390 and 1280px) against `HEAD` and lists pages that changed. A pure refactor should report none.

## Glossary

- **token**: a raw value with a name (`--navy`, `--size-lg`).
- **role**: what a token is for (`--text-muted`, `--font-body`); change it to restyle every use.
- **palette**: a section's background, text and button colours.
- **section**: a full-width stripe of the page with its own palette (`.section-outer` around `.section-inner`).
- **layout**: a block that arranges items, from one file in `theme/layouts/` (columns, cards, media, gallery).
- **behaviour**: a shared switch (`cycle`) a layout or an author turns on, from `theme/behaviours/`.
- **pattern**: reusable page structure in `src/styles/patterns/` (page grid, section).
- **component**: a small reusable piece (button, icon, accordion).
- **CSS variable**: a custom property a pattern or layout reads so you can adjust it from outside without touching its insides.
