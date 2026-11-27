#!/usr/bin/env node
// Visual diff: build the site at a git ref and as it is now, screenshot every page in
// both, and report which pages changed. Nothing is stored in the repo; output goes to
// a git-ignored folder. See the README section "Visual diff".
//
//   npm run visual-diff -- [<git-ref>] [--out <dir>]
import { execFileSync, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const args = process.argv.slice(2);
let ref = 'HEAD';
let outDir = join(root, '.visual-diff');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') outDir = resolve(args[++i]);
  else if (args[i] === '--') continue;
  else ref = args[i];
}

// "Today" for both builds and the browser: noon in Sydney on a fixed day.
const NOW = '2026-06-15T02:00:00Z';
const WIDTHS = [390, 1280];
const VIEWPORT_HEIGHT = 800;
const run = (cmd, argv, options = {}) => execFileSync(cmd, argv, { stdio: 'pipe', encoding: 'utf8', ...options });

// ---- Builds ----------------------------------------------------------------
const work = mkdtempSync(join(tmpdir(), 'visual-diff-'));
const baselineTree = join(work, 'baseline-src');
const baselineDist = join(work, 'baseline-dist');
const currentDist = join(work, 'current-dist');

function build(cwd, dist, label) {
  console.log(`Building ${label}…`);
  // Both builds share node_modules, and Astro's content cache doesn't notice plugin changes, so start clean.
  rmSync(join(root, 'node_modules/.astro'), { recursive: true, force: true });
  rmSync(join(cwd, '.astro'), { recursive: true, force: true });
  const result = spawnSync(join(root, 'node_modules/.bin/astro'), ['build', '--outDir', dist], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      VISUAL_DIFF_NOW: NOW,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import ${pathToFileURL(join(root, 'scripts/visual-diff-clock.mjs'))}`,
    },
  });
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
    throw new Error(`Build of ${label} failed`);
  }
}

// ---- Static servers --------------------------------------------------------
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.xml': 'application/xml', '.mp3': 'audio/mpeg' };
function serve(dir) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = join(dir, path);
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    else if (!existsSync(file) && existsSync(file + '.html')) file += '.html';
    if (!existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise(done => server.listen(0, '127.0.0.1', () => done({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

// Every .html file in a build is a page, except static meta-refresh redirect stubs.
function pagesIn(dist) {
  const found = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) {
        if (readFileSync(full, 'utf8').includes('http-equiv="refresh"')) continue;
        found.push(relative(dist, full));
      }
    }
  };
  walk(dist);
  const hash = s => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  // Cap dynamic slug collections to a deterministic sample (add future prefixes here).
  const sampleCaps = { '/sermons/': 3 };
  const alwaysInclude = new Set(['/sermons/list']);
  return found
    .map(file => '/' + file.replace(/(^|\/)index\.html$/, '').replace(/\.html$/, ''))
    .sort((a, b) => hash(a) - hash(b))
    .filter(path => {
      if (alwaysInclude.has(path)) return true;
      const prefix = Object.keys(sampleCaps).find(p => path.startsWith(p));
      return !prefix || sampleCaps[prefix]-- > 0;
    })
    .sort();
}
const slugOf = path => (path === '/' ? 'home' : path.slice(1).replace(/\//g, '--'));

// ---- Screenshots -----------------------------------------------------------
async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const globalRoot = run('npm', ['root', '-g']).trim();
  return createRequire(join(globalRoot, 'x.js'))('playwright');
}

const FREEZE = `*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }`;

async function settle(page) {
  // Lazy images only load once scrolled near, so walk down the page and back.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); }
    scrollTo(0, 0);
    await document.fonts.ready;
    const visibleImages = [...document.images].filter(img => img.getClientRects().length > 0);
    for (const img of visibleImages) {
      if (img.loading === 'lazy') img.loading = 'eager';
    }
    const waitImg = img => img.complete
      ? Promise.resolve()
      : new Promise(r => {
          const timer = setTimeout(r, 3000);
          img.onload = img.onerror = () => { clearTimeout(timer); r(); };
        });
    await Promise.all(visibleImages.map(waitImg));
  });
  await page.waitForTimeout(150);
}

async function open(page, url, { motion = false } = {}) {
  await page.goto(url, { waitUntil: 'load' });
  if (!motion) await page.addStyleTag({ content: FREEZE });
  await settle(page);
}

async function shootSite(browser, baseUrl, pages, shotDir) {
  mkdirSync(shotDir, { recursive: true });
  const shoot = (page, name, options = {}) => page.screenshot({ path: join(shotDir, name + '.png'), animations: 'disabled', ...options });
  const CONCURRENCY = 4;
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: VIEWPORT_HEIGHT }, reducedMotion: 'reduce' });
    await context.clock.setFixedTime(new Date(NOW));
    let next = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, pages.length) }, async () => {
      const page = await context.newPage();
      while (next < pages.length) {
        const path = pages[next++];
        await open(page, baseUrl + path);
        await shoot(page, `${slugOf(path)}.${width}`, { fullPage: true });
      }
      return page;
    });
    const [page] = await Promise.all(workers);
    // Extra states: the mobile menu, or the first desktop dropdown.
    if (pages.includes('/')) {
      await open(page, baseUrl + '/');
      const toggle = page.locator('.menu-toggle');
      if (await toggle.isVisible()) {
        await toggle.click();
        await page.waitForTimeout(200);
        await shoot(page, `home.${width}.menu-open`);
      } else {
        const summary = page.locator('.desktop-nav details > summary').first();
        if (await summary.count()) {
          await summary.click();
          await page.waitForTimeout(200);
          await shoot(page, `home.${width}.dropdown-open`);
        }
      }
    }
    await context.close();
    // The home hero cycles between two photos (4s each); reduced motion shows only the first, so
    // shoot the second with motion on, paused part-way through the animation.
    if (pages.includes('/')) {
      const motionContext = await browser.newContext({ viewport: { width, height: VIEWPORT_HEIGHT }, reducedMotion: 'no-preference' });
      await motionContext.clock.setFixedTime(new Date(NOW));
      const motionPage = await motionContext.newPage();
      await open(motionPage, baseUrl + '/', { motion: true });
      await motionPage.evaluate(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = 6000; }));
      await motionPage.waitForTimeout(100);
      await shoot(motionPage, `home.${width}.hero-photo-2`);
      await motionContext.close();
    }
  }
}

// ---- Comparison ------------------------------------------------------------
function pad(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  out.data.fill(255);
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

function compare(beforeFile, afterFile, name) {
  const rawA = readFileSync(beforeFile), rawB = readFileSync(afterFile);
  if (rawA.equals(rawB)) return { name, count: 0, percent: 0, sizeChanged: false };
  const a = PNG.sync.read(rawA), b = PNG.sync.read(rawB);
  const width = Math.max(a.width, b.width), height = Math.max(a.height, b.height);
  const before = pad(a, width, height), after = pad(b, width, height);
  const diff = new PNG({ width, height });
  const count = pixelmatch(before.data, after.data, diff.data, width, height, { threshold: 0.1, diffColor: [255, 0, 0], alpha: 0.3 });
  const sizeChanged = a.width !== b.width || a.height !== b.height;
  if (count === 0 && !sizeChanged) return { name, count, percent: 0, sizeChanged };
  // Side-by-side: before | after | diff, with a gap.
  const gap = 20;
  const sheet = new PNG({ width: width * 3 + gap * 2, height });
  sheet.data.fill(200);
  PNG.bitblt(before, sheet, 0, 0, width, height, 0, 0);
  PNG.bitblt(after, sheet, 0, 0, width, height, width + gap, 0);
  PNG.bitblt(diff, sheet, 0, 0, width, height, (width + gap) * 2, 0);
  mkdirSync(join(outDir, 'changed'), { recursive: true });
  writeFileSync(join(outDir, 'changed', `${name}.diff.png`), PNG.sync.write(diff));
  writeFileSync(join(outDir, 'changed', `${name}.compare.png`), PNG.sync.write(sheet));
  return { name, count, percent: (count / (width * height)) * 100, sizeChanged, from: `${a.width}x${a.height}`, to: `${b.width}x${b.height}` };
}

// ---- Main ------------------------------------------------------------------
let exitCode = 0;
const fmtSec = ms => `${(ms / 1000).toFixed(1)}s`;
const timed = async (label, fn) => {
  const t0 = performance.now();
  const res = await fn();
  timings.push(`${label} ${fmtSec(performance.now() - t0)}`);
  return res;
};
const timings = [];
const totalStart = performance.now();
try {
  run('git', ['worktree', 'add', '--detach', baselineTree, ref], { cwd: root });
  symlinkSync(join(root, 'node_modules'), join(baselineTree, 'node_modules'), 'dir');
  const sha = run('git', ['rev-parse', '--short', ref], { cwd: root }).trim();
  await timed('build baseline:', () => build(baselineTree, baselineDist, `baseline (${ref} = ${sha})`));
  await timed('build current:', () => build(root, currentDist, 'working copy'));

  const basePages = pagesIn(baselineDist), currentPages = pagesIn(currentDist);
  const common = currentPages.filter(path => basePages.includes(path));
  const added = currentPages.filter(path => !basePages.includes(path));
  const removed = basePages.filter(path => !currentPages.includes(path));

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const [baseServer, currentServer] = await Promise.all([serve(baselineDist), serve(currentDist)]);
  console.log(`Screenshotting ${common.length} pages at ${WIDTHS.join('px and ')}px (plus extra states)…`);
  await timed('shoot baseline:', () => shootSite(browser, baseServer.url, common, join(work, 'shots-before')));
  await timed('shoot current:', () => shootSite(browser, currentServer.url, common, join(work, 'shots-after')));
  await browser.close();
  baseServer.server.close(); currentServer.server.close();

  const names = readdirSync(join(work, 'shots-after')).map(file => file.replace(/\.png$/, '')).sort();
  const results = await timed('compare:', () =>
    names.map(name => compare(join(work, 'shots-before', name + '.png'), join(work, 'shots-after', name + '.png'), name))
  );
  const changed = results.filter(result => result.count > 0 || result.sizeChanged);
  const unchanged = results.filter(result => !changed.includes(result));

  const lines = [`Visual diff: ${ref} (${sha}) vs working copy`, ''];
  if (changed.length) {
    lines.push(`Changed (${changed.length}):`);
    for (const r of changed) lines.push(`  ${r.name.padEnd(48)} ${r.percent.toFixed(2).padStart(6)}% of pixels${r.sizeChanged ? `  (size ${r.from} → ${r.to})` : ''}`);
  } else lines.push('No visual differences.');
  lines.push('', `Unchanged (${unchanged.length}): ${unchanged.map(r => r.name).join(', ') || 'none'}`);
  if (added.length) lines.push('', `Pages only in working copy: ${added.join(', ')}`);
  if (removed.length) lines.push('', `Pages only in baseline: ${removed.join(', ')}`);
  if (changed.length) lines.push('', `Images: ${join(outDir, 'changed')}  (*.compare.png = before | after | diff, *.diff.png = red highlights)`);
  lines.push('', `Timings: ${timings.join(' · ')} · total ${fmtSec(performance.now() - totalStart)}`);
  const report = lines.join('\n');
  writeFileSync(join(outDir, 'report.txt'), report + '\n');
  console.log('\n' + report);
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  try { run('git', ['worktree', 'remove', '--force', baselineTree], { cwd: root }); } catch {}
  rmSync(work, { recursive: true, force: true });
}
process.exit(exitCode);
