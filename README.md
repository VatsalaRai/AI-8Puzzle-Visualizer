# Blank Quest: Interactive 8-Puzzle Problem Solver

Artificial Intelligence Digital Assignment (Case Study)
5. Uniform Cost Search (UCS)**.

Blank Quest is a retro pixel-art web game built around the 8-Puzzle. You play the puzzle yourself, hear a different sound for every right and wrong move, and the optimal answer found by Uniform Cost Search is revealed at the end. A separate Solver page replays the search node by node.

## Student Details

| Field | Value |
| --- | --- |
| Name | VATSALA RAI  |
| Registration number | 24BCE2803 |
| Course | Artificial Intelligence |
| Algorithm | Uniform Cost Search  |


## GitHub Pages URL

`https://github.com/VatsalaRai/AI-8Puzzle-Visualizer.git`

## Run it in VS Code

1. Open the `AI-8Puzzle-Visualizer` folder in VS Code (File, Open Folder).
2. Install the **Live Server** extension. VS Code offers it automatically because of `.vscode/extensions.json`.
3. Right-click `index.html` and choose **Open with Live Server**.

You can also double-click `index.html`, because the site is plain HTML, CSS and JavaScript with no build step. An internet connection is needed the first time, because Tailwind CSS, GSAP, anime.js, canvas-confetti and the Google fonts load from CDNs.

Click anywhere on a page once before you expect sound, because browsers block audio until you interact with the page.

## Publish on GitHub Pages

1. Create a repository named `AI-8Puzzle-Visualizer` on GitHub and push this folder to it.
2. In the repository open **Settings, Pages**.
3. Under **Build and deployment** choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
4. After a minute the site is live at the URL above. Put that URL in this README.

## Pages and features

| Page | File | What it has |
| --- | --- | --- |
| Home | `index.html` | Course name, assignment title, student name, registration number, introduction to the 8-Puzzle, navigation menu |
| Setup | `setup.html` | Method 1: type initial and goal states with live validation. Method 2: Generate Random Puzzle (always solvable). Algorithm selection, cost model, solvability check |
| Play | `game.html` | The game: click tiles or use the keyboard, right and wrong move feedback, sound effects, hints, undo, score, hidden answer revealed at the end |
| Solver | `solver.html` | Puzzle visualization and search process visualization, controls, solution summary |
| Compare | `compare.html` | Comparison table, bar charts, difficulty benchmark, your game against the optimum |
| Algorithms | `algorithms.html` | Description, working principle, advantages, limitations, time and space complexity, completeness and optimality for all seven algorithms |

### Puzzle visualization (Solver page)

Initial state, goal state, current state, generated successor states and the final solution path are all shown. Tiles slide when the blank moves.

### Search process visualization (Solver page)

Shown in real time: current node being expanded, nodes generated, nodes expanded, open list (frontier), closed list (explored), current search depth, parent node and path cost g(n). UCS has no heuristic, so h(n) = 0 and f(n) = g(n).

### Solution summary (Solver page)

Solution found or not found, total moves, nodes generated, nodes expanded, maximum search depth, execution time, path cost and approximate memory usage.

### Interactive controls (Solver page)

Run, Pause, Resume, Next Step, Previous Step, Reset and Change Speed. There are also Run to End and a step slider to jump anywhere in the search.

### The game (Play page)

- Slide a tile by clicking it, or move the blank with the arrow keys or W A S D.
- A move is **right** when it lies on a cheapest path to the goal. It plays a bright rising chime and a message that names the tile. Streaks raise the pitch.
- A move is **wrong** when it leaves every cheapest path. It plays a low buzz, shakes the board and shows a message saying so.
- Other sounds: tile slide, tile locking into its goal square, blocked click, undo, hint, victory fanfare and a defeat tune.
- Hints, undo, restart, give up, difficulty levels, score, streak, accuracy, timer and a local high score table.
- When the puzzle is solved, or the player gives up, the optimal solution is revealed step by step with a replay board, a grade, and a comparison with the player's own moves.

## Technologies Used

- HTML5, CSS3, JavaScript (ES6: classes, arrow functions, const and let, template literals, destructuring)
- **Tailwind CSS** (Play CDN) for layout, plus a hand-written pixel-art stylesheet (`css/pixel.css`)
- Animation libraries: **GSAP** (tile movement, shakes, entrances), **anime.js** (twinkling stars, counters, bars), **canvas-confetti** (victory bursts)
- Web Audio API for all sound effects (no audio files)
- SVG pixel sprites generated from character maps (`js/sprites.js`)
- Press Start 2P and Silkscreen from Google Fonts
- `localStorage` to share the puzzle between pages

The search algorithm is written from scratch in `js/ucs.js`. No search library is used.

## Search Algorithms Implemented

Only the assigned algorithm: **Uniform Cost Search**.

- Open list: binary min-heap ordered by path cost g(n)
- Closed list: a Set of encoded states
- Goal test on selection, which makes it optimal
- A cheaper path to a waiting state replaces the costlier copy
- Two cost models: **uniform** (every move costs 1) and **tile weighted** (moving tile k costs k)

See `docs/UCS-notes.md` for pseudocode, data structures and complexity.

BFS, DFS, DLS, IDDLS, GBFS and A* are described on the Algorithms page but not implemented, because the assignment says to implement only the assigned algorithm. Their rows on the Compare page are marked as not implemented.

## Heuristics Used

None. Uniform Cost Search is an uninformed algorithm, so h(n) = 0 and f(n) = g(n). Misplaced Tiles and Manhattan Distance belong to GBFS and A*, so the heuristic and depth limit controls on the Setup page are shown disabled.

## Project structure

```
AI-8Puzzle-Visualizer/
|-- index.html            Home
|-- setup.html            Puzzle input and algorithm selection
|-- game.html             Play
|-- solver.html           Puzzle and search visualization
|-- compare.html          Comparison
|-- algorithms.html       Algorithm information
|-- css/pixel.css         Pixel-art components
|-- js/
|   |-- config.js         Name, registration number, course text (edit this)
|   |-- puzzle.js         State model, solvability, successors, random puzzles
|   |-- ucs.js            Uniform Cost Search, trace replay, distance map
|   |-- sound.js          Web Audio sound effects
|   |-- sprites.js        Pixel sprites
|   |-- board.js          Animated board and mini boards
|   |-- decor.js          Pixel scenery and animation
|   |-- ui.js, state.js   Navigation, toasts, shared storage
|   |-- tailwind-config.js
|   `-- pages/            One script per page
|-- assets/               Palette and font notes
|-- images/               Favicon
|-- docs/                 UCS notes and screenshots
|-- tests/engine.test.js  Engine tests
`-- README.md
```

## Tests

The search engine has 13 tests: optimality against independent Breadth First Search and Dijkstra implementations, legal solution paths, unsolvable puzzles, and the step replay. Run them with Node.js:

```
node tests/engine.test.js
```

## Design

The look follows a retro 8-bit and 16-bit style: near-black background with a checkerboard texture, hot pink, pastel pink, lavender, green and yellow accents, hard offset shadows, pixel fonts, pixel sprites and stepped animations. Animation respects the visitor's reduced-motion setting, and the layout works on phones.

## References
Russell, S. and Norvig, P. Artificial Intelligence: A Modern Approach (4th edition), Pearson. Chapter 3, Solving Problems by Searching (uniform-cost search and the 8-Puzzle).
Dijkstra, E. W. (1959). A note on two problems in connexion with graphs. Numerische Mathematik, 1, 269-271. (Uniform Cost Search is Dijkstra's algorithm applied to a state space.)
Johnson, W. W. and Story, W. E. (1879). Notes on the "15" puzzle. American Journal of Mathematics, 2(4), 397-404. (Solvability by inversion parity.)
Assignment brief: Artificial Intelligence Digital Assignment (Case Study), Interactive 8-Puzzle Problem Solver using AI Search Algorithms.
Tailwind CSS documentation: https://tailwindcss.com/docs
GSAP documentation: https://gsap.com/docs/v3/
anime.js documentation: https://animejs.com/documentation/
canvas-confetti: https://github.com/catdad/canvas-confetti
MDN Web Docs, Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
Google Fonts, Press Start 2P and Silkscreen: https://fonts.google.com/specimen/Press+Start+2P and https://fonts.google.com/specimen/Silkscreen
