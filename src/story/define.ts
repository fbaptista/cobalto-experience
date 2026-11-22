// DEFINE: the two kinds of test, side by side. Each has one expected
// value the visitor can change; `actual` is what the program gives.

export interface Definition {
  title: string;
  about: string;
  /** Suite lines; `{}` marks where the expected value goes. */
  lines: string[];
  field: string;
  actual: string;
  /** Values the visitor cycles through. The first is the right one. */
  choices: string[];
}

export const DEFINITIONS: Definition[] = [
  {
    title: 'INTERFACE TEST',
    about: 'Only what goes in and what comes out.',
    lines: [
      "TESTCASE 'installment, 12 months'",
      '    MOVE 100000 TO WS-PRINCIPAL',
      '    MOVE 0.36 TO WS-ANNUAL-RATE',
      '    MOVE 12 TO WS-TERM-MONTHS',
      '    CALL "LOANCALC" USING WS-LOAN',
      '    EXPECT WS-INSTALLMENT',
      '        TO BE NUMERIC {}',
    ],
    field: 'WS-INSTALLMENT',
    actual: '10046.21',
    choices: ['10046.21', '10046.20', '10000.00'],
  },
  {
    title: 'COMPONENT TEST',
    about: 'One paragraph, the rest mocked.',
    lines: [
      "TESTCASE 'February of a leap year'",
      '    MOCK PARAGRAPH 1300-LEAP-YEAR',
      '        MOVE "Y" TO WS-LEAP',
      '    END-MOCK',
      '    MOVE 2 TO WS-MONTH',
      '    PERFORM 1200-DAYS-IN-MONTH',
      '    EXPECT WS-DAYS-IN-MONTH',
      '        TO BE NUMERIC {}',
      '    VERIFY PARAGRAPH 1300-LEAP-YEAR',
      '        HAPPENED ONCE',
    ],
    field: 'WS-DAYS-IN-MONTH',
    actual: '29',
    choices: ['29', '28', '30'],
  },
];

export const DEFINE_NOTES = [
  'The interface test survives any rewrite of the program: it never looks inside.',
  'The component test reaches one paragraph and replaces what it depends on.',
];
