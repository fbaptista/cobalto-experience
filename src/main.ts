import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './style.css';
import { App, NARROW, WIDE, type FKey } from './app';
import type { FaceId } from './faces';
import { logon } from './panels/logon';
import { menu } from './panels/menu';
import { runPanel } from './panels/run';
import { validatePanel } from './panels/validate';
import { debugPanel } from './panels/debug';
import { definePanel } from './panels/define';
import { generatePanel } from './panels/generate';
import { compilersPanel } from './panels/compilers';
import { understandPanel } from './panels/understand';
import { LINKS, help, install } from './panels/extras';

const monitor = document.getElementById('monitor')!;
const screenEl = document.getElementById('screen')!;
const app = new App(screenEl);
app.add(logon, menu, understandPanel, definePanel, generatePanel, runPanel, validatePanel, debugPanel, compilersPanel, install, help);

// Clickable fields that leave the session.
screenEl.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act^="open:"]');
  const url = el && LINKS[el.dataset.act!.slice(5)];
  if (url) window.open(url, '_blank', 'noopener');
});

// --- Tabs: four faces of the same session.
const tabs = document.querySelectorAll<HTMLButtonElement>('#tabs [data-tab]');
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tab.blur();
    app.sound.unlock();
    app.setFace(tab.dataset.tab as FaceId);
  });
});
app.onFace = (face) => {
  tabs.forEach((tab) => {
    const on = tab.dataset.tab === face;
    tab.classList.toggle('on', on);
    if (on) tab.setAttribute('aria-current', 'true');
    else tab.removeAttribute('aria-current');
  });
};

const soundBtn = document.getElementById('sound')!;
function showSound(on: boolean): void {
  soundBtn.textContent = on ? 'Sound on' : 'Sound off';
  soundBtn.setAttribute('aria-pressed', String(on));
}
app.onSound = showSound;
showSound(app.sound.on);
soundBtn.addEventListener('click', () => {
  soundBtn.blur();
  app.toggleSound();
});
document.getElementById('install')!.addEventListener('click', (e) => {
  (e.currentTarget as HTMLElement).blur();
  app.act('key:F12');
});

// --- On the narrow grid the function keys are buttons under the screen.
const keysBar = document.getElementById('keys')!;
let shownKeys = '';
app.onKeys = (keys: FKey[]) => {
  const signature = JSON.stringify(keys);
  if (signature === shownKeys) return;
  shownKeys = signature;
  keysBar.textContent = '';
  keys.forEach((k, i) => {
    const button = document.createElement('button');
    button.textContent = k.label;
    if (i === 0) button.className = 'primary';
    button.addEventListener('click', () => {
      button.blur();
      app.sound.unlock();
      app.sound.key();
      app.press(k.key);
    });
    keysBar.appendChild(button);
  });
};

const live = document.getElementById('live')!;
app.onMessage = (text) => (live.textContent = text);

// --- The grid keeps its columns and scales with the window: 80 columns,
// or 40 on a screen as narrow as a phone.
function fit(): void {
  const narrow = window.innerWidth < 640;
  const grid = narrow ? NARROW : WIDE;
  document.body.classList.toggle('narrow', narrow);
  app.setGrid(grid);
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;font:100px "IBM Plex Mono",monospace;white-space:pre';
  probe.textContent = '0'.repeat(10);
  document.body.appendChild(probe);
  const ch = probe.getBoundingClientRect().width / 1000;
  probe.remove();
  // Sizes in em of the monitor font; they mirror style.css.
  const widthEm = narrow ? grid.cols * ch + 2 * 0.5 + 2 * 0.4 : grid.cols * ch + 2 * 1.6 + 2 * 1.0;
  const heightEm = narrow
    ? grid.rows * 1.2 + 2 * 0.5 + 2.4 + 5.2 + 2 * 0.4
    : grid.rows * 1.2 + 2 * 1.1 + 2.4 + 1.9 + 2 * 1.0;
  const footer = document.querySelector('footer')!.getBoundingClientRect().height;
  const size = Math.min((window.innerWidth - (narrow ? 4 : 12)) / widthEm, (window.innerHeight - footer - (narrow ? 4 : 12)) / heightEm);
  monitor.style.fontSize = `${Math.max(6, Math.floor(size * 10) / 10)}px`;
}
window.addEventListener('resize', fit);
fit();
void document.fonts.ready.then(fit);

app.start('logon');
