'use client';

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { findOption } from '@/config/catalog';
import { compatibleSelection, presetSelection, recipeById, type RecipeId } from './recipes';
import { priceCents, subtotalCents } from './price';
import { getSafeStorage, loadCart, saveCart, type StorageLike } from './storage';
import { submitOrder } from './service';
import { MAX_LINES, QUANTITY_MAX, QUANTITY_MIN, type CartLine, type OptionKey, type OrderReceipt, type PickupDetails, type Selection } from './types';

interface OrderState {
  selection: Selection;
  recipe: RecipeId;
  lines: CartLine[];
  hydrated: boolean;
  drawer: boolean;
  status: 'idle' | 'pending' | 'success' | 'error';
  receipt: OrderReceipt | null;
  error: string;
  hydrate(): void;
  chooseRecipe(id: RecipeId): void;
  choose<K extends OptionKey>(key: K, value: Selection[K]): void;
  add(quantity: number): boolean;
  setQuantity(id: string, quantity: number): void;
  remove(id: string): void;
  openDrawer(): void;
  closeDrawer(): void;
  submit(pickup: PickupDetails): Promise<void>;
  reset(): void;
}

const validQuantity = (n: number) => Number.isInteger(n) && n >= QUANTITY_MIN && n <= QUANTITY_MAX;
const signature = (s: Selection) => [s.size, s.blend, s.roast, s.milk, s.sweetener].join('|');

export function createOrderStore(providedStorage?: StorageLike | null) {
  let storage = providedStorage ?? null;
  return createStore<OrderState>((set, get) => {
    const persist = (lines: CartLine[]) => saveCart(storage, lines);
    return {
      selection: presetSelection('flat-white'), recipe: 'flat-white', lines: [], hydrated: false,
      drawer: false, status: 'idle', receipt: null, error: '',
      hydrate() {
        if (get().hydrated) return;
        if (providedStorage === undefined) storage = getSafeStorage();
        const lines = loadCart(storage, () => crypto.randomUUID()).filter((line) => compatibleSelection(line.selection));
        set({ lines, hydrated: true });
      },
      chooseRecipe(id) {
        if (get().status === 'pending') return;
        set({ recipe: id, selection: presetSelection(id) });
      },
      choose(key, value) {
        if (get().status === 'pending' || !findOption(key, value)) return;
        const recipe = recipeById(get().recipe);
        const next = { ...get().selection, [key]: value };
        if (!recipe.milk.includes(next.milk) || !recipe.sizes.includes(next.size)) return;
        set({ selection: next });
      },
      add(quantity) {
        const state = get();
        if (state.status === 'pending' || !validQuantity(quantity)) return false;
        const matching = state.lines.find((line) => signature(line.selection) === signature(state.selection));
        if (matching && matching.quantity + quantity > QUANTITY_MAX) return false;
        if (!matching && state.lines.length >= MAX_LINES) return false;
        const lines = matching
          ? state.lines.map((line) => line.id === matching.id ? { ...line, quantity: line.quantity + quantity } : line)
          : [...state.lines, { id: crypto.randomUUID(), selection: { ...state.selection }, quantity }];
        set({ lines, receipt: null, status: 'idle', error: '' }); persist(lines);
        return true;
      },
      setQuantity(id, quantity) {
        if (get().status === 'pending' || !validQuantity(quantity)) return;
        const lines = get().lines.map((line) => line.id === id ? { ...line, quantity } : line);
        set({ lines }); persist(lines);
      },
      remove(id) {
        if (get().status === 'pending') return;
        const lines = get().lines.filter((line) => line.id !== id);
        set({ lines }); persist(lines);
      },
      openDrawer: () => set({ drawer: true }),
      closeDrawer: () => set({ drawer: false }),
      async submit(pickup) {
        const state = get();
        if (state.status === 'pending' || state.lines.length === 0) return;
        set({ status: 'pending', error: '' });
        try {
          const receipt = await submitOrder({
            lines: state.lines.map((line) => ({ selection: { ...line.selection }, quantity: line.quantity, unitCents: priceCents(line.selection) })),
            subtotalCents: subtotalCents(state.lines), pickup,
          });
          set({ receipt, status: 'success', lines: [] }); persist([]);
        } catch {
          set({ status: 'error', error: 'We couldn’t finish the demo. Your cups are saved here. Please try again.' });
        }
      },
      reset() {
        if (get().status === 'pending') return;
        set({ selection: presetSelection('flat-white'), recipe: 'flat-white', lines: [], receipt: null, status: 'idle', drawer: false, error: '' });
        persist([]);
      },
    };
  });
}

export const orderStore = createOrderStore();
export function useOrder<T>(selector: (state: OrderState) => T): T {
  return useStore(orderStore, selector);
}
