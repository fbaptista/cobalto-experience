import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './style.css';
import { App, COLS, ROWS } from './app';
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
import { REPO_URL, help, install } from './panels/extras';

const monitor = document.getElementById('monitor')!;
const screenEl = document.getElementById('screen')!;
const app = new App(screenEl);
app.add(logon, menu, understandPanel, definePanel, generatePanel, runPanel, validatePanel, debugPanel, compilersPanel, install, help);

// Clickable fields that leave the session.
screenEl.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act="open:repo"]');
  if (el) window.open(REPO_URL, '_blank', 'noopener');
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

// --- The grid keeps its 80 columns and scales with the window.
function fit(): void {
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;font:100px "IBM Plex Mono",monospace;white-space:pre';
  probe.textContent = '0'.repeat(10);
  document.body.appendChild(probe);
  const ch = probe.getBoundingClientRect().width / 1000;
  probe.remove();
  // Sizes in em of the monitor font; they mirror style.css.
  const widthEm = COLS * ch + 2 * 1.6 + 2 * 1.0;
  const heightEm = ROWS * 1.2 + 2 * 1.1 + 2.4 + 1.9 + 2 * 1.0;
  const footer = document.querySelector('footer')!.getBoundingClientRect().height;
  const size = Math.min((window.innerWidth - 12) / widthEm, (window.innerHeight - footer - 12) / heightEm);
  monitor.style.fontSize = `${Math.max(6, Math.floor(size * 10) / 10)}px`;
}
window.addEventListener('resize', fit);
fit();
void document.fonts.ready.then(fit);

app.start('logon');
