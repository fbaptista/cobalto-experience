import type { Ctx, Panel } from '../app';
import { wrap } from '../term/screen';
import {
  CASES,
  DEBUG_INTRO,
  DEBUG_TRACE,
  DEFECT_LINE,
  FAILURE,
  FIX,
  PROGRAM,
  WATCH,
  source,
} from '../story/loancalc';

const SRC_ROWS = 18;
const SRC_COL = 8;
const SRC_WIDTH = 45;
const WATCH_COL = 55;

type Phase = 'stepping' | 'found' | 'fixing' | 'fixed';

let phase: Phase = 'stepping';
let at = 0; // index in DEBUG_TRACE of the statement about to run
let values = new Map<string, string>();
let changed = new Set<string>();
let alarms = new Set<string>();
let note = DEBUG_INTRO;
let noteCls = 't';
let busy = false;
/** Text typed so far over each line being fixed. */
let typing = new Map<number, string>();

function reset(ctx: Ctx): void {
  phase = ctx.story.fixed ? 'fixed' : 'stepping';
  at = 0;
  values = new Map(WATCH.map((f) => [f.name, f.value]));
  changed = new Set();
  alarms = new Set();
  typing = new Map();
  busy = false;
  note = ctx.story.fixed
    ? 'The IF in 1300-LEAP-YEAR now asks about WS-REM-400 first. Press ENTER to run the suite again.'
    : DEBUG_INTRO;
  noteCls = ctx.story.fixed ? 'g' : 't';
}

function step(ctx: Ctx): void {
  const st = DEBUG_TRACE[at];
  changed = new Set(Object.keys(st.set ?? {}));
  for (const [name, value] of Object.entries(st.set ?? {})) values.set(name, value);
  if (st.alarm) alarms.add(st.alarm);
  note = st.note;
  noteCls = st.alarm ? 'r' : 't';
  at++;
  if (at === DEBUG_TRACE.length) {
    phase = 'found';
    ctx.msg(`Defect found at line ${DEFECT_LINE}. Press ENTER to fix it.`, 'y');
  }
}

async function runToDefect(ctx: Ctx): Promise<void> {
  busy = true;
  while (phase === 'stepping') {
    step(ctx);
    ctx.sound.tick();
    ctx.redraw();
    await ctx.run.sleep(260);
  }
  busy = false;
}

async function fix(ctx: Ctx): Promise<void> {
  phase = 'fixing';
  busy = true;
  changed = new Set();
  note = 'A century year is a leap year only when it is divisible by 400. The IF now says so.';
  noteCls = 't';
  ctx.msg('');
  for (const [n, text] of Object.entries(FIX)) {
    const indent = text.length - text.trimStart().length;
    await ctx.run.type(text.slice(indent), (p) => {
      typing.set(Number(n), text.slice(0, indent) + p);
      ctx.sound.tick();
      ctx.redraw();
    }, 38);
    await ctx.run.sleep(200);
  }
  ctx.story.fixed = true;
  ctx.story.rerun = true;
  typing = new Map();
  phase = 'fixed';
  busy = false;
  ctx.msg('Fixed. Press ENTER to run the suite again.', 'g');
}

export const debugPanel: Panel = {
  id: 'debug',
  title: 'COBALTO - DEBUG',
  context: () => `case ${FAILURE.caseN} of ${CASES.length}`,

  fkeys: () => [
    {
      key: 'Enter',
      label: phase === 'stepping' ? 'Step' : phase === 'fixed' ? 'Run the suite' : 'Fix the defect',
    },
    ...(phase === 'stepping' ? [{ key: 'F8', label: 'Run to defect' }] : []),
    { key: 'F4', label: 'Restart' },
  ],

  enter(ctx: Ctx) {
    if (!ctx.story.lastRun) ctx.story.lastRun = { passed: CASES.length - 1, failed: 1 };
    reset(ctx);
  },

  render(ctx: Ctx) {
    const s = ctx.s;
    const top = ctx.top;
    const lines = source(phase === 'fixed');
    const current = phase === 'stepping' ? DEBUG_TRACE[at].line : DEFECT_LINE;
    const stack = phase === 'stepping' ? DEBUG_TRACE[at].stack : DEBUG_TRACE[DEBUG_TRACE.length - 1].stack;

    s.put(top, 0, `${PROGRAM}.cbl`, 'w');
    s.put(top, 14, CASES[FAILURE.caseN - 1].name.slice(0, 38), 'b');

    const idx = lines.findIndex((l) => l.n === current);
    const first = Math.max(0, Math.min(idx - 8, lines.length - SRC_ROWS));
    lines.slice(first, first + SRC_ROWS).forEach((l, i) => {
      const row = top + 1 + i;
      const isDefect = l.n in FIX;
      s.put(row, 0, String(l.n).padStart(5, '0'), 'b');
      if (typing.has(l.n)) {
        const text = typing.get(l.n)!;
        s.put(row, 6, '+', 't');
        s.put(row, SRC_COL, text, 't');
        if (phase === 'fixing') s.cursor(row, SRC_COL + text.length);
        return;
      }
      if (phase === 'stepping' && l.n === current) {
        s.put(row, 6, '=>', 'y');
        s.put(row, SRC_COL, l.text.padEnd(SRC_WIDTH), 'k rv');
        return;
      }
      if (isDefect && phase === 'found') {
        s.put(row, 6, '**', 'r');
        s.put(row, SRC_COL, l.text.padEnd(SRC_WIDTH), 'r rv');
        return;
      }
      if (isDefect && phase === 'fixing') return;
      if (l.fixed) s.put(row, 6, '+', 't');
      const header = l.hits === null && !l.text.startsWith(' ');
      s.put(row, SRC_COL, l.text, l.fixed ? 't' : header ? 'w' : 'g');
    });

    s.put(top, WATCH_COL, 'WATCH', 'w');
    s.right(top, 'STORAGE', 'b');
    WATCH.forEach((f, i) => {
      const row = top + 1 + i;
      const value = values.get(f.name) ?? f.value;
      // After the fix the values are those of the failed run: shown as stale.
      const cls = phase === 'fixed' ? 'd' : alarms.has(f.name) ? 'r rv' : changed.has(f.name) ? 'y rv' : 'g';
      s.put(row, WATCH_COL, f.name, 'b');
      s.right(row, ` ${value} `, cls, null, 0);
    });

    const stackRow = top + 2 + WATCH.length;
    if (phase !== 'fixed') s.put(stackRow, WATCH_COL, 'CALL STACK', 'w');
    (phase === 'fixed' ? [] : [...stack].reverse()).forEach((frame, i) => {
      s.put(stackRow + 1 + i, WATCH_COL, frame, i === 0 ? 't' : 'd');
    });

    wrap(note, s.cols - 4).slice(0, 3).forEach((line, i) => {
      s.put(top + SRC_ROWS + 2 + i, 2, line, noteCls);
    });
  },

  key(key: string, ctx: Ctx) {
    if (key === 'F4') {
      ctx.story.fixed = false;
      ctx.story.rerun = false;
      ctx.story.lastRun = { passed: CASES.length - 1, failed: 1 };
      ctx.run.stop();
      ctx.go('debug');
      return true;
    }
    if (busy) return true;
    if (key === 'F8' && phase === 'stepping') {
      void runToDefect(ctx);
      return true;
    }
    if (key === 'Enter') {
      if (phase === 'stepping') step(ctx);
      else if (phase === 'found') void fix(ctx);
      else if (phase === 'fixed') ctx.go('run');
      return true;
    }
    return false;
  },
};
