import { describe, it, expect } from 'vitest';
import { slugify } from '../build.mjs';

describe('slugify', () => {
  it('converts basic text to single word slug', () => {
    expect(slugify('Hello World')).toBe('helloworld');
  });

  it('handles German umlauts', () => {
    expect(slugify('Übung für Anfänger')).toBe('uebungfueranfaenger');
    expect(slugify('Größe und Stärke')).toBe('groesseundstaerke');
  });

  it('handles ß', () => {
    expect(slugify('Straßentraining')).toBe('strassentraining');
  });

  it('removes special characters', () => {
    expect(slugify('Blutzucker & Dopamin – Warum?')).toBe('blutzuckerdopaminwarum');
  });

  it('removes hyphens and spaces completely', () => {
    expect(slugify('a   b---c')).toBe('abc');
  });

  it('removes leading and trailing special chars', () => {
    expect(slugify('-hello-')).toBe('hello');
  });

  it('truncates at 50 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(50);
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles only special characters', () => {
    expect(slugify('!@#$%')).toBe('');
  });

  it('produces single word without any separators', () => {
    const result = slugify('Proteinverteilung über den Tag');
    expect(result).not.toContain('-');
    expect(result).not.toContain(' ');
    expect(result).toBe('proteinverteilungueberdentag');
  });
});
