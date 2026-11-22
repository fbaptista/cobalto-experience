// The other faces of the session: the same step shown as the VS Code
// extension, as a CI pipeline and as an AI agent. They are stylized
// recreations drawn on the same character grid, from the same story.

import type { Story } from '../app';
import type { Screen } from '../term/screen';
import { CASES } from '../story/loancalc';

export const STEPS = ['understand', 'define', 'generate', 'run', 'validate', 'debug', 'compilers'];
export const STEP_NAMES = ['UNDERSTAND', 'DEFINE', 'GENERATE', 'RUN', 'VALIDATE', 'DEBUG', 'COMPILERS'];

export type Seg = [text: string, cls: string];
export interface Line {
  segs: Seg[];
  /** Background class for the whole line. */
  bg?: string;
}

/** A line from segments; a bare string is a green segment. */
export function L(...segs: (Seg | string)[]): Line {
  return { segs: segs.map((s) => (typeof s === 'string' ? [s, 'g'] : s)) };
}

export function LB(bg: string, ...segs: (Seg | string)[]): Line {
  return { ...L(...segs), bg };
}

export const BLANK = L('');

export interface FaceCtx {
  s: Screen;
  story: Story;
  /** 0 to 6, or -1 before the visitor picked a step. */
  step: number;
  /** Ticks since the face opened: content appears as it grows. */
  beat: number;
}

export interface Face {
  label: string;
  /** How many beats the step needs to show everything. */
  beats(step: number, story: Story): number;
  render(f: FaceCtx): void;
}

/** Draws a line clipped to `width`; a background covers the whole width. */
export function putLine(s: Screen, row: number, col: number, line: Line, width: number, bg = ''): void {
  const back = line.bg ?? bg;
  if (back) s.put(row, col, ' '.repeat(width), back);
  let c = col;
  for (const [text, cls] of line.segs) {
    const room = col + width - c;
    if (room <= 0) break;
    const clipped = Array.from(text).slice(0, room).join('');
    s.put(row, c, clipped, back ? `${cls} ${back}` : cls);
    c += clipped.length;
  }
}

export function band(s: Screen, row: number, col: number, width: number, cls: string): void {
  s.put(row, col, ' '.repeat(width), cls);
}

/** Outcome of each case of the suite in the current state of the story. */
export function outcomes(story: Story): boolean[] {
  return CASES.map((c) => c.pass || story.fixed);
}

export function totals(story: Story): { passed: number; failed: number } {
  const o = outcomes(story);
  return { passed: o.filter(Boolean).length, failed: o.filter((x) => !x).length };
}
