# St John’s Darlinghurst website prototype

Static Astro site built from authored pages in `content/`, a look defined in `theme/`, code in `src/` and committed data snapshots in `imported/`.

## Folder layout

| Folder | What lives there | Who edits it |
|---|---|---|
| `content/` | Written pages (`about.md`, …) and the home page `index.mdx`. One file = one page. | Editors |
| `theme/` | The look: `tokens.css` (raw colours and sizes), `roles.css` (what they are for, plus the band palettes), `palettes.mjs` (palette names). | Whoever restyles the site |
| `imported/` | Data the site reads: `church.json`, sermons, events, concerts. Hand-edited snapshots today, written by importers later. | Importers (later) |
| `src/` | Code only: components, layouts, routes, plugins (`lib/`) and the structural CSS (`styles/`: base, patterns, components, the `--screen` flag). | Developers |
| `public/` | Files served as-is: fonts and `media/` images. | |
| `admin/` | The admin app. Its own npm workspace; empty for now. | |
| `scripts/` | Build-time checks and tools (`check-styles`, `visual-diff`). | |
| `docs/` | Notes for maintainers. | |

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

- Edit written pages in `content/` and add component-driven routes in `src/pages/`. Edit the shared homepage composition in `content/index.mdx`. It renders at `/`. The shared navigation lives in `src/layouts/Site.astro`.
- `imported/church.json` holds shared contact details, Sunday services (`services`: each name has a dated history of start times, so changing a time keeps old sermons on their old time), staff inboxes (`inboxes`) and which inbox handles what (`roles`).
- `imported/concerts/` contains one dated entry per concert.
- `imported/sermons/` contains the latest three episodes at capture time, one record per episode. Each record has a stable feed ID, route slug, date, service (`service`, a name from `church.json`, whose time on that date is the feed's publish time), passage, series, preacher, description, playback URL and audio size in bytes. The same records build the podcast feed at `/sermons-rss.xml` (`src/pages/sermons-rss.xml.ts`), which needs square JPEG artwork in `artwork.podcastSrc`.
- `imported/events/` contains one record per calendar occurrence, including its time, local calendar date, series (`eventId`) and Church Center's schedule text (`recurrence`). The homepage lists the occurrences from the build day to the end of the month two months later, grouped by month and day beside a mini calendar; a small script hides any that have finished since the build.
- `imported/snapshot.json` records the source URLs, capture date and timezone.

Page images are small local copies for the prototype. Sermon playback uses the existing public media URLs. Giving and mailing list signup link to their hosted services. Contact and prayer requests use email links. The prototype has no live import job, admin interface or publication automation.

## Visual diff

Before changing CSS, see exactly which pages a change affects:

```sh
npm run visual-diff                  # working copy vs HEAD
npm run visual-diff -- <git-ref>     # working copy vs any commit/branch
npm run visual-diff -- --out <dir>   # write results somewhere else
```

It builds the site at the ref (in a temporary git worktree) and from the working copy, screenshots every page (found automatically from the build) at 390px and 1280px, and compares pixel by pixel. "Today" is frozen so Events renders the same in both, animations are off, and extra shots cover the home hero's second photo, the open mobile menu and an open desktop dropdown. It prints changed pages with the share of pixels that differ, and writes `report.txt` plus, for each changed page, `*.compare.png` (before | after | diff) and `*.diff.png` (red highlights) into `.visual-diff/` (git-ignored). Takes about a minute. Uses the Playwright Chromium already installed; no screenshots are ever committed.
