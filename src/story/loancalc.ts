// The story every panel tells: LOANCALC, a made-up loan subprogram with a
// leap-year defect, and TSTLOAN, the suite that catches it. Data and
// animation steps only, no rendering: the terminal panels and the 3D
// site read the same script.

export const PROGRAM = 'LOANCALC';
export const SUITE = 'TSTLOAN';
export const SUITE_TITLE = 'Loans: installment, interest and due date';
export const COMPILER = 'GnuCOBOL 3.2';
export const FIRST_LINE = 52;

export interface SourceLine {
  n: number;
  text: string;
  /** null: not executable. */
  hits: number | null;
  /** A condition of the line never took one of its values. */
  partial?: string;
  fixed?: boolean;
}

// hits|text. An empty hits column marks a line that is not a statement.
const LISTING = `
|PROCEDURE DIVISION USING LN-LOAN.
|0000-MAIN.
14|    PERFORM 1000-VALIDATE
14|    IF LN-OK
8|        PERFORM 2000-INSTALLMENT
8|        PERFORM 3000-FIRST-DUE
|    END-IF
14|    EXIT PROGRAM.
|1000-VALIDATE.
14|    MOVE "00" TO LN-RETURN-CODE
14|    EVALUATE TRUE
14|        WHEN LN-PRINCIPAL = ZERO
1|            MOVE "10" TO LN-RETURN-CODE
13|        WHEN LN-TERM-MONTHS < 1
|          OR LN-TERM-MONTHS > 360
2|            MOVE "20" TO LN-RETURN-CODE
11|        WHEN LN-ANNUAL-RATE > 2
0|            MOVE "30" TO LN-RETURN-CODE
11|        WHEN OTHER
11|            PERFORM 1100-CHECK-DATE
|    END-EVALUATE.
|1100-CHECK-DATE.
11|    MOVE LN-START-DATE TO WS-DATE-NUM
11|    PERFORM 1200-DAYS-IN-MONTH
11~|    IF WS-DAY < 1
|       OR WS-DAY > WS-DAYS-IN-MONTH
3|        MOVE "40" TO LN-RETURN-CODE
|    END-IF.
|1200-DAYS-IN-MONTH.
19|    MOVE WS-MDAYS(WS-MONTH)
|        TO WS-DAYS-IN-MONTH
19|    IF WS-MONTH = 2
10|        PERFORM 1300-LEAP-YEAR
10|        IF WS-LEAP-YEAR
1|            MOVE 29 TO WS-DAYS-IN-MONTH
|        END-IF
|    END-IF.
|1300-LEAP-YEAR.
10|    DIVIDE WS-YEAR BY 4 GIVING WS-Q
|        REMAINDER WS-REM-4
10|    DIVIDE WS-YEAR BY 100 GIVING WS-Q
|        REMAINDER WS-REM-100
10|    DIVIDE WS-YEAR BY 400 GIVING WS-Q
|        REMAINDER WS-REM-400
10|    IF WS-REM-4 = ZERO
|       AND WS-REM-100 NOT = ZERO
1|        MOVE "Y" TO WS-LEAP
|    ELSE
9|        MOVE "N" TO WS-LEAP
|    END-IF.
|2000-INSTALLMENT.
8|    COMPUTE WS-MONTHLY-RATE ROUNDED =
|        LN-ANNUAL-RATE / 12
8|    ADD 1 WS-MONTHLY-RATE GIVING WS-GROWTH
8|    IF WS-MONTHLY-RATE = ZERO
1|        COMPUTE LN-INSTALLMENT ROUNDED =
|            LN-PRINCIPAL / LN-TERM-MONTHS
|    ELSE
7|        MOVE 1 TO WS-FACTOR
7|        PERFORM LN-TERM-MONTHS TIMES
444|            MULTIPLY WS-GROWTH BY WS-FACTOR
|        END-PERFORM
7|        COMPUTE LN-INSTALLMENT ROUNDED =
|            LN-PRINCIPAL * WS-MONTHLY-RATE
|            * WS-FACTOR / (WS-FACTOR - 1)
|    END-IF
8|    COMPUTE LN-TOTAL-INTEREST =
|        LN-INSTALLMENT * LN-TERM-MONTHS
|        - LN-PRINCIPAL.
|3000-FIRST-DUE.
8|    MOVE LN-START-DATE TO WS-DATE-NUM
8|    ADD 1 TO WS-MONTH
8|    IF WS-MONTH > 12
1|        MOVE 1 TO WS-MONTH
1|        ADD 1 TO WS-YEAR
|    END-IF
8|    PERFORM 1200-DAYS-IN-MONTH
8|    IF WS-DAY > WS-DAYS-IN-MONTH
7|        MOVE WS-DAYS-IN-MONTH TO WS-DAY
|    END-IF
8|    MOVE WS-DATE-NUM TO LN-FIRST-DUE.
`;

const PARTIAL_NOTE = '1 of 2 conditions';

const BASE: SourceLine[] = LISTING.trim()
  .split('\n')
  .map((raw, i) => {
    const bar = raw.indexOf('|');
    const col = raw.slice(0, bar);
    const partial = col.endsWith('~');
    const hits = col === '' ? null : parseInt(col, 10);
    const line: SourceLine = { n: FIRST_LINE + i, text: raw.slice(bar + 1), hits };
    if (partial) line.partial = PARTIAL_NOTE;
    return line;
  });

/** The defect: the remainder by 400 is computed and never checked. */
export const DEFECT_LINE = lineOf('IF WS-REM-4 = ZERO');
export const FIX: Record<number, string> = {
  [DEFECT_LINE]: '    IF WS-REM-400 = ZERO OR (WS-REM-4 = ZERO',
  [DEFECT_LINE + 1]: '       AND WS-REM-100 NOT = ZERO)',
};

export function lineOf(fragment: string): number {
  const found = BASE.find((l) => l.text.includes(fragment));
  if (!found) throw new Error(`no line with: ${fragment}`);
  return found.n;
}

export function source(fixed: boolean): SourceLine[] {
  if (!fixed) return BASE;
  return BASE.map((l) => (FIX[l.n] ? { ...l, text: FIX[l.n], fixed: true } : l));
}

export interface TestCase {
  n: number;
  name: string;
  ms: number;
  /** Outcome before the fix. After it, every case passes. */
  pass: boolean;
}

export const CASES: TestCase[] = [
  { n: 1, name: 'installment for 100,000 at 36% over 12 months', ms: 4, pass: true },
  { n: 2, name: 'zero rate: installment is principal over term', ms: 2, pass: true },
  { n: 3, name: 'longer term, more interest', ms: 5, pass: true },
  { n: 4, name: 'zero principal returns 10 and calculates nothing', ms: 2, pass: true },
  { n: 5, name: 'term out of range returns 20', ms: 6, pass: true },
  { n: 6, name: 'first due date: January 31 to February 28', ms: 3, pass: true },
  { n: 7, name: 'first due date rolls from December to January', ms: 3, pass: true },
  { n: 8, name: 'first due date in a leap year', ms: 3, pass: true },
  { n: 9, name: 'invalid start date returns 40', ms: 2, pass: true },
  { n: 10, name: '1900 is not a leap year: February 29 is invalid', ms: 3, pass: true },
  { n: 11, name: '2000 is a leap year: February 29 is valid', ms: 3, pass: false },
];

export const FAILURE = {
  caseN: 11,
  suiteLine: 71,
  snippet: [
    "TESTCASE '2000 is a leap year: February 29 is valid'",
    '    MOVE 20000229 TO WS-START-DATE',
    '    CALL "LOANCALC" USING WS-LOAN',
    "    EXPECT WS-RETURN-CODE TO BE '00'",
  ],
  field: 'WS-RETURN-CODE',
  expected: "'00'",
  obtained: "'40'",
  meaning: 'LN-BAD-DATE',
};

export const RUN_COMMAND = 'cobalto test tests/TSTLOAN.cblt --coverage';

export interface Metric {
  name: string;
  covered: number;
  total: number;
}

export function coverage(fixed: boolean): Metric[] {
  const exec = source(fixed).filter((l) => l.hits !== null);
  return [
    { name: 'Statements', covered: exec.filter((l) => (l.hits ?? 0) > 0).length, total: exec.length },
    { name: 'Branches', covered: 25, total: 26 },
    { name: 'Conditions', covered: 13, total: 14 },
  ];
}

// --- Debug -----------------------------------------------------------

export interface Field {
  name: string;
  value: string;
}

/** The fields the debugger watches, as the failing case enters 1100-CHECK-DATE. */
export const WATCH: Field[] = [
  { name: 'LN-START-DATE', value: '20000229' },
  { name: 'WS-YEAR', value: '0000' },
  { name: 'WS-MONTH', value: '00' },
  { name: 'WS-DAY', value: '00' },
  { name: 'WS-DAYS-IN-MONTH', value: '00' },
  { name: 'WS-REM-4', value: '0000' },
  { name: 'WS-REM-100', value: '0000' },
  { name: 'WS-REM-400', value: '0000' },
  { name: 'WS-LEAP', value: '" "' },
  { name: 'LN-RETURN-CODE', value: '"00"' },
];

export interface DebugStep {
  /** The statement about to run. */
  line: number;
  stack: string[];
  /** What running it changes. */
  set?: Record<string, string>;
  /** What the visitor should notice once it has run. */
  note: string;
  /** The value that gives the defect away. */
  alarm?: string;
}

const S_CHECK = ['0000-MAIN', '1000-VALIDATE', '1100-CHECK-DATE'];
const S_DAYS = [...S_CHECK, '1200-DAYS-IN-MONTH'];
const S_LEAP = [...S_DAYS, '1300-LEAP-YEAR'];

export const DEBUG_INTRO =
  'Stopped at the breakpoint in 1100-CHECK-DATE. The case sent February 29, 2000 and got return code 40. Step to see why.';

export const DEBUG_TRACE: DebugStep[] = [
  {
    line: lineOf('MOVE LN-START-DATE TO WS-DATE-NUM'),
    stack: S_CHECK,
    set: { 'WS-YEAR': '2000', 'WS-MONTH': '02', 'WS-DAY': '29' },
    note: 'The start date is split into year, month and day.',
  },
  {
    line: lineOf('PERFORM 1200-DAYS-IN-MONTH'),
    stack: S_CHECK,
    note: 'Into 1200-DAYS-IN-MONTH: how many days does February 2000 have?',
  },
  {
    line: lineOf('MOVE WS-MDAYS(WS-MONTH)'),
    stack: S_DAYS,
    set: { 'WS-DAYS-IN-MONTH': '28' },
    note: 'The table says 28. A leap year should raise it to 29.',
  },
  {
    line: lineOf('IF WS-MONTH = 2'),
    stack: S_DAYS,
    note: 'It is February, so the program checks the year.',
  },
  {
    line: lineOf('PERFORM 1300-LEAP-YEAR'),
    stack: S_DAYS,
    note: 'Into 1300-LEAP-YEAR.',
  },
  {
    line: lineOf('DIVIDE WS-YEAR BY 4 '),
    stack: S_LEAP,
    set: { 'WS-REM-4': '0000' },
    note: '2000 / 4 leaves no remainder.',
  },
  {
    line: lineOf('DIVIDE WS-YEAR BY 100'),
    stack: S_LEAP,
    set: { 'WS-REM-100': '0000' },
    note: '2000 / 100 leaves no remainder either: a century year.',
  },
  {
    line: lineOf('DIVIDE WS-YEAR BY 400'),
    stack: S_LEAP,
    set: { 'WS-REM-400': '0000' },
    note: '2000 / 400 leaves no remainder: century years divisible by 400 are leap years.',
  },
  {
    line: DEFECT_LINE,
    stack: S_LEAP,
    note: 'The condition is false because WS-REM-100 is zero. WS-REM-400 was computed, and nobody asks about it.',
  },
  {
    line: lineOf('MOVE "N" TO WS-LEAP'),
    stack: S_LEAP,
    set: { 'WS-LEAP': '"N"' },
    alarm: 'WS-LEAP',
    note: 'There it is: the year 2000 comes out as not leap. The rule of 400 is missing from the IF.',
  },
  {
    line: lineOf('IF WS-LEAP-YEAR'),
    stack: S_DAYS,
    note: 'Not a leap year, so February keeps 28 days.',
  },
  {
    line: lineOf('IF WS-DAY < 1'),
    stack: S_CHECK,
    note: 'Day 29 is greater than 28: the date looks invalid.',
  },
  {
    line: lineOf('MOVE "40" TO LN-RETURN-CODE'),
    stack: S_CHECK,
    set: { 'LN-RETURN-CODE': '"40"' },
    alarm: 'LN-RETURN-CODE',
    note: "Return code 40, where the case expects '00'. The defect is the IF in 1300-LEAP-YEAR.",
  },
];
