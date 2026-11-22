import type { Ctx, Panel } from '../app';
import { wrap } from '../term/screen';
import { CASES, SUITE } from '../story/loancalc';
import { COMPILERS, DEFECT_NOTE, DIALECT_NOTE } from '../story/compilers';

type Mark = 'wait' | 'run' | 'pass' | 'fail';

const CELL = [52, 59, 66, 73];

let sel = 0;
let marks: Mark[][] = [];
let busy = false;

function outcome(ctx: Ctx, compiler: number, caseIdx: number): Mark {
  const c = CASES[caseIdx];
  if (!c.pass && !ctx.story.fixed) return 'fail';
  return COMPILERS[compiler].failures.some((f) => f.caseN === c.n) ? 'fail' : 'pass';
}

function passed(compiler: number): number {
  return marks[compiler].filter((m) => m === 'pass').length;
}

async function start(ctx: Ctx): Promise<void> {
  busy = true;
  marks = COMPILERS.map(() => CASES.map(() => 'wait'));
  ctx.msg('');
  await ctx.run.sleep(400);
  for (let k = 0; k < COMPILERS.length; k++) {
    sel = k;
    for (let i = 0; i < CASES.length; i++) {
      marks[k][i] = 'run';
      ctx.redraw();
      await ctx.run.sleep(70);
      marks[k][i] = outcome(ctx, k, i);
      ctx.sound.tick();
    }
    ctx.redraw();
    await ctx.run.sleep(350);
  }
  busy = false;
  sel = COMPILERS.findIndex((c) => c.failures.length);
  ctx.msg('Same suite, four compilers. F7 / F8 or a click on a column shows each one.', 'y');
}

export const compilersPanel: Panel = {
  id: 'compilers',
  title: 'COBALTO - COMPILERS',
  context: () => `${SUITE} on every compiler`,

  fkeys: () => [
    { key: 'Enter', label: 'Next compiler' },
    { key: 'F7', label: 'Prev' },
    { key: 'F4', label: 'Run again' },
  ],

  enter(ctx: Ctx) {
    sel = 0;
    void start(ctx);
  },

  render(ctx: Ctx) {
    if (ctx.narrow) return renderNarrow(ctx);
    const s = ctx.s;
    const top = ctx.top;
    s.put(top, 1, 'Case', 'b');
    COMPILERS.forEach((c, k) => {
      s.put(top, CELL[k] - 1, ` ${c.short.padEnd(4)} `, k === sel ? 'w rv' : 'w', `p:sel:${k}`);
    });

    CASES.forEach((c, i) => {
      const row = top + 1 + i;
      s.put(row, 1, String(c.n).padStart(2, '0'), 'b');
      s.put(row, 4, c.name.slice(0, 46), marks[sel]?.[i] === 'fail' ? 'r' : 'g');
      COMPILERS.forEach((_, k) => {
        const m = marks[k]?.[i] ?? 'wait';
        if (m === 'pass') s.put(row, CELL[k], 'PASS', 'g', `p:sel:${k}`);
        else if (m === 'fail') s.put(row, CELL[k] - 1, ' FAIL ', 'r rv', `p:sel:${k}`);
        else if (m === 'run') s.put(row, CELL[k], 'RUN', 'y');
        else s.put(row, CELL[k], '....', 'd');
      });
    });

    const totals = top + 2 + CASES.length;
    s.put(totals, 1, 'Passed', 'b');
    COMPILERS.forEach((_, k) => {
      const done = marks[k]?.every((m) => m === 'pass' || m === 'fail');
      if (done) s.put(totals, CELL[k], `${passed(k)}/${CASES.length}`, passed(k) === CASES.length ? 'g' : 'r');
    });

    const c = COMPILERS[sel];
    let row = totals + 2;
    let col = s.put(row, 1, c.name, 'w');
    col = s.put(row, col + 2, c.platform, 'b');
    s.right(row, `cobalto test --profile ${c.profile}`, 'd');
    row++;
    if (busy && marks[sel]?.some((m) => m === 'wait' || m === 'run')) return;

    const defect = !ctx.story.fixed;
    if (!c.failures.length) {
      s.put(row, 1, defect ? 'Same results as every other compiler.' : 'Every case passes, with the same results.', 'g');
      row++;
    }
    for (const f of c.failures) {
      s.put(row, 1, String(f.caseN).padStart(2, '0'), 'r');
      s.put(row, 4, f.expect, 'w');
      s.put(row, 53, `obtained ${f.obtained}`, 'r');
      s.put(row + 1, 4, f.why, 'b');
      row += 2;
    }
    const note = c.failures.length ? DIALECT_NOTE : defect ? DEFECT_NOTE : '';
    wrap(note, s.cols - 4).forEach((line, i) => s.put(row + i, 1, line, 't'));
  },

  key(key: string, ctx: Ctx) {
    if (key === 'F4') {
      ctx.go('compilers');
      return true;
    }
    if (busy) return key === 'Enter' || key.startsWith('@');
    const n = COMPILERS.length;
    if (key.startsWith('@sel:')) sel = Number(key.slice(5));
    else if (key === 'Enter' || key === 'F8' || key === 'ArrowRight' || key === 'ArrowDown') sel = (sel + 1) % n;
    else if (key === 'F7' || key === 'ArrowLeft' || key === 'ArrowUp') sel = (sel + n - 1) % n;
    else return false;
    return true;
  },
};

function renderNarrow(ctx: Ctx): void {
  const s = ctx.s;
  const top = ctx.top;
  const width = s.cols - 2;
  const cell = [21, 26, 31, 36];
  s.put(top, 1, 'Case', 'b');
  COMPILERS.forEach((c, k) => s.put(top, cell[k], c.short.padEnd(4), k === sel ? 'w rv' : 'w', `p:sel:${k}`));

  CASES.forEach((c, i) => {
    const row = top + 1 + i;
    s.put(row, 1, String(c.n).padStart(2, '0'), 'b');
    s.put(row, 4, c.name.slice(0, 16), marks[sel]?.[i] === 'fail' ? 'r' : 'g');
    COMPILERS.forEach((_, k) => {
      const m = marks[k]?.[i] ?? 'wait';
      if (m === 'pass') s.put(row, cell[k], 'PASS', 'g', `p:sel:${k}`);
      else if (m === 'fail') s.put(row, cell[k], 'FAIL', 'r rv', `p:sel:${k}`);
      else if (m === 'run') s.put(row, cell[k], 'RUN', 'y');
      else s.put(row, cell[k], '....', 'd');
    });
  });

  const totals = top + 2 + CASES.length;
  s.put(totals, 1, 'Passed', 'b');
  COMPILERS.forEach((_, k) => {
    const done = marks[k]?.every((m) => m === 'pass' || m === 'fail');
    if (done) s.put(totals, cell[k], String(passed(k)), passed(k) === CASES.length ? 'g' : 'r');
  });

  const c = COMPILERS[sel];
  let row = totals + 2;
  s.put(row++, 1, c.name, 'w');
  const col = s.put(row, 1, c.platform, 'b');
  s.put(row++, col + 2, `--profile ${c.profile}`.slice(0, width - col), 'd');
  if (busy && marks[sel]?.some((m) => m === 'wait' || m === 'run')) return;

  const defect = !ctx.story.fixed;
  if (!c.failures.length) s.put(row++, 1, defect ? 'Same results as the others.' : 'Every case passes.', 'g');
  for (const f of c.failures) {
    s.put(row, 1, String(f.caseN).padStart(2, '0'), 'r');
    s.put(row++, 4, `${f.obtained}, expected ${f.expect.split(' ').pop()}`, 'r');
    for (const line of wrap(f.why, width - 3)) s.put(row++, 4, line, 'b');
  }
  const note = c.failures.length ? DIALECT_NOTE : defect ? DEFECT_NOTE : '';
  wrap(note, width).slice(0, ctx.bottom - row + 1).forEach((line, i) => s.put(row + i, 1, line, 't'));
}
