// The sermons list's search box and filters (markup: SermonArchive.astro). Everything is filtered in the page.
// The address holds the filters (?q=, ?series=, ?preacher=, ?book=), so links such as a sermon's "Preacher" arrive already filtered.
export function startSermonFilters(archive: HTMLElement) {
  const form = archive.querySelector<HTMLFormElement>('.archive-filters')!;
  const count = archive.querySelector<HTMLElement>('.archive-count')!;
  const empty = archive.querySelector<HTMLElement>('.archive-empty')!;
  const more = archive.querySelector<HTMLElement>('.archive-more');
  const groups = [...archive.querySelectorAll<HTMLElement>('.archive-series')];
  const search = form.elements.namedItem('q') as HTMLInputElement;
  const fields = ['series', 'preacher', 'book'] as const;
  const select = (name: string) => form.elements.namedItem(name) as HTMLSelectElement;
  const newest = Number(archive.dataset.newest);
  let olderShown = false;

  const params = new URLSearchParams(location.search);
  search.value = params.get('q') ?? '';
  // A value with no matching option (an old link) leaves the select on its first option, "all".
  for (const name of fields) select(name).value = params.get(name) ?? '';

  function apply() {
    const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
    const chosen = Object.fromEntries(fields.map(name => [name, select(name).value]));
    const filtering = words.length > 0 || fields.some(name => chosen[name]);
    let shown = 0;
    groups.forEach((group, index) => {
      let matches = 0;
      for (const row of group.querySelectorAll<HTMLElement>('li')) {
        const { search: text = '', series, preacher, book } = row.dataset;
        const match = words.every(word => text.includes(word))
          && (!chosen.series || chosen.series === series)
          && (!chosen.preacher || chosen.preacher === preacher)
          && (!chosen.book || chosen.book === book);
        row.hidden = !match;
        if (match) matches++;
      }
      shown += matches;
      // Filtering shows every series with a match; otherwise only the newest few, until "Show older series" is pressed.
      group.hidden = matches === 0 || (!filtering && !olderShown && index >= newest);
    });
    if (more) more.hidden = filtering || olderShown;
    count.hidden = false;
    count.textContent = `${shown} ${shown === 1 ? 'sermon' : 'sermons'}`;
    empty.hidden = shown > 0;

    const next = new URLSearchParams();
    if (search.value.trim()) next.set('q', search.value.trim());
    for (const name of fields) if (chosen[name]) next.set(name, chosen[name]);
    const query = next.toString();
    // Keep the history entry's own state (which sermon is showing).
    history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
  }

  form.hidden = false;
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', apply);
  more?.querySelector('button')!.addEventListener('click', () => { olderShown = true; apply(); });
  apply();
}
