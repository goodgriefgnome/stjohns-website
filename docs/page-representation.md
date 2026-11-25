# Page representation

The architecture spec calls for ordinary Astro components, typed reusable layout primitives, domain components such as service times and upcoming events, and a homepage that reads top to bottom as declarative composition. It leaves the exact field boundaries for each page open. This prototype keeps authored narrative and composition in Astro, reusable rendering in components, and facts with a shared or repeatable shape in content records.

| Route | Representation |
| --- | --- |
| `/`, `/home` | One ordered homepage composition. Welcome, ministry invitations, giving and music are authored sections. Shared service times, the calendar and latest sermons render from records. |
| `/new` | Short authored invitation with the shared church email as the contact action. |
| `/list` | Authored signup explanation and hosted subscription link. |
| `/sunday-services` | Authored visitor guidance with the shared weekly service schedule and church email. |
| `/childrens-ministry` | Authored scripture quotation, ministry explanation, illustration and contact action. |
| `/community-groups` | Authored explanation of how groups work and how to ask about joining. The page currently has no named group roster. |
| `/prayer` | Authored pastoral information with the shared church email. |
| `/welcome` | Authored invitation and venue guidance using shared service times and location. |
| `/about` | Authored vision, history and Acknowledgement of Country. |
| `/our-team` | Directory component reads one record per person, with name, role, biography paragraphs and display order. |
| `/what-is-christianity` | Markdown article with blockquotes. |
| `/sermons` | Authored podcast link and a listing composed from sermon records. |
| `/episode/:slug` | The same episode component renders each of the three captured sermon records, with one title, date, set of metadata and player. |
| `/christianity-art--culture` | Authored essay and artwork attribution. |
| `/music-ministry` | Authored ministry and choir information with the existing signup action. |
| `/concert-series` | Authored series introduction and mailing list action. The annual programme renders from dated records, including past concerts. The homepage calendar has its own captured window. |
| `/creatives-collective` | Authored description of the gatherings and contact action. |
| `/serve` | Authored invitation and contact action. |
| `/rough-edges-2` | Authored partner description and volunteering information, including the partner’s opening hours in context. |
| `/671b6dd7-d046-4114-adb8-9cc2ee1ae882` | Authored Banksia Women description and external partner link, using the existing URL. |
| `/christianity--social-concern` | Markdown article on the church’s approach to social concern. |
| `/faith-work-and-economics` | Markdown article with contextual pastoral and resource links. |
| `/community-pantry` | Authored description of the service and its terms. Scheduled occurrences come from the shared calendar. |
| `/contact` | Shared church contact and location fields, with authored FAQs. |
| `/give` | Authored giving appeal and provider link. |

Page routes compose shared layouts, content sections and links. Components and the stylesheet own presentation details. The source snapshots remain local files at build time.

The three Markdown articles use `Article.astro`. The layout looks for the hero photo at `public/media/articles/<page-slug>.webp`. To feature an opening paragraph or quotation, put it between `:::lead` and a line containing only `:::`. To group photos, put ordinary Markdown images between `:::gallery` and `:::`, one per line. The live examples show both patterns.
