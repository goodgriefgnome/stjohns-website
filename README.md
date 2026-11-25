# St John’s Darlinghurst website prototype

Static Astro site built from authored templates in `src/` and committed content snapshots in `inputs/`.

## Build locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run build
npm run preview
```

Astro writes the static site to `dist/`. The build reads local files and requires no service credentials or requests to the source sites after dependencies are installed. `npm run dev` starts the local development server.

## Content snapshots

See the [page-by-page representation review](docs/page-representation.md).

- Edit written pages in `src/content/pages/` and component-driven routes in `src/pages/`. Edit the shared homepage composition in `src/content/home.mdx`. It renders at `/`. The shared navigation lives in `src/layouts/Site.astro`.
- `inputs/church.json` holds shared contact details, Sunday service times, staff inboxes (`inboxes`) and which inbox handles what (`roles`).
- `inputs/concerts/` contains one dated entry per concert.
- `inputs/sermons/` contains the latest three episodes at capture time, one record per episode. Each record has a stable feed ID, route slug, date, publish time, passage, series, preacher, description, playback URL and audio size in bytes. The same records build the podcast feed at `/sermons-rss.xml` (`src/pages/sermons-rss.xml.ts`), which needs square JPEG artwork in `artwork.podcastSrc`.
- `inputs/events/` contains one record per calendar occurrence, including its time, local calendar date, series (`eventId`) and Church Center's schedule text (`recurrence`). The homepage lists the occurrences from the build day to the end of the month two months later, grouped by month and day beside a mini calendar; a small script hides any that have finished since the build.
- `inputs/snapshot.json` records the source URLs, capture date and timezone.

Page images are small local copies for the prototype. Sermon playback uses the existing public media URLs. Giving and mailing list signup link to their hosted services. Contact and prayer requests use email links. The prototype has no live import job, admin interface or publication automation.
