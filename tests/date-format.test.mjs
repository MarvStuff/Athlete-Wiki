import { describe, it, expect } from 'vitest';
import { formatDate } from '../build.mjs';

describe('formatDate', () => {
  it('formats a standard date', () => {
    expect(formatDate('2026-02-10')).toBe('10. Feb 2026');
  });

  it('formats January', () => {
    expect(formatDate('2025-01-01')).toBe('1. Jan 2025');
  });

  it('formats December', () => {
    expect(formatDate('2026-12-25')).toBe('25. Dez 2026');
  });

  it('formats March (Mär)', () => {
    expect(formatDate('2026-03-15')).toBe('15. Mär 2026');
  });

  it('returns original string for invalid date', () => {
    expect(formatDate('invalid')).toBe('invalid');
  });

  it('returns original string for month out of range', () => {
    expect(formatDate('2026-13-01')).toBe('2026-13-01');
  });

  it('returns original string for day zero', () => {
    expect(formatDate('2026-01-00')).toBe('2026-01-00');
  });

  it('formats all 12 months correctly', () => {
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    months.forEach((name, i) => {
      const m = String(i + 1).padStart(2, '0');
      expect(formatDate(`2026-${m}-01`)).toBe(`1. ${name} 2026`);
    });
  });
});
