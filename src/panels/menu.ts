import type { Ctx, Panel } from '../app';
import { PROGRAM, SUITE, COMPILER } from '../story/loancalc';

export const OPTIONS: { n: string; name: string; text: string }[] = [
  { n: '1', name: 'UNDERSTAND', text: 'Map the code base: programs, calls, copybooks' },
  { n: '2', name: 'DEFINE', text: 'Write interface tests and component tests' },
  { n: '3', name: 'GENERATE', text: 'Draft a suite with AI, round by round' },
  { n: '4', name: 'RUN', text: 'Run the suite and watch the cases light up' },
  { n: '5', name: 'VALIDATE', text: 'Read the failure and the coverage, line by line' },
  { n: '6', name: 'DEBUG', text: 'Step through the COBOL until the defect shows' },
  { n: '7', name: 'COMPILERS', text: 'Run the same suite on any compiler' },
];

export const menu: Panel = {
  id: 'menu',
  title: 'COBALTO PRIMARY OPTION MENU',
  prompt: 'Option',

  render(ctx: Ctx) {
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
