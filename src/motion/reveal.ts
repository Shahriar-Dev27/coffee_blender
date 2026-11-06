import { MOTION } from './tokens';

/** Chapter entrance choreography: label, then heading, body, media, cards. Pure; never imports gsap. */
export type RevealKind = 'label' | 'heading' | 'body' | 'media' | 'card';
export const REVEAL_KINDS: readonly RevealKind[] = ['label', 'heading', 'body', 'media', 'card'];

const OFFSETS: Readonly<Record<RevealKind, number>> = { label: 0, heading: 0.1, body: 0.35, media: 0.45, card: 0.55 };

export const REVEAL = {
  start: 'top 82%',
  startFraction: 0.82,
  duration: MOTION.stageText,
  wordStagger: MOTION.wordStagger,
  itemStagger: 0.08,
  offsets: OFFSETS,
} as const;

export interface RevealVars { opacity?: number; y?: number; yPercent?: number; scale?: number; filter?: string }

const VARS: Readonly<Record<RevealKind, { from: RevealVars; to: RevealVars }>> = {
  label: { from: { opacity: 0, y: 16, filter: 'blur(6px)' }, to: { opacity: 1, y: 0, filter: 'blur(0px)' } },
  heading: { from: { yPercent: 120 }, to: { yPercent: 0 } },
  body: { from: { opacity: 0, y: 28, filter: 'blur(8px)' }, to: { opacity: 1, y: 0, filter: 'blur(0px)' } },
  media: { from: { opacity: 0, scale: 0.94 }, to: { opacity: 1, scale: 1 } },
  card: { from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 } },
};

export function revealVars(kind: RevealKind): { from: RevealVars; to: RevealVars } {
  const vars = VARS[kind];
  return { from: { ...vars.from }, to: { ...vars.to } };
}

export function isRevealKind(value: unknown): value is RevealKind {
  return typeof value === 'string' && (REVEAL_KINDS as readonly string[]).includes(value);
}

/** A chapter whose anchor is already above the start line when the layer arms is left untouched. */
export function pastStartLine(top: number, viewportHeight: number, fraction: number = REVEAL.startFraction): boolean {
  return Number.isFinite(top) && Number.isFinite(viewportHeight) && top < viewportHeight * fraction;
}

/** Only elements fully below the viewport at arm time may start hidden. Unknown geometry fails visible. */
export function startsHidden(top: number, viewportHeight: number): boolean {
  return Number.isFinite(top) && Number.isFinite(viewportHeight) && top >= viewportHeight;
}

export type RevealLine = string | { text: string; className?: string };
export function lineText(line: RevealLine): string {
  return typeof line === 'string' ? line : line.text;
}
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}
export function headingLabel(lines: readonly RevealLine[]): string {
  return lines.map((line) => splitWords(lineText(line)).join(' ')).filter(Boolean).join(' ');
}
