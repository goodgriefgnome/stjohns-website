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

- Edit page copy and layout in `src/pages/`. The homepage is shared by `/` and `/home` via `src/components/Home.astro`. The shared navigation lives in `src/layouts/Site.astro`.
- `inputs/team/` contains one record per team member, with a name, role, biography paragraphs and display order.
- `inputs/sermons/` contains the latest three episodes at capture time, one record per episode. Each record has a stable feed ID, route slug, date, passage, series, preacher, description and playback URL.
- `inputs/events/` contains one record per calendar occurrence, including its time and local calendar date. The homepage groups occurrences by month using the captured calendar window.
- `inputs/snapshot.json` records the source URLs, capture date and timezone.

Page images are small local copies for the prototype. Sermon playback uses the existing public media URLs. Giving and mailing list signup link to their hosted services. Contact and prayer requests use email links. The prototype has no live import job, admin interface or publication automation.
