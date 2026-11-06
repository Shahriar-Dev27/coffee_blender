import { Wordmark } from './Wordmark';
export function Footer() {
  return <footer className="site-footer">
    <div className="footer-top"><p>Good things.<br />One cup at a time.</p><a href="#arrival">Back to the top <span aria-hidden="true">↑</span></a></div>
    <div className="footer-bottom"><Wordmark /><p>A little everyday ritual.</p><small>An interactive coffee demo. No real orders.</small><span>© 2026 BREOU</span></div>
  </footer>;
}