import type { Story } from '../app';
import { wrap } from '../term/screen';
import { CALLS, PROGRAMS, callees, callers } from '../story/codebase';
import { COMPILERS } from '../story/compilers';
import { DEFINITIONS } from '../story/define';
import { DRAFTS, DRAFT_WARNING } from '../story/generate';
import {
  CASES,
  COMPILER,
  DEBUG_TRACE,
  DEFECT_LINE,
  FAILURE,
  PROGRAM,
  SUITE,
  WATCH,
  coverage,
  lineOf,
  source,
} from '../story/loancalc';
import type { Screen } from '../term/screen';
import { BLANK, L, LB, band, outcomes, putLine, totals, wrapLine, type Face, type FaceCtx, type Line } from './common';

const SIDE = 2;
const SIDE_WIDTH = 26;
const EDITOR = 29;
const EDITOR_WIDTH = 51;
const EDITOR_ROWS = 19;

interface View {
  tab: string;
  sideTitle: string;
  side: Line[];
  editor: Line[];
  panelTitle: string;
  panel: Line[];
  /** Which icon of the activity bar is lit: explorer, testing or debug. */
  activity: 'E' | 'T' | 'D';
}

function code(n: number, text: string, cls = 'g', mark = ' ', markCls = 'd', bg?: string): Line {
  const line = L([String(n).padStart(4), 'd'], [' ', ''], [mark, markCls], [' ', ''], [text, cls]);
  return bg ? { ...line, bg } : line;
}

function cobolCls(text: string): string {
  return text.startsWith(' ') ? 'g' : 'w';
}

function mark(pass: boolean | null): [string, string] {
  return pass === null ? ['-', 'd'] : pass ? ['+', 'g'] : ['x', 'r'];
}

function testTree(names: string[], results: (boolean | null)[]): Line[] {
  return [
    L([`v ${SUITE}`, 'w']),
    ...names.map((name, i) => L(['  ', ''], mark(results[i]), [` ${name}`, results[i] === false ? 'r' : 'g'])),
  ];
}

function suiteLines(start: number, lines: string[]): Line[] {
  return lines.map((text, i) => code(start + i, text, text.startsWith('TESTCASE') ? 't' : text.includes('EXPECT') || text.includes('TO BE') ? 'w' : 'g'));
}

function view(step: number, story: Story): View {
  const { passed, failed } = totals(story);
  const results = outcomes(story);
  const src = source(story.fixed);

  if (step === 0) {
    const tree: Line[] = [];
    const walk = (name: string, depth: number): void => {
      const by = callers(name).length;
      const p = PROGRAMS.find((x) => x.name === name)!;
      tree.push(
        L(
          [`${'   '.repeat(depth)}${depth ? '+- ' : ''}${name}`, depth ? 'g' : 'w'],
          by > 1 ? [`   called by ${by}`, 'y'] : p.note ? [`   ${p.note}`, 'r'] : by === 0 ? [`   ${p.kind}`, 'b'] : ['', ''],
        ),
      );
      callees(name).forEach((c) => walk(c, depth + 1));
    };
    PROGRAMS.filter((p) => callers(p.name).length === 0).forEach((p) => {
      walk(p.name, 0);
      tree.push(BLANK);
    });
    const loancalc = PROGRAMS.find((p) => p.name === PROGRAM)!;
    const most = Math.max(...loancalc.paragraphs.map((p) => p.performed));
    return {
      tab: 'Code map',
      activity: 'E',
      sideTitle: `OUTLINE: ${PROGRAM}`,
      side: loancalc.paragraphs.map((p, i) =>
        L([p.name.padEnd(19), p.performed === most ? 'y' : 'g'], [i === 0 ? 'entry' : `x${p.performed}`, i === 0 ? 't' : 'd']),
      ),
      editor: [L(['Who calls whom', 'b']), BLANK, ...tree],
      panelTitle: 'OUTPUT',
      panel: [L(`Cobalto: ${PROGRAMS.length} programs, ${CALLS.length} calls, 3 copybooks, 3 files`)],
    };
  }

  if (step === 1) {
    const editor: Line[] = [];
    let n = 24;
    for (const def of DEFINITIONS) {
      editor.push(L(['       Run Test | Debug Test', 'd']));
      const lines = def.lines.map((l) => l.replace('{}', def.choices[0]));
      editor.push(...suiteLines(n, lines));
      n += lines.length + 1;
    }
    return {
      tab: `${SUITE}.cblt`,
      activity: 'T',
      sideTitle: 'TESTING',
      side: [
        ...testTree(DEFINITIONS.map((d) => d.lines[0].slice(10, -1)), [null, null]),
        BLANK,
        L(['interface test', 'b']),
        L(['  inputs and outputs', 'd']),
        L(['component test', 'b']),
        L(['  one paragraph, mocks', 'd']),
      ],
      editor,
      panelTitle: 'PROBLEMS',
      panel: [L(['No problems in the suite.', 'd'])],
    };
  }

  if (step === 2) {
    const draft = DRAFTS[0];
    const cases = draft.rounds.flatMap((r) => r.cases);
    const last = draft.rounds[draft.rounds.length - 1];
    const editor: Line[] = [code(1, `* ${DRAFT_WARNING}`, 'p')];
    let n = 40;
    for (const c of last.cases) {
      editor.push(code(n++, `TESTCASE '${c.name}'`, 't'));
      if (c.review) editor.push(code(n++, `* REVIEW: ${c.review}`.slice(0, 44), 'p'));
      for (const b of c.body) editor.push(code(n++, `    ${b}`, b.startsWith('EXPECT') ? 'w' : 'g'));
      editor.push(code(n++, ''));
    }
    return {
      tab: `${PROGRAM}.ai.cblt`,
      activity: 'T',
      sideTitle: 'TESTING',
      side: [
        L([' AI ', 'p rv'], [' draft', 'p']),
        ...testTree(cases.map((c) => c.name.slice(0, 20)), cases.map((_, i) => i < cases.length - 1)),
      ],
      editor,
      panelTitle: 'OUTPUT',
      panel: draft.rounds.map((r, i) =>
        L([`round ${i + 1}  `, 'b'], `${r.passed} pass ${r.failed} fail  `, [`coverage ${r.coverage}%`, 'w']),
      ),
    };
  }

  if (step === 3) {
    const editor = [
      ...suiteLines(FAILURE.suiteLine - 8, [
        "TESTCASE '1900 is not a leap year: Feb 29 invalid'",
        '    MOVE 19000229 TO WS-START-DATE',
        '    CALL "LOANCALC" USING WS-LOAN',
        "    EXPECT WS-RETURN-CODE TO BE '40'",
        '',
      ]),
      ...suiteLines(FAILURE.suiteLine - 3, FAILURE.snippet),
    ];
    editor.push(
      story.fixed
        ? LB('cov', ['         passed', 'g'])
        : LB('miss', [`         Expected ${FAILURE.expected}  Obtained ${FAILURE.obtained}`, 'r']),
    );
    return {
      tab: `${SUITE}.cblt`,
      activity: 'T',
      sideTitle: 'TESTING',
      side: testTree(CASES.map((c) => c.name.slice(0, 20)), results),
      editor,
      panelTitle: 'TEST RESULTS',
      panel: [
        L([`${CASES.length} tests  `, 'w'], `${passed} passed  `, [`${failed} failed`, failed ? 'r' : 'd'], ['   0.36 s', 'd']),
        failed ? L([`x ${CASES[FAILURE.caseN - 1].name}`, 'r']) : L('Every case passes.'),
      ],
    };
  }

  if (step === 4) {
    const first = src.findIndex((l) => l.n === lineOf('1000-VALIDATE.'));
    return {
      tab: `${PROGRAM}.cbl`,
      activity: 'T',
      sideTitle: 'TEST COVERAGE',
      side: [
        ...coverage(story.fixed).flatMap((m) => [
          L([m.name, 'b']),
          L(['  ', ''], [`${Math.floor((m.covered / m.total) * 100)}%`.padEnd(6), 'w'], [`${m.covered} of ${m.total}`, 'd']),
        ]),
        BLANK,
        L([`${PROGRAM}.cbl`, 'w']),
        L(['  1 line never executed', 'r']),
        L(['  1 condition half tested', 'y']),
      ],
      editor: src.slice(first, first + EDITOR_ROWS).map((l) => {
        const missed = l.hits === 0;
        const bar: [string, string] = l.hits === null ? [' ', 'd'] : missed ? ['█', 'r'] : l.partial ? ['█', 'y'] : ['█', 'g'];
        return code(l.n, l.text, missed ? 'r' : cobolCls(l.text), bar[0], bar[1], missed ? 'miss' : undefined);
      }),
      panelTitle: 'TEST RESULTS',
      panel: failed
        ? [L([`x case ${FAILURE.caseN}  `, 'r'], [`expected ${FAILURE.expected}, obtained ${FAILURE.obtained}`, 'w'])]
        : [L('Every case passes.')],
    };
  }

  if (step === 5) {
    const stop = DEBUG_TRACE.findIndex((s) => s.line === DEFECT_LINE);
    const values = new Map(WATCH.map((f) => [f.name, f.value]));
    for (const st of DEBUG_TRACE.slice(0, stop)) for (const [k, v] of Object.entries(st.set ?? {})) values.set(k, v);
    const first = src.findIndex((l) => l.n === DEFECT_LINE) - 8;
    const editor = src.slice(first, first + EDITOR_ROWS).map((l) => {
      if (l.fixed) return code(l.n, l.text, 't', '+', 't', 'cov');
      if (!story.fixed && l.n === DEFECT_LINE) return code(l.n, l.text, 'w', '>', 'y', 'hl');
      return code(l.n, l.text, cobolCls(l.text));
    });
    if (story.fixed) {
      return {
        tab: `${PROGRAM}.cbl`,
        activity: 'T',
        sideTitle: 'TESTING',
        side: testTree(CASES.map((c) => c.name.slice(0, 20)), results),
        editor,
        panelTitle: 'TEST RESULTS',
        panel: [L(`${passed} of ${CASES.length} passed after the fix in 1300-LEAP-YEAR.`)],
      };
    }
    return {
      tab: `${PROGRAM}.cbl   || >  step over  step into  stop`,
      activity: 'D',
      sideTitle: 'VARIABLES',
      side: [
        ...WATCH.map((f) => L([f.name.padEnd(17), 'b'], [values.get(f.name)!, f.name === 'WS-REM-400' ? 'y' : 'g'])),
        BLANK,
        L(['CALL STACK', 'w']),
        ...[...DEBUG_TRACE[stop].stack].reverse().map((frame, i) => L([frame, i === 0 ? 't' : 'd'])),
      ],
      editor,
      panelTitle: 'DEBUG CONSOLE',
      panel: [
        L([`Paused on step, ${PROGRAM}.cbl:${DEFECT_LINE}`, 'w']),
        L(['WS-REM-400 = 0000: computed, never checked.', 'y']),
      ],
    };
  }

  if (step === 6) {
    const editor: Line[] = [L(['Profile'.padEnd(16), 'b'], ['Compiler'.padEnd(27), 'b'], ['Passed', 'b']), BLANK];
    const side: Line[] = [];
    for (const c of COMPILERS) {
      const bad = new Set(c.failures.map((f) => f.caseN));
      const ok = CASES.filter((k, i) => results[i] && !bad.has(k.n)).length;
      const all = ok === CASES.length;
      editor.push(L([c.profile.padEnd(16), 'w'], c.name.padEnd(27), [`${ok}/${CASES.length}`, all ? 'g' : 'r']));
      for (const f of c.failures) {
        editor.push(L([`  case ${f.caseN}: obtained ${f.obtained}`, 'r']));
        for (const w of wrap(f.why, EDITOR_WIDTH - 4)) editor.push(L([`  ${w}`, 'd']));
      }
      editor.push(BLANK);
      side.push(L(mark(all), [` ${c.profile}`, all ? 'g' : 'r']), L(['    ', ''], [c.platform, 'd']));
    }
    return {
      tab: 'Cobalto: profiles',
      activity: 'T',
      sideTitle: 'PROFILES',
      side,
      editor,
      panelTitle: 'OUTPUT',
      panel: [L('Same suite, four compilers: arithmetic rules differ.')],
    };
  }

  return {
    tab: 'Welcome',
    activity: 'E',
    sideTitle: 'EXPLORER',
    side: [
      L(['v loans', 'w']),
      L('  v src'),
      ...PROGRAMS.map((p) => L(`      ${p.name}.cbl`)),
      L('  v tests'),
      L(`      ${SUITE}.cblt`),
      L('    cblt.json'),
    ],
    editor: [
      L(['Cobalto for VS Code', 'w']),
      BLANK,
      L('The same session, inside the editor.'),
      BLANK,
      L(['Test Explorer   ', 'b'], 'run and debug each TESTCASE'),
      L(['Coverage        ', 'b'], 'statements and branches in the gutter'),
      L(['Debugging       ', 'b'], 'paragraphs and PIC fields, not C'),
      L(['AI drafts       ', 'b'], 'suites to review, marked as drafts'),
      BLANK,
      L(['Pick a step below, 1 to 7, or press the right arrow.', 'y']),
    ],
    panelTitle: 'OUTPUT',
    panel: [L([`Cobalto ready. ${COMPILER} found.`, 'd'])],
  };
}

export const vscode: Face = {
  label: 'VS Code',

  beats(step, story) {
    const v = view(step, story);
    return Math.max(v.side.length, v.editor.length) + v.panel.length + 1;
  },

  render({ s, story, step, beat }: FaceCtx) {
    const v = view(step, story);
    const { passed, failed } = totals(story);
    if (s.cols < 80) return renderNarrow(s, v, beat, `Cobalto: ${passed} passed, ${failed} failed`);
    band(s, 0, 0, s.cols, 's0');
    s.center(0, 'loans - Cobalto for VS Code', 'd s0');
    for (let r = 1; r <= 26; r++) {
      band(s, r, 0, SIDE, 's0');
      band(s, r, SIDE, SIDE_WIDTH, 's1');
    }
    (['E', 'T', 'D'] as const).forEach((icon, i) => s.put(2 + i * 2, 0, icon, icon === v.activity ? 'w s0' : 'd s0'));
    s.put(1, SIDE + 1, v.sideTitle, 'b s1');
    band(s, 1, SIDE + SIDE_WIDTH, s.cols - SIDE - SIDE_WIDTH, 's0');
    s.put(1, EDITOR, ` ${v.tab} `, 'w');

    v.side.slice(0, 25).forEach((line, i) => {
      if (i < beat) putLine(s, 2 + i, SIDE + 1, line, SIDE_WIDTH - 1, 's1');
    });
    v.editor.slice(0, EDITOR_ROWS).forEach((line, i) => {
      if (i < beat) putLine(s, 2 + i, EDITOR, line, EDITOR_WIDTH);
    });

    band(s, 21, SIDE + SIDE_WIDTH, s.cols - SIDE - SIDE_WIDTH, 's0');
    s.put(21, EDITOR, ` ${v.panelTitle} `, 'w s0');
    const after = Math.max(v.side.length, v.editor.length);
    v.panel.slice(0, 5).forEach((line, i) => {
      if (beat > after + i) putLine(s, 22 + i, EDITOR, line, EDITOR_WIDTH);
    });

    band(s, 27, 0, s.cols, 's2');
    s.put(27, 1, 'main', 'w s2');
    s.put(27, 8, `Cobalto: ${passed} passed, ${failed} failed`, 'w s2');
    s.right(27, `${COMPILER}   COBOL`, 'w s2');
  },
};

/** 40 columns: the editor on top, the side bar under it, then the panel. */
function renderNarrow(s: Screen, v: View, beat: number, status: string): void {
  const editorRows = 14;
  const sideRows = 12;
  band(s, 0, 0, s.cols, 's0');
  s.center(0, 'Cobalto for VS Code', 'd s0');
  s.put(1, 1, v.tab.slice(0, s.cols - 2), 'w');
  v.editor.slice(0, editorRows).forEach((line, i) => {
    if (i < beat) putLine(s, 2 + i, 0, line, s.cols);
  });
  const sideTop = 2 + editorRows;
  band(s, sideTop, 0, s.cols, 's0');
  s.put(sideTop, 1, v.sideTitle, 'b s0');
  for (let r = 0; r < sideRows; r++) band(s, sideTop + 1 + r, 0, s.cols, 's1');
  // The end of a long tree matters most: that is where the failing case is.
  (v.sideTitle === 'TESTING' ? v.side.slice(-sideRows) : v.side.slice(0, sideRows)).forEach((line, i) => {
    if (i < beat) putLine(s, sideTop + 1 + i, 1, line, s.cols - 2, 's1');
  });
  const panelTop = sideTop + 1 + sideRows;
  band(s, panelTop, 0, s.cols, 's0');
  s.put(panelTop, 1, v.panelTitle, 'w s0');
  v.panel
    .flatMap((line) => wrapLine(line, s.cols - 2))
    .slice(0, 2)
    .forEach((line, i) => putLine(s, panelTop + 1 + i, 1, line, s.cols - 2));
  band(s, panelTop + 3, 0, s.cols, 's2');
  s.put(panelTop + 3, 1, status, 'w s2');
}
