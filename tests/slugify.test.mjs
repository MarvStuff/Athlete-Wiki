import { describe, it, expect } from 'vitest';
import { slugify } from '../build.mjs';

describe('slugify', () => {
  it('converts basic text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('handles German umlauts', () => {
    expect(slugify('Übung für Anfänger')).toBe('uebung-fuer-anfaenger');
    expect(slugify('Größe und Stärke')).toBe('groesse-und-staerke');
  });

  it('handles ß', () => {
    expect(slugify('Straßentraining')).toBe('strassentraining');
  });

  it('removes special characters', () => {
    expect(slugify('Blutzucker & Dopamin – Warum?')).toBe('blutzucker-dopamin-warum');
  });

  it('collapses multiple dashes', () => {
    expect(slugify('a   b---c')).toBe('a-b-c');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('-hello-')).toBe('hello');
  });

  it('truncates at 80 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles only special characters', () => {
    expect(slugify('!@#$%')).toBe('');
  });
});
