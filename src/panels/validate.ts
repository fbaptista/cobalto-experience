import type { Ctx, Panel } from '../app';
import { narrowCode, wrap, wrapCode } from '../term/screen';
import { CASES, FAILURE, PROGRAM, SUITE, coverage, lineOf, source } from '../story/loancalc';

let listRows = 12;

let scroll = 0;
let fill = 0; // 0..1, how far the bars have filled
let revealed = 0; // listing rows already painted with their coverage

function clampScroll(total: number): void {
  scroll = Math.max(0, Math.min(scroll, total - listRows));
}

export const validatePanel: Panel = {
  id: 'validate',
  title: 'COBALTO - VALIDATE',
  context: () => `${SUITE} / ${PROGRAM}`,

  fkeys: (ctx) => [
    ...(ctx.story.fixed ? [] : [{ key: 'Enter', label: 'Debug the failure' }]),
    { key: 'F7', label: 'Up' },
    { key: 'F8', label: 'Down' },
  ],

  enter(ctx: Ctx) {
    const { story, run } = ctx;
    // The panel stands alone: opened before RUN, it shows the first run.
    if (!story.lastRun) story.lastRun = { passed: CASES.length - 1, failed: 1 };
    const lines = source(story.fixed);
    scroll = lines.findIndex((l) => l.n === lineOf('1000-VALIDATE.'));
    fill = 0;
    revealed = 0;
    void (async () => {
      await run.sleep(250);
      for (let i = 1; i <= 20; i++) {
        fill = i / 20;
        ctx.redraw();
        await run.sleep(35);
      }
      for (let i = 1; i <= listRows; i++) {
        revealed = i;
        ctx.redraw();
        await run.sleep(45);
      }
      revealed = Infinity;
      ctx.msg(
        story.fixed
          ? `Every case passes. One statement is still never executed: line ${lineOf('MOVE "30"')}.`
          : `Line ${lineOf('MOVE "30"')} was never executed. The failure is elsewhere: ENTER to debug it.`,
        story.fixed ? 'g' : 'y',
      );
    })();
  },

  render(ctx: Ctx) {
    if (ctx.narrow) return renderNarrow(ctx);
    listRows = 12;
    const s = ctx.s;
    const top = ctx.top;
    const fixed = ctx.story.fixed;

    if (fixed) {
      s.put(top, 1, ' PASSED ', 'g rv');
      s.put(top, 11, `${CASES.length} of ${CASES.length} cases`, 'w');
      s.put(top + 2, 3, 'No failed cases. With the fix in 1300-LEAP-YEAR,', 'g');
      s.put(top + 3, 3, 'February 29, 2000 is a valid date and the case gets return code 00.', 'g');
    } else {
      s.put(top, 1, ' FAILED ', 'r rv', 'go:debug');
      s.put(top, 11, `case ${FAILURE.caseN}`, 'w');
      s.put(top, 20, CASES[FAILURE.caseN - 1].name, 'w');
      FAILURE.snippet.forEach((line, i) => {
        const last = i === FAILURE.snippet.length - 1;
        s.put(top + 2 + i, 3, line, i === 0 ? 't' : last ? 'w' : 'g');
        if (last) s.put(top + 2 + i, 4 + line.length + 1, '<== failed', 'r');
      });
      s.put(top + 2, 59, 'Expected', 'b');
      s.put(top + 2, 69, FAILURE.expected, 'g');
      s.put(top + 3, 59, 'Obtained', 'b');
      s.put(top + 3, 69, FAILURE.obtained, 'r');
      s.put(top + 4, 69, FAILURE.meaning, 'r');
      s.put(top + 5, 59, `${SUITE}.cblt line ${FAILURE.suiteLine}`, 'd');
    }

    s.put(top + 7, 1, `COVERAGE OF ${PROGRAM}`, 'w');
    coverage(fixed).forEach((m, i) => {
      const col = 1 + i * 27;
      const width = 8;
      const pct = m.covered / m.total;
      const on = Math.round(pct * fill * width);
      s.put(top + 8, col, m.name.padEnd(11), 'b');
      s.put(top + 8, col + 11, '█'.repeat(on), m.covered === m.total ? 'g' : 'y');
      s.put(top + 8, col + 11 + on, '█'.repeat(width - on), 'x');
      s.put(top + 8, col + 20, `${Math.floor(pct * fill * 100)}%`.padStart(4), 'w');
      s.put(top + 9, col + 11, `${Math.round(m.covered * fill)} of ${m.total}`, 'd');
    });

    const lines = source(fixed);
    clampScroll(lines.length);
    const view = lines.slice(scroll, scroll + listRows);
    const head = top + 10;
    s.put(head, 1, 'Line', 'b');
    s.put(head, 9, 'Hits', 'b');
    s.put(head, 15, `${PROGRAM}.cbl`, 'b');
    s.right(head, `Lines ${view[0].n}-${view[view.length - 1].n} of ${lines[lines.length - 1].n}`, 'b');
    view.forEach((l, i) => {
      const row = head + 1 + i;
      const painted = i < revealed;
      s.put(row, 1, String(l.n).padStart(6, '0'), 'b');
      if (!painted) {
        s.put(row, 15, l.text, 'd');
        return;
      }
      const missed = l.hits === 0;
      const cls = l.fixed ? 't' : missed ? 'r' : l.partial ? 'y' : l.hits === null && !l.text.startsWith(' ') ? 'w' : 'g';
      if (l.hits !== null) s.put(row, 8, String(l.hits).padStart(5), missed ? 'r rv' : l.partial ? 'y' : 'g');
      s.put(row, 15, l.text, cls);
      if (missed) s.put(row, 61, '< never executed', 'r');
      else if (l.partial) s.put(row, 61, `< ${l.partial}`, 'y');
      else if (l.fixed) s.put(row, 61, '< fixed', 't');
    });
  },

  key(key: string, ctx: Ctx) {
    const step: Record<string, number> = {
      F7: -(listRows - 1),
      PageUp: -(listRows - 1),
      ArrowUp: -1,
      F8: listRows - 1,
      PageDown: listRows - 1,
      ArrowDown: 1,
    };
    if (key in step) {
      scroll += step[key];
      revealed = Infinity;
      return true;
    }
    if (key === 'Enter' && !ctx.story.fixed) {
      ctx.go('debug');
      return true;
    }
    return false;
  },
};

function renderNarrow(ctx: Ctx): void {
  const s = ctx.s;
  const width = s.cols - 2;
  const fixed = ctx.story.fixed;
  let row = ctx.top;

  if (fixed) {
    s.put(row, 1, ' PASSED ', 'g rv');
    s.put(row, 11, `${CASES.length} of ${CASES.length} cases`, 'w');
    row += 2;
    for (const line of wrap('No failed cases. With the fix, February 29, 2000 is a valid date.', width)) s.put(row++, 1, line, 'g');
  } else {
    s.put(row, 1, ' FAILED ', 'r rv', 'go:debug');
    s.put(row, 11, `case ${FAILURE.caseN}`, 'w');
    row += 2;
    FAILURE.snippet.forEach((line, i) => {
      const cls = i === 0 ? 't' : i === FAILURE.snippet.length - 1 ? 'w' : 'g';
      for (const part of wrapCode(narrowCode(line), width)) s.put(row++, 1, part, cls);
    });
    let col = s.put(row, 1, 'Expected', 'b');
    col = s.put(row, col + 1, FAILURE.expected, 'g');
    col = s.put(row, col + 3, 'Obtained', 'b');
    s.put(row, col + 1, FAILURE.obtained, 'r');
    row++;
  }

  row++;
  for (const m of coverage(fixed)) {
    const bar = 10;
    const pct = m.covered / m.total;
    const on = Math.round(pct * fill * bar);
    s.put(row, 1, m.name.padEnd(11), 'b');
    s.put(row, 12, '█'.repeat(on), m.covered === m.total ? 'g' : 'y');
    s.put(row, 12 + on, '█'.repeat(bar - on), 'x');
    s.put(row, 23, `${Math.floor(pct * fill * 100)}%`.padStart(4), 'w');
    s.put(row, 29, `${Math.round(m.covered * fill)}/${m.total}`, 'd');
    row++;
  }

  row++;
  const lines = source(fixed);
  listRows = ctx.bottom - row;
  clampScroll(lines.length);
  const view = lines.slice(scroll, scroll + listRows);
  s.put(row, 1, 'Line Hits', 'b');
  s.right(row, `${view[0].n}-${view[view.length - 1].n} of ${lines[lines.length - 1].n}`, 'b');
  view.forEach((l, i) => {
    const r = row + 1 + i;
    const text = narrowCode(l.text).slice(0, s.cols - 10);
    s.put(r, 1, String(l.n).padStart(3), 'b');
    if (i >= revealed) {
      s.put(r, 10, text, 'd');
      return;
    }
    const missed = l.hits === 0;
    const cls = l.fixed ? 't' : missed ? 'r' : l.partial ? 'y' : l.hits === null && !l.text.startsWith(' ') ? 'w' : 'g';
    if (l.hits !== null) s.put(r, 5, String(l.hits).padStart(4), missed ? 'r rv' : l.partial ? 'y' : 'g');
    s.put(r, 10, text, cls);
  });
}
