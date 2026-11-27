// "This week" on the home page: from today up to and including the coming Sunday. Plain functions so tests and the browser script can share them.

const at = (day) => new Date(`${day}T00:00:00Z`);

/** The coming Sunday as YYYY-MM-DD. On a Sunday itself it is the Sunday a week later, so the week is never empty-ended. */
export function comingSunday(day) {
  const date = at(day);
  date.setUTCDate(date.getUTCDate() + 7 - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

/** The day `count` days after `day`. */
export function addDays(day, count) {
  const date = at(day);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
