// UNDERSTAND: a made-up code base of seven programs, who calls whom,
// and the files and copybooks they share. Positions are in map cells;
// the panel only draws.

export interface Paragraph {
  name: string;
  /** How many places perform it. The first paragraph is the entry. */
  performed: number;
}

export interface Program {
  name: string;
  kind: string;
  about: string;
  /** Position of the node on the map: row and column of its left edge. */
  at: [number, number];
  copybooks: string[];
  files: string[];
  paragraphs: Paragraph[];
  note?: string;
}

function paras(...list: [string, number][]): Paragraph[] {
  return list.map(([name, performed]) => ({ name, performed }));
}

export const PROGRAMS: Program[] = [
  {
    name: 'DAYCLOSE',
    kind: 'batch entry',
    about: 'End-of-day batch: runs the loan batch and the invoicing.',
    at: [4, 1],
    copybooks: [],
    files: [],
    paragraphs: paras(['0000-MAIN', 0], ['1000-OPEN', 1], ['2000-RUN-JOBS', 1], ['9000-CLOSE', 1]),
  },
  {
    name: 'LOANBTCH',
    kind: 'subprogram',
    about: 'Reads the loan file and prices each loan.',
    at: [2, 17],
    copybooks: ['LOANREC'],
    files: ['LOAN-FILE'],
    paragraphs: paras(['0000-MAIN', 0], ['1000-READ-LOAN', 2], ['2000-PRICE', 1], ['2900-WRITE-ERROR', 0], ['9000-END', 1]),
  },
  {
    name: 'INVOICE',
    kind: 'subprogram',
    about: 'Reads customers, calls DISCOUNT, writes the report.',
    at: [6, 17],
    copybooks: ['CUSTREC'],
    files: ['CUST-FILE', 'REPORT-FILE'],
    paragraphs: paras(['0000-MAIN', 0], ['1000-INIT', 1], ['2000-PROCESS', 1], ['2100-CALC', 2], ['3000-END', 1]),
  },
  {
    name: 'LOANCALC',
    kind: 'subprogram',
    about: 'Installment, total interest and first due date of a loan.',
    at: [2, 34],
    copybooks: ['LOANREC'],
    files: [],
    paragraphs: paras(
      ['0000-MAIN', 0],
      ['1000-VALIDATE', 1],
      ['1100-CHECK-DATE', 1],
      ['1200-DAYS-IN-MONTH', 2],
      ['1300-LEAP-YEAR', 1],
      ['2000-INSTALLMENT', 1],
      ['3000-FIRST-DUE', 1],
    ),
  },
  {
    name: 'DISCOUNT',
    kind: 'subprogram',
    about: 'Discount tier and net amount for an amount.',
    at: [6, 34],
    copybooks: ['RATETAB'],
    files: [],
    paragraphs: paras(['0000-MAIN', 0], ['1000-TIER', 1], ['2000-APPLY', 1]),
  },
  {
    name: 'PREMIUM',
    kind: 'online entry',
    about: 'Quotes a premium loan: discount tier plus installment.',
    at: [9, 1],
    copybooks: ['CUSTREC', 'RATETAB'],
    files: [],
    paragraphs: paras(['0000-MAIN', 0], ['1000-QUOTE', 1], ['2000-FORMAT', 3], ['8000-OLD-FORMAT', 0]),
  },
  {
    name: 'LEGACY',
    kind: 'no caller',
    about: 'A rate conversion that nothing in the code base calls.',
    at: [12, 1],
    copybooks: ['RATETAB'],
    files: [],
    paragraphs: paras(['MAIN', 0], ['CONVERT', 1], ['PRINT-TABLE', 0]),
    note: 'nobody calls it',
  },
];

export interface Call {
  from: string;
  to: string;
  /** Corners of the line on the map, as [row, col], ending at the arrow head. */
  path: [number, number][];
}

export const CALLS: Call[] = [
  { from: 'DAYCLOSE', to: 'LOANBTCH', path: [[4, 11], [4, 13], [2, 13], [2, 16]] },
  { from: 'DAYCLOSE', to: 'INVOICE', path: [[4, 11], [4, 13], [6, 13], [6, 16]] },
  { from: 'LOANBTCH', to: 'LOANCALC', path: [[2, 27], [2, 33]] },
  { from: 'INVOICE', to: 'DISCOUNT', path: [[6, 27], [6, 33]] },
  { from: 'PREMIUM', to: 'DISCOUNT', path: [[9, 11], [9, 46], [6, 46], [6, 44]] },
  { from: 'PREMIUM', to: 'LOANCALC', path: [[9, 11], [9, 46], [2, 46], [2, 44]] },
];

export const COPYBOOKS = ['LOANREC', 'CUSTREC', 'RATETAB'];
export const FILES = ['LOAN-FILE', 'CUST-FILE', 'REPORT-FILE'];
export const MAP_COMMAND = 'cobalto map src/';
export const FIRST_PROGRAM = 'LOANCALC';

export function callers(name: string): string[] {
  return CALLS.filter((c) => c.to === name).map((c) => c.from);
}

export function callees(name: string): string[] {
  return CALLS.filter((c) => c.from === name).map((c) => c.to);
}
