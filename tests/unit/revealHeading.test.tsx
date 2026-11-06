import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RevealHeading } from '@/components/motion/RevealHeading';

describe('RevealHeading', () => {
  const html = renderToStaticMarkup(
    <RevealHeading id="ritual-heading" lines={['Not just coffee.', 'A small', { text: 'reset.', className: 'outline-type' }]} />,
  );
  it('keeps the id and marks the heading for the reveal layer', () => {
    expect(html.startsWith('<h2 id="ritual-heading" data-reveal="heading">')).toBe(true);
  });
  it('gives assistive tech one clean sentence and hides the visual split', () => {
    expect(html).toContain('<span class="sr-only">Not just coffee. A small reset.</span>');
    expect(html).toContain('<span class="reveal-lines" aria-hidden="true">');
  });
  it('renders one mask per authored line and one span per word', () => {
    expect(html.match(/class="reveal-line"/g)).toHaveLength(3);
    expect(html.match(/class="reveal-word"/g)).toHaveLength(6);
    expect(html).toContain('<span class="reveal-line-inner outline-type"><span class="reveal-word">reset.</span></span>');
    expect(html).toContain('<span class="reveal-word">Not</span> <span class="reveal-word">just</span>');
  });
});
