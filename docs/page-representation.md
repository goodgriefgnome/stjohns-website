# Page representation

The architecture spec calls for ordinary Astro components, typed reusable layout primitives, domain components such as service times and upcoming events, and a homepage that reads top to bottom as declarative composition. It leaves the exact field boundaries for each page open. This prototype keeps authored narrative and composition in Astro, reusable rendering in components, and facts with a shared or repeatable shape in content records.

| Route | Representation |
| --- | --- |
| `/` | MDX homepage composition at `src/content/home.mdx`. Welcome, ministry invitations, giving and music are authored sections. Shared service times, the calendar and latest sermons render from records. |
| `/new` | Short authored invitation with the shared church email as the contact action. |
| `/list` | Markdown signup explanation and hosted subscription link. |
| `/concert-series` | MDX page with authored introduction, the concert program component and a mailing-list link. |
| `/sunday-services` | Authored visitor guidance with the shared weekly service schedule and church email. |
| `/childrens-ministry` | Markdown scripture quotation, two alternating image-and-text sections (`layout="media"`) and contact action. |
| `/community-groups` | Markdown explanation of how groups work and how to ask about joining. The page currently has no named group roster. |
| `/prayer` | Authored pastoral information with the shared church email. |
| `/welcome` | Authored invitation and venue guidance using shared service times and location. |
| `/about` | Markdown vision, history and Acknowledgement of Country. |
| `/our-team` | Markdown page with one alternating image-and-text section per person. Email buttons use person tokens such as `{{richard.email}}`. |
| `/what-is-christianity` | Markdown article with blockquotes. |
| `/sermons` | Authored podcast link and a listing composed from sermon records. |
| `/episode/:slug` | The same episode component renders each of the three captured sermon records, with one title, date, set of metadata and player. |
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

Written pages live in `src/content/pages/`. A filename like `about.md` renders at `/about`. Every entry uses `Page.astro`. The optional `hero` field names the public image URL, independently of the content width. Use `heroFocus: [39, 80]` to set the horizontal and vertical crop position in percentages from 0 to 100. Omit it for a centred crop. To feature an opening paragraph or quotation, put it between `:::lead` and a line containing only `:::`. To group photos, put ordinary Markdown images between `:::gallery` and `:::`, one per line. The live examples show both patterns.

Section palettes use `white`, `mist`, `blue`, `cream`, or `navy`. In Astro, use `<ContentSection palette="navy">`. In Markdown, use `:::section{palette="navy"}` and close the block with `:::`. A lead defaults to navy and also accepts a palette override. Links inherit the section text colour.

Collection entries default to a narrow reading column. Add `width: standard` for the regular page width. Omit `hero` for a simple title band. Astro routes that use `Page.astro` directly default to the standard width.

Use `:::section{palette="blue" layout="columns"}` for a row of related items. Each level-three heading starts a column. To put a small icon above a heading, start the heading with an emoji, as in `### 🍞 Food`. It is drawn in monochrome Noto Emoji, in the section's action colour. Use the normal section directive for a full-width colour band with a reading-width body.

In Markdown and MDX, write `*[Plan a visit](/new)*` for a link with the action style. Ordinary links use the standard underline.

To use shared church details in a Markdown page, write a token such as `{{email}}`. The build replaces it with the value from `inputs/church.json`, in text and in link addresses, so `[{{email}}](mailto:{{email}})` makes an email link. Any string key in that file works, for example `{{telephone}}`, `{{telephoneLabel}}`, `{{streetAddress}}` or `{{postalAddress}}`. `{{address}}` gives the full street address, and `{{serviceTimes}}` gives the Sunday times as “10am and 5pm”. It works only in text, not in a link. An unknown token stops the build and lists the valid names. Tokens inside backticks stay as written.

Staff emails go through roles, so a page asks for whoever does a job, not a named person. In `church.json`, `people` holds each person's `name` and optional `email`, and `roles` maps a job to either a `person` or a plain `email` inbox. For example, `music` points at `sam`, while `communityPantry` points straight at the church inbox. Write `{{music.email}}` or `{{music.name}}` for a role, or `{{sam.email}}` for a person. When someone changes job, edit the role, and every page follows. Asking for a field that does not exist, such as the name of an inbox-only role, stops the build. Dotted tokens do not work in `.mdx` pages, because MDX reads `{a.b}` as code.

A page that needs a live component, such as the concert program, can be an `.mdx` file in `src/content/pages/`. Import the component under the frontmatter and place it like an HTML tag, for example `<ConcertProgram />`. Directives, action links and tokens work the same as in `.md`. Plain Markdown is still the default, because MDX treats a stray `<` or `{` in prose as code.
