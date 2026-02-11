import { describe, it, expect } from 'vitest';
import { injectOgTags } from '../build.mjs';

const article = {
  title: 'Testartiekel',
  summary: 'Eine Zusammenfassung.',
  date: '2026-02-10',
  url: '/pages/2026-02-10-test.html',
};

describe('injectOgTags', () => {
  it('injects OG tags after charset meta', () => {
    const html = `<html><head><meta charset="UTF-8"><title>Test</title></head><body></body></html>`;
    const result = injectOgTags(html, article);
    expect(result).toContain('og:title');
    expect(result).toContain('og:description');
    expect(result).toContain('og:type');
    expect(result).toContain('og:url');
    expect(result).toContain('og:image');
  });

  it('injects canonical link', () => {
    const html = `<html><head><meta charset="UTF-8"></head><body></body></html>`;
    const result = injectOgTags(html, article);
    expect(result).toContain('rel="canonical"');
    expect(result).toContain('/pages/2026-02-10-test.html');
  });

  it('injects JSON-LD structured data', () => {
    const html = `<html><head><meta charset="UTF-8"></head><body></body></html>`;
    const result = injectOgTags(html, article);
    expect(result).toContain('application/ld+json');
    expect(result).toContain('"@type":"Article"');
  });

  it('injects meta description', () => {
    const html = `<html><head><meta charset="UTF-8"></head><body></body></html>`;
    const result = injectOgTags(html, article);
    expect(result).toContain('name="description"');
    expect(result).toContain('Eine Zusammenfassung.');
  });

  it('removes existing OG tags to prevent duplicates', () => {
    const html = `<html><head><meta charset="UTF-8"><meta property="og:title" content="Alt"></head><body></body></html>`;
    const result = injectOgTags(html, article);
    const ogTitleCount = (result.match(/og:title/g) || []).length;
    expect(ogTitleCount).toBe(1);
  });

  it('removes existing description to prevent duplicates', () => {
    const html = `<html><head><meta charset="UTF-8"><meta name="description" content="Alt"></head><body></body></html>`;
    const result = injectOgTags(html, article);
    const descCount = (result.match(/name="description"/g) || []).length;
    expect(descCount).toBe(1);
  });

  it('escapes special characters in HTML attributes', () => {
    const specialArticle = {
      ...article,
      title: 'Test "mit" <Zeichen> & Mehr',
      summary: 'Zusammenfassung mit "Anführungszeichen"',
    };
    const html = `<html><head><meta charset="UTF-8"></head><body></body></html>`;
    const result = injectOgTags(html, specialArticle);
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;');
    expect(result).not.toMatch(/content="[^"]*<[^"]*"/);
  });

  it('falls back to <head> if no charset meta found', () => {
    const html = `<html><head><title>Test</title></head><body></body></html>`;
    const result = injectOgTags(html, article);
    expect(result).toContain('og:title');
  });
});
