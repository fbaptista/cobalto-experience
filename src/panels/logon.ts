import type { Ctx, Panel } from '../app';

// Five-row block letters for the logon banner.
const GLYPHS: Record<string, string[]> = {
  C: [' █████ ', '██     ', '██     ', '██     ', ' █████ '],
  O: [' █████ ', '██   ██', '██   ██', '██   ██', ' █████ '],
  B: ['██████ ', '██   ██', '██████ ', '██   ██', '██████ '],
  A: [' █████ ', '██   ██', '███████', '██   ██', '██   ██'],
  L: ['██     ', '██     ', '██     ', '██     ', '███████'],
  T: ['███████', '  ██   ', '  ██   ', '  ██   ', '  ██   '],
};

const BANNER = [0, 1, 2, 3, 4].map((row) =>
  Array.from('COBALTO')
    .map((c) => GLYPHS[c][row])
    .join('  '),
);

const BOOT = [
  'COBALTO SESSION MANAGER',
  'TERMINAL CONNECTED    LU=CBLT0001',
  'CODE BASE ATTACHED    7 PROGRAMS  3 COPYBOOKS',
];

let bootLines = 0;
let banner = 0;
let ready = false;

export const logon: Panel = {
  id: 'logon',
  title: 'COBALTO - SESSION LOGON',
  bare: true,

  enter(ctx: Ctx) {
    bootLines = 0;
    banner = 0;
    ready = false;
    void (async () => {
      for (let i = 1; i <= BOOT.length; i++) {
        await ctx.run.sleep(260);
        bootLines = i;
        ctx.sound.tick();
        ctx.redraw();
      }
      await ctx.run.sleep(300);
      for (let i = 1; i <= BANNER.length; i++) {
        banner = i;
        ctx.redraw();
        await ctx.run.sleep(70);
      }
      await ctx.run.sleep(250);
      ready = true;
      ctx.redraw();
    })();
  },

  render(ctx: Ctx) {
    const s = ctx.s;
    s.fill(0, 0, s.cols, '-', 'b');
    s.center(0, '  COBALTO - SESSION LOGON  ', 'w');
    for (let i = 0; i < bootLines; i++) s.put(2 + i, 2, BOOT[i], 'd');
    for (let i = 0; i < banner; i++) s.center(7 + i, BANNER[i], 'k');
    if (banner === BANNER.length) {
      s.center(13, 'Unit testing, debugging and AI for COBOL', 'w');
      s.center(14, 'The COBOL you have always run, with the tools of today', 'b');
    }
    if (ready) {
      s.put(18, 24, 'Userid   ===> ', 'b');
      s.put(18, 38, 'GUEST   ', 'g u');
      s.put(19, 24, 'Password ===> ', 'b');
      s.put(19, 38, 'not needed here', 'd');
      s.put(20, 24, 'Program  ===> ', 'b');
      s.put(20, 38, 'LOANCALC', 'g u');
      s.center(23, ' Press ENTER to start the session ', 'y', 'key:Enter');
      s.cursor(18, 43);
      s.center(26, 'No account, no form. This site is a session of Cobalto.', 'd');
    }
  },

  key(key: string, ctx: Ctx) {
    if (key === 'Enter' || key === ' ') {
      ctx.go('menu');
      return true;
    }
    return false;
  },
};
