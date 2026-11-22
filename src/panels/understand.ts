import type { Ctx, Panel } from '../app';
import { wrap } from '../term/screen';
import {
  CALLS,
  COPYBOOKS,
  FILES,
  FIRST_PROGRAM,
  MAP_COMMAND,
  PROGRAMS,
  callees,
  callers,
  type Call,
} from '../story/codebase';

const DETAIL = 51;
const DETAIL_WIDTH = 28;

let sel = PROGRAMS.findIndex((p) => p.name === FIRST_PROGRAM);
let typed = '';
let shown = 0; // nodes already on the map
let wired = false; // calls drawn

interface Cell {
  ch: string;
  lit: boolean;
}

/** The cells of every call line, merged: where two lines meet there is a '+'. */
function wires(selected: string): Map<string, Cell> {
  const out = new Map<string, Cell>();
  const set = (r: number, c: number, ch: string, lit: boolean): void => {
    const key = `${r},${c}`;
    const old = out.get(key);
    if (!old) out.set(key, { ch, lit });
    else out.set(key, { ch: old.ch === ch ? ch : '+', lit: old.lit || lit });
  };
  const draw = (call: Call): void => {
    const lit = call.from === selected || call.to === selected;
    const p = call.path;
    for (let i = 0; i < p.length - 1; i++) {
      const [r0, c0] = p[i];
      const [r1, c1] = p[i + 1];
      if (r0 === r1) for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) set(r0, c, '-', lit);
      else for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) set(r, c0, '|', lit);
    }
    for (const [r, c] of p.slice(1, -1)) out.set(`${r},${c}`, { ch: '+', lit: out.get(`${r},${c}`)!.lit });
    const [r, c] = p[p.length - 1];
    const fromLeft = p[p.length - 2][1] < c;
    out.set(`${r},${c}`, { ch: fromLeft ? '>' : '<', lit: out.get(`${r},${c}`)!.lit });
  };
  CALLS.forEach(draw);
  return out;
}

function select(ctx: Ctx, i: number): void {
  sel = (i + PROGRAMS.length) % PROGRAMS.length;
  const p = PROGRAMS[sel];
  const by = callers(p.name).length;
  const dead = p.paragraphs.filter((x, n) => n > 0 && x.performed === 0).length;
  const who = by === 0 ? (p.note ? 'nobody calls it' : 'an entry point') : by === 1 ? 'one caller' : `${by} callers`;
  const extra = dead ? `, and ${dead === 1 ? 'a paragraph' : `${dead} paragraphs`} nobody performs` : '';
  ctx.msg(`${p.name}: ${who}, ${p.paragraphs.length} paragraphs${extra}.`, dead || p.note ? 'y' : 't');
}

export const understandPanel: Panel = {
  id: 'understand',
  title: 'COBALTO - UNDERSTAND',
  context: () => 'the code base',

  fkeys: () => [
    { key: 'Enter', label: 'Define tests' },
    { key: 'F7', label: 'Prev' },
    { key: 'F8', label: 'Next' },
  ],

  enter(ctx: Ctx) {
    sel = PROGRAMS.findIndex((p) => p.name === FIRST_PROGRAM);
    typed = '';
    shown = 0;
    wired = false;
    void (async () => {
      const { run } = ctx;
      await run.sleep(300);
      await run.type(MAP_COMMAND, (p) => {
        typed = p;
        ctx.sound.tick();
        ctx.redraw();
      });
      await run.sleep(350);
      for (let i = 1; i <= PROGRAMS.length; i++) {
        shown = i;
        ctx.sound.tick();
        ctx.redraw();
        await run.sleep(140);
      }
      await run.sleep(250);
      wired = true;
      select(ctx, sel);
    })();
  },

  render(ctx: Ctx) {
    const s = ctx.s;
    const top = ctx.top;
    const base = top + 2;
    const current = PROGRAMS[sel];
    s.put(top, 1, '> ', 'b');
    s.put(top, 3, typed, 'w');
    if (!shown) {
      s.cursor(top, 3 + typed.length);
      return;
    }

    s.put(base, 1, 'ENTRY POINTS', 'b');
    s.put(base, 17, 'PROGRAMS', 'b');
    s.put(base, 34, 'CALLED BY MANY', 'b');

    if (wired) {
      for (const [key, cell] of wires(current.name)) {
        const [r, c] = key.split(',').map(Number);
        s.put(base + r, c, cell.ch, cell.lit ? 'y' : 'd');
      }
    }

    const related = new Set([...callers(current.name), ...callees(current.name)]);
    PROGRAMS.slice(0, shown).forEach((p, i) => {
      const [r, c] = p.at;
      const cls = !wired ? 'g' : i === sel ? 'w rv' : related.has(p.name) ? 'y' : 'g';
      s.put(base + r, c, `[${p.name.padEnd(8)}]`, cls, `p:sel:${i}`);
      if (p.note && wired) s.put(base + r, c + 12, p.note, 'r');
    });
    if (!wired) return;

    const lists: [string, string[], string[]][] = [
      ['COPYBOOKS', COPYBOOKS, current.copybooks],
      ['FILES', FILES, current.files],
    ];
    lists.forEach(([label, all, used], i) => {
      let col = s.put(base + 14 + i, 1, label.padEnd(11), 'b');
      for (const name of all) col = s.put(base + 14 + i, col, name, used.includes(name) ? 'y' : 'd') + 2;
    });
    const paragraphs = PROGRAMS.reduce((n, p) => n + p.paragraphs.length, 0);
    s.put(
      base + 17,
      1,
      `${PROGRAMS.length} programs  ${paragraphs} paragraphs  ${CALLS.length} calls`,
      'g',
    );

    // --- The selected program.
    let row = base;
    s.put(row, DETAIL, current.name, 'w');
    s.right(row, current.kind, current.note ? 'r' : 'b');
    row++;
    for (const line of wrap(current.about, DETAIL_WIDTH)) s.put(row++, DETAIL, line, 'g');
    row++;
    const facts: [string, string[]][] = [
      ['Called by', callers(current.name)],
      ['Calls', callees(current.name)],
      ['Copybooks', current.copybooks],
      ['Files', current.files],
    ];
    for (const [label, values] of facts) {
      s.put(row, DETAIL, label, 'b');
      if (!values.length) s.put(row++, DETAIL + 10, label === 'Called by' ? 'nobody' : '-', label === 'Called by' && current.note ? 'r' : 'd');
      for (const line of wrap(values.join(' '), DETAIL_WIDTH - 10)) s.put(row++, DETAIL + 10, line, 'g');
    }
    row++;
    s.put(row, DETAIL, 'PARAGRAPHS', 'w');
    s.right(row, 'performed', 'b');
    row++;
    const most = Math.max(...current.paragraphs.map((p) => p.performed));
    current.paragraphs.forEach((p, i) => {
      const entry = i === 0;
      const dead = !entry && p.performed === 0;
      const hot = most > 1 && p.performed === most;
      s.put(row, DETAIL, p.name, dead ? 'r' : hot ? 'y' : 'g');
      s.right(row, entry ? 'entry' : dead ? 'nobody' : hot ? `${p.performed} most` : String(p.performed), entry ? 't' : dead ? 'r' : hot ? 'y' : 'g');
      row++;
    });
  },

  key(key: string, ctx: Ctx) {
    if (!wired) return key === 'Enter' || key.startsWith('@');
    if (key.startsWith('@sel:')) select(ctx, Number(key.slice(5)));
    else if (key === 'F8' || key === 'ArrowDown' || key === 'ArrowRight') select(ctx, sel + 1);
    else if (key === 'F7' || key === 'ArrowUp' || key === 'ArrowLeft') select(ctx, sel - 1);
    else if (key === 'Enter') ctx.go('define');
    else return false;
    return true;
  },
};
