import type { Ctx, Panel } from '../app';
import { wrap } from '../term/screen';
import { DEFINE_NOTES, DEFINITIONS } from '../story/define';

const COLS = [1, 41];
const RESULT_ROW = 15;

let side = 0;
let choice = [0, 0];

function cycle(i: number, by: number): void {
  side = i;
  const n = DEFINITIONS[i].choices.length;
  choice[i] = (choice[i] + by + n) % n;
}

export const definePanel: Panel = {
  id: 'define',
  title: 'COBALTO - DEFINE',
  context: () => 'LOANCALC',

  fkeys: () => [
    { key: 'Enter', label: 'Generate' },
    { key: 'F6', label: 'Other test' },
    { key: 'F7', label: 'Prev value' },
    { key: 'F8', label: 'Next value' },
  ],

  enter() {
    side = 0;
    choice = [0, 0];
  },

  render(ctx: Ctx) {
    if (ctx.narrow) return renderNarrow(ctx);
    const s = ctx.s;
    const top = ctx.top;
    for (let r = top; r <= top + RESULT_ROW + 1; r++) s.put(r, 39, '|', 'd');

    DEFINITIONS.forEach((def, i) => {
      const col = COLS[i];
      const active = i === side;
      const expected = def.choices[choice[i]];
      const pass = expected === def.actual;
      s.put(top, col, ` ${def.title} `, active ? 'w rv' : 'w', `p:side:${i}`);
      s.put(top + 1, col + 1, def.about, 'b');

      def.lines.forEach((line, n) => {
        const row = top + 3 + n;
        const mark = line.indexOf('{}');
        const cls = line.startsWith('TESTCASE') ? 't' : line.includes('EXPECT') || mark >= 0 ? 'w' : 'g';
        if (mark < 0) {
          s.put(row, col + 1, line, cls);
          return;
        }
        const next = s.put(row, col + 1, line.slice(0, mark), cls);
        s.put(row, next, ` ${expected} `, active ? 'y rv' : 'y', `p:cycle:${i}`);
      });

      const row = top + RESULT_ROW;
      let c = s.put(row, col + 1, 'Program gives ', 'b');
      s.put(row, c, def.actual, 'g');
      c = s.put(row + 1, col + 1, pass ? ' PASS ' : ' FAIL ', pass ? 'g rv' : 'r rv');
      if (!pass) s.put(row + 1, c + 1, `expected ${expected}`, 'r');
    });

    DEFINE_NOTES.forEach((note, i) => s.put(top + 18 + i, 2, note, 'b'));
    s.put(top + 21, 2, 'Change what a case expects: F7 / F8, or click the yellow value.', 't');
  },

  key(key: string, ctx: Ctx) {
    if (key.startsWith('@cycle:')) cycle(Number(key.slice(7)), 1);
    else if (key.startsWith('@side:')) side = Number(key.slice(6));
    else if (key === 'F6' || key === 'ArrowLeft' || key === 'ArrowRight') side = 1 - side;
    else if (key === 'F8' || key === 'ArrowDown') cycle(side, 1);
    else if (key === 'F7' || key === 'ArrowUp') cycle(side, -1);
    else if (key === 'Enter') ctx.go('generate');
    else return false;
    return true;
  },
};

function renderNarrow(ctx: Ctx): void {
  const s = ctx.s;
  const top = ctx.top;
  const def = DEFINITIONS[side];
  const expected = def.choices[choice[side]];
  const pass = expected === def.actual;
  s.put(top, 1, ` ${def.title} `, 'w rv');
  s.right(top, `${side + 1} of ${DEFINITIONS.length}`, 'b');
  s.put(top + 1, 1, def.about, 'b');

  def.lines.forEach((line, n) => {
    const row = top + 3 + n;
    const mark = line.indexOf('{}');
    const cls = line.startsWith('TESTCASE') ? 't' : line.includes('EXPECT') || mark >= 0 ? 'w' : 'g';
    if (mark < 0) {
      s.put(row, 1, line, cls);
      return;
    }
    const next = s.put(row, 1, line.slice(0, mark), cls);
    s.put(row, next, ` ${expected} `, 'y rv', `p:cycle:${side}`);
  });

  let row = top + 4 + def.lines.length;
  const c = s.put(row, 1, 'Program gives ', 'b');
  s.put(row, c, def.actual, 'g');
  const after = s.put(row + 1, 1, pass ? ' PASS ' : ' FAIL ', pass ? 'g rv' : 'r rv');
  if (!pass) s.put(row + 1, after + 1, `expected ${expected}`, 'r');
  row += 3;
  for (const line of wrap(DEFINE_NOTES[side], s.cols - 2)) s.put(row++, 1, line, 'b');
  row++;
  for (const line of wrap('Tap the yellow value to change what the case expects.', s.cols - 2)) s.put(row++, 1, line, 't');
}
