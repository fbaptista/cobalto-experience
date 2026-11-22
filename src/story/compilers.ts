// COMPILERS: the same suite on four compilers. On one of them two cases
// fail, and neither failure is a defect: the arithmetic rules differ.

export interface DialectFailure {
  caseN: number;
  expect: string;
  obtained: string;
  why: string;
}

export interface Compiler {
  short: string;
  name: string;
  platform: string;
  profile: string;
  failures: DialectFailure[];
}

export const COMPILERS: Compiler[] = [
  { short: 'GNU', name: 'GnuCOBOL 3.2', platform: 'Linux, macOS', profile: 'gnucobol', failures: [] },
  {
    short: 'IBM',
    name: 'IBM Enterprise COBOL 6.4',
    platform: 'z/OS',
    profile: 'ibm-enterprise',
    failures: [
      {
        caseN: 1,
        expect: 'EXPECT WS-INSTALLMENT TO BE NUMERIC 10046.21',
        obtained: '10046.18',
        why: 'rounding: the intermediate result keeps the decimals of the result field',
      },
      {
        caseN: 3,
        expect: 'EXPECT WS-TOTAL-INTEREST TO BE NUMERIC 41713.76',
        obtained: '41713.52',
        why: 'truncation: one cent less per installment, over 24 installments',
      },
    ],
  },
  { short: 'MF', name: 'Micro Focus Visual COBOL 9', platform: 'Windows, Linux', profile: 'microfocus', failures: [] },
  { short: 'VSI', name: 'VSI COBOL V3.1', platform: 'OpenVMS', profile: 'vms-vsi-cobol', failures: [] },
];

export const DIALECT_NOTE =
  'Not a defect of the program or of the compiler: the arithmetic rules differ, and the suite shows where.';
export const DEFECT_NOTE =
  'Case 11 fails everywhere: that is the defect in LOANCALC, not a dialect. Option 6 finds it.';
