/*
 * algorithms.js - Algorithm information page.
 * Description, working principle, advantages, limitations, time and space complexity,
 * completeness and optimality for all seven algorithms of the assignment.
 */
(() => {
  'use strict';
  const { $ } = UI;
  const P = Puzzle;

  UI.init('algorithms');

  const ALGOS = [
    {
      key: 'bfs', name: 'BFS', full: 'Breadth First Search', type: 'Uninformed',
      description: 'Breadth First Search expands the shallowest unexpanded node first. It explores the puzzle level by level: every board that is one move from the start, then every board two moves away, and so on. A first in, first out queue holds the frontier.',
      principle: [
        'Put the start state in a FIFO queue.',
        'Remove the oldest node from the queue. If it is the goal, stop.',
        'Add every successor that has not been seen before to the back of the queue.',
        'Repeat. All nodes of depth k are expanded before any node of depth k + 1.'
      ],
      pros: [
        'Complete whenever the branching factor is finite.',
        'Finds the shallowest goal, which is optimal when every move costs the same.',
        'Very simple to implement.'
      ],
      cons: [
        'Memory grows as b^d, which fills up fast on hard puzzles.',
        'Ignores step costs, so it is not optimal when moves cost different amounts.',
        'Expands many nodes that are far from the goal.'
      ],
      time: 'O(b^d)', space: 'O(b^d)', complete: 'Yes, when the branching factor is finite.', optimal: 'Yes, when every step cost is equal.'
    },
    {
      key: 'dfs', name: 'DFS', full: 'Depth First Search', type: 'Uninformed',
      description: 'Depth First Search expands the deepest unexpanded node first. It follows one sequence of moves as far as it can, then backs up and tries the next branch. A last in, first out stack, or recursion, holds the frontier.',
      principle: [
        'Push the start state on a stack.',
        'Pop the newest node. If it is the goal, stop.',
        'Push its unseen successors on the stack.',
        'When a branch has no new successors, backtrack to the most recent unexplored choice.'
      ],
      pros: [
        'Needs very little memory, only O(b m).',
        'Can reach a goal quickly when it lies down the first branches tried.',
        'Simple to implement with recursion.'
      ],
      cons: [
        'Not optimal: it can return a very long solution.',
        'Can run forever on infinite or cyclic search spaces without an explored set.',
        'Results depend heavily on the order in which moves are tried.'
      ],
      time: 'O(b^m)', space: 'O(b m)', complete: 'No in general. Yes on a finite space when an explored set is used.', optimal: 'No.'
    },
    {
      key: 'dls', name: 'DLS', full: 'Depth Limited Search', type: 'Uninformed',
      description: 'Depth Limited Search is Depth First Search with a fixed depth limit l. Nodes at depth l are treated as if they had no successors. This stops the endless descent of plain DFS.',
      principle: [
        'Choose a depth limit l.',
        'Run depth first search from the start state.',
        'Do not expand any node whose depth equals l.',
        'Report the goal if found, a cutoff if the limit stopped the search, or failure if the space is exhausted.'
      ],
      pros: [
        'Memory use stays at O(b l).',
        'Cannot descend forever, so it always terminates.',
        'Useful when a good bound on the solution depth is known.'
      ],
      cons: [
        'Incomplete when the goal is deeper than l.',
        'Not optimal, even when the goal is within the limit.',
        'Choosing a good limit needs knowledge of the problem.'
      ],
      time: 'O(b^l)', space: 'O(b l)', complete: 'No, when the shallowest goal is deeper than l.', optimal: 'No.',
      param: 'Needs a depth limit as input.'
    },
    {
      key: 'iddls', name: 'IDDLS', full: 'Iterative Deepening Depth Limited Search', type: 'Uninformed',
      description: 'Iterative Deepening runs Depth Limited Search again and again with limits 0, 1, 2, and so on, until a goal is found. It combines the small memory of DFS with the completeness and optimality of BFS.',
      principle: [
        'Set the limit l to 0.',
        'Run depth limited search with limit l.',
        'If a goal is found, return it. Otherwise increase l by 1.',
        'Repeat. Shallow levels are searched many times, but the deepest level dominates the cost.'
      ],
      pros: [
        'Complete, and optimal when every step cost is equal.',
        'Memory use is only O(b d).',
        'No need to guess a depth limit.'
      ],
      cons: [
        'Re-expands the upper levels on every pass.',
        'Time is still exponential.',
        'Not optimal when step costs differ.'
      ],
      time: 'O(b^d)', space: 'O(b d)', complete: 'Yes.', optimal: 'Yes, when every step cost is equal.'
    },
    {
      key: 'ucs', name: 'UCS', full: 'Uniform Cost Search', type: 'Uninformed', implemented: true,
      description: 'Uniform Cost Search expands the node with the lowest path cost g(n) first. A priority queue ordered by g(n) holds the frontier. It is Dijkstra\'s shortest path algorithm applied to the puzzle graph, and it behaves exactly like BFS when every move costs 1.',
      principle: [
        'Put the start state in a priority queue with g = 0.',
        'Pop the node with the lowest g. Skip it if its state is already in the closed list.',
        'Goal test on selection: if it is the goal, stop. Testing here, not when the node is generated, is what guarantees an optimal answer.',
        'Add the state to the closed list. Generate the successors with g = g(parent) + step cost.',
        'Skip a successor that is closed or already waiting with an equal or cheaper cost. A cheaper copy replaces a costlier one.',
        'Repeat until the goal is selected or the queue is empty.'
      ],
      pros: [
        'Complete and optimal for any step costs above zero.',
        'Handles unequal move costs, such as the tile weighted model.',
        'Needs no heuristic and no domain knowledge.'
      ],
      cons: [
        'Searches in every direction at once, with no sense of where the goal is.',
        'Expands more nodes than informed search such as A*.',
        'Memory grows exponentially because every generated node is kept.'
      ],
      time: 'O(b^(1 + floor(C* / e)))', space: 'O(b^(1 + floor(C* / e)))', complete: 'Yes, when every step cost is above 0.', optimal: 'Yes.',
      project: [
        'Frontier: a binary min-heap ordered by g, with ties broken by creation order. Closed list: a Set of encoded states.',
        'Two cost models: uniform (every move costs 1) or tile weighted (moving tile k costs k).',
        'The search records every step, so the Solver page can replay it forwards and backwards.',
        'The game runs Uniform Cost Search backwards from the goal to know the exact cost of every state. A move is right when it lies on a cheapest path.'
      ]
    },
    {
      key: 'gbfs', name: 'GBFS', full: 'Greedy Best First Search', type: 'Informed',
      description: 'Greedy Best First Search expands the node that looks closest to the goal, using only the heuristic h(n), so f(n) = h(n). On the 8-Puzzle the usual heuristics are Misplaced Tiles and Manhattan Distance.',
      principle: [
        'Put the start state in a priority queue ordered by h(n).',
        'Pop the node with the smallest h. If it is the goal, stop.',
        'Generate its successors and compute h for each one.',
        'Add the unseen successors to the queue and repeat.'
      ],
      pros: [
        'Often reaches the goal after very few expansions.',
        'Low effort per step.',
        'Works well when the heuristic is informative.'
      ],
      cons: [
        'Not optimal, because it ignores the cost already spent.',
        'Can be led down a misleading path.',
        'Worst case time and space are exponential.'
      ],
      time: 'O(b^m) in the worst case', space: 'O(b^m) in the worst case', complete: 'No on infinite or cyclic spaces. Yes on a finite space with an explored set.', optimal: 'No.',
      param: 'Needs a heuristic: Misplaced Tiles or Manhattan Distance.'
    },
    {
      key: 'astar', name: 'A*', full: 'A* Search', type: 'Informed',
      description: 'A* expands the node with the lowest f(n) = g(n) + h(n): the cost paid so far plus the estimated cost still to go. With an admissible heuristic it keeps the optimality of Uniform Cost Search and expands far fewer nodes.',
      principle: [
        'Put the start state in a priority queue ordered by f(n) = g(n) + h(n).',
        'Pop the node with the lowest f. If it is the goal, stop.',
        'Generate the successors and compute g, h and f for each one.',
        'Keep the cheapest path to each state, add the successors to the queue and repeat.'
      ],
      pros: [
        'Complete, and optimal with an admissible heuristic (consistent for graph search).',
        'Expands far fewer nodes than UCS or BFS on the 8-Puzzle.',
        'Manhattan Distance gives a stronger guide than Misplaced Tiles.'
      ],
      cons: [
        'Stores every generated node, so memory grows exponentially.',
        'Performance depends on the quality of the heuristic.',
        'Needs a heuristic that is designed for the problem.'
      ],
      time: 'O(b^d) in the worst case', space: 'O(b^d) in the worst case', complete: 'Yes.', optimal: 'Yes, with an admissible heuristic.',
      param: 'Needs a heuristic: Misplaced Tiles or Manhattan Distance.'
    }
  ];

  const tabs = $('algo-tabs');
  const panel = $('algo-panel');
  let activeKey = 'ucs';

  const list = items => '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';

  /* Live worked example: the first expansions of UCS on the assignment puzzle. */
  function exampleHtml() {
    const goal = P.GOAL_ASSIGNMENT;
    const res = Ucs.solve(P.EXAMPLE_INITIAL, goal, { costModel: 'uniform', record: true });
    const rp = new Ucs.Replay(res);
    const shown = Math.min(6, rp.total());
    let rows = '';
    for (let i = 0; i < shown; i++) {
      rp.forward();
      const cur = rp.current();
      const added = cur.children.filter(c => c.status === 0 || c.status === 1).length;
      rows += `<li>${miniBoard(cur.state, { goal })}<span><strong>Step ${cur.step}</strong>: expand a node with g = ${cur.g}. ` +
        `${cur.isGoal ? 'It is the goal.' : `${added} new successor${added === 1 ? '' : 's'} added. Open list now holds ${cur.frontierSize}.`}</span></li>`;
    }
    return `<div class="panel panel-lav"><h3 class="panel-h">WORKED EXAMPLE: THE ASSIGNMENT PUZZLE</h3>` +
      '<p class="text-[13px] mt-0 mb-3">With every move costing 1, UCS expands nodes in order of depth. These are the first expansions on the example puzzle from the assignment, taken from the real search.</p>' +
      `<ul class="rows">${rows}</ul>` +
      `<p class="text-[12px] muted mb-0 mt-3">The full search takes ${res.trace.node.length} expansions to select the goal at cost ${res.cost}. Watch all of them on the <a href="solver.html">Solver</a> page.</p></div>`;
  }

  function renderTabs() {
    tabs.innerHTML = ALGOS.map((a, i) =>
      `<button type="button" role="tab" class="tab-btn${a.key === activeKey ? ' active' : ''}" id="tab-${a.key}" data-key="${a.key}" ` +
      `aria-selected="${a.key === activeKey}" aria-controls="algo-panel" tabindex="${a.key === activeKey ? 0 : -1}">` +
      `${i + 1}. ${a.name}${a.implemented ? ' (IMPLEMENTED)' : ''}<br><span class="font-silk text-[12px] font-normal">${a.full}</span></button>`
    ).join('');
  }

  function metric(label, value, cls) {
    return `<div class="stat ${cls || ''}"><div class="stat-k">${label}</div><div class="stat-v !text-[12px] !leading-5">${value}</div></div>`;
  }

  function renderPanel(animate) {
    const a = ALGOS.find(x => x.key === activeKey);
    panel.setAttribute('aria-labelledby', 'tab-' + a.key);
    panel.innerHTML =
      '<div class="win">' +
      `<div class="win-bar"><h2 class="win-title m-0">${a.full.toUpperCase()}</h2><span class="win-ctl" aria-hidden="true"><i></i><i></i><i></i></span></div>` +
      '<div class="win-body prose">' +
      `<p><span class="chip chip-lav">${a.type}</span> ${a.implemented ? '<span class="chip chip-lime">IMPLEMENTED IN THIS PROJECT</span>' : '<span class="chip chip-ink">ASSIGNED TO ANOTHER STUDENT</span>'}</p>` +
      '<h3 class="head-px">DESCRIPTION</h3>' +
      `<p>${a.description}</p>` +
      (a.param ? `<p><strong>Input needed:</strong> ${a.param}</p>` : '') +
      '<h3 class="head-px mt-4">WORKING PRINCIPLE</h3>' +
      `<ol class="pl-5 m-0">${a.principle.map(s => `<li class="mb-2 text-[14px] leading-[1.65]">${s}</li>`).join('')}</ol>` +
      '</div></div>' +

      '<div class="grid gap-6 md:grid-cols-2">' +
      `<div class="panel"><h3 class="panel-h">ADVANTAGES</h3><div class="prose">${list(a.pros)}</div></div>` +
      `<div class="panel panel-pink"><h3 class="panel-h">LIMITATIONS</h3><div class="prose">${list(a.cons)}</div></div>` +
      '</div>' +

      '<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">' +
      metric('TIME COMPLEXITY', a.time, 'stat-lime') +
      metric('SPACE COMPLEXITY', a.space, 'stat-lime') +
      metric('COMPLETENESS', a.complete, 'stat-lav') +
      metric('OPTIMALITY', a.optimal, 'stat-lav') +
      '</div>' +

      (a.project
        ? `<div class="panel"><h3 class="panel-h">HOW IT WORKS IN THIS PROJECT</h3><div class="prose">${list(a.project)}</div></div>${exampleHtml()}`
        : '<div class="panel panel-lav"><h3 class="panel-h">NOT IMPLEMENTED HERE</h3><p class="text-[13px] m-0">The assignment gives each student one algorithm and says to implement only that one. This page explains the algorithm for reference. Uniform Cost Search is the algorithm built into this project.</p></div>');

    if (animate && window.gsap && !Decor.reduceMotion) {
      gsap.from(panel.children, { opacity: 0, y: 16, duration: 0.35, stagger: 0.07, ease: 'steps(5)', clearProps: 'all' });
    }
  }

  function select(key, focus, silent) {
    activeKey = key;
    renderTabs();
    renderPanel(!silent);
    if (focus) $('tab-' + key).focus();
    if (!silent) Sound.click();
    try { history.replaceState(null, '', '#' + key); } catch (e) { /* file:// may block this */ }
  }

  tabs.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (btn) select(btn.dataset.key, false, false);
  });

  tabs.addEventListener('keydown', e => {
    const i = ALGOS.findIndex(a => a.key === activeKey);
    let n = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % ALGOS.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + ALGOS.length) % ALGOS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = ALGOS.length - 1;
    if (n === null) return;
    e.preventDefault();
    select(ALGOS[n].key, true, false);
  });

  /* At-a-glance table */
  $('glance-body').innerHTML = ALGOS.map(a =>
    `<tr class="${a.implemented ? 'is-mine' : ''}"><th scope="row" class="text-left font-px text-[9px] p-[10px] border-2 border-[#3A32B8] ${a.implemented ? 'text-sun' : ''}">${a.name}</th>` +
    `<td>${a.type}</td><td>${a.time}</td><td>${a.space}</td><td>${a.complete}</td><td>${a.optimal}</td></tr>`).join('');

  /* Start on the tab named in the URL, otherwise on the assigned algorithm. */
  const hash = (location.hash || '').replace('#', '');
  if (ALGOS.some(a => a.key === hash)) activeKey = hash;
  renderTabs();
  renderPanel(false);
})();
