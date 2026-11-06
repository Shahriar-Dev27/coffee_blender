'use client';
import { useEffect } from 'react';
import { orderStore, useOrder } from '@/order/store';
export function CartButton() {
  const count = useOrder((s) => s.lines.reduce((total, line) => total + line.quantity, 0));
  const receipt = useOrder((s) => s.receipt);
  useEffect(() => orderStore.getState().hydrate(), []);
  if (!count && !receipt) return null;
  return <button type="button" className="cart-trigger" onClick={() => orderStore.getState().openDrawer()} aria-label={count ? `Review order, ${count} ${count === 1 ? 'cup' : 'cups'}` : 'View demo receipt'}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 8h16l-1 13H5L4 8Z" /><path d="M8 9V6a4 4 0 0 1 8 0v3" /></svg><span>{count || '✓'}</span>
  </button>;
}