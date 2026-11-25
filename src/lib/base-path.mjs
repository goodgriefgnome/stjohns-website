// The site can be served from a subfolder, such as /stjohns-website/ on GitHub Pages.
// Content and components keep writing root links like "/contact"; these helpers add the folder.

export function addBase(base, path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return path;
  const prefix = base.replace(/\/+$/, '');
  if (!prefix || path === prefix || path.startsWith(`${prefix}/`)) return path;
  return `${prefix}${path}`;
}

export function withBase(path) {
  return addBase(import.meta.env.BASE_URL, path);
}
