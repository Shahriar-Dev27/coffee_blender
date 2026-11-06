import { validateOrder } from './validate';
import { compatibleSelection } from './recipes';
import type { Order, OrderReceipt } from './types';

/** Local-only demonstration. No fetch, payment, email, or personal-data persistence. */
export async function submitOrder(input: Order): Promise<OrderReceipt> {
  const checked = validateOrder(input);
  if (!checked.ok || !checked.value.lines.every((line) => compatibleSelection(line.selection))) throw new Error('Please check your order and try again.');
  const order = checked.value;
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    orderNumber: `BR-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
    placedAt: new Date().toISOString(),
    lines: order.lines,
    subtotalCents: order.subtotalCents,
    pickup: { name: order.pickup.name, slotId: order.pickup.slotId },
  };
}
