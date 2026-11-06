export type SizeId = 'small' | 'regular' | 'large';
export type BlendId = 'house' | 'single-origin' | 'dark-reserve';
export type RoastId = 'light' | 'medium' | 'dark';
export type MilkId = 'none' | 'whole' | 'oat' | 'almond' | 'soy';
export type SweetenerId = 'none' | 'sugar' | 'honey' | 'vanilla';

export interface Selection {
  size: SizeId;
  blend: BlendId;
  roast: RoastId;
  milk: MilkId;
  sweetener: SweetenerId;
}

export type OptionKey = keyof Selection;

export interface Option<Id extends string> {
  id: Id;
  label: string;
  deltaCents: number;
}

export interface CartLine {
  id: string;
  selection: Selection;
  quantity: number;
}

export type PickupSlotId = string;

export interface PickupDetails {
  name: string;
  email: string;
  slotId: PickupSlotId;
}

export interface OrderLine {
  selection: Selection;
  quantity: number;
  unitCents: number;
}

export interface Order {
  lines: OrderLine[];
  subtotalCents: number;
  pickup: PickupDetails;
}

export interface OrderReceipt {
  orderNumber: string;
  placedAt: string;
  lines: OrderLine[];
  subtotalCents: number;
  pickup: { name: string; slotId: PickupSlotId };
}

export interface OrderService {
  submitOrder(order: Order): Promise<OrderReceipt>;
}

export const QUANTITY_MIN = 1;
export const QUANTITY_MAX = 10;
export const MAX_LINES = 20;
