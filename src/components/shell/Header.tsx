import { COPY } from '@/config/copy';
import { CartButton } from '@/components/cart/CartButton';

export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a className="wordmark" href="#stage-1">
          {COPY.wordmark}
        </a>
        <CartButton />
      </div>
    </header>
  );
}
