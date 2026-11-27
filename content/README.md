# Writing pages

Every file in this folder is one page of the website. `about.md` becomes `/about`, and `index.mdx` is the home page. You don't need to know any code: you write plain text with a few extra marks, and the layouts (columns, cards, pictures beside text) are already made for you.

If you make a mistake, the site refuses to build and says what is wrong. The [last section](#when-the-build-says-no) explains each message.

## The top of a page

Every page starts with a few settings between two lines of `---`:

```
---
title: Music Ministry & Choir
width: standard
palette: white
---
```

| Setting | What it does |
|---|---|
| `title` | The page title: the browser tab, the menu, and the big heading over the photo (unless you write your own heading in the hero). Required. |
| `width` | `reading` (the default) keeps everything in a narrow column. `standard` lets sections and layouts use the full width of the page. Use `standard` for pages with columns, cards, pictures beside text, or galleries. |
| `palette` | The colour of the page behind everything: `white`, `mist`, `blue`, `cream` or `navy`. |

## The hero: the big photo at the top

Every page has one. If you write nothing, the page gets the site's default photo with its `title` over it. To choose your own, make the first section start with `::hero`:

```
---
::hero

![](/media/articles/give.webp) :focus{at="53% 53%"}

# "For all things come from You, and of your own we have given you."

1 Chronicles 29:14

**[Give now](/give)**
```

- The picture is the background. `:focus{at="across% down%"}` right after it says which part to keep when it is cropped (`50% 50%` is the middle, and what you get without it). A space before `:focus` is fine. It belongs to that use of the picture, so the same file can have a different focus on another page.
- A `#` heading is the page's big heading. This is the only place `#` is allowed. Leave it out and the page `title` is used.
- Anything else is ordinary Markdown: a paragraph is a subtitle, `**[Text](/link)**` is a button.
- For a slideshow, write the pictures as a list and add `images="cycle"`:

```
---
::hero{images="cycle"}

- ![](/media/hero-door.webp)
- ![](/media/hero-community.webp) :focus{at="53% 39%"}

# Truth, Beauty, and Goodness for the heart of the city.
```

  Two to nine pictures cycle. With reduced motion on, only the first shows. A list of several pictures without `images="cycle"` is an error.
- `aspect="3/2"` gives the hero that shape (it is never shorter than usual).
- `::hero` only works as the first section. A hero with no picture uses the default one.

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
| `images` | `cycle` | Several pictures in the section fade into each other in turn. |
| `aspect` | two numbers, such as `7/5` | The shape (width/height) of pictures written in the section. Every picture fills that shape, cropped around its `:focus`. Without it, the first picture's own shape is used. |
| `width` | `full-bleed` | No padding: pictures run edge to edge and are not capped in height. Text keeps its usual column. |

Example: `::section{palette="cream" align="center" text="wide"}`

A picture on its own line, or a list holding only pictures, is shown as a figure where you wrote it. This is how to write a slideshow in any section, like the one on About:

```
---
::section{width="full-bleed" aspect="7/5" images="cycle"}

- ![](/media/articles/about-1.webp)
- ![](/media/articles/about-2.webp)
- ![](/media/articles/about-3.webp)
```

(Directly inside a layout block, a list still means "one item each". Inside an item, a list of pictures is one figure.)

### Banners

`::banner` is a ready-made section: centred text on navy. Use it for a verse, a welcome or a call to action. It can take a different colour: `::banner{palette="white"}`.

### Headings

Use `##` for headings in a section, and `###` for smaller ones. A single `#` is only for the hero (see above).

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

Everything in an item shows in the order you write it, so on a phone you read it top to bottom exactly as typed. The one exception is a background picture (see cards).

A line holding only pictures, such as `![A short description](/media/worship.webp)`, is a picture; several pictures on consecutive lines belong together. Leave a blank line between a picture and ordinary text.

Which layouts exist:

| Layout | What it looks like | Settings |
|---|---|---|
| `:::columns` | Items side by side, stacked on phones. Nothing is lined up across columns. If the block has just one item, its text flows into two columns on wide screens. | none |
| `:::cards` | Cards. A picture at the very start of a card is its background, behind its text. Headings, text and buttons line up across the cards. | `align="top"` or `"bottom"` (the default): where the text sits. `fill="mist"` (or `white`, `blue`, `cream`, `navy`): a background colour; the default is none. |
| `:::media` | A picture beside text. One block is one row of two items, the picture and the text, in the order you want on a phone. The picture swaps sides block by block. | `image="left"` or `"right"`: keep the picture on one side |
| `:::gallery` | A row of square photos. Write it as a list, one photo per item: `- ![…](/media/…)`. | none |

### Pictures in cards, and `::no-background`

In `:::cards`, a picture that starts an item is its background. To start an item with something else but still keep the card plain, or to put an ordinary picture first in any layout that uses backgrounds, write `::no-background` on the first line of the item. It shows nothing and holds the place:

```
---
::no-background
![A short description](/media/worship.webp)
```

It only works as the first line of an item. Anywhere else the build says no.

### Media: two items per row

```
:::media
---

![A short description](/media/worship.webp)

---

## Parts of the site

A file whose name starts with an underscore is a part of the site, not a page, so it gets no address of its own. `content/_footer.md` is the footer on every page, written like any page (a section, a columns layout, tokens and icons).

## Are you new?

Considering St John's…

*[Learn More](/new)*
:::
```

For another row, start another `:::media` block. Rows alternate sides down the page.

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
| `{{year}}` | The year the site was built, such as 2026 |
| `{{serviceTimes}}` | The current Sunday times, such as "10am and 5pm" (text only, not inside a link) |
| `{{music.email}}`, `{{music.name}}` | Whoever looks after that role. The roles are `rector`, `music`, `children` and `admin`. |
| `{{richardg.email}}`, `{{neridap.name}}` | A particular person's inbox. The names are listed under `inboxes` in `imported/church.json`. |

Example: `**[Get in Touch](mailto:{{music.email}})**`.

## Events

Events come from Church Center; nothing is written on the page. To show an event under Save the date on the home page, give it the tag Featured in Church Center.

## Icons

`:icon[bell]` shows a small Font Awesome icon. Put one at the start of a heading (`### :icon[desktop] Direct Deposit`) and it sits above the heading. Use `:icon[bell]{style="regular"}` for the outline version. Use `{style="brands"}` for logos such as `:icon[instagram]{style="brands"}`. An icon on its own inside a link has no name for screen readers, so add `label`: `[:icon[instagram]{style="brands" label="Instagram"}](https://www.instagram.com/…)`. Add `{accent}` (`:icon[heart]{accent}`) to use the section's accent colour: sky on light sections, white on blue and navy. Without it an icon keeps the text colour. The names are at [fontawesome.com/search?ic=free](https://fontawesome.com/search?ic=free).

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
| A `#` heading is only for the hero… | You started a line with a single `#` outside the hero. Use `##`, or move it under `::hero` in the first section. |
| Several pictures in a hero need `images="cycle"` | A hero holds a list of pictures. Write `::hero{images="cycle"}`. |
| `:focus{…}` goes right after a picture / `:focus` needs `at`… | Write `![](/media/x.webp) :focus{at="50% 20%"}`: two percentages, 0% to 100%. |
| `::hero` is only for the first section | Move it under the page's first `---`. |
| `---` only splits sections and layout items. | You used `---` inside a list, an accordion or a quote. Use it only between sections, or between items inside a layout block. |
| `::section` must be the first line of a section, right under the `---`. | Move the `::section{…}` line to directly under the `---`. |
| … has no setting "…" / Unknown palette / Unknown … | A setting is spelled wrong, or isn't one of the choices. The message lists the choices. |
| Unknown block `:::name`. The layouts are: … | There is no layout with that name. Check the spelling. |
| `:::section`, `:::banner`, `:::column`, `:::lead` or `layout="…"` messages | These are the old way of writing pages. Use `---`, `::section{…}`, `::banner` and `:::columns` instead (see above). |
| Use `::no-background`. | You wrote a picture with nothing in the brackets and no file. For a placeholder that shows nothing, write `::no-background`. |
| `::no-background` only goes first in an item of a layout block. | Move it to the first line of an item. |
| If a paragraph fell out of the list, indent it under its item … | In a layout or accordion written as a list, the lines that belong to a bullet must be indented by two spaces. Or start the block with `---`. |
| `:::name` is empty | The layout has nothing inside. |
| An :::accordion holds one list and nothing else. | Put only the question list inside `:::accordion`. |
| Unknown token {{…}} / Unknown inbox or role | The name isn't in `imported/church.json`. The message lists the ones that are. |
| Unknown Font Awesome … icon | The icon name doesn't exist. Check it on the Font Awesome site. |
