import {
  BASE_PRICE_CENTS,
  OPTION_KEYS,
  findOption,
} from '@/config/catalog';
import type { CartLine, OptionKey, Selection } from '@/order/types';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function requireOption<K extends OptionKey>(key: K, id: string) {
  const option = findOption(key, id);
  if (!option) {
    throw new RangeError(`Unknown ${key} id: ${id}`);
  }
  return option;
}

export function priceCents(selection: Selection): number {
  let total = BASE_PRICE_CENTS;
  for (const key of OPTION_KEYS) {
    total += requireOption(key, selection[key]).deltaCents;
  }
  return total;
}

/**
 * Line total in integer cents (unit price times quantity).
 *
 * quantity must be an integer in [QUANTITY_MIN, QUANTITY_MAX]; callers validate
 * (Task 5/7/8 own validation). This function does not validate and does not
 * throw, because it runs in render paths.
 */
export function lineTotalCents(
  line: Pick<CartLine, 'selection' | 'quantity'>,
): number {
  return priceCents(line.selection) * line.quantity;
}

/**
 * Sum of line totals in integer cents.
 *
 * Each line's quantity must be an integer in [QUANTITY_MIN, QUANTITY_MAX];
 * callers validate (Task 5/7/8 own validation). This function does not
 * validate and does not throw, because it runs in render paths.
 */
export function subtotalCents(
  lines: Pick<CartLine, 'selection' | 'quantity'>[],
): number {
  let total = 0;
  for (const line of lines) {
    total += lineTotalCents(line);
  }
  return total;
}

/**
 * Formats integer cents as USD, e.g. 1400 -> '$14.00'.
 * Throws RangeError on non-finite input (an upstream bug, fail loudly).
 * Negative zero is normalised so -0 displays as '$0.00'.
 */
export function formatCents(cents: number): string {
  if (!Number.isFinite(cents)) {
    throw new RangeError(`formatCents requires a finite number, got ${cents}`);
  }
  return USD.format(cents / 100 || 0);
}

/**
 * Formats an integer cents delta with an ASCII sign, e.g. 120 -> '+$1.20',
 * -50 -> '-$0.50'. Deltas are expected to be integer cents. A delta that
 * rounds to zero (including -0 and sub-cent values) returns ''.
 * Throws RangeError on non-finite input.
 */
export function formatDeltaCents(delta: number): string {
  if (!Number.isFinite(delta)) {
    throw new RangeError(`formatDeltaCents requires a finite number, got ${delta}`);
  }
  if (Math.round(delta) === 0) {
    return '';
  }
  const sign = delta > 0 ? '+' : '-';
  return `${sign}${USD.format(Math.abs(delta) / 100)}`;
}

export function describeSelection(selection: Selection): string {
  const size = requireOption('size', selection.size);
  const blend = requireOption('blend', selection.blend);
  const roast = requireOption('roast', selection.roast);
  const milk = requireOption('milk', selection.milk);
  const sweetener = requireOption('sweetener', selection.sweetener);

  const parts = [`${size.label} ${blend.label}, ${roast.label.toLowerCase()} roast`];
  if (selection.milk !== 'none') {
    parts.push(`${milk.label.toLowerCase()} milk`);
  }
  if (selection.sweetener !== 'none') {
    parts.push(sweetener.label.toLowerCase());
  }
  return parts.join(', ');
}
