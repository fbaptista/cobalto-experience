// The session shell: owns the screen, the command line, the function
// keys and the status line, and hands the middle of the screen to the
// current panel.

import { Screen, wrap } from './term/screen';
import { Sound } from './term/sound';
import { Runner } from './term/motion';
import { FACES, type FaceId } from './faces';
import { STEPS, STEP_NAMES } from './faces/common';

/** The desktop grid, and the one for phones. */
export const WIDE = { cols: 80, rows: 30 };
export const NARROW = { cols: 40, rows: 36 };

export interface FKey {
  key: string;
  label: string;
}

/** What the session remembers across panels. */
export interface Story {
  /** The visitor applied the fix in DEBUG. */
  fixed: boolean;
  /** Outcome of the last run of the suite, if any. */
  lastRun: { passed: number; failed: number } | null;
  /** RUN should start a new run as soon as it opens. */
  rerun: boolean;
}

export interface Ctx {
  readonly s: Screen;
  /** First and last rows a panel may draw on. */
  readonly top: number;
  readonly bottom: number;
  /** The 40-column grid of a phone. */
  readonly narrow: boolean;
  story: Story;
  readonly run: Runner;
  sound: Sound;
  go(id: string): void;
  back(): void;
  redraw(): void;
  /** Long message, on the line above the function keys. */
  msg(text: string, cls?: string): void;
}

export interface Panel {
  id: string;
  title: string;
  /** Draws the whole screen itself: no command line, no function keys. */
  bare?: boolean;
  prompt?: string;
  /** Text at the right of the command line. */
  context?: (ctx: Ctx) => string;
  fkeys?: (ctx: Ctx) => FKey[];
  enter?(ctx: Ctx): void;
  render(ctx: Ctx): void;
  /** Returns true when the key was handled. */
  key?(key: string, ctx: Ctx): boolean;
}

interface Message {
  text: string;
  cls: string;
}

const MENU_OPTIONS: Record<string, string> = {
  '1': 'understand',
  '2': 'define',
  '3': 'generate',
  '4': 'run',
  '5': 'validate',
  '6': 'debug',
  '7': 'compilers',
};

const OVERLAYS = ['install', 'help'];
const NO_MESSAGE: Message = { text: '', cls: 't' };

export class App {
  private s: Screen;
  private panels = new Map<string, Panel>();
  private current!: Panel;
  private runner = new Runner();
  private cmd = '';
  private shortMsg = '';
  private longMsg: Message = NO_MESSAGE;
  /** The panel under help or install: it keeps running and keeps its message. */
  private under: { panel: Panel; msg: Message } | null = null;
  private ctx: Ctx;
  private face: FaceId = 'terminal';
  private beat = 0;
  private faceRunner = new Runner();
  /** The step changed while the terminal was not the face on screen. */
  private stale = false;
  readonly sound = new Sound();
  readonly story: Story = { fixed: false, lastRun: null, rerun: false };
  onSound: (on: boolean) => void = () => {};
  onFace: (face: FaceId) => void = () => {};
  /** Function keys to show as buttons: only on the narrow grid. */
  onKeys: (keys: FKey[]) => void = () => {};
  /** The message line, for assistive technology. */
  onMessage: (text: string) => void = () => {};

  constructor(private root: HTMLElement, grid = WIDE) {
    this.s = new Screen(root, grid.cols, grid.rows);
    const app = this;
    this.ctx = {
      get s() {
        return app.s;
      },
      get top() {
        return 3;
      },
      get bottom() {
        return app.s.rows - (app.narrow ? 6 : 4);
      },
      get narrow() {
        return app.narrow;
      },
      story: this.story,
      get run() {
        return app.runner;
      },
      sound: this.sound,
      go: (id) => this.go(id),
      back: () => this.back(),
      redraw: () => this.draw(),
      msg: (text, cls = 't') => {
        // A panel that keeps running under help or install keeps its own message.
        if (this.under) this.under.msg = { text, cls };
        else {
          this.longMsg = { text, cls };
          this.onMessage(text);
        }
        this.draw();
      },
    };
    root.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  private get narrow(): boolean {
    return this.s.cols < WIDE.cols;
  }

  add(...panels: Panel[]): void {
    for (const p of panels) this.panels.set(p.id, p);
  }

  start(id: string): void {
    this.open(id);
  }

  /** Changes the size of the grid: 80 columns, or 40 on a phone. */
  setGrid(grid: { cols: number; rows: number }): void {
    if (grid.cols === this.s.cols && grid.rows === this.s.rows) return;
    this.s = new Screen(this.root, grid.cols, grid.rows);
    if (this.current) this.draw();
  }

  go(id: string): void {
    if (!this.panels.has(id)) return;
    if (!OVERLAYS.includes(id)) return this.open(id);
    // Help and install open over the panel, which keeps its place.
    if (this.current.id === id) return;
    if (!this.under && !OVERLAYS.includes(this.current.id)) this.under = { panel: this.current, msg: this.longMsg };
    this.current = this.panels.get(id)!;
    this.cmd = '';
    this.longMsg = NO_MESSAGE;
    this.root.dataset.panel = id;
    this.current.enter?.(this.ctx);
    this.draw();
  }

  back(): void {
    if (this.current.id === 'menu' || this.current.id === 'logon') return;
    if (OVERLAYS.includes(this.current.id) && this.under) {
      const { panel, msg } = this.under;
      this.under = null;
      this.current = panel;
      this.cmd = '';
      this.longMsg = msg;
      this.root.dataset.panel = panel.id;
      return this.draw();
    }
    this.open('menu');
  }

  toggleSound(): void {
    this.sound.unlock();
    const on = this.sound.toggle();
    this.sound.unlock();
    this.onSound(on);
    this.draw();
  }

  /** Changes the face of the session. The step stays where it is. */
  setFace(face: FaceId): void {
    if (face === this.face) return;
    this.face = face;
    document.body.dataset.face = face;
    this.onFace(face);
    if (face === 'terminal') {
      this.faceRunner.stop();
      if (this.stale) {
        this.stale = false;
        return this.open(this.current.id);
      }
      return this.draw();
    }
    if (this.under) {
      this.current = this.under.panel;
      this.longMsg = this.under.msg;
      this.under = null;
    }
    this.playFace();
  }

  private get step(): number {
    return STEPS.indexOf(this.current.id);
  }

  private get shownFace(): Exclude<FaceId, 'terminal'> {
    return this.face as Exclude<FaceId, 'terminal'>;
  }

  private playFace(): void {
    this.faceRunner.stop();
    const runner = (this.faceRunner = new Runner());
    this.beat = 0;
    const total = FACES[this.shownFace].beats(this.step, this.story);
    void (async () => {
      for (let b = 1; b <= total; b++) {
        await runner.sleep(55);
        this.beat = b;
        if (b % 3 === 0) this.sound.tick();
        this.draw();
      }
    })();
    this.draw();
  }

  private faceStep(i: number): void {
    const step = Math.max(0, Math.min(STEPS.length - 1, i));
    if (step === this.step) return;
    this.runner.stop();
    this.current = this.panels.get(STEPS[step])!;
    this.root.dataset.panel = this.current.id;
    this.stale = true;
    this.playFace();
  }

  private drawFace(): void {
    const s = this.s;
    s.clear();
    FACES[this.shownFace].render({ s, story: this.story, step: this.step, beat: this.beat });
    let col = 1;
    STEP_NAMES.forEach((name, i) => {
      const on = i === this.step;
      const label = this.narrow && !on ? ` ${i + 1} ` : `${i + 1} ${name}`;
      col = s.put(s.rows - 2, col, label, on ? 'w rv' : 'b', `p:step:${i}`) + 1;
    });
    this.drawStatus();
    this.onKeys(
      this.narrow
        ? [
            { key: 'ArrowRight', label: 'Next step' },
            { key: 'ArrowLeft', label: 'Prev step' },
            { key: 'Escape', label: 'Terminal' },
          ]
        : [],
    );
    s.flush();
  }

  private pressFace(key: string): void {
    if (/^[1-7]$/.test(key)) return this.faceStep(Number(key) - 1);
    if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'Enter') return this.faceStep(this.step + 1);
    if (key === 'ArrowLeft' || key === 'ArrowUp') return this.faceStep(this.step - 1);
    if (key === 'Escape' || key === 'F3') return this.setFace('terminal');
    if (key === 'F1' || key === 'F12') {
      this.setFace('terminal');
      return this.go(key === 'F1' ? 'help' : 'install');
    }
  }

  private open(id: string): void {
    this.runner.stop();
    this.runner = new Runner();
    this.under = null;
    this.current = this.panels.get(id)!;
    this.cmd = '';
    this.shortMsg = '';
    this.longMsg = NO_MESSAGE;
    this.root.dataset.panel = id;
    this.current.enter?.(this.ctx);
    this.draw();
  }

  private draw(): void {
    if (this.face !== 'terminal') return this.drawFace();
    const s = this.s;
    const p = this.current;
    const narrow = this.narrow;
    s.clear();
    if (!p.bare) {
      s.fill(0, 0, s.cols, '-', 'b');
      s.center(0, narrow ? ` ${p.title.replace('COBALTO - ', '')} ` : `  ${p.title}  `, 'w');
      if (this.shortMsg) s.right(0, ` ${this.shortMsg} `, 'r rv', null, 0);
      const prompt = `${p.prompt ?? 'Command'} ===> `;
      s.put(1, 1, prompt, 'b');
      s.put(1, 1 + prompt.length, this.cmd.padEnd(narrow ? 12 : 24, ' '), 'w u');
      s.cursor(1, 1 + prompt.length + this.cmd.length);
      if (p.context && !narrow) s.right(1, p.context(this.ctx), 'b');
    }
    p.render(this.ctx);
    if (!p.bare) {
      // On the narrow grid the function keys are buttons, and their row holds the message.
      const lines = narrow ? wrap(this.longMsg.text, s.cols - 2).slice(0, 3) : [this.longMsg.text.slice(0, s.cols - 2)];
      lines.forEach((line, i) => s.put(s.rows - (narrow ? 4 : 3) + i, 1, line, this.longMsg.cls));
    }
    if (narrow) {
      this.onKeys(
        p.bare
          ? [
              { key: 'Enter', label: 'Start the session' },
              { key: 'F12', label: 'Install' },
            ]
          : [
              ...(p.fkeys?.(this.ctx) ?? []),
              { key: 'F3', label: p.id === 'menu' ? 'Exit' : 'Back' },
              { key: 'F1', label: 'Help' },
              { key: 'F12', label: 'Install' },
            ],
      );
    } else {
      this.onKeys([]);
      if (!p.bare) this.drawKeys(p);
    }
    this.drawStatus();
    s.flush();
  }

  private drawKeys(p: Panel): void {
    const keys: FKey[] = [
      { key: 'F1', label: 'Help' },
      { key: 'F3', label: p.id === 'menu' ? 'Exit' : 'Back' },
      ...(p.fkeys?.(this.ctx) ?? []),
      { key: 'F12', label: 'Install' },
    ];
    const row = this.s.rows - 2;
    let col = 1;
    for (const k of keys) {
      const act = `key:${k.key}`;
      col = this.s.put(row, col, k.key.toUpperCase(), 'y', act);
      col = this.s.put(row, col, '=', 'b', act);
      col = this.s.put(row, col, k.label, 'w', act) + 2;
    }
  }

  private drawStatus(): void {
    const s = this.s;
    const row = s.rows - 1;
    const run = this.story.lastRun;
    let col = s.put(row, 1, 'COBALTO', 'w');
    if (this.narrow) {
      col = s.put(row, col + 2, 'GUEST', 'b');
      if (run) {
        col = s.put(row, col + 2, `${run.passed} PASS`, 'g');
        s.put(row, col + 1, `${run.failed} FAIL`, run.failed ? 'r' : 'd');
      }
      return;
    }
    col = s.put(row, col + 2, 'SESSION A', 'b');
    col = s.put(row, col + 2, 'GUEST', 'b');
    if (run) {
      col = s.put(row, col + 3, `${run.passed} PASSED`, 'g');
      s.put(row, col + 2, `${run.failed} FAILED`, run.failed ? 'r' : 'd');
    }
    s.right(row, 'F2 VIEW', 'y', 'key:F2', 15);
    s.right(row, this.sound.on ? 'F9 SOUND ON ' : 'F9 SOUND OFF', this.sound.on ? 'y' : 'd', 'key:F9');
  }

  private onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    this.sound.unlock();
    if (!el) return;
    this.sound.key();
    this.act(el.dataset.act!);
  }

  /** Actions carried by clickable fields: `key:F3`, `go:run`, `cmd:4`, `p:panel-action`. */
  act(action: string): void {
    const [kind, arg] = [action.slice(0, action.indexOf(':')), action.slice(action.indexOf(':') + 1)];
    if (kind === 'key') this.press(arg);
    else if (kind === 'go') this.go(arg);
    else if (kind === 'cmd') this.submit(arg);
    else if (kind === 'p' && this.face !== 'terminal') {
      if (arg.startsWith('step:')) this.faceStep(Number(arg.slice(5)));
    } else if (kind === 'p') {
      // Panel-specific action: delivered as a key that starts with '@'.
      this.current.key?.(`@${arg}`, this.ctx);
      this.draw();
    }
  }

  private onKey(e: KeyboardEvent): void {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key;
    const known =
      /^F([1-9]|1[0-2])$/.test(key) ||
      ['Enter', 'Escape', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'].includes(key) ||
      key.length === 1;
    if (!known) return;
    // A focused button keeps its own Enter and space.
    if ((key === 'Enter' || key === ' ') && e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    this.sound.unlock();
    this.sound.key();
    this.press(key);
  }

  /** One key, from the keyboard or from a function key on screen. */
  press(key: string): void {
    this.shortMsg = '';
    if (key === 'F9') return this.toggleSound();
    if (key === 'F2') {
      const order: FaceId[] = ['terminal', 'vscode', 'ci', 'agent'];
      return this.setFace(order[(order.indexOf(this.face) + 1) % order.length]);
    }
    if (this.face !== 'terminal') return this.pressFace(key);
    if (this.current.bare) {
      // The logon screen has no function keys, but install and help open from it.
      if (key === 'F12') return this.go('install');
      if (key === 'F1') return this.go('help');
      this.current.key?.(key, this.ctx);
      return;
    }
    if (key === 'Enter' && this.cmd) return this.submit(this.cmd);
    if (key === 'Backspace') {
      this.cmd = this.cmd.slice(0, -1);
      return this.draw();
    }
    if (key.length === 1) {
      if (this.cmd.length < (this.narrow ? 10 : 20)) this.cmd += key.toUpperCase();
      return this.draw();
    }
    if (this.current.key?.(key, this.ctx)) return this.draw();
    if (key === 'F3' || key === 'Escape') {
      if (this.current.id === 'menu') return this.go('logon');
      return this.back();
    }
    if (key === 'F1') return this.go('help');
    if (key === 'F12') return this.go('install');
    this.draw();
  }

  private submit(raw: string): void {
    const cmd = raw.trim().toUpperCase().replace(/^=/, '');
    this.cmd = '';
    const target = MENU_OPTIONS[cmd];
    if (target) return this.go(target);
    if (cmd === 'X' || cmd === 'EXIT' || cmd === 'LOGOFF') return this.go('logon');
    if (cmd === 'M' || cmd === 'MENU') return this.go('menu');
    if (cmd === 'HELP') return this.go('help');
    if (cmd === 'INSTALL') return this.go('install');
    this.shortMsg = 'INVALID OPTION';
    this.longMsg = { text: `"${raw.trim()}" is not an option. Type a number from 1 to 7 and press ENTER.`, cls: 'y' };
    this.onMessage(this.longMsg.text);
    this.draw();
  }
}
