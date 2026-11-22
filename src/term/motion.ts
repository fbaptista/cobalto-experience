// Timers for a panel's animation. A Runner dies when the visitor leaves
// the panel, and whatever was waiting on it never resumes. With
// prefers-reduced-motion every wait collapses and the panel shows its
// final state at once.

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

export class Runner {
  private alive = true;

  stop(): void {
    this.alive = false;
  }

  get instant(): boolean {
    return reduced.matches;
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        if (this.alive) resolve();
      }, this.instant ? 0 : ms);
    });
  }

  /** Reveals text one character at a time through `show`. */
  async type(text: string, show: (partial: string) => void, cps = 45): Promise<void> {
    if (this.instant) {
      show(text);
      return;
    }
    for (let i = 1; i <= text.length; i++) {
      show(text.slice(0, i));
      await this.sleep(1000 / cps);
    }
  }
}
