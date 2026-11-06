import { describe, expect, it } from 'vitest';
import { DEFAULT_SELECTION } from '@/config/catalog';
import type { CartLine, Selection } from '@/order/types';
import {
  describeSelection,
  formatCents,
  formatDeltaCents,
  lineTotalCents,
  priceCents,
  subtotalCents,
} from '@/order/price';

const SIZES = ['small', 'regular', 'large'] as const;
const BLENDS = ['house', 'single-origin', 'dark-reserve'] as const;
const ROASTS = ['light', 'medium', 'dark'] as const;
const MILKS = ['none', 'whole', 'oat', 'almond', 'soy'] as const;
const SWEETENERS = ['none', 'sugar', 'honey', 'vanilla'] as const;

const CHEAPEST: Selection = {
  size: 'small',
  blend: 'house',
  roast: 'light',
  milk: 'none',
  sweetener: 'none',
};

const MOST_EXPENSIVE: Selection = {
  size: 'large',
  blend: 'single-origin',
  roast: 'dark',
  milk: 'oat',
  sweetener: 'vanilla',
};

const THE_700: Selection = {
  size: 'large',
  blend: 'single-origin',
  roast: 'medium',
  milk: 'oat',
  sweetener: 'honey',
};

function allSelections(): Selection[] {
  const out: Selection[] = [];
  for (const size of SIZES)
    for (const blend of BLENDS)
      for (const roast of ROASTS)
        for (const milk of MILKS)
          for (const sweetener of SWEETENERS)
            out.push({ size, blend, roast, milk, sweetener });
  return out;
}

describe('priceCents', () => {
  it('prices the default selection at the 400 base', () => {
    expect(priceCents(DEFAULT_SELECTION)).toBe(400);
  });

  it('prices the cheapest selection at 350', () => {
    expect(priceCents(CHEAPEST)).toBe(350);
  });

  it('prices the most expensive selection at 710', () => {
    expect(priceCents(MOST_EXPENSIVE)).toBe(710);
  });

  it('prices Large, Single Origin, Medium, Oat, Honey at 700', () => {
    expect(priceCents(THE_700)).toBe(700);
  });

  it('keeps every one of the 540 selections an integer in [350, 710] with exact extremes', () => {
    const all = allSelections();
    expect(all).toHaveLength(540);
    let min = Infinity;
    let max = -Infinity;
    for (const selection of all) {
      const price = priceCents(selection);
      expect(Number.isInteger(price)).toBe(true);
      expect(price).toBeGreaterThanOrEqual(350);
      expect(price).toBeLessThanOrEqual(710);
      min = Math.min(min, price);
      max = Math.max(max, price);
    }
    expect(min).toBe(350);
    expect(max).toBe(710);
  });

  it('throws RangeError for an unknown size id', () => {
    expect(() =>
      priceCents({ ...DEFAULT_SELECTION, size: 'jumbo' as Selection['size'] }),
    ).toThrow(RangeError);
  });

  it('throws RangeError for an unknown blend id', () => {
    expect(() =>
      priceCents({ ...DEFAULT_SELECTION, blend: 'nope' as Selection['blend'] }),
    ).toThrow(RangeError);
  });

  it('throws RangeError for an unknown roast id', () => {
    expect(() =>
      priceCents({ ...DEFAULT_SELECTION, roast: 'nope' as Selection['roast'] }),
    ).toThrow(RangeError);
  });

  it('throws RangeError for an unknown milk id', () => {
    expect(() =>
      priceCents({ ...DEFAULT_SELECTION, milk: 'nope' as Selection['milk'] }),
    ).toThrow(RangeError);
  });

  it('throws RangeError for an unknown sweetener id', () => {
    expect(() =>
      priceCents({
        ...DEFAULT_SELECTION,
        sweetener: 'nope' as Selection['sweetener'],
      }),
    ).toThrow(RangeError);
  });
});

describe('lineTotalCents and subtotalCents', () => {
  it('multiplies the unit price by quantity in lineTotalCents', () => {
    expect(lineTotalCents({ selection: THE_700, quantity: 3 })).toBe(2100);
  });

  it('sums line totals in subtotalCents', () => {
    const lines: Pick<CartLine, 'selection' | 'quantity'>[] = [
      { selection: THE_700, quantity: 2 },
    ];
    expect(subtotalCents(lines)).toBe(1400);
  });

  it('returns 0 for an empty subtotal', () => {
    expect(subtotalCents([])).toBe(0);
  });
});

describe('formatCents', () => {
  it('formats cents as USD currency', () => {
    expect(formatCents(1400)).toBe('$14.00');
    expect(formatCents(350)).toBe('$3.50');
  });
});

describe('formatDeltaCents', () => {
  it('prefixes positive deltas with +', () => {
    expect(formatDeltaCents(120)).toBe('+$1.20');
  });

  it('prefixes negative deltas with -', () => {
    expect(formatDeltaCents(-50)).toBe('-$0.50');
  });

  it('returns an empty string for a zero delta', () => {
    expect(formatDeltaCents(0)).toBe('');
  });
});

describe('describeSelection', () => {
  it('describes the default selection', () => {
    expect(describeSelection(DEFAULT_SELECTION)).toBe(
      'Regular House Blend, medium roast',
    );
  });

  it('describes a full selection with milk and sweetener', () => {
    expect(
      describeSelection({
        size: 'large',
        blend: 'single-origin',
        roast: 'medium',
        milk: 'oat',
        sweetener: 'vanilla',
      }),
    ).toBe('Large Single Origin, medium roast, oat milk, vanilla syrup');
  });

  it('omits milk and sweetener when they are None', () => {
    expect(describeSelection(CHEAPEST)).toBe('Small House Blend, light roast');
  });
});
