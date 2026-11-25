import church from '../../inputs/church.json' with { type: 'json' };

export { church };

const clock = new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });

// "17:00" -> "5pm", "09:30" -> "9:30am"
export const formatServiceTime = time =>
  clock.format(new Date(`2000-01-01T${time}:00Z`)).replace(/:00|\s/g, '').toLowerCase();

// Joins items as "a", "a and b", or "a, b and c".
export const listSeparator = (index, length) =>
  index === 0 ? '' : index === length - 1 ? ' and ' : ', ';
