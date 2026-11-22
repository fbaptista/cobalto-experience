import type { Ctx, Panel } from '../app';
import { wrap } from '../term/screen';
import { PROGRAM, SUITE, COMPILER } from '../story/loancalc';

export const OPTIONS: { n: string; name: string; short: string; text: string }[] = [
  { n: '1', name: 'UNDERSTAND', short: 'Map the code base', text: 'Map the code base: programs, calls, copybooks' },
  { n: '2', name: 'DEFINE', short: 'Two kinds of test', text: 'Write interface tests and component tests' },
  { n: '3', name: 'GENERATE', short: 'Draft suites with AI', text: 'Draft a suite with AI, round by round' },
  { n: '4', name: 'RUN', short: 'Run the suite', text: 'Run the suite and watch the cases light up' },
  { n: '5', name: 'VALIDATE', short: 'Failure and coverage', text: 'Read the failure and the coverage, line by line' },
  { n: '6', name: 'DEBUG', short: 'Step to the defect', text: 'Step through the COBOL until the defect shows' },
  { n: '7', name: 'COMPILERS', short: 'Any compiler', text: 'Run the same suite on any compiler' },
];

export const menu: Panel = {
  id: 'menu',
  title: 'COBALTO PRIMARY OPTION MENU',
  prompt: 'Option',

  render(ctx: Ctx) {
    if (ctx.narrow) return renderNarrow(ctx);
    const s = ctx.s;
    let row = ctx.top + 1;
    for (const o of OPTIONS) {
      const act = `cmd:${o.n}`;
      s.put(row, 3, o.n, 'y', act);
      s.put(row, 6, o.name.padEnd(11), 'w', act);
      s.put(row, 18, o.text, 'g', act);
      row += 2;
    }
    s.put(row, 3, 'X', 'y', 'cmd:X');
    s.put(row, 6, 'EXIT'.padEnd(11), 'w', 'cmd:X');
    s.put(row, 18, 'End the session', 'g', 'cmd:X');

    const info: [string, string][] = [
      ['Userid:', 'GUEST'],
      ['Program:', PROGRAM],
      ['Suite:', SUITE],
      ['Compiler:', COMPILER],
    ];
    let col = 3;
    for (const [label, value] of info) {
      col = s.put(ctx.bottom - 4, col, label, 'b');
      col = s.put(ctx.bottom - 4, col + 1, value, 'g') + 3;
    }

    const story = ctx.story;
    const next = story.fixed ? '7' : story.lastRun ? (story.lastRun.failed ? '5' : '7') : '1';
    s.put(ctx.bottom - 2, 3, 'One story, seven panels: LOANCALC has a defect, and the suite finds it.', 'b');
    s.put(ctx.bottom - 1, 3, 'Type a number and press ENTER, or click an option.', 'b');
    s.put(ctx.bottom - 1, 54, `Suggested next: ${next}`, 't', `cmd:${next}`);
  },
};

function renderNarrow(ctx: Ctx): void {
  const s = ctx.s;
  let row = ctx.top + 1;
  for (const o of [...OPTIONS, { n: 'X', name: 'EXIT', short: 'End the session' }]) {
    const act = `cmd:${o.n}`;
    s.put(row, 1, o.n, 'y', act);
    s.put(row, 4, o.name.padEnd(11), 'w', act);
    s.put(row, 16, o.short, 'g', act);
    row += o.n === '7' ? 3 : 2;
  }
  row++;
  let col = s.put(row, 1, 'Program:', 'b');
  col = s.put(row, col + 1, PROGRAM, 'g');
  col = s.put(row, col + 2, 'Suite:', 'b');
  s.put(row, col + 1, SUITE, 'g');
  col = s.put(row + 1, 1, 'Compiler:', 'b');
  s.put(row + 1, col + 1, COMPILER, 'g');
  const story = ctx.story;
  const next = story.fixed ? '7' : story.lastRun ? (story.lastRun.failed ? '5' : '7') : '1';
  wrap('One story, seven panels: LOANCALC has a defect, and the suite finds it.', s.cols - 2).forEach((line, i) =>
    s.put(row + 3 + i, 1, line, 'b'),
  );
  s.put(row + 6, 1, `Suggested next: ${next}`, 't', `cmd:${next}`);
}
