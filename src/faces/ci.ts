import type { Story } from '../app';
import { CALLS, PROGRAMS } from '../story/codebase';
import { COMPILERS } from '../story/compilers';
import { DRAFTS, DRAFT_WARNING } from '../story/generate';
import { CASES, COMPILER, DEFECT_LINE, FAILURE, PROGRAM, SUITE, coverage, lineOf } from '../story/loancalc';
import { BLANK, L, band, outcomes, putLine, totals, type Face, type FaceCtx, type Line } from './common';

const JOBS = 1;
const LOG = 27;
const LOG_WIDTH = 52;
const LOG_ROWS = 20;

type Status = 'pass' | 'fail' | 'warn' | 'skip';

interface View {
  job: string;
  command: string;
  log: Line[];
}

const JOB_LIST = ['map', 'parse-suites', 'suggest (manual)', 'test', 'coverage', 'sonar', 'matrix'];

const cmd = (text: string): Line => L(['$ ', 'd'], [text, 'w']);

function view(step: number, story: Story): View {
  const { passed, failed } = totals(story);
  const results = outcomes(story);
  const junit = L(['junit.xml  ', 'b'], `tests="${CASES.length}" failures="${failed}" errors="0"`);

  if (step === 0) {
    return {
      job: 'map',
      command: 'cobalto map src/ --json > build/map.json',
      log: [
        L(`${PROGRAMS.length} programs, ${CALLS.length} calls, 3 copybooks, 3 files`),
        BLANK,
        L(['changed in this commit  ', 'b'], [`${PROGRAM}.cbl`, 'w']),
        L(['called by               ', 'b'], 'LOANBTCH, PREMIUM'),
        L(['suites that cover it    ', 'b'], `${SUITE}.cblt`),
        BLANK,
        L(['warning  ', 'y'], 'LEGACY has no caller'),
        L(['artifact ', 'b'], 'build/map.json'),
      ],
    };
  }
  if (step === 1) {
    return {
      job: 'parse-suites',
      command: 'cobalto parse tests/ --json',
      log: [
        L([`${SUITE}.cblt  `, 'w'], `${CASES.length} cases  `, ['OK', 'g']),
        L(['  interface tests   ', 'b'], '9   CALL and what comes back'),
        L(['  component tests   ', 'b'], '2   PERFORM with MOCK and VERIFY'),
        BLANK,
        L('0 errors, 0 warnings'),
        L(['A suite that does not parse stops the pipeline here.', 'd']),
      ],
    };
  }
  if (step === 2) {
    const draft = DRAFTS[0];
    return {
      job: 'suggest (manual)',
      command: `cobalto suggest --program ${draft.program}`,
      log: [
        ...draft.rounds.map((r, i) =>
          L([`round ${i + 1}  `, 'b'], `${r.cases.length} cases  ${r.passed} pass  ${r.failed} fail  `, [`coverage ${r.coverage}%`, 'w']),
        ),
        BLANK,
        L(['wrote    ', 'b'], `tests/${draft.program}.ai.cblt`),
        L(['kept     ', 'b'], 'build/ai/: everything sent to the model'),
        BLANK,
        L(['opened pull request  ', 'b'], ['"Draft suite for LOANCALC"', 'w']),
        L(['label    ', 'b'], [' AI ', 'p rv'], [` ${DRAFT_WARNING}`, 'p']),
        L(['A person approves it. The pipeline never merges a draft.', 'd']),
      ],
    };
  }
  if (step === 3) {
    return {
      job: 'test',
      command: 'cobalto test --junit build/junit.xml',
      log: [
        L([`Compiling ${PROGRAM} with ${COMPILER}  `, 'b'], ['OK', 'g']),
        ...CASES.map((c, i) => L([results[i] ? 'PASS  ' : 'FAIL  ', results[i] ? 'g' : 'r'], [c.name, results[i] ? 'g' : 'r'])),
        BLANK,
        L([`${passed} passed  `, 'g'], [`${failed} failed`, failed ? 'r' : 'd']),
        junit,
        failed ? L(['exit code 1: the pipeline stops', 'r']) : L(['exit code 0', 'g']),
      ],
    };
  }
  if (step === 4) {
    const gate = failed === 0;
    return {
      job: 'coverage',
      command: 'cobalto test --coverage --sonar build/sonar.xml',
      log: [
        ...coverage(story.fixed).map((m) =>
          L([m.name.padEnd(12), 'b'], [`${Math.floor((m.covered / m.total) * 100)}%`.padEnd(6), 'w'], [`${m.covered} of ${m.total}`, 'd']),
        ),
        BLANK,
        L(['annotation  ', 'y'], `${PROGRAM}.cbl:${lineOf('MOVE "30"')}  never executed`),
        L(['annotation  ', 'y'], `${PROGRAM}.cbl:${lineOf('IF WS-DAY < 1')}  1 of 2 conditions`),
        BLANK,
        L(['coverage.xml  ', 'b'], 'sent to Sonar as generic coverage'),
        L(['quality gate  ', 'b'], gate ? ['PASSED', 'g'] : ['FAILED', 'r'], gate ? ['', ''] : ['   1 failing test', 'r']),
      ],
    };
  }
  if (step === 5) {
    if (story.fixed) {
      return {
        job: 'test',
        command: 'cobalto test --junit build/junit.xml',
        log: [
          L(['commit   ', 'b'], ['century years divisible by 400 are leap', 'w']),
          L(['changed  ', 'b'], `${PROGRAM}.cbl  lines ${DEFECT_LINE}-${DEFECT_LINE + 1}`),
          BLANK,
          L([`${passed} passed  `, 'g'], ['0 failed', 'd']),
          junit,
          L(['exit code 0: the pipeline goes on', 'g']),
        ],
      };
    }
    return {
      job: 'test',
      command: 'cat build/results.json',
      log: [
        L(['A pipeline does not debug. It hands over the evidence:', 'd']),
        BLANK,
        L(['case      ', 'b'], [CASES[FAILURE.caseN - 1].name, 'w']),
        L(['assert    ', 'b'], FAILURE.snippet[3].trim()),
        L(['expected  ', 'b'], FAILURE.expected),
        L(['actual    ', 'b'], [`${FAILURE.obtained}  ${FAILURE.meaning}`, 'r']),
        L(['source    ', 'b'], `${SUITE}.cblt:${FAILURE.suiteLine}`),
        BLANK,
        L(['annotation on the pull request  ', 'y'], `${SUITE}.cblt:${FAILURE.suiteLine}`),
        L(['artifact  ', 'b'], 'build/results.json, build/junit.xml'),
        BLANK,
        L(['The developer opens the same case in the debugger: tab Terminal', 'd']),
        L(['or VS Code, step 6.', 'd']),
      ],
    };
  }
  if (step === 6) {
    const log: Line[] = [];
    for (const c of COMPILERS) {
      const bad = new Set(c.failures.map((f) => f.caseN));
      const ok = CASES.filter((k, i) => results[i] && !bad.has(k.n)).length;
      log.push(L([`--profile ${c.profile}`.padEnd(27), 'w'], [c.platform.padEnd(16), 'd'], [`${ok}/${CASES.length}`, ok === CASES.length ? 'g' : 'r']));
      for (const f of c.failures) log.push(L([`    case ${f.caseN}: expected ${f.expect.split(' ').pop()}, obtained ${f.obtained}`, 'r']));
    }
    log.push(BLANK, L(['One job per compiler, the same suite in each.', 'd']));
    if (!story.fixed) log.push(L([`Case ${FAILURE.caseN} fails in all four: a defect, not a dialect.`, 'y']));
    return { job: 'matrix', command: 'cobalto test --profile $PROFILE --junit build/junit.xml', log };
  }
  return {
    job: '',
    command: 'cat .ci/pipeline.yml',
    log: [
      L(['stages:', 'w']),
      L('  - build      ', ['cobc, with the profile of the project', 'd']),
      L('  - test       ', ['cobalto test --junit', 'd']),
      L('  - coverage   ', ['cobalto test --coverage', 'd']),
      L('  - sonar      ', ['generic coverage and test reports', 'd']),
      BLANK,
      L(['The same session, as a pipeline.', 'w']),
      L(['Pick a step below, 1 to 7, or press the right arrow.', 'y']),
    ],
  };
}

export const ci: Face = {
  label: 'CI',

  beats(step, story) {
    return view(step, story).log.length + 2;
  },

  render({ s, story, step, beat }: FaceCtx) {
    const v = view(step, story);
    const broken = !story.fixed;
    band(s, 0, 0, s.cols, 's0');
    s.put(0, 1, 'loans  >  Pipelines  >  #128', 'w s0');
    s.right(0, 'CI', 'b s0');
    s.put(1, 1, 'main', 'b');
    s.put(1, 7, broken ? 'a41c9e7' : '7be20d3', 'd');
    s.put(1, 16, broken ? `Add ${SUITE}: the loan suite` : `${PROGRAM}: century years divisible by 400 are leap`, 'w');

    const stages: [string, Status][] = [
      ['build', 'pass'],
      ['test', broken ? 'fail' : 'pass'],
      ['coverage', broken ? 'skip' : 'pass'],
      ['sonar', broken ? 'skip' : 'pass'],
      ['matrix', broken ? 'skip' : 'warn'],
    ];
    let col = 1;
    stages.forEach(([name, status], i) => {
      const cls = status === 'pass' ? 'g rv' : status === 'fail' ? 'r rv' : status === 'warn' ? 'y rv' : 'd';
      col = s.put(3, col, status === 'skip' ? `( ${name} )` : `  ${name}  `, cls);
      if (i < stages.length - 1) col = s.put(3, col, '----', 'd');
    });

    s.put(5, JOBS, 'JOBS', 'b');
    JOB_LIST.forEach((job, i) => {
      const active = job === v.job;
      s.put(6 + i, JOBS, active ? '>' : ' ', 'y');
      s.put(6 + i, JOBS + 2, job, active ? 'w' : 'd');
    });
    s.put(15, JOBS, 'ARTIFACTS', 'b');
    ['junit.xml', 'coverage.xml', 'results.json', 'map.json'].forEach((a, i) => s.put(16 + i, JOBS + 2, a, 'd'));

    band(s, 5, LOG, LOG_WIDTH + 1, 's1');
    s.put(5, LOG + 1, v.job || 'pipeline', 'w s1');
    putLine(s, 6, LOG, cmd(v.command), LOG_WIDTH);
    v.log.slice(0, LOG_ROWS).forEach((line, i) => {
      if (i < beat) putLine(s, 7 + i, LOG, line, LOG_WIDTH);
    });
  },
};
