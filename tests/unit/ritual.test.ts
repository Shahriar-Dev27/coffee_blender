import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SELECTION } from '@/config/catalog';
import { presetSelection, compatibleSelection, recipeFor } from '@/order/recipes';
import { createOrderStore } from '@/order/store';
import { priceCents } from '@/order/price';
import { poseAt } from '@/scene/director';
import { progressAt } from '@/motion/chapters';
import { submitOrder } from '@/order/service';

describe('Everyday Ritual recipes', () => {
  it('provides three compatible recipes priced in cents', () => {
    expect(priceCents(presetSelection('espresso'))).toBe(350);
    expect(priceCents(presetSelection('flat-white'))).toBe(400);
    expect(priceCents(presetSelection('oat-latte'))).toBe(460);
    expect(recipeFor(presetSelection('oat-latte')).id).toBe('oat-latte');
    expect(compatibleSelection({ ...DEFAULT_SELECTION, size: 'large' })).toBe(false);
    expect(compatibleSelection(presetSelection('flat-white'))).toBe(true);
  });
  it('rejects incompatible recipes at the submission boundary', async () => {
    const selection = { ...presetSelection('espresso'), size: 'large' as const };
    await expect(submitOrder({ lines: [{ selection, quantity: 1, unitCents: priceCents(selection) }], subtotalCents: priceCents(selection), pickup: { name: 'Ada', email: 'ada@example.com', slotId: '15' } })).rejects.toThrow();
  });
});

describe('cart and submission lifecycle', () => {
  const make = () => createOrderStore(null);
  beforeEach(() => vi.useRealTimers());
  it('merges equal cups and rejects overflowing quantities instead of losing cups', () => {
    const store = make();
    expect(store.getState().add(6)).toBe(true);
    expect(store.getState().add(4)).toBe(true);
    expect(store.getState().lines).toHaveLength(1);
    expect(store.getState().lines[0].quantity).toBe(10);
    expect(store.getState().add(1)).toBe(false);
    expect(store.getState().add(0)).toBe(false);
    expect(store.getState().add(1.5)).toBe(false);
    store.getState().setQuantity(store.getState().lines[0].id, 11);
    expect(store.getState().lines[0].quantity).toBe(10);
  });
  it('switching recipes resets incompatible ingredients and preserves cart', () => {
    const store = make();
    store.getState().add(1);
    store.getState().chooseRecipe('espresso');
    store.getState().choose('milk', 'oat');
    expect(store.getState().selection.milk).toBe('none');
    expect(store.getState().lines).toHaveLength(1);
  });
  it('survives storage failures and never persists pickup information', async () => {
    const writes: string[] = [];
    const store = createOrderStore({ getItem: () => null, setItem: (_, value) => { writes.push(value); }, removeItem: () => {} });
    store.getState().hydrate();
    store.getState().add(1);
    await store.getState().submit({ name: 'Private Name', email: 'private@example.com', slotId: '15' });
    expect(writes.join('')).not.toContain('Private Name');
    expect(writes.join('')).not.toContain('private@example.com');
    const blocked = createOrderStore({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); }, removeItem: () => {} });
    expect(() => blocked.getState().hydrate()).not.toThrow();
    expect(blocked.getState().add(1)).toBe(true);
  });
  it('guards double submit and keeps the receipt across drawer close/reopen', async () => {
    const store = make();
    store.getState().add(2);
    const pickup = { name: 'Ada', email: 'ada@example.com', slotId: '15' };
    const pending = store.getState().submit(pickup);
    store.getState().closeDrawer();
    await store.getState().submit(pickup);
    await pending;
    store.getState().openDrawer();
    expect(store.getState().receipt?.lines[0].quantity).toBe(2);
    expect(store.getState().receipt?.orderNumber).toMatch(/^BR-/);
    expect(store.getState().lines).toHaveLength(0);
    expect(store.getState().status).toBe('success');
  });
});

describe('continuous scene director', () => {
  it('aligns authored progress with measured chapter positions', () => {
    const positions = [0, 1000, 2100, 3150, 4200, 5250];
    expect(progressAt(1000, positions)).toBe(.14);
    expect(progressAt(2100, positions)).toBe(.27);
    expect(progressAt(3150, positions)).toBe(.43);
    expect(progressAt(4200, positions)).toBe(.62);
    expect(progressAt(5250, positions)).toBe(1);
    expect(progressAt(1575, positions)).toBeCloseTo(.2079545);
  });
  it('clamps endpoints and evaluates deterministic finite poses', () => {
    expect(poseAt(-10, false)).toEqual(poseAt(0, false));
    expect(poseAt(10, true)).toEqual(poseAt(1, true));
    for (let i = 0; i <= 100; i++) {
      const pose = poseAt(i / 100, false);
      expect(Object.values(pose).every(Number.isFinite)).toBe(true);
      expect(poseAt(i / 100, false)).toEqual(pose);
    }
  });
  it('has no camera or cup cuts at chapter boundaries', () => {
    for (const at of [0.14, 0.27, 0.43, 0.62, 0.83]) {
      const before = poseAt(at - 0.00001, false);
      const after = poseAt(at + 0.00001, false);
      for (const key of Object.keys(before) as (keyof typeof before)[]) {
        expect(Math.abs(after[key] - before[key])).toBeLessThan(0.01);
      }
    }
  });
});
