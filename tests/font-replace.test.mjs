import { describe, it, expect } from 'vitest';
import { replaceGoogleFonts, checkExternalResources } from '../build.mjs';

describe('replaceGoogleFonts', () => {
  it('replaces Google Fonts link with local @font-face', () => {
    const html = `<head>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400&display=swap" rel="stylesheet">
</head>`;
    const result = replaceGoogleFonts(html);
    expect(result).not.toContain('fonts.googleapis.com');
    expect(result).toContain('@font-face');
    expect(result).toContain('/fonts/outfit-400.woff2');
  });

  it('removes preconnect links to Google Fonts domains', () => {
    const html = `<head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit" rel="stylesheet">
</head>`;
    const result = replaceGoogleFonts(html);
    expect(result).not.toContain('fonts.gstatic.com');
    expect(result).not.toContain('preconnect');
  });

  it('keeps existing local @font-face untouched', () => {
    const html = `<head><style>
@font-face{font-family:'Outfit';src:url('/fonts/outfit-400.woff2') format('woff2')}
</style></head>`;
    const result = replaceGoogleFonts(html);
    expect(result).toContain('/fonts/outfit-400.woff2');
  });

  it('adds @font-face if no fonts at all', () => {
    const html = '<head></head>';
    const result = replaceGoogleFonts(html);
    expect(result).toContain('@font-face');
  });
});

describe('checkExternalResources', () => {
  it('reports Google Fonts references', () => {
    const html = '<link href="https://fonts.googleapis.com/css" rel="stylesheet">';
    const issues = checkExternalResources(html, 'test.html');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain('fonts.googleapis.com');
  });

  it('reports external scripts', () => {
    const html = '<script src="https://cdn.example.com/lib.js"></script>';
    const issues = checkExternalResources(html, 'test.html');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain('External script');
  });

  it('flags cloudflareinsights scripts as external', () => {
    const html = '<script src="https://static.cloudflareinsights.com/beacon.min.js"></script>';
    const issues = checkExternalResources(html, 'test.html');
    expect(issues.length).toBe(1);
  });

  it('allows local scripts', () => {
    const html = '<script src="/fuse.min.js"></script>';
    const issues = checkExternalResources(html, 'test.html');
    expect(issues.length).toBe(0);
  });

  it('reports jsdelivr CDN', () => {
    const html = '<script src="https://cdn.jsdelivr.net/npm/fuse.js"></script>';
    const issues = checkExternalResources(html, 'test.html');
    expect(issues.length).toBeGreaterThan(0);
  });

  it('returns empty array for clean HTML', () => {
    const html = '<html><head><style>body{color:red}</style></head><body><p>OK</p></body></html>';
    const issues = checkExternalResources(html, 'clean.html');
    expect(issues).toEqual([]);
  });
});
