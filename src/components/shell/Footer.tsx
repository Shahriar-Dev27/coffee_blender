import { COPY } from '@/config/copy';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <span className="wordmark">{COPY.wordmark}</span>
        <p>{COPY.footer.note}</p>
      </div>
    </footer>
  );
}
