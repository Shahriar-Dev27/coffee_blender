import { CartButton } from '@/components/cart/CartButton';
import { Wordmark } from './Wordmark';
export function Header() {
  return <header className="site-header">
    <a className="brand-link" href="#arrival" aria-label="BREOU CAFFEE, back to the beginning"><Wordmark /></a>
    <nav className="header-actions" aria-label="Main navigation">
      <details className="menu"><summary>Explore <span aria-hidden="true">+</span></summary><div className="menu-links"><a href="#ritual">The ritual</a><a href="#flavor">Find your flavor</a><a href="#order">Make yours</a></div></details>
      <CartButton /><a href="#order" className="button button-primary header-cta">Make yours <span aria-hidden="true">↗</span></a>
    </nav>
  </header>;
}