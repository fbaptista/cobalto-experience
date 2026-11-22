import type { Ctx, Panel } from '../app';
import { wrap } from '../term/screen';
import { DRAFTS, DRAFT_WARNING, type Draft } from '../story/generate';

const LEFT_WIDTH = 57;
const LEFT_ROWS = 17;
const RIGHT = 61;

type Phase = 'pick' | 'running' | 'done';
type Stage = 'asking' | 'writing' | 'compiling' | 'running' | 'scored';

interface RoundView {
  stage: Stage;
  proposed: number;
}

let phase: Phase = 'pick';
let sel = 0;
let typed = '';
let stream: { text: string; cls: string }[] = [];
let rounds: RoundView[] = [];
let coverage = 0;

function push(text: string, cls: string): void {
  stream.push({ text, cls });
}

async function start(ctx: Ctx, draft: Draft): Promise<void> {
  const { run } = ctx;
  phase = 'running';
  typed = '';
  stream = [];
  rounds = [];
  coverage = 0;
  ctx.msg('');
  await run.type(`cobalto suggest --program ${draft.program}`, (p) => {
    typed = p;
    ctx.sound.tick();
    ctx.redraw();
  });
  await run.sleep(350);

  for (const [i, round] of draft.rounds.entries()) {
    const view: RoundView = { stage: 'asking', proposed: 0 };
    rounds.push(view);
    ctx.redraw();
    await run.sleep(900);
    view.stage = 'writing';
    for (const c of round.cases) {
      const lines = [
        { text: `TESTCASE '${c.name}'`, cls: 't' },
        ...(c.review ? wrap(`* REVIEW: ${c.review}`, LEFT_WIDTH - 4).map((t) => ({ text: `    ${t}`, cls: 'p' })) : []),
        ...c.body.map((t) => ({ text: `    ${t}`, cls: t.startsWith('EXPECT') || t.startsWith('VERIFY') ? 'w' : 'g' })),
        { text: '', cls: 'g' },
      ];
      for (const line of lines) {
        push(line.text, line.cls);
        ctx.sound.tick();
        ctx.redraw();
        await run.sleep(75);
      }
      view.proposed++;
    }
    view.stage = 'compiling';
    ctx.redraw();
    await run.sleep(450);
    view.stage = 'running';
    ctx.redraw();
    await run.sleep(550);
    view.stage = 'scored';
    const from = coverage;
    for (let k = 1; k <= 10; k++) {
      coverage = Math.round(from + ((round.coverage - from) * k) / 10);
      ctx.redraw();
      await run.sleep(40);
    }
    for (const line of wrap(`>> round ${i + 1}: ${round.feedback}`, LEFT_WIDTH)) push(line, 'b');
    push('', 'g');
    ctx.redraw();
    await run.sleep(500);
  }
  phase = 'done';
  ctx.msg(draft.closing, 'y');
}

export const generatePanel: Panel = {
  id: 'generate',
  title: 'COBALTO - GENERATE',
  context: () => 'suites drafted by AI',

  fkeys: () =>
    phase === 'pick'
      ? [
          { key: 'Enter', label: 'Draft a suite' },
          { key: 'F7', label: 'Up' },
          { key: 'F8', label: 'Down' },
        ]
      : [
          { key: 'Enter', label: phase === 'done' ? 'Run' : 'Wait' },
          { key: 'F4', label: 'Another program' },
        ],

  enter() {
    phase = 'pick';
    typed = '';
  },

  render(ctx: Ctx) {
    const s = ctx.s;
    const top = ctx.top;
    const draft = DRAFTS[sel];

    if (phase === 'pick') {
      s.put(top + 1, 2, 'Pick a program. The model proposes cases, Cobalto compiles and runs them,', 'b');
      s.put(top + 2, 2, 'and what failed or was never executed goes back to the model. In rounds.', 'b');
      DRAFTS.forEach((d, i) => {
        const row = top + 5 + i * 2;
        const act = `p:pick:${i}`;
        s.put(row, 3, i === sel ? '=>' : '  ', 'y');
        s.put(row, 6, ` ${d.program.padEnd(9)}`, i === sel ? 'w rv' : 'w', act);
        s.put(row, 18, d.about, 'g', act);
      });
      s.put(top + 12, 2, ' AI ', 'p rv');
      s.put(top + 12, 7, 'What comes out is a draft of characterization tests: what the program', 'p');
      s.put(top + 13, 7, 'does today, written down for a person to review.', 'p');
      return;
    }

    s.put(top, 1, '> ', 'b');
    s.put(top, 3, typed, 'w');
    s.right(top, ' AI DRAFT ', 'p rv');

    stream.slice(-LEFT_ROWS).forEach((line, i) => s.put(top + 2 + i, 1, line.text.slice(0, LEFT_WIDTH), line.cls));

    rounds.forEach((view, i) => {
      const round = draft.rounds[i];
      const row = top + 2 + i * 6;
      s.put(row, RIGHT, `ROUND ${i + 1} OF ${draft.rounds.length}`, 'w');
      if (view.stage === 'asking') {
        s.put(row + 1, RIGHT, 'asking the model', 'p');
        return;
      }
      s.put(row + 1, RIGHT, 'proposed', 'b');
      s.put(row + 1, RIGHT + 10, `${view.proposed} cases`, 'p');
      if (view.stage === 'writing') return;
      s.put(row + 2, RIGHT, 'compiled', 'b');
      s.put(row + 2, RIGHT + 10, view.stage === 'compiling' ? '...' : 'OK', view.stage === 'compiling' ? 'y' : 'g');
      if (view.stage === 'compiling') return;
      s.put(row + 3, RIGHT, 'suite', 'b');
      if (view.stage === 'running') {
        s.put(row + 3, RIGHT + 10, 'RUN', 'y');
        return;
      }
      const c = s.put(row + 3, RIGHT + 10, `${round.passed} pass`, 'g');
      if (round.failed) s.put(row + 3, c + 1, `${round.failed} fail`, 'r');
      const last = i === rounds.length - 1;
      const pct = last ? coverage : round.coverage;
      s.put(row + 4, RIGHT, 'coverage', 'b');
      s.put(row + 4, RIGHT + 10, `${pct}%`, 'w');
    });

    if (rounds.length) {
      const width = 18;
      const on = Math.round((coverage / 100) * width);
      s.put(top + 20, RIGHT, '█'.repeat(on), 'g');
      s.put(top + 20, RIGHT + on, '█'.repeat(width - on), 'x');
      s.put(top + 21, RIGHT, `statements ${coverage}%`, 'b');
    }

    if (phase === 'done') {
      s.put(top + 21, 1, ` ${DRAFT_WARNING} `, 'y rv');
      s.put(top + 22, 1, `Saved as tests/${draft.program}.ai.cblt. What was sent to the model: build/ai/`, 'b');
    }
  },

  key(key: string, ctx: Ctx) {
    if (key.startsWith('@pick:')) {
      if (phase !== 'pick') return true;
      sel = Number(key.slice(6));
      void start(ctx, DRAFTS[sel]);
      return true;
    }
    if (key === 'F4') {
      ctx.go('generate');
      return true;
    }
    if (phase === 'pick') {
      if (key === 'F8' || key === 'ArrowDown') sel = (sel + 1) % DRAFTS.length;
      else if (key === 'F7' || key === 'ArrowUp') sel = (sel + DRAFTS.length - 1) % DRAFTS.length;
      else if (key === 'Enter') void start(ctx, DRAFTS[sel]);
      else return false;
      return true;
    }
    if (key === 'Enter') {
      if (phase === 'done') ctx.go('run');
      return true;
    }
    return false;
  },
};
