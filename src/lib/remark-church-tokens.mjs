import { visit, SKIP } from 'unist-util-visit';
import { church as defaultChurch, formatServiceTime, listSeparator } from './church.mjs';

const token = /\{\{\s*([A-Za-z]+(?:\.[A-Za-z]+)?)\s*\}\}/g;

// Replaces {{name}} with a value from inputs/church.json, in text and in link URLs.
// astro.config.mjs passes the data in, so that editing church.json changes the
// config and the dev server re-renders cached Markdown.
export default function churchTokens({ church = defaultChurch } = {}) {
  // Values that are worked out from church.json rather than copied from it.
  const derived = {
    address: `${church.streetAddress}, ${church.locality} ${church.region} ${church.postcode}`,
  };

  // A role points at a person, or straight at an inbox. People and roles share
  // one namespace, so {{music.email}} and {{sam.email}} read the same way.
  const { people = {}, roles = {} } = church;
  for (const [key, role] of Object.entries(roles)) {
    if (key in people) throw new Error(`church.json: "${key}" is both a person and a role. Rename one.`);
    if (('person' in role) === ('email' in role)) throw new Error(`church.json: role "${key}" needs either "person" or "email", not both.`);
    if (role.person && !people[role.person]) throw new Error(`church.json: role "${key}" names unknown person "${role.person}".`);
  }
  const contacts = {
    ...people,
    ...Object.fromEntries(Object.entries(roles).map(([key, role]) => [key, role.person ? people[role.person] : { email: role.email }])),
  };

  // {{music.email}} or {{richard.name}}
  const contactValue = (name, file, node) => {
    const [key, field] = name.split('.');
    const contact = contacts[key];
    if (!contact) file.fail(`Unknown person or role in {{${name}}}. Choose ${Object.keys(contacts).sort().join(', ')}.`, node);
    if (typeof contact[field] === 'string') return contact[field];
    const fields = Object.keys(contact).filter(f => typeof contact[f] === 'string');
    file.fail(`{{${name}}} has no value. "${key}" only has ${fields.join(' and ')}.`, node);
  };

  const plainValue = (name, file, node) => {
    if (name.includes('.')) return contactValue(name, file, node);
    const value = derived[name] ?? church[name];
    if (typeof value === 'string') return value;
    const known = [...Object.keys(church).filter(key => typeof church[key] === 'string'), ...Object.keys(derived), 'serviceTimes'];
    file.fail(`Unknown token {{${name}}}. Choose ${known.sort().join(', ')}.`, node);
  };

  // "10am and 5pm", with each time in a <time> element.
  const serviceTimes = () => church.sundayServiceTimes.flatMap((time, index, times) => [
    ...(index ? [{ type: 'text', value: listSeparator(index, times.length) }] : []),
    { type: 'text', value: formatServiceTime(time), data: { hName: 'time', hProperties: { dateTime: time } } },
  ]);

  return (tree, file) => {
    visit(tree, (node, index, parent) => {
      if ((node.type === 'link' || node.type === 'image' || node.type === 'definition') && node.url.includes('{{')) {
        node.url = node.url.replace(token, (_, name) => {
          if (name === 'serviceTimes') file.fail('{{serviceTimes}} only works in text, not in a link.', node);
          return plainValue(name, file, node);
        });
      }
      // In MDX, {{email}} parses as an expression whose source is "{email}".
      if ((node.type === 'mdxTextExpression' || node.type === 'mdxFlowExpression') && parent) {
        const name = node.value.match(/^\s*\{\s*([A-Za-z]+)\s*\}\s*$/)?.[1];
        if (!name) return;
        const parts = name === 'serviceTimes' ? serviceTimes() : [{ type: 'text', value: plainValue(name, file, node) }];
        const replacement = node.type === 'mdxFlowExpression' ? [{ type: 'paragraph', children: parts }] : parts;
        parent.children.splice(index, 1, ...replacement);
        return [SKIP, index + replacement.length];
      }
      if (node.type !== 'text' || !node.value.includes('{{') || !parent) return;

      const parts = [];
      let last = 0;
      for (const match of node.value.matchAll(token)) {
        if (match.index > last) parts.push({ type: 'text', value: node.value.slice(last, match.index) });
        const name = match[1];
        if (name === 'serviceTimes') parts.push(...serviceTimes());
        else parts.push({ type: 'text', value: plainValue(name, file, node) });
        last = match.index + match[0].length;
      }
      if (!parts.length) return;
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) });
      parent.children.splice(index, 1, ...parts);
      return [SKIP, index + parts.length];
    });
  };
}
