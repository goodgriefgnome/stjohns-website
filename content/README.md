# Writing pages

Every file in this folder is one page of the website. `about.md` becomes `/about`, and `index.mdx` is the home page. You don't need to know any code: you write plain text with a few extra marks, and the layouts (columns, cards, pictures beside text) are already made for you.

If you make a mistake, the site refuses to build and says what is wrong. The [last section](#when-the-build-says-no) explains each message.

## The top of a page

Every page starts with a few settings between two lines of `---`:

```
---
title: Music Ministry & Choir
hero: /media/3595ec07d9070fb1a02d.webp
heroFocus: [50, 40]
heroSubtitle: A line under the title
width: standard
palette: white
---
```

| Setting | What it does |
|---|---|
| `title` | The page title, shown over the big photo at the top. Required. |
| `hero` | The big photo at the top. Leave it out to use the site's default photo. |
| `heroFocus` | Which part of the photo to keep when it is cropped: `[across, down]`, each 0 to 100. `[50, 50]` is the middle. |
| `heroSubtitle` | A small line under the title. |
| `width` | `reading` (the default) keeps everything in a narrow column. `standard` lets sections and layouts use the full width of the page. Use `standard` for pages with columns, cards, pictures beside text, or galleries. |
| `palette` | The colour of the page behind everything: `white`, `mist`, `blue`, `cream` or `navy`. |

## A page is a stack of sections

A line with only `---` starts a new section. A section is a stripe across the whole page, and it can have its own colour.

```
## Who we are

Some text about the church.

---
::section{palette="blue" align="center"}
## What people say

Some more text.

---
::banner
Join us this Sunday at 10am.
```

This page has three sections: the first (no settings), a blue one with centred text, and a banner.

**Always leave a blank line before `---`.** Without it, Markdown turns the line above into a big heading instead.

### Settings for a section

Put a `::section{…}` line right under the `---` (it must be the first line of the section). All the settings are optional:

| Setting | Choices | What it does |
|---|---|---|
| `palette` | `white`, `mist`, `blue`, `cream`, `navy` | The colour of the stripe. Without it the section takes the page's colour. |
| `align` | `left`, `center` | Where the text sits. Headings are centred unless you say `left`. |
| `text` | `reading`, `wide` | How wide ordinary text runs. `reading` (the default) is a comfortable narrow column. `wide` uses the full page width. Layouts such as columns are always full width. |

Example: `::section{palette="cream" align="center" text="wide"}`

### Banners

`::banner` is a ready-made section: centred text on navy. Use it for a verse, a welcome or a call to action. It can take a different colour: `::banner{palette="white"}`.

### Headings

Use `##` for headings in a section, and `###` for smaller ones. Never use a single `#`: the page title already is the one top-level heading.

## Layouts

A layout arranges several **items**. It starts with a line `:::name` and ends with a line `:::`. Inside, **a line with only `---` starts the next item.**

```
## Ways to give

:::columns
---
### Direct Deposit

BSB: 032 032 · Account: 811 496

---
### Give Online

Click below to give securely.

**[GIVE ONLINE](https://example.org/give)**
:::
```

Put the section's heading and introduction *outside* the layout, above it. Text or buttons after the layout go below the closing `:::`.

If each item is short, you can write the layout as a list instead, with no `---`:

```
:::columns
- ### Food

  Dinner, nibbles or dessert.

- ### Prayer

  Time spent coming before God.
:::
```

(Indent the lines that belong to a bullet by two spaces. Use `1.` instead of `-` for a numbered list.) If you want one item that itself contains a bullet list, start the block with `---`.

An item can have:

- a **heading** (a `###` or `##` line, as the first thing in the item),
- a **picture** (a line holding only pictures, such as `![A short description](/media/worship.webp)`; several pictures on consecutive lines belong together),
- and **text** (everything else).

Which layouts exist:

| Layout | What it looks like | Settings |
|---|---|---|
| `:::columns` | Items side by side, stacked on phones. Headings line up across the row. | `picture="above"` or `"below"`: where each item's picture goes (above is the default) |
| `:::cards` | Photo cards: each item's picture fills the card behind its text. | none |
| `:::media` | A picture beside text, one row per item. The picture swaps sides each row. | `image="left"` or `"right"`: keep the picture on one side |
| `:::gallery` | A row of square photos. Write it as a list, one photo per item: `- ![…](/media/…)`. | none |

Every layout also accepts `images="cycle"`, which makes the pictures in each item fade into each other one after another (use it when an item has several pictures).

New layouts are added by dropping one CSS file into `theme/layouts/`; see `theme/layouts/README.md`. The block's name is the file's name.

If you want a layout inside an item of another layout, give the outer one more colons: `::::columns` outside, `:::cards` inside.

## Accordions

Questions and answers that open and close. One list: the first paragraph of each bullet is the title, and the rest, indented two spaces, is the answer.

```
:::accordion
- Where can I park?

  There is parking in the basement next door.

- What should I expect?

  A friendly service of about 75 minutes.
:::
```

## Centring one paragraph

Wrap it in `:::center` … `:::`. (To centre a whole section, use `align="center"` on the section.)

## Pictures

Put a picture on a line of its own: `![A description](/media/worship.webp)`. The files live in `public/media/`.

The text in the square brackets is the **alt text**, which screen readers read aloud and which shows if the picture doesn't load. Describe what the picture shows ("Children playing with building blocks"). If a picture is purely decoration, leave the brackets empty: `![](/media/pastoral.webp)`.

## Church details that change

Don't type phone numbers, emails or service times into pages. Write a token in double braces and the site fills it in from `imported/church.json`, so it is right everywhere and changes in one place:

| Write | You get |
|---|---|
| `{{email}}`, `{{telephone}}`, `{{telephoneLabel}}` | The church email and phone number |
| `{{streetAddress}}`, `{{locality}}`, `{{postalAddress}}`, `{{address}}` | The address |
| `{{serviceTimes}}` | The current Sunday times, such as "10am and 5pm" (text only, not inside a link) |
| `{{music.email}}`, `{{music.name}}` | Whoever looks after that role. The roles are `rector`, `music`, `children` and `admin`. |
| `{{richardg.email}}`, `{{neridap.name}}` | A particular person's inbox. The names are listed under `inboxes` in `imported/church.json`. |

Example: `**[Get in Touch](mailto:{{music.email}})**`.

## Icons

`:icon[bell]` shows a small Font Awesome icon. Put one at the start of a heading (`### :icon[desktop] Direct Deposit`) and it sits above the heading. Use `:icon[bell]{style="regular"}` for the outline version. The names are at [fontawesome.com/search?ic=free](https://fontawesome.com/search?ic=free).

## Links and buttons

| Write | You get |
|---|---|
| `[Read more](/about)` | An ordinary underlined link |
| `**[Plan a visit](/contact)**` | A filled button |
| `*[More about us](/about)*` | A link with a bar under it |

Put buttons and bar links on a line of their own. Several in a row sit side by side: `*[One](/one)* *[Two](/two)*`.

## When the build says no

| Message | What it means and what to do |
|---|---|
| Put a blank line before `---`, or use `##` for a heading. | You wrote a line of text and then `---` straight underneath. Add an empty line above the `---`. |
| The page title is the only level-one heading. Use `##`. | You started a line with a single `#`. Use `##`. |
| `---` only splits sections and layout items. | You used `---` inside a list, an accordion or a quote. Use it only between sections, or between items inside a layout block. |
| `::section` must be the first line of a section, right under the `---`. | Move the `::section{…}` line to directly under the `---`. |
| … has no setting "…" / Unknown palette / Unknown … | A setting is spelled wrong, or isn't one of the choices. The message lists the choices. |
| Unknown block `:::name`. The layouts are: … | There is no layout with that name. Check the spelling. |
| `:::section`, `:::banner`, `:::column`, `:::lead` or `layout="…"` messages | These are the old way of writing pages. Use `---`, `::section{…}`, `::banner` and `:::columns` instead (see above). |
| If a paragraph fell out of the list, indent it under its item … | In a layout or accordion written as a list, the lines that belong to a bullet must be indented by two spaces. Or start the block with `---`. |
| `:::name` is empty | The layout has nothing inside. |
| An :::accordion holds one list and nothing else. | Put only the question list inside `:::accordion`. |
| Unknown token {{…}} / Unknown inbox or role | The name isn't in `imported/church.json`. The message lists the ones that are. |
| Unknown Font Awesome … icon | The icon name doesn't exist. Check it on the Font Awesome site. |
