import { describe, it, expect } from 'vitest';
import { extractContent, extractSummaryFromHtml } from '../build.mjs';

describe('extractContent', () => {
  it('extracts text from HTML', () => {
    const html = '<html><body><h1>Titel</h1><p>Inhalt hier.</p></body></html>';
    const text = extractContent(html);
    expect(text).toContain('Titel');
    expect(text).toContain('Inhalt hier.');
  });

  it('strips script tags', () => {
    const html = '<html><body><p>Sichtbar</p><script>alert("x")</script></body></html>';
    const text = extractContent(html);
    expect(text).toContain('Sichtbar');
    expect(text).not.toContain('alert');
  });

  it('strips style tags', () => {
    const html = '<html><body><style>.x{color:red}</style><p>Text</p></body></html>';
    const text = extractContent(html);
    expect(text).not.toContain('color:red');
    expect(text).toContain('Text');
  });

  it('strips SVG content', () => {
    const html = '<html><body><svg><text>Chart</text></svg><p>Artikel</p></body></html>';
    const text = extractContent(html);
    expect(text).not.toContain('Chart');
    expect(text).toContain('Artikel');
  });

  it('collapses whitespace', () => {
    const html = '<html><body><p>Viel     Platz\n\nhier</p></body></html>';
    const text = extractContent(html);
    expect(text).not.toContain('  ');
  });

  it('truncates very long content', () => {
    const longP = '<p>' + 'a'.repeat(25000) + '</p>';
    const html = `<html><body>${longP}</body></html>`;
    const text = extractContent(html);
    expect(text.length).toBeLessThanOrEqual(20000);
  });
});

describe('extractSummaryFromHtml', () => {
  it('extracts first paragraph', () => {
    const html = '<html><body><h1>Title</h1><p>Erster Absatz.</p><p>Zweiter.</p></body></html>';
    expect(extractSummaryFromHtml(html)).toBe('Erster Absatz.');
  });

  it('truncates long paragraphs to 200 characters', () => {
    const longText = 'a'.repeat(250);
    const html = `<html><body><p>${longText}</p></body></html>`;
    const summary = extractSummaryFromHtml(html);
    expect(summary.length).toBeLessThanOrEqual(200);
    expect(summary).toMatch(/\.\.\.$/);
  });

  it('returns empty string when no paragraph exists', () => {
    const html = '<html><body><h1>Nur Titel</h1></body></html>';
    expect(extractSummaryFromHtml(html)).toBe('');
  });
});
