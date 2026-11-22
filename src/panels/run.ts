import type { Ctx, Panel } from '../app';
import { CASES, COMPILER, FAILURE, PROGRAM, RUN_COMMAND, SUITE, SUITE_TITLE } from '../story/loancalc';

type Mark = 'wait' | 'run' | 'pass' | 'fail';
type Phase = 'typing' | 'compiling' | 'running' | 'done';

let phase: Phase = 'typing';
let typed = '';
let compiled = false;
let marks: Mark[] = [];
let seconds = 0;

function count(m: Mark): number {
  return marks.filter((x) => x === m).length;
}

async function start(ctx: Ctx): Promise<void> {
  const { story, run } = ctx;
  story.rerun = false;
  story.lastRun = null;
  phase = 'typing';
  typed = '';
  compiled = false;
  marks = CASES.map(() => 'wait');
  seconds = 0;
  ctx.msg('');
  await run.sleep(350);
  await run.type(RUN_COMMAND, (p) => {
    typed = p;
    ctx.sound.tick();
    ctx.redraw();
  });
  await run.sleep(300);
  phase = 'compiling';
  ctx.redraw();
  await run.sleep(800);
  compiled = true;
  phase = 'running';
  for (let i = 0; i < CASES.length; i++) {
    marks[i] = 'run';
    ctx.redraw();
    await run.sleep(190 + CASES[i].ms * 30);
    marks[i] = CASES[i].pass || story.fixed ? 'pass' : 'fail';
    seconds += CASES[i].ms / 100;
    story.lastRun = { passed: count('pass'), failed: count('fail') };
    ctx.sound.tick();
    ctx.redraw();
  }
  await run.sleep(350);
  phase = 'done';
  finish(ctx);
}

function finish(ctx: Ctx): void {
  if (count('fail')) ctx.msg('One case failed. Press ENTER to read the failure in VALIDATE.', 'y');
  else ctx.msg('All green. The same suite runs on any compiler: press ENTER for COMPILERS.', 'g');
}

export const runPanel: Panel = {
  id: 'run',
  title: 'COBALTO - RUN',
  context: () => `${SUITE} / ${PROGRAM}`,

  fkeys: () => [
    { key: 'Enter', label: phase !== 'done' ? 'Continue' : count('fail') ? 'Validate' : 'Compilers' },
    { key: 'F4', label: 'Run again' },
  ],

  enter(ctx: Ctx) {
    if (phase === 'done' && ctx.story.lastRun && !ctx.story.rerun) {
      queueMicrotask(() => finish(ctx));
      return;
    }
    void start(ctx);
  },

  render(ctx: Ctx) {
    const s = ctx.s;
    const top = ctx.top;
    s.put(top, 1, '> ', 'b');
    s.put(top, 3, typed, 'w');
    if (phase === 'typing') s.cursor(top, 3 + typed.length);
    if (phase === 'typing') return;

    s.put(top + 2, 1, `Compiling ${PROGRAM} with ${COMPILER}`, 'b');
    s.put(top + 2, 40, compiled ? 'OK' : '...', compiled ? 'g' : 'y');
    if (!compiled) return;
    s.put(top + 3, 1, `Suite ${SUITE}`, 'w');
    s.put(top + 3, 16, `'${SUITE_TITLE}'`, 'g');

    CASES.forEach((c, i) => {
      const row = top + 5 + i;
      const m = marks[i];
      const act = m === 'fail' ? 'go:validate' : null;
      s.put(row, 2, String(c.n).padStart(2, '0'), 'b');
      s.put(row, 6, c.name, m === 'wait' ? 'd' : m === 'run' ? 'w' : m === 'fail' ? 'r' : 'g', act);
      if (m === 'pass') s.put(row, 62, 'PASS', 'g');
      else if (m === 'fail') s.put(row, 61, ' FAIL ', 'r rv', act);
      else if (m === 'run') s.put(row, 62, 'RUN', 'y');
      else s.put(row, 62, '....', 'd');
      if (m === 'pass' || m === 'fail') s.right(row, `${c.ms} ms`, 'd', null, 6);
    });

    const row = top + 6 + CASES.length;
    const done = count('pass') + count('fail');
    let col = s.put(row, 2, `${done} of ${CASES.length} cases`, 'w');
    col = s.put(row, col + 3, `${count('pass')} passed`, 'g');
    col = s.put(row, col + 3, `${count('fail')} failed`, count('fail') ? 'r' : 'd');
    col = s.put(row, col + 3, '0 ignored', 'd');
    if (phase === 'done') s.put(row, col + 3, `${seconds.toFixed(2)} s`, 'b');

    if (phase === 'done' && count('fail')) {
      s.put(row + 2, 2, `Case ${FAILURE.caseN}`, 'r', 'go:validate');
      s.put(row + 2, 11, FAILURE.snippet[3].trim(), 'w', 'go:validate');
      s.put(row + 2, 46, `obtained ${FAILURE.obtained}`, 'r', 'go:validate');
    }
    if (phase === 'done' && !count('fail') && ctx.story.fixed) {
      s.put(row + 2, 2, 'February 29, 2000 is a valid date again. 11 of 11.', 'g');
    }
  },

  key(key: string, ctx: Ctx) {
    if (key === 'F4') {
      ctx.story.rerun = true;
      ctx.go('run');
      return true;
    }
    if (key === 'Enter') {
      if (phase !== 'done') return true;
      ctx.go(count('fail') ? 'validate' : 'compilers');
      return true;
    }
    return false;
  },
};
