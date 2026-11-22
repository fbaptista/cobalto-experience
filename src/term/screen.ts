// Character grid rendered as DOM: one div per row, one span per field.
// Panels draw in immediate mode (clear, put, flush); flush only touches
// the rows whose content changed.

// Field classes: b blue (labels), g green (values), w white (titles),
// y yellow (actions), r red, t turquoise, p pink, d dim.
// Modifiers, space separated: rv (reverse), u (underlined input field).

export class Screen {
  readonly cols: number;
  readonly rows: number;
  private ch: string[][] = [];
  private cls: string[][] = [];
  private act: (string | null)[][] = [];
  private keys: string[] = [];
  private rowEls: HTMLElement[] = [];

  constructor(root: HTMLElement, cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    root.textContent = '';
    for (let r = 0; r < rows; r++) {
      const el = document.createElement('div');
      el.className = 'row';
      root.appendChild(el);
      this.rowEls.push(el);
      this.keys.push('\u0000');
    }
    this.clear();
  }

  clear(): void {
    for (let r = 0; r < this.rows; r++) {
      this.ch[r] = new Array(this.cols).fill(' ');
      this.cls[r] = new Array(this.cols).fill('');
      this.act[r] = new Array(this.cols).fill(null);
    }
  }

  /** Writes text at (row, col), clipped to the grid. Returns the next column. */
  put(row: number, col: number, text: string, cls = 'g', act: string | null = null): number {
    if (row < 0 || row >= this.rows) return col + text.length;
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i++) {
      const c = col + i;
      if (c < 0 || c >= this.cols) continue;
      this.ch[row][c] = chars[i];
      this.cls[row][c] = cls;
      this.act[row][c] = act;
    }
    return col + chars.length;
  }

  right(row: number, text: string, cls = 'g', act: string | null = null, margin = 1): void {
    this.put(row, this.cols - margin - Array.from(text).length, text, cls, act);
  }

  center(row: number, text: string, cls = 'g', act: string | null = null): void {
    this.put(row, Math.floor((this.cols - Array.from(text).length) / 2), text, cls, act);
  }

  fill(row: number, col: number, n: number, ch: string, cls = 'b'): void {
    this.put(row, col, ch.repeat(Math.max(0, n)), cls);
  }

  cursor(row: number, col: number): void {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    this.cls[row][col] = 'cur';
  }

  flush(): void {
    for (let r = 0; r < this.rows; r++) {
      const runs: { text: string; cls: string; act: string | null }[] = [];
      for (let c = 0; c < this.cols; c++) {
        const cls = this.cls[r][c];
        const act = this.act[r][c];
        const last = runs[runs.length - 1];
        if (last && last.cls === cls && last.act === act) last.text += this.ch[r][c];
        else runs.push({ text: this.ch[r][c], cls, act });
      }
      const key = runs.map((x) => `${x.cls}\u0001${x.act ?? ''}\u0001${x.text}`).join('\u0002');
      if (key === this.keys[r]) continue;
      this.keys[r] = key;
      const el = this.rowEls[r];
      el.textContent = '';
      for (const run of runs) {
        if (!run.cls && !run.act) {
          el.appendChild(document.createTextNode(run.text));
          continue;
        }
        const span = document.createElement('span');
        span.className = run.act ? `${run.cls} hot` : run.cls;
        if (run.act) {
          span.dataset.act = run.act;
          span.setAttribute('role', 'button');
        }
        span.textContent = run.text;
        el.appendChild(span);
      }
    }
  }
}

/** Splits text into lines of at most `width` characters, on spaces. */
export function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && line.length + 1 + word.length > width) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  return out;
}

/** Halves the indentation of a line of code, for the 40-column grid. */
export function narrowCode(text: string): string {
  const indent = text.length - text.trimStart().length;
  return ' '.repeat(Math.floor(indent / 2)) + text.trimStart();
}

/** Wraps a line of code, keeping its indentation and indenting what continues. */
export function wrapCode(text: string, width: number): string[] {
  if (text.length <= width) return [text];
  const indent = text.length - text.trimStart().length;
  return wrap(text.trim(), width - indent - 2).map((part, i) => ' '.repeat(indent + (i ? 2 : 0)) + part);
}
