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

export function lineTotalCents(
  line: Pick<CartLine, 'selection' | 'quantity'>,
): number {
  return priceCents(line.selection) * line.quantity;
}

export function subtotalCents(
  lines: Pick<CartLine, 'selection' | 'quantity'>[],
): number {
  let total = 0;
  for (const line of lines) {
    total += lineTotalCents(line);
  }
  return total;
}

export function formatCents(cents: number): string {
  return USD.format(cents / 100);
}

export function formatDeltaCents(delta: number): string {
  if (delta === 0) {
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
