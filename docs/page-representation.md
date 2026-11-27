# Page representation

The architecture spec calls for ordinary Astro components, typed reusable layout primitives, domain components such as service times and upcoming events, and a homepage that reads top to bottom as declarative composition. It leaves the exact field boundaries for each page open. This prototype keeps authored narrative and composition in Astro, reusable rendering in components, and facts with a shared or repeatable shape in content records.

| Route | Representation |
| --- | --- |
| `/` | MDX homepage composition at `content/index.mdx`. Welcome, ministry invitations, giving and music are authored sections. Shared service times, the calendar and latest sermons render from records. |
| `/new` | Short authored invitation with the shared church email as the contact action. |
| `/list` | Markdown signup explanation and hosted subscription link. |
| `/concert-series` | MDX page with authored introduction, the concert program component and a mailing-list link. |
| `/sunday-services` | Authored visitor guidance with the shared weekly service schedule and church email. |
| `/childrens-ministry` | Markdown scripture quotation, two alternating image-and-text sections (`layout="media"`) and contact action. |
| `/community-groups` | Markdown explanation of how groups work and how to ask about joining. The page currently has no named group roster. |
| `/prayer` | Authored pastoral information with the shared church email. |
| `/welcome` | Authored invitation and venue guidance using shared service times and location. |
| `/about` | Markdown vision, history and Acknowledgement of Country. |
| `/our-team` | Markdown page with one alternating image-and-text section per person. Email buttons use inbox tokens such as `{{richardg.email}}`. |
| `/what-is-christianity` | Markdown article with blockquotes. |
| `/sermons` | Authored podcast link and a listing composed from sermon records. |
| `/christianity-art--culture` | Markdown essay and artwork attribution. |
| `/music-ministry` | Authored ministry and choir information with the existing signup action. |
| `/concert-series` | Authored series introduction and mailing list action. The annual programme renders from dated records, including past concerts. The homepage calendar has its own captured window. |
| `/creatives-collective` | Markdown description of the gatherings and contact action. |
| `/serve` | Authored invitation and contact action. |
| `/rough-edges-2` | Markdown partner description and volunteering information, including the partner’s opening hours in context. |
| `/671b6dd7-d046-4114-adb8-9cc2ee1ae882` | Markdown Banksia Women description and external partner link, using the existing URL. |
| `/christianity--social-concern` | Markdown article on the church’s approach to social concern. |
| `/faith-work-and-economics` | Markdown article with contextual pastoral and resource links. |
| `/community-pantry` | Authored description of the service and its terms. Scheduled occurrences come from the shared calendar. |
| `/contact` | Shared church contact and location fields, with authored FAQs. |
| `/give` | Markdown giving appeal and provider link. |

Page routes compose shared layouts, content sections and links. Components and the stylesheet own presentation details. The source snapshots remain local files at build time.

Written pages live in `content/`. A filename like `about.md` renders at `/about`. Every entry uses `Page.astro`, which wraps its children in a `.page` frame (carrying `--page-measure`) containing a hero followed by full-width sections. The hero is written in the page as a first section starting with `::hero` (picture, optional `:focus{at="x% y%"}`, optional `#` heading, subtitle, buttons); without it the page gets the default hero. Astro pages place `<Hero>` directly inside `<Page>` alongside their sections. See `content/README.md`. The authors' guide is `content/README.md`; this page records the design.

A page is a stack of **sections**: a line containing only `---` starts a new one. An optional `::section{palette="navy" align="center" text="wide"}` line directly under the `---` sets its look, and `::banner` is a centred navy section (it also accepts a palette). Section palettes use `white`, `mist`, `blue`, `cream`, or `navy`. In Astro, emit `<section class="section-outer" data-palette="navy"><div class="section-inner">…</div></section>`. Links inherit the section text colour.

Sections are always full width and inherit `--page-measure` from `.page` for their horizontal padding. Ordinary text sits in a centred reading-width column (`text="wide"` widens it), and layout blocks use the full page width. Collection entries default to `width: reading` (`.page.page-reading`), which caps everything at the reading width; add `width: standard` for the regular page width (needed for columns, cards, media and galleries). Astro routes that use `Page.astro` directly default to the standard width.

A **layout block** (`:::columns`, `:::cards`, `:::media`, `:::gallery`) arranges items, and inside it a `---` starts the next item. Each item can have a heading, a picture and text. A block that holds a single list is written one list item per item. Each layout is one file in `theme/layouts/`; dropping a new file in makes the block name available. See `theme/layouts/README.md`.

Columns stay in one row while the section has at least the site's reading width, then stack in reading order. In rows of columns whose items have headings, headings and body text line up across the row.

Use `##` for a major heading at the section level. These headings are centred by default, and subheadings follow the alignment of their text. Set `align="center"` on a section to centre all its content, or `align="left"` to left-align the whole section, including its heading. To centre just a paragraph or caption, wrap it in `:::center` and `:::`. For expandable questions and answers, use `:::accordion` holding one list: each item's first paragraph is the title and the rest, indented under it, is the body. Nest a block by giving the outer one more colons (`::::columns` around `:::accordion`).

Write `:icon[credit-card]` for a decorative [Font Awesome Free](https://fontawesome.com/search?ic=free) icon. Put it at the start of a heading, as in `### :icon[utensils] Food`, to show it above the heading. In running text it stays inline, as in `Pay by card :icon[credit-card]`. Start the directive after whitespace or at the beginning of the line. The default style is Solid. Use `:icon[bell]{style="regular"}` for an icon from the Regular set. The build embeds the SVG in the page, where it inherits the text colour. [Font Awesome Free attribution and license](licenses/Font-Awesome-Free.txt)

In Markdown and MDX, write `*[Plan a visit](/new)*` for a link with the action style. Ordinary links use the standard underline.

To use shared church details in a Markdown page, write a token such as `{{email}}`. The build replaces it with the value from `imported/church.json`, in text and in link addresses, so `[{{email}}](mailto:{{email}})` makes an email link. Any string key in that file works, for example `{{telephone}}`, `{{telephoneLabel}}`, `{{streetAddress}}` or `{{postalAddress}}`. `{{address}}` gives the full street address, and `{{serviceTimes}}` gives the Sunday times as “10am and 5pm”. It works only in text, not in a link. An unknown token stops the build and lists the valid names. Tokens inside backticks stay as written.

Staff emails go through roles, so a page asks for whoever does a job, not a named person. In `church.json`, `inboxes` lists each address by the part before the @, with the name of whoever reads it, for example `"samg": "Sam Giddy"`. The domain comes from the church `email`. `roles` maps a job to an inbox, for example `"music": "samg"`. Write `{{music.email}}` or `{{music.name}}` for a role, or `{{samg.email}}` for an inbox. When someone changes job, edit the role, and every page follows. An unknown inbox, role or field stops the build. Dotted tokens do not work in `.mdx` pages, because MDX reads `{a.b}` as code.

A page that needs a live component, such as the concert program, can be an `.mdx` file in `content/`. Import the component under the frontmatter and place it like an HTML tag, for example `<ConcertProgram />`. Directives, action links and tokens work the same as in `.md`. Plain Markdown is still the default, because MDX treats a stray `<` or `{` in prose as code.
