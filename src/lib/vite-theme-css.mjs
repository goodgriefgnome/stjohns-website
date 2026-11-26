// Builds two stylesheets from the theme folders, so adding a file needs no other edit:
//   virtual:theme-layouts.css     every theme/layouts/<name>.css, wrapped in
//                                 @scope ([data-layout="<name>"]) { … } so its selectors only reach
//                                 inside its own blocks, and `:scope` means the block itself
//   virtual:theme-behaviours.css  every theme/behaviours/<name>.css, as written (site-wide)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, sep } from 'node:path';
import { behavioursDir, layoutsDir } from './layout-registry.mjs';

const files = dir => (existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.css')).sort().map(name => join(dir, name)) : []);

export const wrapLayout = (name, css) => `@scope ([data-layout="${name}"]) {\n${css}\n}`;

const sheets = {
  'virtual:theme-layouts.css': {
    dir: layoutsDir,
    build: file => wrapLayout(basename(file, '.css'), readFileSync(file, 'utf8')),
  },
  'virtual:theme-behaviours.css': {
    dir: behavioursDir,
    build: file => readFileSync(file, 'utf8'),
  },
};

export default function themeCss() {
  const dirs = Object.values(sheets).map(sheet => sheet.dir);
  return {
    name: 'theme-css',
    resolveId: id => (id in sheets ? `\0${id}` : undefined),
    load(id) {
      const sheet = sheets[id.slice(1)];
      if (!id.startsWith('\0') || !sheet) return;
      const list = files(sheet.dir);
      list.forEach(file => this.addWatchFile(file));
      return list.map(sheet.build).join('\n');
    },
    // A new or removed file changes the list of layouts the Markdown plugin knows, so restart.
    configureServer(server) {
      server.watcher.add(dirs);
      const slashed = path => path.split(sep).join('/');
      const changed = file => {
        if (file.endsWith('.css') && dirs.some(dir => slashed(file).startsWith(slashed(dir)))) server.restart();
      };
      server.watcher.on('add', changed);
      server.watcher.on('unlink', changed);
    },
  };
}
