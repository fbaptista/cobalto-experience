// Key clicks synthesized with Web Audio. On by default, remembered when
// turned off. The audio context starts on the first user gesture.

const STORE = 'cobalto.sound';

export class Sound {
  on = true;
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private lastTick = 0;

  constructor() {
    try {
      if (localStorage.getItem(STORE) === 'off') this.on = false;
    } catch {
      // storage unavailable: keep the default
    }
  }

  toggle(): boolean {
    this.on = !this.on;
    try {
      localStorage.setItem(STORE, this.on ? 'on' : 'off');
    } catch {
      // not remembered, still toggled for this visit
    }
    if (this.on) this.key();
    return this.on;
  }

  /** Call from a user gesture so the browser allows audio. */
  unlock(): void {
    if (!this.on || this.ctx) {
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const len = Math.floor(this.ctx.sampleRate * 0.05);
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  }

  /** A key pressed by the visitor. */
  key(): void {
    this.click(0.16, 1500 + Math.random() * 900);
  }

  /** A character written by the terminal: softer, rate limited. */
  tick(): void {
    const now = performance.now();
    if (now - this.lastTick < 45) return;
    this.lastTick = now;
    this.click(0.05, 2400 + Math.random() * 800);
  }

  private click(gain: number, freq: number): void {
    if (!this.on || !this.ctx || !this.noise || this.ctx.state !== 'running') return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 1.2;
    const amp = this.ctx.createGain();
    amp.gain.value = gain;
    src.connect(filter).connect(amp).connect(this.ctx.destination);
    src.start();
  }
}
