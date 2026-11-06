import { describe, expect, it } from 'vitest';
import { priceCents } from '@/order/price';
import type { Selection } from '@/order/types';
import {
  EMAIL_MAX,
  NAME_MAX,
  PICKUP_FIELD_ORDER,
  validateOrder,
  validatePickup,
} from '@/order/validate';

const SEL_A: Selection = {
  size: 'large',
  blend: 'single-origin',
  roast: 'medium',
  milk: 'oat',
  sweetener: 'honey',
}; // 400 + 80 + 120 + 0 + 60 + 40 = 700
const SEL_B: Selection = {
  size: 'regular',
  blend: 'house',
  roast: 'light',
  milk: 'none',
  sweetener: 'none',
}; // 400

const PICKUP = { name: 'Ana', email: 'ana@example.com', slotId: '30' };

function goodOrder() {
  return {
    lines: [
      { selection: { ...SEL_A }, quantity: 2, unitCents: 700 },
      { selection: { ...SEL_B }, quantity: 1, unitCents: 400 },
    ],
    subtotalCents: 1800,
    pickup: { ...PICKUP },
  };
}

function withLine(patch: Record<string, unknown>) {
  const order = goodOrder();
  Object.assign(order.lines[0], patch);
  return order;
}

describe('constants', () => {
  it('exposes field order and limits', () => {
    expect(PICKUP_FIELD_ORDER).toEqual(['name', 'email', 'slotId']);
    expect(NAME_MAX).toBe(80);
    expect(EMAIL_MAX).toBe(254);
  });
});

describe('validatePickup', () => {
  it('accepts valid input and trims name and email', () => {
    const result = validatePickup({
      name: '  Ana ',
      email: ' ana@example.com ',
      slotId: '30',
    });
    expect(result).toEqual({
      ok: true,
      value: { name: 'Ana', email: 'ana@example.com', slotId: '30' },
    });
  });

  it('returns required on all three fields for empty input', () => {
    const result = validatePickup({ name: '', email: '', slotId: '' });
    expect(result).toEqual({
      ok: false,
      errors: { name: 'required', email: 'required', slotId: 'required' },
    });
  });

  it('treats whitespace-only and non-string values as required', () => {
    const result = validatePickup({ name: '   ', email: null, slotId: undefined });
    expect(result).toEqual({
      ok: false,
      errors: { name: 'required', email: 'required', slotId: 'required' },
    });
  });

  it('treats a numeric name as required', () => {
    const result = validatePickup({ name: 42, email: 'ana@example.com', slotId: '30' });
    expect(result).toEqual({ ok: false, errors: { name: 'required' } });
  });

  it('treats a numeric slot as required', () => {
    const result = validatePickup({ name: 'Ana', email: 'ana@example.com', slotId: 30 });
    expect(result).toEqual({ ok: false, errors: { slotId: 'required' } });
  });

  it('flags an email without a domain as invalid', () => {
    const result = validatePickup({ name: 'Ana', email: 'ana@', slotId: '30' });
    expect(result).toEqual({ ok: false, errors: { email: 'invalid' } });
  });

  it('flags an 81 character name as tooLong and accepts 80', () => {
    expect(
      validatePickup({ name: 'a'.repeat(81), email: 'a@b.c', slotId: '30' }),
    ).toEqual({ ok: false, errors: { name: 'tooLong' } });
    expect(
      validatePickup({ name: 'a'.repeat(80), email: 'a@b.c', slotId: '30' }).ok,
    ).toBe(true);
  });

  it('measures name length after trimming', () => {
    const result = validatePickup({
      name: `  ${'a'.repeat(80)}  `,
      email: 'a@b.c',
      slotId: '30',
    });
    expect(result.ok).toBe(true);
  });

  it('flags an unknown slot as invalid', () => {
    expect(validatePickup({ name: 'Ana', email: 'a@b.c', slotId: '99' })).toEqual({
      ok: false,
      errors: { slotId: 'invalid' },
    });
  });

  it('does not accept prototype property names as slot ids', () => {
    for (const slotId of ['__proto__', 'constructor', 'toString', 'length', '0']) {
      expect(validatePickup({ name: 'Ana', email: 'a@b.c', slotId })).toEqual({
        ok: false,
        errors: { slotId: 'invalid' },
      });
    }
  });

  it('handles email edge cases', () => {
    const check = (email: string) =>
      validatePickup({ name: 'Ana', email, slotId: '30' });
    expect(check('a@b.c').ok).toBe(true);
    expect(check('a b@c.d')).toEqual({ ok: false, errors: { email: 'invalid' } });
    expect(check('@b.c')).toEqual({ ok: false, errors: { email: 'invalid' } });
    expect(check('a@b')).toEqual({ ok: false, errors: { email: 'invalid' } });
  });

  it('accepts a 254 character email and rejects 255', () => {
    const local = 'a'.repeat(254 - '@b.c'.length);
    const ok = `${local}@b.c`;
    expect(ok).toHaveLength(254);
    expect(validatePickup({ name: 'Ana', email: ok, slotId: '30' }).ok).toBe(true);
    expect(
      validatePickup({ name: 'Ana', email: `a${ok}`, slotId: '30' }),
    ).toEqual({ ok: false, errors: { email: 'tooLong' } });
  });

  it('rejects a 100,000 character email as tooLong quickly', () => {
    const email = 'a'.repeat(100_000) + '@b.c';
    const start = performance.now();
    const result = validatePickup({ name: 'Ana', email, slotId: '30' });
    expect(performance.now() - start).toBeLessThan(50);
    expect(result).toEqual({ ok: false, errors: { email: 'tooLong' } });
  });

  it('does not hang on pathological email input', () => {
    const inputs = [
      'a@' + 'a.'.repeat(5000),
      'a@' + 'a.'.repeat(120),
      '@'.repeat(250),
      'a'.repeat(250) + '@',
      'a@' + '.'.repeat(250),
    ];
    const start = performance.now();
    for (const email of inputs) {
      validatePickup({ name: 'Ana', email, slotId: '30' });
    }
    expect(performance.now() - start).toBeLessThan(100);
  });

  it('never throws on exotic values', () => {
    const weird: unknown[] = [{}, [], Symbol.iterator, BigInt(1), () => 1, NaN, true];
    for (const value of weird) {
      expect(() =>
        validatePickup({ name: value, email: value, slotId: value }),
      ).not.toThrow();
    }
  });
});

describe('validateOrder', () => {
  it('accepts a correct two line order and returns the same data', () => {
    const input = goodOrder();
    const result = validateOrder(input);
    expect(result).toEqual({ ok: true, value: input });
  });

  it('returns a fresh object with exactly the Order shape', () => {
    const input = goodOrder();
    const result = validateOrder(input);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).not.toBe(input);
    expect(result.value.lines).not.toBe(input.lines);
    expect(result.value.lines[0]).not.toBe(input.lines[0]);
    expect(result.value.lines[0].selection).not.toBe(input.lines[0].selection);
    expect(result.value.pickup).not.toBe(input.pickup);
    expect(Object.keys(result.value).sort()).toEqual(['lines', 'pickup', 'subtotalCents']);
    expect(Object.keys(result.value.lines[0]).sort()).toEqual([
      'quantity',
      'selection',
      'unitCents',
    ]);
    expect(Object.keys(result.value.lines[0].selection).sort()).toEqual([
      'blend',
      'milk',
      'roast',
      'size',
      'sweetener',
    ]);
    expect(Object.keys(result.value.pickup).sort()).toEqual(['email', 'name', 'slotId']);
  });

  it('trims pickup in the returned value', () => {
    const input = goodOrder();
    input.pickup.name = '  Ana  ';
    const result = validateOrder(input);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.pickup.name).toBe('Ana');
  });

  it('does not copy unknown properties through', () => {
    const input = goodOrder() as Record<string, unknown>;
    input.admin = true;
    (input.lines as Record<string, unknown>[])[0].discount = 500;
    ((input.lines as Record<string, unknown>[])[0].selection as Record<string, unknown>).extra =
      'x';
    (input.pickup as Record<string, unknown>).note = 'y';
    const result = validateOrder(input);
    if (!result.ok) throw new Error('expected ok');
    expect(JSON.stringify(result.value)).not.toMatch(/admin|discount|extra|note/);
  });

  it('rejects zero lines', () => {
    const input = goodOrder();
    input.lines = [];
    input.subtotalCents = 0;
    expect(validateOrder(input).ok).toBe(false);
  });

  it('rejects 21 lines and accepts 20', () => {
    const make = (n: number) => ({
      lines: Array.from({ length: n }, () => ({
        selection: { ...SEL_B },
        quantity: 1,
        unitCents: 400,
      })),
      subtotalCents: 400 * n,
      pickup: { ...PICKUP },
    });
    expect(validateOrder(make(20)).ok).toBe(true);
    expect(validateOrder(make(21)).ok).toBe(false);
  });

  it('accepts quantity 1 and 10, rejects 0, 11, 1.5, -1', () => {
    const make = (q: unknown) => {
      const order = withLine({ quantity: q });
      order.subtotalCents = 700 * (typeof q === 'number' ? q : 0) + 400;
      return order;
    };
    expect(validateOrder(make(1)).ok).toBe(true);
    expect(validateOrder(make(10)).ok).toBe(true);
    for (const q of [0, 11, 1.5, -1]) {
      expect(validateOrder(make(q)).ok).toBe(false);
    }
  });

  it('rejects string, NaN and Infinity quantities', () => {
    for (const q of ['3', NaN, Infinity, -Infinity, null, undefined, {}, [3], true]) {
      const order = withLine({ quantity: q });
      expect(validateOrder(order).ok).toBe(false);
    }
  });

  it('rejects tampered unitCents', () => {
    const order = withLine({ unitCents: 1 });
    order.subtotalCents = 1 * 2 + 400;
    expect(validateOrder(order).ok).toBe(false);
  });

  it('rejects negative, fractional and non-numeric unitCents', () => {
    for (const u of [-700, 700.5, NaN, Infinity, '700', null]) {
      const order = withLine({ unitCents: u });
      expect(validateOrder(order).ok).toBe(false);
    }
  });

  it('rejects a wrong subtotal', () => {
    const order = goodOrder();
    order.subtotalCents = 1799;
    expect(validateOrder(order).ok).toBe(false);
  });

  it('rejects negative, fractional and non-numeric subtotals', () => {
    for (const s of [-1800, 1800.5, NaN, Infinity, '1800', null, undefined]) {
      const order = goodOrder() as Record<string, unknown>;
      order.subtotalCents = s;
      expect(validateOrder(order).ok).toBe(false);
    }
  });

  it('rejects an unknown blend', () => {
    const order = withLine({ selection: { ...SEL_A, blend: 'mystery' } });
    expect(validateOrder(order).ok).toBe(false);
  });

  it('rejects non-string and prototype-name selection ids', () => {
    for (const v of [1, null, {}, ['house'], '__proto__', 'constructor']) {
      const order = withLine({ selection: { ...SEL_A, blend: v } });
      expect(validateOrder(order).ok).toBe(false);
    }
  });

  it('rejects a missing selection key', () => {
    for (const key of Object.keys(SEL_A)) {
      const selection: Record<string, unknown> = { ...SEL_A };
      delete selection[key];
      expect(validateOrder(withLine({ selection })).ok).toBe(false);
    }
  });

  it('rejects a missing or non-object selection', () => {
    for (const selection of [undefined, null, 'large', [], 5]) {
      expect(validateOrder(withLine({ selection })).ok).toBe(false);
    }
  });

  it('rejects non-object orders', () => {
    for (const input of [null, undefined, [], 'order', 42, true, () => 1]) {
      expect(validateOrder(input)).toMatchObject({ ok: false });
    }
  });

  it('rejects lines that are not an array', () => {
    for (const lines of [undefined, null, {}, 'x', { length: 1, 0: {} }]) {
      const order = goodOrder() as Record<string, unknown>;
      order.lines = lines;
      expect(validateOrder(order).ok).toBe(false);
    }
  });

  it('rejects a non-object line', () => {
    for (const line of [null, 5, 'x', []]) {
      const order = goodOrder() as Record<string, unknown>;
      order.lines = [line];
      expect(validateOrder(order).ok).toBe(false);
    }
  });

  it('rejects an invalid or missing pickup', () => {
    for (const pickup of [
      undefined,
      null,
      [],
      { ...PICKUP, slotId: '99' },
      { ...PICKUP, email: 'nope' },
      { ...PICKUP, name: '' },
    ]) {
      const order = goodOrder() as Record<string, unknown>;
      order.pickup = pickup;
      expect(validateOrder(order).ok).toBe(false);
    }
  });

  it('ignores inherited properties (prototype pollution input cannot satisfy checks)', () => {
    const proto = goodOrder();
    const inheriting = Object.create(proto);
    expect(validateOrder(inheriting).ok).toBe(false);

    const lineProto = { selection: { ...SEL_B }, quantity: 1, unitCents: 400 };
    const order = goodOrder();
    order.lines = [Object.create(lineProto)];
    order.subtotalCents = 400;
    expect(validateOrder(order).ok).toBe(false);

    const selection = Object.create({ ...SEL_B });
    const order2 = goodOrder();
    order2.lines = [{ selection, quantity: 1, unitCents: 400 }];
    order2.subtotalCents = 400;
    expect(validateOrder(order2).ok).toBe(false);

    const order3 = goodOrder() as Record<string, unknown>;
    order3.pickup = Object.create({ ...PICKUP });
    expect(validateOrder(order3).ok).toBe(false);
  });

  it('does not leak or pollute with __proto__ / constructor keys', () => {
    const json = JSON.stringify(goodOrder()).replace(
      '{"lines"',
      '{"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":2}},"lines"',
    );
    const input = JSON.parse(json);
    expect(Object.hasOwn(input, '__proto__')).toBe(true);
    const result = validateOrder(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.hasOwn(result.value, '__proto__')).toBe(false);
    expect(Object.hasOwn(result.value, 'constructor')).toBe(false);
    expect(Object.getPrototypeOf(result.value)).not.toHaveProperty('polluted');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(result.value).sort()).toEqual(['lines', 'pickup', 'subtotalCents']);
  });

  it('does not leak __proto__ keys nested in lines, selection and pickup', () => {
    const input = JSON.parse(
      JSON.stringify(goodOrder())
        .replace('"quantity":2', '"__proto__":{"polluted":3},"quantity":2')
        .replace('"size":"large"', '"__proto__":{"polluted":4},"size":"large"')
        .replace('"name":"Ana"', '"__proto__":{"polluted":5},"name":"Ana"'),
    );
    const result = validateOrder(input);
    expect(result.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    if (!result.ok) return;
    expect(JSON.stringify(result.value)).not.toContain('polluted');
  });

  it('is consistent with priceCents for every unitCents it accepts', () => {
    const order = goodOrder();
    expect(order.lines[0].unitCents).toBe(priceCents(SEL_A));
    expect(validateOrder(order).ok).toBe(true);
  });

  it('never echoes user input in the failure reason', () => {
    const name = 'Zebediah Quux';
    const email = 'zebediah.quux@secret-domain.test';
    const attempts: unknown[] = [
      { ...goodOrder(), subtotalCents: 1, pickup: { name, email, slotId: '30' } },
      { ...goodOrder(), pickup: { name, email, slotId: '99' } },
      { ...goodOrder(), pickup: { name, email: 'bad email', slotId: '30' } },
      { ...goodOrder(), pickup: { name: name.repeat(10), email, slotId: '30' } },
      { ...goodOrder(), lines: [] , pickup: { name, email, slotId: '30' } },
    ];
    for (const attempt of attempts) {
      const result = validateOrder(attempt);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
      expect(result.reason.length).toBeLessThan(60);
      expect(result.reason).not.toContain(name);
      expect(result.reason).not.toContain(email);
      expect(result.reason).not.toContain('bad email');
      expect(result.reason).toMatch(/^[a-z ]+$/);
    }
  });
});
