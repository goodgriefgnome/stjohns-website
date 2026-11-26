# Writing a layout

A layout is one CSS file in this folder. Drop `quotes.css` in, and every page can write `:::quotes … :::`. You never touch code, the page's Markdown stays readable on GitHub, and the build checks your file (see [What the build checks](#what-the-build-checks)).

## The mental model

- **A page is a stack of sections.** `---` on its own line starts a new section.
- **A section** is a full-width stripe with a palette. Its settings, if any, go on a `::section{…}` line right under the `---`.
- **A layout block** (`:::columns`, `:::quotes`…) sits inside a section and arranges its **items**. Inside a layout block, a `---` starts a new item.
- **A behaviour** (for example `cycle`) is a shared switch that a layout or an author turns on. It is pure CSS like a layout, with looser rules (it may animate), so it is usually written by the developers. It lives in `theme/behaviours/`.
- **A component** (the accordion) is a self-contained piece placed anywhere in a section. Components need code.

In short: `---` splits whatever you are in. Layout writers write layouts. Behaviours are pure CSS too, but trickier, and components need code.

The author's side of all this is in `content/README.md`.

## The contract: what your CSS gets to style

The build turns each layout block into this HTML. You never write it, but you style it.

```html
<ul class="layout" role="list" data-layout="quotes" data-nth="odd" style="--item-count: 2">
  <li class="layout-item" style="--i: 0">
    <h3>…</h3>                                   <!-- the item's first block, whatever it is: heading, figure, paragraph… -->
    <div class="layout-body">…</div>              <!-- every later block, in order; left out if the item has only one block -->
  </li>
  …
</ul>
```

- **Items are a list** (`ul`/`li`, or `ol` if the author wrote a numbered list), so screen readers announce "list, N items". The base styles already remove the bullets, indents and margins; you never reset them.
- **Nothing is lifted or moved.** An item's contents stay in the order the author wrote them, and **the order in the Markdown is always the order shown on a narrow screen.** The one exception is a background.
  - The item's **first block** stays outside `.layout-body`, so a layout can line it up across items or use a leading picture as a background (cards do both).
  - A paragraph that holds only pictures becomes `<figure class="layout-figure" style="--image-count: N">` where it sits, each `img` numbered `--i`. An item can have several figures. A list holding only pictures is one figure too. A `:focus{at="x% y%"}` after a picture becomes its `object-position`. Pictures inside a text paragraph stay inline.
  - **Backgrounds:** style `.layout-item > figure:first-child` (for example `position: absolute; inset: 0`). Nothing is declared; an item that doesn't start with a picture just has no background. The author's `::no-background` line makes an empty `<figure class="layout-figure"></figure>` that holds that first place and shows nothing.
- On the block: `--item-count` is the number of items. On each item: `--i` numbers them from 0.
- `data-nth` is `odd` or `even`. It counts blocks **of the same layout** down the page, starting at odd. (`media` uses it to swap sides.)
- Headings keep the level the author gave them, and CSS sizes them by level. You don't resize them.
- Items never nest. To group items, an author puts a layout block inside an item.
- There is no "intro" or "after" box. Intro text and buttons belong to the section, outside the block.

## The ordering rule

On narrow screens items show in the order they're written. So `check-styles` fails a layout or behaviour file that uses `order`, `grid-row`, `grid-column`, `grid-area`, `grid-template-areas`, `flex-direction: row-reverse | column-reverse`, `flex-wrap: wrap-reverse` or `grid-auto-flow: dense` outside a `@container style(--section-size: wide) { … }` block. A background (`position: absolute` on the first figure) doesn't reorder anything, so it is allowed.

## Writing the file

The build wraps your file in `@scope ([data-layout="quotes"]) { … }`. So you write plain selectors (`h3`, `.layout-item`, `figure img`), and `:scope` means the block itself. Your rules only reach inside your own blocks.

### Sizes

Ask the section how wide it is, narrow layout first:

```css
@container style(--section-size: wide) {
  :scope { grid-template-columns: repeat(var(--item-count), 1fr); }
}
```

`--section-size` is `wide` once the section's content box is at least the reading width. It works on `:scope` and at any depth. To ask about the *window* instead (menus, galleries), use `@container style(--screen: wide)` or `style(--screen: medium) or style(--screen: wide)`. Never write a width yourself.

### Declaring inputs

A layout lists its inputs in its **header comment**: the first thing in the file. The build reads it and checks it.

```css
/* Quotes: short testimonials in a row, stacked on phones.
   Variables:
     --quotes-gap    space between quotes (default --space-md)
   Options:
     size = normal | large   (large uses --font-heading for the quote text) */
```

- The first line says, in plain English, what the layout is for.
- **Variables** are CSS variables that other CSS may set (a behaviour, the theme, a page's own style). Names start with the layout's name (`--quotes-…`), so two layouts can't clash. Set each one at the top of the file, on `:scope`, with a one-line comment saying what it does. Every variable your file reads must be declared here, a token, a role, or one of the contract variables (`--i`, `--item-count`, `--image-count`, `--section-size`, `--images`). A declared variable you never use is an error.
- **Options** are the only inputs authors set from Markdown (`:::quotes{size="large"}`). They are named choices, never raw numbers. The block gets `data-size="large"`, and your CSS maps it to tokens: `:scope[data-size="large"] { … }`. An author who uses an undeclared option or value gets a build error.
- Every layout also accepts `images="<behaviour>"` (see below).

### Behaviours

A behaviour file in `theme/behaviours/<name>.css` listens for a flag:

```css
@container style(--images: cycle) { img { … } }
```

A layout can turn one on with one line (`figure { --images: cycle; }`), and an author can set `images="cycle"` on a block. The one that exists today is `cycle`: the pictures in a figure fade into each other in turn, timed by `--cycle-time` (a role, in `roles.css`). With reduced motion on, only the first picture shows.

## What the build checks

`npm run check-styles` (part of every build) checks `theme/layouts/*.css` with the same rules as the rest of the site:

- colours, lengths and font sizes come from tokens and roles (no loose numbers, no raw colours), and there are no width queries;
- the header comment, as above: a first line, variables prefixed with the file's name and all used, nothing undeclared read;
- no `!important`, `@import`, `url()`, `@keyframes` or `@media` (motion belongs in behaviours), no `position: fixed`, no selectors for `html`, `body` or `:root`.

Behaviour files follow the same rules, except that `@keyframes` and `@media (prefers-reduced-motion: …)` are allowed. Every `animation` must sit inside `@media (prefers-reduced-motion: no-preference)`, and keyframe names start with the behaviour's name (`cycle-…`).

A layout's name is its filename: lower-case letters, digits and hyphens. These names are taken: `band banner section accordion center column icon lead`.

## Worked example: a `quotes` layout

Say we want testimonials in a row, stacked on phones, with the quote large when asked. We want authors to write:

```
:::quotes{size="large"}
---
"Such a welcoming church." Jo
---
"The music is wonderful." Sam
:::
```

(Remember the blank lines before each `---` if the line above is text.) The whole of `theme/layouts/quotes.css` would be:

```css
/* Quotes: short testimonials in a row, stacked on phones.
   Variables:
     --quotes-gap    space between quotes (default --space-md)
   Options:
     size = normal | large   (large uses --font-heading for the quote text) */
:scope {
  /* Space between quotes. */
  --quotes-gap: var(--space-md);
  display: grid;
  gap: var(--quotes-gap);
}
.layout-item {
  padding: var(--space-sm);
  border-left: var(--line-bar) solid var(--sky);
}
.layout-body > :last-child { margin-bottom: 0; }
:scope[data-size='large'] .layout-body p { font-size: var(--font-heading); }

@container style(--section-size: wide) {
  :scope { grid-template-columns: repeat(var(--item-count), minmax(0, 1fr)); }
}
```

That is all: no HTML, no JavaScript, no other file to edit. (This example is not shipped; add it as a file when a page needs it.)

## The layouts that exist

Their header comments, so everyone can see every input in one place:

| Layout | Header |
|---|---|
| `columns` | Items side by side, one column each, stacked on phones. Nothing lines up across columns. A block with one item flows into two columns on wide screens, keeping paragraphs whole. Variables: `--columns-gap`. |
| `cards` | Cards side by side, stacked on phones. A picture that starts a card fills it behind the text. On wide screens cards line up first block, middle block, last block. Variables: `--cards-height`, `--cards-scrim`. Options: `align = bottom \| top`, `fill = white \| mist \| blue \| cream \| navy`. |
| `media` | One block is one row of two items, a picture and text; on wide screens it swaps sides block by block. Variables: `--media-gap`. Options: `image = left \| right`. |
| `gallery` | A row of square photos, stacked on phones. Variables: `--gallery-gap`. |

## When the HTML changes

The shape above is a contract. `tests/layout-contract/` runs a fixture page through the real Markdown pipeline and compares the HTML with `expected.html` on every build; each error message authors can hit has a small failing example too. If you change the contract on purpose, update the expected file with `UPDATE=1 npm test` and review the diff.
