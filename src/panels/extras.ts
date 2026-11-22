import type { Ctx, Panel } from '../app';
import { wrap } from '../term/screen';

export const REPO_URL = 'https://github.com/abstracta/cobalto';

/** Where the clickable fields that leave the session go. */
export const LINKS: Record<string, string> = {
  repo: REPO_URL,
  marketplace: 'https://marketplace.visualstudio.com/items?itemName=abstracta.vscode-cobalto',
  openvsx: 'https://open-vsx.org/extension/abstracta/vscode-cobalto',
};

const STEPS: [string, string][] = [
  ['python3 -m pip install cobalto', 'install the CLI'],
  ['cobalto init /path/to/my/project', 'set up a project and a first suite'],
  ['cobalto suggest --program LOANCALC', 'ask AI for a draft suite, to review'],
  ['cobalto test --coverage', 'run the suites, with coverage'],
];

export const install: Panel = {
  id: 'install',
  title: 'COBALTO - INSTALL',
  render(ctx: Ctx) {
    if (ctx.narrow) return installNarrow(ctx);
    const s = ctx.s;
    const top = ctx.top;
    s.put(top + 1, 3, 'QUICK START', 'w');
    s.put(top + 2, 3, 'Python 3.9 or later and a COBOL compiler. GnuCOBOL 3.x works out of the box.', 'b');
    STEPS.forEach(([cmd, what], i) => {
      s.put(top + 4 + i * 2, 3, '>', 'b');
      s.put(top + 4 + i * 2, 5, cmd, 'w');
      s.put(top + 4 + i * 2, 42, what, 'g');
    });
    s.put(top + 13, 3, 'REPOSITORY', 'w');
    s.put(top + 14, 3, REPO_URL, 'y', 'open:repo');
    s.put(top + 15, 3, 'Open source. Documentation and examples live there.', 'b');
    s.put(top + 17, 3, 'EXTENSIONS', 'w');
    s.put(top + 18, 3, 'VS Code', 'b');
    s.put(top + 18, 12, 'Visual Studio Marketplace', 'y', 'open:marketplace');
    s.put(top + 18, 40, 'Open VSX', 'y', 'open:openvsx');
    s.put(top + 19, 12, 'abstracta.vscode-cobalto', 'g');
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
    if (ctx.narrow) return helpNarrow(ctx);
    const s = ctx.s;
    const top = ctx.top;
    s.put(top + 1, 3, 'HOW TO MOVE AROUND', 'w');
    const keys: [string, string][] = [
      ['1 - 7, ENTER', 'Type an option on the command line, from any panel'],
      ['ENTER', 'The next step of the panel you are in'],
      ['F3 or ESC', 'Back to the menu'],
      ['F7 / F8', 'Scroll up and down'],
      ['F2 or the tabs', 'The same step in VS Code, in CI and with an AI agent'],
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

function installNarrow(ctx: Ctx): void {
  const s = ctx.s;
  const width = s.cols - 2;
  let row = ctx.top + 1;
  s.put(row++, 1, 'QUICK START', 'w');
  for (const line of wrap('Python 3.9 or later and a COBOL compiler. GnuCOBOL 3.x works out of the box.', width)) s.put(row++, 1, line, 'b');
  row++;
  for (const [cmd, what] of STEPS) {
    s.put(row, 1, '>', 'b');
    s.put(row++, 3, cmd, 'w');
    s.put(row++, 3, what, 'g');
  }
  row++;
  s.put(row++, 1, 'REPOSITORY', 'w');
  s.put(row++, 1, REPO_URL.replace('https://', ''), 'y', 'open:repo');
  row++;
  s.put(row++, 1, 'EXTENSIONS', 'w');
  s.put(row++, 1, 'VS Code: abstracta.vscode-cobalto', 'g');
  s.put(row, 1, 'Visual Studio Marketplace', 'y', 'open:marketplace');
  s.put(row, 29, 'Open VSX', 'y', 'open:openvsx');
}

function helpNarrow(ctx: Ctx): void {
  const s = ctx.s;
  const width = s.cols - 2;
  let row = ctx.top + 1;
  s.put(row++, 1, 'HOW TO MOVE AROUND', 'w');
  row++;
  const keys: [string, string][] = [
    ['Tap', 'Menu options, yellow fields and the buttons under the screen'],
    ['Tabs', 'The same step as a terminal, in VS Code, in CI and with an AI agent'],
    ['Keyboard', 'A number and ENTER picks an option; F3 goes back; F2 changes the view'],
    ['Sound', 'The button next to the tabs turns the key sound on and off'],
  ];
  for (const [k, what] of keys) {
    s.put(row++, 1, k, 'y');
    for (const line of wrap(what, width - 2)) s.put(row++, 3, line, 'g');
  }
  row++;
  s.put(row++, 1, 'THE STORY', 'w');
  const story = 'LOANCALC computes loan installments and has a defect. Go from 1 to 7: the suite finds it, the debugger shows it, you fix it.';
  for (const line of wrap(story, width)) s.put(row++, 1, line, 'b');
}
