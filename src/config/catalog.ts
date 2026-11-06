// PLACEHOLDER: every name and price here is a spec placeholder until real values are supplied.
import type {
  BlendId,
  MilkId,
  Option,
  OptionKey,
  PickupSlotId,
  RoastId,
  Selection,
  SizeId,
  SweetenerId,
} from '@/order/types';

export const CATALOG_STATUS = 'placeholder' as const;

// Single cup base price (Regular size), in integer cents.
export const BASE_PRICE_CENTS = 400;

export const CATALOG: {
  size: Option<SizeId>[];
  blend: (Option<BlendId> & { beanMix: { roundFraction: number; sizeJitter: number } })[];
  roast: Option<RoastId>[];
  milk: (Option<MilkId> & { tint: number; foam: number })[];
  sweetener: Option<SweetenerId>[];
} = {
  size: [
    { id: 'small', label: 'Small', deltaCents: -50 },
    { id: 'regular', label: 'Regular', deltaCents: 0 },
    { id: 'large', label: 'Large', deltaCents: 80 },
  ],
  blend: [
    {
      id: 'house',
      label: 'House Blend',
      deltaCents: 0,
      beanMix: { roundFraction: 0.15, sizeJitter: 0.12 },
    },
    {
      id: 'single-origin',
      label: 'Single Origin',
      deltaCents: 120,
      beanMix: { roundFraction: 0, sizeJitter: 0.05 },
    },
    {
      id: 'dark-reserve',
      label: 'Dark Reserve',
      deltaCents: 80,
      beanMix: { roundFraction: 0.3, sizeJitter: 0.18 },
    },
  ],
  roast: [
    { id: 'light', label: 'Light', deltaCents: 0 },
    { id: 'medium', label: 'Medium', deltaCents: 0 },
    { id: 'dark', label: 'Dark', deltaCents: 0 },
  ],
  milk: [
    { id: 'none', label: 'None', deltaCents: 0, tint: 0, foam: 0 },
    { id: 'whole', label: 'Whole', deltaCents: 0, tint: 0.55, foam: 0.8 },
    { id: 'oat', label: 'Oat', deltaCents: 60, tint: 0.45, foam: 0.6 },
    { id: 'almond', label: 'Almond', deltaCents: 60, tint: 0.4, foam: 0.45 },
    { id: 'soy', label: 'Soy', deltaCents: 50, tint: 0.45, foam: 0.55 },
  ],
  sweetener: [
    { id: 'none', label: 'None', deltaCents: 0 },
    { id: 'sugar', label: 'Sugar', deltaCents: 0 },
    { id: 'honey', label: 'Honey', deltaCents: 40 },
    { id: 'vanilla', label: 'Vanilla syrup', deltaCents: 50 },
  ],
};

export const OPTION_KEYS: readonly OptionKey[] = [
  'size',
  'blend',
  'roast',
  'milk',
  'sweetener',
];

export const DEFAULT_SELECTION: Selection = {
  size: 'regular',
  blend: 'house',
  roast: 'medium',
  milk: 'none',
  sweetener: 'none',
};

// Placeholder pickup slots; labels are not final copy.
export const PICKUP_SLOTS: readonly { id: PickupSlotId; label: string }[] = [
  { id: '15', label: 'In 15 minutes' },
  { id: '30', label: 'In 30 minutes' },
  { id: '45', label: 'In 45 minutes' },
  { id: '60', label: 'In 1 hour' },
];

export function findOption<K extends OptionKey>(
  key: K,
  id: string,
): (typeof CATALOG)[K][number] | undefined {
  const options: readonly { id: string }[] = CATALOG[key];
  return options.find((option) => option.id === id) as
    | (typeof CATALOG)[K][number]
    | undefined;
}
