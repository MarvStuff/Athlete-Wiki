import { describe, it, expect } from 'vitest';
import { parseMetaBlock } from '../build.mjs';

describe('parseMetaBlock', () => {
  it('parses a standard meta block', () => {
    const html = `<!--
title: Mein Artikel
date: 2026-01-15
tags: training, kraft
category: training
status: published
slug: 2026-01-15-mein-artikel
summary: Ein Testartikel.
-->
<!DOCTYPE html>`;

    const meta = parseMetaBlock(html);
    expect(meta).toEqual({
      title: 'Mein Artikel',
      date: '2026-01-15',
      tags: 'training, kraft',
      category: 'training',
      status: 'published',
      slug: '2026-01-15-mein-artikel',
      summary: 'Ein Testartikel.',
    });
  });

  it('handles values with colons', () => {
    const html = `<!--
title: Warum du 08:00 aufstehen solltest
summary: Energie von 06:00 bis 22:00
-->
<html>`;

    const meta = parseMetaBlock(html);
    expect(meta.title).toBe('Warum du 08:00 aufstehen solltest');
    expect(meta.summary).toBe('Energie von 06:00 bis 22:00');
  });

  it('returns null if no meta block found', () => {
    const html = '<!DOCTYPE html><html><head></head><body></body></html>';
    expect(parseMetaBlock(html)).toBeNull();
  });

  it('skips empty lines in meta block', () => {
    const html = `<!--
title: Test

category: training
-->`;

    const meta = parseMetaBlock(html);
    expect(meta.title).toBe('Test');
    expect(meta.category).toBe('training');
  });

  it('trims whitespace from keys and values', () => {
    const html = `<!--
  title:   Spaces Everywhere
  date:  2026-03-01
-->`;

    const meta = parseMetaBlock(html);
    expect(meta.title).toBe('Spaces Everywhere');
    expect(meta.date).toBe('2026-03-01');
  });
});
