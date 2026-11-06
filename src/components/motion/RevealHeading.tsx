import { Fragment } from 'react';
import { headingLabel, lineText, splitWords, type RevealLine } from '@/motion/reveal';

/**
 * Server-rendered split heading. Assistive tech reads one clean sentence (sr-only); the visual
 * lines and words are aria-hidden. Each authored line replaces a former <br />.
 */
export function RevealHeading({ id, lines }: { id: string; lines: readonly RevealLine[] }) {
  return (
    <h2 id={id} data-reveal="heading">
      <span className="sr-only">{headingLabel(lines)}</span>
      <span className="reveal-lines" aria-hidden="true">
        {lines.map((line, i) => {
          const extra = typeof line === 'string' ? undefined : line.className;
          return (
            <span key={i} className="reveal-line">
              <span className={extra ? `reveal-line-inner ${extra}` : 'reveal-line-inner'}>
                {splitWords(lineText(line)).map((word, j) => (
                  <Fragment key={j}>{j > 0 ? ' ' : null}<span className="reveal-word">{word}</span></Fragment>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </h2>
  );
}
