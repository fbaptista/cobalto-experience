import type { Story } from '../app';
import { wrap } from '../term/screen';
import { CALLS, PROGRAMS } from '../story/codebase';
import { COMPILERS } from '../story/compilers';
import { DRAFTS } from '../story/generate';
import { CASES, DEFECT_LINE, FAILURE, FIX, PROGRAM, SUITE, coverage, lineOf, source } from '../story/loancalc';
import { BLANK, L, band, outcomes, putLine, totals, wrapLine, type Face, type FaceCtx, type Line } from './common';

const ROWS = 23;

/** Width of the transcript: set by render for the grid on screen. */
let WIDTH = 76;

/** What the person asks. */
function you(text: string): Line[] {
  return wrap(text, WIDTH - 7).map((t, i) => L(i === 0 ? [' YOU ', 'w rv'] : ['     ', ''], [` ${t}`, 'w']));
}

/** What the AI agent answers. */
function ai(text: string): Line[] {
  return wrap(text, WIDTH - 7).map((t, i) => L(i === 0 ? [' AI  ', 'p rv'] : ['     ', ''], [` ${t}`, 'p']));
}

/** A command the agent runs, and what comes back. */
function tool(command: string, ...out: Line[]): Line[] {
  return [L(['      $ ', 'd'], [command, 'y']), ...out.map((l) => ({ ...l, segs: [['        ', ''] as [string, string], ...l.segs] })), BLANK];
}

function script(step: number, story: Story): Line[] {
  const { passed, failed } = totals(story);
  const results = outcomes(story);

  if (step === 0) {
    return [
      ...you(`What is in this code base, and what depends on ${PROGRAM}?`),
      BLANK,
      ...tool('cobalto map src/ --json', L(`${PROGRAMS.length} programs, ${CALLS.length} calls, 3 copybooks, 3 files`)),
      ...ai(
        `Seven programs. ${PROGRAM} is a subprogram called by LOANBTCH and PREMIUM, so a change there reaches the batch and the online quote. ` +
          'Its paragraph 1200-DAYS-IN-MONTH is performed from two places. LEGACY has no caller: worth asking someone before touching it.',
      ),
    ];
  }
  if (step === 1) {
    return [
      ...you('Write a test for the installment, and one for 1200-DAYS-IN-MONTH on its own.'),
      BLANK,
      ...tool(
        `edit tests/${SUITE}.cblt`,
        L(["+ TESTCASE 'installment, 12 months'", 't']),
        L('+     CALL "LOANCALC" USING WS-LOAN'),
        L(['+     EXPECT WS-INSTALLMENT TO BE NUMERIC 10046.21', 'w']),
        L(["+ TESTCASE 'February of a leap year'", 't']),
        L('+     MOCK PARAGRAPH 1300-LEAP-YEAR ... END-MOCK'),
        L('+     PERFORM 1200-DAYS-IN-MONTH'),
        L(['+     EXPECT WS-DAYS-IN-MONTH TO BE NUMERIC 29', 'w']),
      ),
      ...tool('cobalto parse tests/ --json', L('2 cases added, 0 errors')),
      ...ai(
        'Two cases. The first is an interface test: it only looks at what goes in and what comes out. ' +
          'The second runs one paragraph and mocks the leap-year check, so it fails only if that paragraph is wrong.',
      ),
    ];
  }
  if (step === 2) {
    const draft = DRAFTS[0];
    return [
      ...you(`Draft a suite for ${PROGRAM}.`),
      BLANK,
      ...tool(
        `cobalto suggest --program ${draft.program}`,
        ...draft.rounds.map((r, i) =>
          L([`round ${i + 1}  `, 'b'], `${r.cases.length} cases  ${r.passed} pass  ${r.failed} fail  `, [`coverage ${r.coverage}%`, 'w']),
        ),
        L(['wrote ', 'b'], `tests/${draft.program}.ai.cblt`),
      ),
      ...ai(
        'Eight cases in three rounds, 97% of the statements. One case fails: February 29, 2000 comes back as an invalid date. ' +
          'I did not change the expected value to make it pass. It is a draft: review it before you trust it.',
      ),
    ];
  }
  if (step === 3) {
    return [
      ...you('Run the suite.'),
      BLANK,
      ...tool(
        'cobalto test --json',
        L([`${passed} passed  `, 'g'], [`${failed} failed`, failed ? 'r' : 'd'], ['   0.36 s', 'd']),
        ...(failed ? [L([`FAIL  ${CASES[FAILURE.caseN - 1].name}`, 'r'])] : []),
      ),
      ...ai(
        failed
          ? `Ten of eleven pass. Case ${FAILURE.caseN} fails: the program returns ${FAILURE.obtained} where the case expects ${FAILURE.expected}. I have not touched the program or the case.`
          : 'All eleven cases pass.',
      ),
    ];
  }
  if (step === 4) {
    const [stm] = coverage(story.fixed);
    return [
      ...you('Why did it fail, and what is the suite not testing?'),
      BLANK,
      ...tool(
        'cobalto test --coverage --json',
        failed
          ? L(['assert    ', 'b'], `${FAILURE.snippet[3].trim()}`)
          : L('no failed asserts'),
        ...(failed ? [L(['actual    ', 'b'], [`${FAILURE.obtained}  ${FAILURE.meaning}`, 'r'])] : []),
        L(['statements  ', 'b'], `${stm.covered} of ${stm.total}`),
        L(['never executed  ', 'b'], `${PROGRAM}.cbl:${lineOf('MOVE "30"')}`),
      ),
      ...ai(
        (failed ? `The date February 29, 2000 is rejected as invalid (${FAILURE.meaning}). ` : 'Nothing fails now. ') +
          `Separately, line ${lineOf('MOVE "30"')} never runs: no case sends an annual rate above 200%. ` +
          'That is a gap in the suite, not the cause of the failure. I can add the case if you want it.',
      ),
    ];
  }
  if (step === 5) {
    const old = source(false).filter((l) => l.n in FIX);
    return [
      ...you('Find the defect.'),
      BLANK,
      ...tool(
        `cobalto debug --case ${FAILURE.caseN} --watch WS-REM-400 WS-LEAP`,
        L([`${PROGRAM}.cbl:${DEFECT_LINE}  `, 'b'], 'WS-REM-4 0000  WS-REM-100 0000  WS-REM-400 0000'),
        L([`${PROGRAM}.cbl:${lineOf('MOVE "N" TO WS-LEAP')}  `, 'b'], ['WS-LEAP "N"', 'r']),
      ),
      ...ai('In 1300-LEAP-YEAR the remainder by 400 is computed and the IF never asks about it, so 2000 is not a leap year. The change:'),
      ...old.map((l) => L(['        - ', 'r'], [l.text.trim(), 'r'])),
      ...Object.values(FIX).map((text) => L(['        + ', 'g'], [text.trim(), 'g'])),
      BLANK,
      ...(story.fixed
        ? [
            ...tool('cobalto test --json', L([`${passed} passed  `, 'g'], ['0 failed', 'd'])),
            ...ai('Applied, as you approved. All eleven cases pass.'),
          ]
        : ai('I have not applied it. Fix it in the Terminal tab, step 6, or tell me to go ahead.')),
    ];
  }
  if (step === 6) {
    const rows = COMPILERS.map((c) => {
      const bad = new Set(c.failures.map((f) => f.caseN));
      const ok = CASES.filter((k, i) => results[i] && !bad.has(k.n)).length;
      return L([c.profile.padEnd(16), 'w'], [c.name.padEnd(28), 'g'], [`${ok}/${CASES.length}`, ok === CASES.length ? 'g' : 'r']);
    });
    return [
      ...you('Does it behave the same on the mainframe compiler?'),
      BLANK,
      ...tool('cobalto test --profile <each> --json', ...rows),
      ...ai(
        'Not quite. On IBM Enterprise COBOL two cases differ by cents: the installment comes out 10046.18 instead of 10046.21. ' +
          'It is not a defect of the program or of the compiler: the intermediate results are rounded by different rules. ' +
          (story.fixed ? '' : `Case ${FAILURE.caseN} fails everywhere, which is the leap-year defect. `) +
          'Someone who owns the business rule should decide which cents are right.',
      ),
    ];
  }
  return [
    ...ai(
      'I am an AI coding agent, not a person. In this tab I drive Cobalto with the same commands you would type, and I show every command I run.',
    ),
    BLANK,
    ...ai('What I write is a draft until someone reviews it. I do not change a test to make it pass.'),
    BLANK,
    L(['      Pick a step below, 1 to 7, or press the right arrow.', 'y']),
  ];
}

export const agent: Face = {
  label: 'Agent',

  beats(step, story) {
    WIDTH = 76;
    return script(step, story).length + 1;
  },

  render({ s, story, step, beat }: FaceCtx) {
    WIDTH = s.cols - 4;
    if (s.cols < 80) return renderNarrow({ s, story, step, beat });
    band(s, 0, 0, s.cols, 's0');
    s.put(0, 1, ' AI AGENT ', 'p rv');
    s.put(0, 13, 'An AI coding agent using Cobalto. Not a person.', 'w s0');
    s.right(0, 'recreation', 'd s0');

    const lines = script(step, story).slice(0, beat);
    lines.slice(-ROWS).forEach((line, i) => putLine(s, 2 + i, 2, line, WIDTH));

    band(s, 26, 1, s.cols - 2, 's1');
    s.put(26, 2, '>', 'p s1');
    s.put(26, 4, 'Ask the agent about this code base', 'd s1');
  },
};

function renderNarrow({ s, story, step, beat }: FaceCtx): void {
  const width = s.cols - 2;
  band(s, 0, 0, s.cols, 's0');
  s.put(0, 1, ' AI AGENT ', 'p rv');
  s.put(0, 13, 'Not a person.', 'w s0');
  s.put(1, 1, 'An AI coding agent using Cobalto.', 'd');
  // Beats count the lines of the wide transcript, so that the pace is the same.
  WIDTH = 76;
  const total = script(step, story).length;
  WIDTH = s.cols - 4;
  const all = script(step, story).flatMap((line) => wrapLine({ ...line, segs: line.segs.map(([t, c]) => [t.replace(/^ {6,8}/, '  '), c]) }, width));
  const lines = all.slice(0, Math.ceil((all.length * Math.min(beat, total)) / total));
  const rows = s.rows - 7;
  lines.slice(-rows).forEach((line, i) => putLine(s, 3 + i, 1, line, width));
  band(s, s.rows - 4, 0, s.cols, 's1');
  s.put(s.rows - 4, 1, '>', 'p s1');
  s.put(s.rows - 4, 3, 'Ask the agent', 'd s1');
}
