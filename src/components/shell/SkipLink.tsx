import { COPY } from '@/config/copy';

export function SkipLink() {
  return (
    <a className="skip" href="#order">
      {COPY.skipLink}
    </a>
  );
}
