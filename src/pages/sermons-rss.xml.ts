// The sermons podcast feed, written to /sermons-rss.xml at build time.
// It mirrors rss.stjohnsanglican.org.au/sermons: RSS 2.0 plus Apple's itunes: tags.
import type { APIContext } from 'astro';
import { church } from '../lib/church.mjs';
import { sermons, type Sermon } from '../lib/content';

const show = {
  title: 'St John’s Darlinghurst',
  subtitle: 'Sermon Audio from St John’s Darlinghurst in Sydney, Australia',
  description: 'We are an inner-city church dedicated to seeking the Truth, practising Goodness, and creating Beauty. Since 1849.',
  artwork: '/media/podcast/channel.jpg',
};

// Text placed inside XML must have these five characters escaped.
const escape = (text: string) =>
  text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);

// Show notes are HTML, where apostrophes and quotes in text can stay as they are.
const escapeHtml = (text: string) => text.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]!);

// HTML descriptions go in CDATA, which needs no escaping unless the text itself contains "]]>".
const cdata = (html: string) => `<![CDATA[${html.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;

const pubDate = (sermon: Sermon) => new Date(sermon.publishedAt ?? `${sermon.date}T00:00:00Z`).toUTCString();

// Same layout as the live feed: heading, passage, series, preacher, then the blurb.
const showNotes = (sermon: Sermon) =>
  [
    `<h3>${escapeHtml(sermon.title)}</h3>`,
    `<p><b>${escapeHtml(sermon.scripture)}</b></p>`,
    `<p><i>Series: ${escapeHtml(sermon.series)}</i></p>`,
    `<p><i>Preacher: ${escapeHtml(sermon.preacher)}</i></p>`,
    ...sermon.description.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`),
  ].join('');

export function GET({ site }: APIContext) {
  // Feeds need absolute URLs. `site` comes from SITE_URL; BASE_URL adds the Pages subfolder.
  const origin = site ?? new URL('http://localhost:4321');
  const absolute = (path: string) => new URL(import.meta.env.BASE_URL.replace(/\/?$/, '/') + path.replace(/^\//, ''), origin).href;

  const items = sermons.map(sermon => {
    const art = sermon.artwork?.podcastSrc;
    return `
    <item>
      <title>${escape(sermon.title)}</title>
      <description>${cdata(showNotes(sermon))}</description>
      <link>${absolute(`/episode/${sermon.slug}`)}</link>
      <guid isPermaLink="false">${escape(sermon.id)}</guid>
      <pubDate>${pubDate(sermon)}</pubDate>
      <enclosure url="${escape(sermon.audioUrl)}" length="${sermon.audioBytes}" type="audio/mpeg"/>
      <itunes:duration>${sermon.durationSeconds}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>${art ? `
      <itunes:image href="${absolute(art)}"/>` : ''}
    </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(show.title)}</title>
    <description>${escape(show.description)}</description>
    <link>${absolute('/')}</link>
    <language>en-AU</language>
    <copyright>${escape(show.title)}</copyright>
    <atom:link href="${absolute('/sermons-rss.xml')}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${absolute(show.artwork)}</url>
      <title>${escape(show.title)}</title>
      <link>${absolute('/')}</link>
    </image>
    <itunes:subtitle>${escape(show.subtitle)}</itunes:subtitle>
    <itunes:summary>${escape(show.description)}</itunes:summary>
    <itunes:author>${escape(show.title)}</itunes:author>
    <itunes:owner>
      <itunes:name>${escape(show.title)}</itunes:name>
      <itunes:email>${escape(church.email)}</itunes:email>
    </itunes:owner>
    <itunes:image href="${absolute(show.artwork)}"/>
    <itunes:category text="Religion &amp; Spirituality">
      <itunes:category text="Christianity"/>
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>${items.join('')}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
