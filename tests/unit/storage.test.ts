import { describe, expect, it } from 'vitest';
import { DEFAULT_SELECTION } from '@/config/catalog';
import { subtotalCents } from '@/order/price';
import {
  CART_KEY,
  getSafeStorage,
  loadCart,
  sanitizeLines,
  saveCart,
  type StorageLike,
} from '@/order/storage';
import type { CartLine } from '@/order/types';

function makeIdFactory(prefix = 'gen') {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Map<string, string>;
} {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    data,
    getItem: (k) => (data.has(k) ? (data.get(k) as string) : null),
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

function storageWith(raw: string): StorageLike {
  return memoryStorage({ [CART_KEY]: raw });
}

function line(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'a',
    selection: { ...DEFAULT_SELECTION },
    quantity: 2,
    ...overrides,
  };
}

function payload(lines: unknown): string {
  return JSON.stringify({ v: 1, lines });
}

describe('getSafeStorage', () => {
  it('returns null when reading win.localStorage throws a SecurityError', () => {
    const win = {
      get localStorage(): StorageLike {
        throw new DOMException('blocked', 'SecurityError');
      },
    };
    expect(getSafeStorage(win)).toBeNull();
  });

  it('returns null when the probe setItem throws', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
      removeItem: () => {},
    };
    expect(getSafeStorage({ localStorage: storage })).toBeNull();
  });

  it('returns null when the probe removeItem throws', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new Error('nope');
      },
    };
    expect(getSafeStorage({ localStorage: storage })).toBeNull();
  });

  it('returns null when localStorage is missing on the window', () => {
    expect(getSafeStorage({} as { localStorage: StorageLike })).toBeNull();
  });

  it('returns the storage when the probe works and leaves no probe key behind', () => {
    const storage = memoryStorage();
    expect(getSafeStorage({ localStorage: storage })).toBe(storage);
    expect(storage.data.size).toBe(0);
  });

  it('returns null when there is no window (SSR)', () => {
    expect(getSafeStorage()).toBeNull();
  });
});

describe('loadCart: empty and malformed', () => {
  it('returns [] for null storage', () => {
    expect(loadCart(null, makeIdFactory())).toEqual([]);
  });

  it('returns [] when nothing is stored', () => {
    expect(loadCart(memoryStorage(), makeIdFactory())).toEqual([]);
  });

  it('returns [] for invalid JSON', () => {
    expect(loadCart(storageWith('{not json'), makeIdFactory())).toEqual([]);
  });

  it('returns [] for a wrong version', () => {
    expect(
      loadCart(storageWith(JSON.stringify({ v: 2, lines: [line()] })), makeIdFactory()),
    ).toEqual([]);
  });

  it('returns [] when v is missing or not the number 1', () => {
    expect(loadCart(storageWith(JSON.stringify({ lines: [line()] })), makeIdFactory())).toEqual([]);
    expect(
      loadCart(storageWith(JSON.stringify({ v: '1', lines: [line()] })), makeIdFactory()),
    ).toEqual([]);
  });

  it('returns [] when lines is not an array', () => {
    expect(loadCart(storageWith(payload({ a: 1 })), makeIdFactory())).toEqual([]);
    expect(loadCart(storageWith(payload('x')), makeIdFactory())).toEqual([]);
    expect(loadCart(storageWith(JSON.stringify({ v: 1 })), makeIdFactory())).toEqual([]);
  });

  it('returns [] when the payload itself is not an object', () => {
    for (const raw of ['null', '[]', '"s"', '12', 'true']) {
      expect(loadCart(storageWith(raw), makeIdFactory())).toEqual([]);
    }
  });

  it('returns [] when getItem throws', () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadCart(storage, makeIdFactory())).toEqual([]);
  });

  it('loads a valid payload', () => {
    expect(loadCart(storageWith(payload([line()])), makeIdFactory())).toEqual([
      { id: 'a', selection: DEFAULT_SELECTION, quantity: 2 },
    ]);
  });
});

describe('sanitizeLines: Bad stored cart', () => {
  it('returns [] for non-array input', () => {
    for (const raw of [null, undefined, 'x', 7, true, {}, { length: 1, 0: line() }]) {
      expect(sanitizeLines(raw, makeIdFactory())).toEqual([]);
    }
  });

  it('drops lines that are null, arrays or primitives', () => {
    const out = sanitizeLines([null, undefined, [], [line()], 5, 'x', true, line()], makeIdFactory());
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a');
  });

  it('drops lines with an unknown option id', () => {
    for (const key of Object.keys(DEFAULT_SELECTION)) {
      const bad = line({ selection: { ...DEFAULT_SELECTION, [key]: 'nope' } });
      expect(sanitizeLines([bad], makeIdFactory())).toEqual([]);
    }
  });

  it('drops lines with a missing selection key', () => {
    for (const key of Object.keys(DEFAULT_SELECTION)) {
      const sel: Record<string, unknown> = { ...DEFAULT_SELECTION };
      delete sel[key];
      expect(sanitizeLines([line({ selection: sel })], makeIdFactory())).toEqual([]);
    }
  });

  it('drops lines with a missing or non-object selection', () => {
    const noSelection = line();
    delete noSelection.selection;
    expect(sanitizeLines([noSelection], makeIdFactory())).toEqual([]);
    for (const selection of [null, 'regular', 5, [], [1, 2, 3, 4, 5]]) {
      expect(sanitizeLines([line({ selection })], makeIdFactory())).toEqual([]);
    }
  });

  it('drops lines whose selection values are not strings', () => {
    for (const value of [1, {}, [], ['regular'], null, true, { toString: () => 'regular' }]) {
      const bad = line({ selection: { ...DEFAULT_SELECTION, size: value } });
      expect(sanitizeLines([bad], makeIdFactory())).toEqual([]);
    }
  });

  it('does not accept inherited selection values', () => {
    const selection = Object.create({ ...DEFAULT_SELECTION }) as Record<string, unknown>;
    expect(sanitizeLines([line({ selection })], makeIdFactory())).toEqual([]);
  });

  it('does not accept inherited quantity or selection on the line', () => {
    const inheritedQty = Object.assign(Object.create({ quantity: 3 }), {
      id: 'a',
      selection: { ...DEFAULT_SELECTION },
    });
    expect(sanitizeLines([inheritedQty], makeIdFactory())).toEqual([]);
    const inheritedSel = Object.assign(Object.create({ selection: { ...DEFAULT_SELECTION } }), {
      id: 'a',
      quantity: 1,
    });
    expect(sanitizeLines([inheritedSel], makeIdFactory())).toEqual([]);
  });

  it('clamps quantities into [1, 10]', () => {
    const out = sanitizeLines(
      [
        line({ id: 'z', quantity: 0 }),
        line({ id: 'h', quantity: 999 }),
        line({ id: 'n', quantity: -5 }),
        line({ id: 'ok', quantity: 4 }),
        line({ id: 'lo', quantity: 1 }),
        line({ id: 'hi', quantity: 10 }),
        line({ id: 'big', quantity: 1e308 }),
      ],
      makeIdFactory(),
    );
    expect(out.map((l) => l.quantity)).toEqual([1, 10, 1, 4, 1, 10, 10]);
  });

  it('drops non-integer and non-number quantities', () => {
    for (const quantity of ['3', NaN, Infinity, -Infinity, 1.5, null, undefined, true, [], {}, [3]]) {
      expect(sanitizeLines([line({ quantity })], makeIdFactory())).toEqual([]);
    }
    const missing = line();
    delete missing.quantity;
    expect(sanitizeLines([missing], makeIdFactory())).toEqual([]);
  });

  it('strips extra fields and rebuilds fresh objects', () => {
    const raw = JSON.parse(
      '[{"id":"a","selection":{"size":"regular","blend":"house","roast":"medium","milk":"none","sweetener":"none","__proto__":{"polluted":true},"extra":1},"quantity":2,"unitCents":1,"price":1,"constructor":{"prototype":{"polluted":true}},"__proto__":{"polluted":true}}]',
    ) as unknown[];
    const out = sanitizeLines(raw, makeIdFactory());
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(out).toHaveLength(1);
    expect(Object.keys(out[0]).sort()).toEqual(['id', 'quantity', 'selection']);
    expect(Object.keys(out[0].selection).sort()).toEqual([
      'blend',
      'milk',
      'roast',
      'size',
      'sweetener',
    ]);
    expect(Object.getPrototypeOf(out[0])).toBe(Object.prototype);
    expect(Object.getPrototypeOf(out[0].selection)).toBe(Object.prototype);
    expect(out[0]).not.toBe(raw[0]);
    expect(out[0].selection).not.toBe((raw[0] as { selection: unknown }).selection);
  });

  it('returns a fresh selection object even for valid input', () => {
    const input = line();
    const out = sanitizeLines([input], makeIdFactory());
    expect(out[0].selection).not.toBe(input.selection);
    expect(out[0]).toEqual({ id: 'a', selection: DEFAULT_SELECTION, quantity: 2 });
  });

  it('regenerates ids that are not strings, empty, too long, or duplicates', () => {
    const out = sanitizeLines(
      [
        line({ id: 5 }),
        line({ id: '' }),
        line({ id: 'x'.repeat(65) }),
        line({ id: 'dup' }),
        line({ id: 'dup' }),
        line({ id: null }),
        line({ id: 'x'.repeat(64) }),
      ],
      makeIdFactory(),
    );
    expect(out).toHaveLength(7);
    expect(out[0].id).toBe('gen-1');
    expect(out[1].id).toBe('gen-2');
    expect(out[2].id).toBe('gen-3');
    expect(out[3].id).toBe('dup');
    expect(out[4].id).toBe('gen-4');
    expect(out[5].id).toBe('gen-5');
    expect(out[6].id).toBe('x'.repeat(64));
    expect(new Set(out.map((l) => l.id)).size).toBe(7);
  });

  it('regenerates an id missing from the line', () => {
    const noId = line();
    delete noId.id;
    expect(sanitizeLines([noId], makeIdFactory())[0].id).toBe('gen-1');
  });

  it('keeps ids unique even when makeId returns colliding or invalid ids', () => {
    const out = sanitizeLines(
      [line({ id: 'gen-1' }), line({ id: 5 }), line({ id: 6 })],
      makeIdFactory(),
    );
    expect(out).toHaveLength(3);
    expect(new Set(out.map((l) => l.id)).size).toBe(3);

    const constant = sanitizeLines([line({ id: 1 }), line({ id: 2 }), line({ id: 3 })], () => 'same');
    expect(constant).toHaveLength(3);
    expect(new Set(constant.map((l) => l.id)).size).toBe(3);
    for (const l of constant) {
      expect(l.id.length).toBeGreaterThan(0);
      expect(l.id.length).toBeLessThanOrEqual(64);
    }

    const bad = sanitizeLines([line({ id: 1 }), line({ id: 2 })], (() => 42) as unknown as () => string);
    expect(bad).toHaveLength(2);
    expect(new Set(bad.map((l) => l.id)).size).toBe(2);
    for (const l of bad) {
      expect(typeof l.id).toBe('string');
      expect(l.id.length).toBeGreaterThan(0);
    }
  });

  it('keeps at most 20 lines', () => {
    const many = Array.from({ length: 50 }, (_, i) => line({ id: `id-${i}` }));
    const out = sanitizeLines(many, makeIdFactory());
    expect(out).toHaveLength(20);
    expect(out[0].id).toBe('id-0');
    expect(out[19].id).toBe('id-19');
  });

  it('counts only valid lines toward the 20 line limit', () => {
    const mixed = [
      ...Array.from({ length: 5 }, () => null),
      ...Array.from({ length: 25 }, (_, i) => line({ id: `id-${i}` })),
    ];
    expect(sanitizeLines(mixed, makeIdFactory())).toHaveLength(20);
  });

  it('handles a huge sparse array without hanging', () => {
    const sparse = new Array(2 ** 32 - 1);
    expect(sanitizeLines(sparse, makeIdFactory())).toEqual([]);
  });
});

describe('hostile fixtures always give a finite integer subtotal', () => {
  const sel = { ...DEFAULT_SELECTION };
  const fixtures: Record<string, unknown> = {
    zeroQty: [line({ quantity: 0 })],
    hugeQty: [line({ quantity: 999 })],
    negativeQty: [line({ quantity: -5 })],
    stringQty: [line({ quantity: '3' })],
    nanQty: [line({ quantity: NaN })],
    infinityQty: [line({ quantity: Infinity })],
    fractionalQty: [line({ quantity: 1.5 })],
    unknownId: [line({ selection: { ...sel, milk: 'nope' } })],
    missingKey: [line({ selection: { size: 'small' } })],
    objectValues: [line({ selection: { ...sel, size: {} } })],
    priceFields: [line({ unitCents: -1e9, price: -5, total: NaN })],
    notArray: { lines: [line()] },
    nulls: [null, undefined, 1, 'x', []],
    tooMany: Array.from({ length: 200 }, (_, i) => line({ id: `i${i}`, quantity: 999 })),
    mixed: [line({ quantity: 'x' }), line({ id: 'k', quantity: 7 }), line({ id: 'k', quantity: 1e20 })],
  };

  for (const [name, raw] of Object.entries(fixtures)) {
    it(`sanitizeLines: ${name}`, () => {
      const total = subtotalCents(sanitizeLines(raw, makeIdFactory()));
      expect(Number.isFinite(total)).toBe(true);
      expect(Number.isInteger(total)).toBe(true);
    });

    it(`loadCart: ${name}`, () => {
      const total = subtotalCents(loadCart(storageWith(payload(raw)), makeIdFactory()));
      expect(Number.isFinite(total)).toBe(true);
      expect(Number.isInteger(total)).toBe(true);
    });
  }
});

describe('saveCart', () => {
  const lines: CartLine[] = [
    { id: 'a', selection: { ...DEFAULT_SELECTION }, quantity: 2 },
    {
      id: 'b',
      selection: { size: 'large', blend: 'dark-reserve', roast: 'dark', milk: 'oat', sweetener: 'honey' },
      quantity: 10,
    },
  ];

  it('returns false for null storage', () => {
    expect(saveCart(null, lines)).toBe(false);
  });

  it('returns false and does not throw when setItem throws QuotaExceededError', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
      removeItem: () => {},
    };
    expect(() => saveCart(storage, lines)).not.toThrow();
    expect(saveCart(storage, lines)).toBe(false);
  });

  it('returns true on success', () => {
    expect(saveCart(memoryStorage(), lines)).toBe(true);
  });

  it('round trips valid lines unchanged', () => {
    const storage = memoryStorage();
    expect(saveCart(storage, lines)).toBe(true);
    expect(loadCart(storage, makeIdFactory())).toEqual(lines);
  });

  it('round trips an empty cart', () => {
    const storage = memoryStorage();
    expect(saveCart(storage, [])).toBe(true);
    expect(loadCart(storage, makeIdFactory())).toEqual([]);
  });

  it('stores only v, lines, id, selection and quantity', () => {
    const storage = memoryStorage();
    const dirty = lines.map((l) => ({
      ...l,
      unitCents: 480,
      price: 4.8,
      selection: { ...l.selection, unitCents: 1 },
    })) as CartLine[];
    expect(saveCart(storage, dirty)).toBe(true);
    const stored = storage.data.get(CART_KEY) as string;
    expect(stored).not.toMatch(/unitCents|price|total|cents/i);
    const parsed = JSON.parse(stored) as { v: number; lines: Record<string, unknown>[] };
    expect(Object.keys(parsed).sort()).toEqual(['lines', 'v']);
    expect(parsed.v).toBe(1);
    expect(parsed.lines).toHaveLength(2);
    for (const l of parsed.lines) {
      expect(Object.keys(l).sort()).toEqual(['id', 'quantity', 'selection']);
      expect(Object.keys(l.selection as object).sort()).toEqual([
        'blend',
        'milk',
        'roast',
        'size',
        'sweetener',
      ]);
    }
  });

  it('writes under the versioned key', () => {
    expect(CART_KEY).toBe('breou.cart.v1');
    const storage = memoryStorage();
    saveCart(storage, lines);
    expect([...storage.data.keys()]).toEqual([CART_KEY]);
  });
});
