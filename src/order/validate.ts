import { OPTION_KEYS, PICKUP_SLOTS, findOption } from '@/config/catalog';
import { priceCents } from '@/order/price';
import {
  MAX_LINES,
  QUANTITY_MAX,
  QUANTITY_MIN,
  type Order,
  type OrderLine,
  type PickupDetails,
  type Selection,
} from '@/order/types';

export type PickupField = 'name' | 'email' | 'slotId';
export type PickupErrorCode = 'required' | 'invalid' | 'tooLong';

export const PICKUP_FIELD_ORDER: readonly PickupField[] = ['name', 'email', 'slotId'];
export const NAME_MAX = 80;
export const EMAIL_MAX = 254;

// The only email pattern. It is only ever run on strings of at most EMAIL_MAX
// characters (length is checked first), which bounds any backtracking cost.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PickupResult =
  | { ok: true; value: PickupDetails }
  | { ok: false; errors: Partial<Record<PickupField, PickupErrorCode>> };

type OrderResult = { ok: true; value: Order } | { ok: false; reason: string };

function isRecord(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads an OWN property only, so inherited or polluted values never count. */
function ownValue(source: object, key: string): unknown {
  return Object.hasOwn(source, key) ? (source as Record<string, unknown>)[key] : undefined;
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validatePickup(input: {
  name: unknown;
  email: unknown;
  slotId: unknown;
}): PickupResult {
  const source: object = isRecord(input) ? input : {};
  const name = trimmedString(ownValue(source, 'name'));
  const email = trimmedString(ownValue(source, 'email'));
  const slotRaw = ownValue(source, 'slotId');
  const slotId = typeof slotRaw === 'string' ? slotRaw : '';

  const errors: Partial<Record<PickupField, PickupErrorCode>> = {};

  if (name === '') {
    errors.name = 'required';
  } else if (name.length > NAME_MAX) {
    errors.name = 'tooLong';
  }

  if (email === '') {
    errors.email = 'required';
  } else if (email.length > EMAIL_MAX) {
    errors.email = 'tooLong';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'invalid';
  }

  if (slotId === '') {
    errors.slotId = 'required';
  } else if (!PICKUP_SLOTS.some((slot) => slot.id === slotId)) {
    errors.slotId = 'invalid';
  }

  if (errors.name || errors.email || errors.slotId) {
    return { ok: false, errors };
  }
  return { ok: true, value: { name, email, slotId } };
}

function readSelection(raw: unknown): Selection | null {
  if (!isRecord(raw)) return null;
  const picked: Partial<Record<(typeof OPTION_KEYS)[number], string>> = {};
  for (const key of OPTION_KEYS) {
    const id = ownValue(raw, key);
    if (typeof id !== 'string' || findOption(key, id) === undefined) return null;
    picked[key] = id;
  }
  return picked as Selection;
}

const REASON = {
  shape: 'malformed order',
  lines: 'invalid line count',
  line: 'malformed line',
  quantity: 'invalid quantity',
  selection: 'invalid selection',
  unit: 'invalid unit price',
  subtotal: 'invalid subtotal',
  pickup: 'invalid pickup',
} as const;

function fail(reason: string): OrderResult {
  return { ok: false, reason };
}

function checkOrder(order: unknown): OrderResult {
  if (!isRecord(order)) return fail(REASON.shape);

  const rawLines = ownValue(order, 'lines');
  if (!Array.isArray(rawLines)) return fail(REASON.shape);
  if (rawLines.length < 1 || rawLines.length > MAX_LINES) return fail(REASON.lines);

  const lines: OrderLine[] = [];
  let expectedSubtotal = 0;

  for (let i = 0; i < rawLines.length; i += 1) {
    const rawLine: unknown = Object.hasOwn(rawLines, i) ? rawLines[i] : undefined;
    if (!isRecord(rawLine)) return fail(REASON.line);

    const quantity = ownValue(rawLine, 'quantity');
    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < QUANTITY_MIN ||
      quantity > QUANTITY_MAX
    ) {
      return fail(REASON.quantity);
    }

    const selection = readSelection(ownValue(rawLine, 'selection'));
    if (selection === null) return fail(REASON.selection);

    const unitCents = ownValue(rawLine, 'unitCents');
    if (
      typeof unitCents !== 'number' ||
      !Number.isSafeInteger(unitCents) ||
      unitCents !== priceCents(selection)
    ) {
      return fail(REASON.unit);
    }

    expectedSubtotal += unitCents * quantity;
    lines.push({ selection, quantity, unitCents });
  }

  const subtotalCents = ownValue(order, 'subtotalCents');
  if (
    typeof subtotalCents !== 'number' ||
    !Number.isSafeInteger(subtotalCents) ||
    subtotalCents !== expectedSubtotal
  ) {
    return fail(REASON.subtotal);
  }

  const rawPickup = ownValue(order, 'pickup');
  if (!isRecord(rawPickup)) return fail(REASON.pickup);
  const pickup = validatePickup({
    name: ownValue(rawPickup, 'name'),
    email: ownValue(rawPickup, 'email'),
    slotId: ownValue(rawPickup, 'slotId'),
  });
  if (!pickup.ok) return fail(REASON.pickup);

  return { ok: true, value: { lines, subtotalCents, pickup: pickup.value } };
}

/**
 * Trust-boundary validation for an untrusted order payload. Returns a freshly
 * built Order (never the input object) or a fixed-vocabulary failure reason
 * that does not echo any user-supplied value.
 */
export function validateOrder(order: unknown): OrderResult {
  try {
    return checkOrder(order);
  } catch {
    // Hostile inputs (throwing getters, revoked proxies) fail closed.
    return fail(REASON.shape);
  }
}
