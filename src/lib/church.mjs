import church from '../../imported/church.json' with { type: 'json' };

export { church };

// Each service keeps a dated history of start times, so old sermons keep the time they were preached.
// The entry that applies on a date is the latest one whose "from" is on or before it.
export function serviceTimeOn(service, date, data = church) {
  const history = data.services[service];
  if (!history) throw new Error(`Unknown service "${service}". Choose ${Object.keys(data.services).join(', ')} (see imported/church.json).`);
  const entry = history.filter(({ from }) => from <= date).sort((a, b) => a.from.localeCompare(b.from)).at(-1);
  if (!entry) throw new Error(`The ${service} service has no time on ${date}. Its history starts ${history.map(({ from }) => from).sort()[0]}.`);
  return entry.time;
}

// Today's date in Sydney as YYYY-MM-DD (the en-CA format happens to be ISO).
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

// The current start time of every service, earliest first, e.g. ["10:00", "17:00"].
export const currentServiceTimes = (data = church) =>
  Object.keys(data.services).map(service => serviceTimeOn(service, today(), data)).sort();

const clock = new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });

// "17:00" -> "5pm", "09:30" -> "9:30am"
export const formatServiceTime = time =>
  clock.format(new Date(`2000-01-01T${time}:00Z`)).replace(/:00|\s/g, '').toLowerCase();

// Joins items as "a", "a and b", or "a, b and c".
export const listSeparator = (index, length) =>
  index === 0 ? '' : index === length - 1 ? ' and ' : ', ';
