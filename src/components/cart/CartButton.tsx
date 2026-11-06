import { COPY } from '@/config/copy';

/** Stub: Task 20 wires the drawer, the count and the hydrate call. */
export function CartButton() {
  return (
    <button className="btn btn--quiet" type="button">
      {COPY.cart.button(0)}
    </button>
  );
}
