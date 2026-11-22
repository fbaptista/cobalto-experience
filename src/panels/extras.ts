import type { Ctx, Panel } from '../app';

export const REPO_URL = 'https://github.com/abstracta/cobalto';

export const install: Panel = {
  id: 'install',
  title: 'COBALTO - INSTALL',
  render(ctx: Ctx) {
    const s = ctx.s;
    const top = ctx.top;
    s.put(top + 1, 3, 'QUICK START', 'w');
    s.put(top + 2, 3, 'Python 3.9 or later and a COBOL compiler. GnuCOBOL 3.x works out of the box.', 'b');
    const steps: [string, string][] = [
      ['python3 -m pip install cobalto', 'install the CLI'],
      ['cobalto init /path/to/my/project', 'set up a project and a first suite'],
      ['cobalto test --coverage', 'run the suites, with coverage'],
      ['cobalto suggest --program LOANCALC', 'ask AI for a draft suite, to review'],
    ];
    steps.forEach(([cmd, what], i) => {
      s.put(top + 4 + i * 2, 3, '>', 'b');
      s.put(top + 4 + i * 2, 5, cmd, 'w');
      s.put(top + 4 + i * 2, 40, what, 'g');
    });
    s.put(top + 13, 3, 'REPOSITORY', 'w');
    s.put(top + 14, 3, REPO_URL, 'y', 'open:repo');
    s.put(top + 15, 3, 'Open source. Documentation, examples and the VS Code extension live there.', 'b');
    s.put(top + 18, 3, 'Some of what this session shows is where Cobalto is heading,', 'd');
    s.put(top + 19, 3, 'not what ships today. The repository says what is verified.', 'd');
  },
  key(key: string) {
    if (key === 'Enter') {
      window.open(REPO_URL, '_blank', 'noopener');
      return true;
    }
    return false;
  },
  fkeys: () => [{ key: 'Enter', label: 'Open the repository' }],
};

export const help: Panel = {
  id: 'help',
  title: 'COBALTO - HELP',
  render(ctx: Ctx) {
    const s = ctx.s;
    const top = ctx.top;
    s.put(top + 1, 3, 'HOW TO MOVE AROUND', 'w');
    const keys: [string, string][] = [
      ['1 - 7, ENTER', 'Type an option on the command line, from any panel'],
      ['ENTER', 'The next step of the panel you are in'],
      ['F3 or ESC', 'Back to the menu'],
      ['F7 / F8', 'Scroll up and down'],
      ['F9', 'Key sound on and off'],
      ['F12', 'Quick start and repository'],
      ['Mouse', 'Yellow fields and function keys can be clicked'],
    ];
    keys.forEach(([k, what], i) => {
      s.put(top + 3 + i, 3, k, 'y');
      s.put(top + 3 + i, 19, what, 'g');
    });
    s.put(top + 12, 3, 'THE STORY', 'w');
    s.put(top + 13, 3, 'LOANCALC computes loan installments and has a defect. Go from 1 to 7, or run', 'b');
    s.put(top + 14, 3, 'the suite (4), read the failure and the coverage (5), then step through', 'b');
    s.put(top + 15, 3, 'the COBOL until the defect shows, fix it and run again (6).', 'b');
  },
};
