import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, readdir, access } from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const OUTPUT_DIR = 'public';

describe('Build Integration', () => {
  beforeAll(() => {
    execSync('node build.mjs', { cwd: process.cwd(), stdio: 'pipe' });
  }, 30000);

  it('creates public/ directory', async () => {
    await expect(access(OUTPUT_DIR)).resolves.toBeUndefined();
  });

  it('creates index.html', async () => {
    const html = await readFile(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(html).toContain('Athlete Wiki');
    expect(html).toContain('fuse.min.js');
  });

  it('creates 404.html', async () => {
    const html = await readFile(path.join(OUTPUT_DIR, '404.html'), 'utf-8');
    expect(html).toContain('nicht gefunden');
  });

  it('creates impressum.html', async () => {
    const html = await readFile(path.join(OUTPUT_DIR, 'impressum.html'), 'utf-8');
    expect(html).toContain('Impressum');
  });

  it('creates datenschutz.html', async () => {
    const html = await readFile(path.join(OUTPUT_DIR, 'datenschutz.html'), 'utf-8');
    expect(html).toContain('Datenschutz');
  });

  it('creates index.json with published articles', async () => {
    const json = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'index.json'), 'utf-8'));
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(8); // 8 published, 1 draft skipped
    for (const article of json) {
      expect(article).toHaveProperty('title');
      expect(article).toHaveProperty('date');
      expect(article).toHaveProperty('category');
      expect(article).toHaveProperty('url');
      expect(article).toHaveProperty('content');
    }
  });

  it('excludes draft articles from index', async () => {
    const json = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'index.json'), 'utf-8'));
    const titles = json.map(a => a.title);
    expect(titles).not.toContain('Mentale Stärke im Wettkampf');
  });

  it('sorts articles by date descending', async () => {
    const json = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'index.json'), 'utf-8'));
    for (let i = 1; i < json.length; i++) {
      expect(json[i - 1].date >= json[i].date).toBe(true);
    }
  });

  it('creates article HTML files in public/pages/', async () => {
    const files = await readdir(path.join(OUTPUT_DIR, 'pages'));
    expect(files.length).toBe(8);
    expect(files).toContain('blutzuckerdopamin.html');
  });

  it('injects navbar into article pages', async () => {
    const html = await readFile(
      path.join(OUTPUT_DIR, 'pages', 'blutzuckerdopamin.html'), 'utf-8'
    );
    expect(html).toContain('Übersicht');
    expect(html).toContain('Link kopieren');
    expect(html).toContain('impressum.html');
    expect(html).toContain('datenschutz.html');
  });

  it('injects OG tags into article pages', async () => {
    const html = await readFile(
      path.join(OUTPUT_DIR, 'pages', 'blutzuckerdopamin.html'), 'utf-8'
    );
    expect(html).toContain('og:title');
    expect(html).toContain('og:description');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('rel="canonical"');
  });

  it('does not contain Google Fonts references (DSGVO)', async () => {
    const files = await readdir(path.join(OUTPUT_DIR, 'pages'));
    for (const file of files) {
      const html = await readFile(path.join(OUTPUT_DIR, 'pages', file), 'utf-8');
      expect(html).not.toContain('fonts.googleapis.com');
      expect(html).not.toContain('fonts.gstatic.com');
    }
  });

  it('copies fuse.min.js locally (DSGVO)', async () => {
    await expect(access(path.join(OUTPUT_DIR, 'fuse.min.js'))).resolves.toBeUndefined();
  });

  it('generates sitemap.xml', async () => {
    const xml = await readFile(path.join(OUTPUT_DIR, 'sitemap.xml'), 'utf-8');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('<loc>');
    expect(xml).toContain('priority');
  });

  it('generates robots.txt', async () => {
    const txt = await readFile(path.join(OUTPUT_DIR, 'robots.txt'), 'utf-8');
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Sitemap:');
    expect(txt).toContain('Disallow: /index.json');
  });

  it('copies fonts to public/fonts/', async () => {
    const fonts = await readdir(path.join(OUTPUT_DIR, 'fonts'));
    expect(fonts.length).toBeGreaterThanOrEqual(1);
    expect(fonts.some(f => f.endsWith('.woff2'))).toBe(true);
  });

  it('copies favicon', async () => {
    await expect(access(path.join(OUTPUT_DIR, 'favicon.ico'))).resolves.toBeUndefined();
  });

  it('copies manifest.json', async () => {
    const manifest = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'manifest.json'), 'utf-8'));
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('icons');
  });

  it('does not include internal fields in index.json', async () => {
    const json = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'index.json'), 'utf-8'));
    for (const article of json) {
      expect(article).not.toHaveProperty('_filename');
      expect(article).not.toHaveProperty('_html');
    }
  });
});
