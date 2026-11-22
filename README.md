# cobalto-experience

A 2D site that shows where [Cobalto](https://github.com/abstracta/cobalto) is heading: unit testing, debugging and AI for COBOL. The site does not describe the product: it is a session of it. The visitor logs on to a full-page terminal, in the style of a 3270, and walks through seven panels over one example program.

The same session has four faces. The tab bar changes the view without changing the step: Terminal, VS Code, CI and Agent (an AI agent that drives Cobalto).

Some of what the session shows is a vision, not what ships today. The Cobalto repository says what is verified.

Live at <https://fbaptista.github.io/cobalto-experience/>. Every push to `main` deploys it with GitHub Pages.

## Run it

```bash
npm install
npm run dev
```

`npm run build` checks the types and writes the static site to `dist/`.

## Layout

- `src/term/`: the terminal. `screen.ts` is the character grid, rendered as DOM; `motion.ts` holds the animation timers and respects `prefers-reduced-motion`; `sound.ts` is the key sound.
- `src/story/`: the script, data and steps with no rendering. `loancalc.ts` tells the story of LOANCALC and its defect; `codebase.ts`, `define.ts`, `generate.ts` and `compilers.ts` are the scripts of those panels.
- `src/panels/`: one module per panel, which draws the script on the terminal.
- `src/faces/`: the VS Code, CI and Agent faces, drawn on the same grid from the same script.
- `src/app.ts`: the session. Command line, function keys, status line, navigation and faces.

## Status

Done: the terminal renderer, the logon screen, the main menu, the seven panels and the four faces, on an 80-column grid and, on a screen as narrow as a phone, on a 40-column grid with the function keys as buttons.

Programs, data and figures are made up for the story. IBM, Micro Focus, VSI and VS Code are trademarks of their respective owners, named only to identify compatibility.
