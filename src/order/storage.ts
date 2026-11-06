import { findOption } from '@/config/catalog';
import {
  MAX_LINES,
  QUANTITY_MAX,
  QUANTITY_MIN,
  type CartLine,
  type OptionKey,
  type Selection,
} from '@/order/types';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const CART_KEY = 'breou.cart.v1';

const PAYLOAD_VERSION = 1;
const MAX_ID_LENGTH = 64;
const PROBE_KEY = 'breou.probe';
// Upper bound on array entries inspected, so a hostile huge (sparse) array
// cannot stall the main thread. A cart we wrote has at most MAX_LINES entries.
const MAX_SCAN = 1000;
// Upper bound on makeId() attempts per line when the id must be regenerated.
const MAX_ID_ATTEMPTS = 25;

/**
 * Returns window.localStorage if it is usable, else null. Every access is
 * guarded: reading the property can throw (blocked storage) and a probe write
 * can throw (quota, private mode). Returns null during SSR (no window).
 */
export function getSafeStorage(
  win?: { localStorage: StorageLike },
): StorageLike | null {
  try {
    const target =
      win ??
      (typeof window !== 'undefined'
        ? (window as unknown as { localStorage: StorageLike })
        : undefined);
    if (!target) return null;
    const storage = target.localStorage;
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function' ||
      typeof storage.removeItem !== 'function'
    ) {
      return null;
    }
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return storage;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function ownValue(obj: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(obj, key) ? obj[key] : undefined;
}

function readOptionId(
  source: Record<string, unknown>,
  key: OptionKey,
): string | null {
  const value = ownValue(source, key);
  if (typeof value !== 'string') return null;
  const option = findOption(key, value);
  return option ? option.id : null;
}

/** Builds a fresh Selection from catalog-checked ids, or null if invalid. */
function readSelection(raw: unknown): Selection | null {
  if (!isPlainObject(raw)) return null;
  const size = readOptionId(raw, 'size');
  const blend = readOptionId(raw, 'blend');
  const roast = readOptionId(raw, 'roast');
  const milk = readOptionId(raw, 'milk');
  const sweetener = readOptionId(raw, 'sweetener');
  if (!size || !blend || !roast || !milk || !sweetener) return null;
  // Ids were checked against the catalog above, so the casts are sound.
  return { size, blend, roast, milk, sweetener } as Selection;
}

function readQuantity(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return null;
  return Math.min(QUANTITY_MAX, Math.max(QUANTITY_MIN, raw));
}

function isUsableId(value: unknown, used: Set<string>): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH &&
    !used.has(value)
  );
}

function resolveId(raw: unknown, makeId: () => string, used: Set<string>): string {
  if (isUsableId(raw, used)) return raw;
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const candidate: unknown = makeId();
    if (isUsableId(candidate, used)) return candidate;
  }
  // makeId kept returning unusable ids: fall back to a counter-based id.
  for (let n = used.size + 1; ; n += 1) {
    const fallback = `line-${n}`;
    if (!used.has(fallback)) return fallback;
  }
}

/**
 * Turns untrusted stored data into valid CartLines. Tolerant of any input:
 * every kept line is a fresh object with catalog-valid ids, an integer
 * quantity in [QUANTITY_MIN, QUANTITY_MAX] and a unique id. No other field of
 * the input survives. At most MAX_LINES lines are kept.
 */
export function sanitizeLines(raw: unknown, makeId: () => string): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  const used = new Set<string>();
  const scan = Math.min(raw.length, MAX_SCAN);
  for (let i = 0; i < scan && out.length < MAX_LINES; i += 1) {
    const item: unknown = raw[i];
    if (!isPlainObject(item)) continue;
    const selection = readSelection(ownValue(item, 'selection'));
    if (!selection) continue;
    const quantity = readQuantity(ownValue(item, 'quantity'));
    if (quantity === null) continue;
    const id = resolveId(ownValue(item, 'id'), makeId, used);
    used.add(id);
    out.push({ id, selection, quantity });
  }
  return out;
}

export function loadCart(
  storage: StorageLike | null,
  makeId: () => string,
): CartLine[] {
  if (!storage) return [];
  try {
    const text = storage.getItem(CART_KEY);
    if (typeof text !== 'string') return [];
    const payload: unknown = JSON.parse(text);
    if (!isPlainObject(payload)) return [];
    if (ownValue(payload, 'v') !== PAYLOAD_VERSION) return [];
    return sanitizeLines(ownValue(payload, 'lines'), makeId);
  } catch {
    return [];
  }
}

/** Persists ids, selections and quantities only; prices are never stored. */
export function saveCart(
  storage: StorageLike | null,
  lines: CartLine[],
): boolean {
  if (!storage) return false;
  try {
    const clean = lines.map((line) => ({
      id: line.id,
      selection: {
        size: line.selection.size,
        blend: line.selection.blend,
        roast: line.selection.roast,
        milk: line.selection.milk,
        sweetener: line.selection.sweetener,
      },
      quantity: line.quantity,
    }));
    storage.setItem(CART_KEY, JSON.stringify({ v: PAYLOAD_VERSION, lines: clean }));
    return true;
  } catch {
    return false;
  }
}
