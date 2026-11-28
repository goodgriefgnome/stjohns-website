// Bible reading plan: plain functions shared by the build and the browser script.

import { addDays } from './event-week.mjs';

export { addDays };

/** A link to the passage in the NIV on Bible Gateway. "John 15.26–16.15" becomes "John 15:26-16:15". */
export function passageUrl(reference) {
  const search = reference.replace(/(\d)\.(\d)/g, '$1:$2').replace(/–/g, '-');
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=NIV`;
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

/** "Sunday 29 November" for a YYYY-MM-DD day. */
export function longDate(day) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-AU', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
}

/** "Sun 29 Nov" for a YYYY-MM-DD day. */
export function shortDate(day) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-AU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
}

/** The plan to show on `today`: the one running, else the next to start, else the last to finish. Plans are { days: [{ date }] } in any order. */
export function currentPlan(plans, today) {
  const span = (plan) => [plan.versions[0].days[0].date, plan.versions[0].days.at(-1).date];
  const sorted = [...plans].sort((a, b) => span(a)[0].localeCompare(span(b)[0]));
  return sorted.find((plan) => span(plan)[0] <= today && today <= span(plan)[1])
    ?? sorted.find((plan) => span(plan)[0] > today)
    ?? sorted.at(-1);
}

/** Where the reader is: the day to show, and a sentence saying how that day relates to today.
    `bookmark` is the next day the reader has to read (or null when they haven't set one). */
export function placeFor(days, today, bookmark) {
  const first = days[0].date;
  const last = days.at(-1).date;
  if (bookmark) {
    const shown = bookmark < first ? first : bookmark > last ? last : bookmark;
    const gap = daysBetween(today, shown);
    const status = bookmark > last ? 'You’ve finished the plan!'
      : gap === 0 ? 'Up to date'
      : gap < 0 ? `${-gap} ${-gap === 1 ? 'day' : 'days'} behind`
      : `${gap} ${gap === 1 ? 'day' : 'days'} ahead`;
    return { day: shown, status, behind: gap < 0 };
  }
  if (today < first) return { day: first, status: `Starts ${longDate(first)}`, behind: false };
  if (today > last) return { day: last, status: 'This plan has finished', behind: false };
  return { day: today, status: 'Today', behind: false };
}
