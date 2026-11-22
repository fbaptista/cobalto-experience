// GENERATE: `cobalto suggest` drafting a suite in rounds. Each round the
// model proposes cases, Cobalto compiles and runs them with coverage,
// and what failed or stayed uncovered goes back to the model.

export interface DraftCase {
  name: string;
  body: string[];
  /** A note the model leaves for the person who reviews the draft. */
  review?: string;
}

export interface Round {
  cases: DraftCase[];
  passed: number;
  failed: number;
  /** Statement coverage after the round, in percent. */
  coverage: number;
  /** What Cobalto gives back to the model. */
  feedback: string;
}

export interface Draft {
  program: string;
  about: string;
  rounds: Round[];
  closing: string;
}

export const DRAFTS: Draft[] = [
  {
    program: 'LOANCALC',
    about: 'Loan installment, interest and first due date',
    rounds: [
      {
        cases: [
          {
            name: 'installment for 100,000 at 36% over 12 months',
            body: ['CALL "LOANCALC" USING WS-LOAN', 'EXPECT WS-INSTALLMENT TO BE NUMERIC 10046.21'],
          },
          {
            name: 'zero principal returns 10',
            body: ['MOVE ZERO TO WS-PRINCIPAL', 'CALL "LOANCALC" USING WS-LOAN', "EXPECT WS-RETURN-CODE TO BE '10'"],
          },
          {
            name: 'first due date: January 31 to February 28',
            body: ['CALL "LOANCALC" USING WS-LOAN', 'EXPECT WS-FIRST-DUE TO BE NUMERIC 20260228'],
          },
        ],
        passed: 3,
        failed: 0,
        coverage: 58,
        feedback: 'not executed: zero rate, invalid dates, 1300-LEAP-YEAR',
      },
      {
        cases: [
          {
            name: 'zero rate: installment is principal over term',
            body: ['MOVE ZERO TO WS-ANNUAL-RATE', 'CALL "LOANCALC" USING WS-LOAN', 'EXPECT WS-INSTALLMENT TO BE NUMERIC 8333.33'],
          },
          {
            name: 'invalid start date returns 40',
            body: ['MOVE 20260230 TO WS-START-DATE', 'CALL "LOANCALC" USING WS-LOAN', "EXPECT WS-RETURN-CODE TO BE '40'"],
          },
          {
            name: 'first due date in a leap year',
            body: ['MOVE 20280131 TO WS-START-DATE', 'CALL "LOANCALC" USING WS-LOAN', 'EXPECT WS-FIRST-DUE TO BE NUMERIC 20280229'],
          },
        ],
        passed: 6,
        failed: 0,
        coverage: 84,
        feedback: 'not executed: century years in 1300-LEAP-YEAR',
      },
      {
        cases: [
          {
            name: '1900 is not a leap year',
            body: ['MOVE 19000229 TO WS-START-DATE', 'CALL "LOANCALC" USING WS-LOAN', "EXPECT WS-RETURN-CODE TO BE '40'"],
          },
          {
            name: '2000 is a leap year',
            review: 'the program returns 40 here. Defect or rule?',
            body: ['MOVE 20000229 TO WS-START-DATE', 'CALL "LOANCALC" USING WS-LOAN', "EXPECT WS-RETURN-CODE TO BE '00'"],
          },
        ],
        passed: 7,
        failed: 1,
        coverage: 97,
        feedback: 'one case fails and stays in the draft, marked for review',
      },
    ],
    closing: 'One case fails: a question for a person, not a verdict. ENTER runs the suite.',
  },
  {
    program: 'INVOICE',
    about: 'Reads customers, calls DISCOUNT, writes a report',
    rounds: [
      {
        cases: [
          {
            name: 'premium customer gets the premium total',
            body: ['MOVE 2000 TO WS-C-AMOUNT', 'PERFORM 2100-CALC', 'EXPECT WS-TOTAL TO BE NUMERIC 1600'],
          },
          {
            name: 'calculation with DISCOUNT mocked',
            body: ["MOCK CALL 'DISCOUNT'", '    MOVE 999 TO WS-NET', 'END-MOCK', 'PERFORM 2100-CALC', 'EXPECT WS-NET TO BE NUMERIC 999'],
          },
        ],
        passed: 2,
        failed: 0,
        coverage: 64,
        feedback: 'not executed: 2000-PROCESS, the read loop, 3000-END',
      },
      {
        cases: [
          {
            name: 'full process with mocked files',
            review: 'two customers made up for the read mock.',
            body: [
              'MOCK FILE CUST-FILE',
              '    ON READ PERFORM T-NEXT-CUSTOMER',
              'END-MOCK',
              'PERFORM 2000-PROCESS',
              'EXPECT WS-LINE-COUNT TO BE NUMERIC 2',
              'VERIFY READ CUST-FILE HAPPENED 3 TIMES',
            ],
          },
        ],
        passed: 3,
        failed: 0,
        coverage: 91,
        feedback: 'not executed: the file status error branch',
      },
    ],
    closing: 'All passing. They say what INVOICE does today, not what it should do.',
  },
  {
    program: 'DISCOUNT',
    about: 'Discount tiers by amount',
    rounds: [
      {
        cases: [
          {
            name: 'exact limit 1000 is premium',
            body: ['MOVE 1000 TO T-AMOUNT', 'CALL "DISCOUNT" USING T-AMOUNT T-RESULT T-CATEGORY', "EXPECT T-CATEGORY TO BE 'PREMIUM'"],
          },
          {
            name: 'basic gets no discount',
            body: ['MOVE 100 TO T-AMOUNT', 'CALL "DISCOUNT" USING T-AMOUNT T-RESULT T-CATEGORY', 'EXPECT T-RESULT TO BE NUMERIC 100'],
          },
        ],
        passed: 2,
        failed: 0,
        coverage: 71,
        feedback: 'not executed: the STANDARD tier',
      },
      {
        cases: [
          {
            name: 'just below 1000 is standard',
            review: '899.991 truncates to 899.99 without ROUNDED.',
            body: ['MOVE 999.99 TO T-AMOUNT', 'CALL "DISCOUNT" USING T-AMOUNT T-RESULT T-CATEGORY', 'EXPECT T-RESULT TO BE NUMERIC 899.99'],
          },
        ],
        passed: 3,
        failed: 0,
        coverage: 100,
        feedback: 'every statement executed',
      },
    ],
    closing: 'Three cases, all passing, and a truncation the reviewer should confirm.',
  },
];

export const DRAFT_WARNING = 'draft: review before you trust it';
