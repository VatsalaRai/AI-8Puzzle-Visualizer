# Uniform Cost Search notes

These notes explain how `js/ucs.js` works, for the viva or the report.

## The algorithm

Uniform Cost Search (UCS) always expands the frontier node with the smallest path cost g(n).

```
function UCS(start, goal):
  open   = min-heap ordered by g(n)
  open.push(start, g = 0)
  closed = empty set

  while open is not empty:
    node = open.pop()          # cheapest g first
    if node.state in closed: continue
    if node.state == goal:     # goal test on selection
      return path(node)
    closed.add(node.state)

    for each legal move (up, down, left, right):
      child   = apply(move, node)
      g_child = g(node) + stepCost(move)
      if child.state in closed: skip
      if child.state in open with g <= g_child: skip
      open.push(child, g_child)   # replaces a costlier copy

  return FAILURE
```

The goal test happens when a node is selected, not when it is generated. That is what makes UCS optimal.

## Problem formulation

| Item | Definition |
| --- | --- |
| State | Positions of tiles 1 to 8 and the blank on a 3 by 3 board |
| Initial state | Chosen on the Setup page or generated randomly |
| Actions | Move the blank up, down, left or right (2 to 4 actions per state) |
| Goal test | Board equals the goal state |
| Path cost | Uniform model: 1 per move. Tile weighted model: k for moving tile k |

## Data structures in this project

| Structure | Used for |
| --- | --- |
| Binary min-heap (`NumHeap`) | Open list, ordered by g, ties broken by creation order |
| `Set` of encoded states | Closed list |
| `Map` of state to node id | Finds a waiting copy of a state so a cheaper one can replace it |
| Parallel arrays | Node storage: state, parent, g, depth, tile, direction |

Each state is encoded as one 9 digit number, so it works as a Map and Set key.

## Status of each generated successor

| Code | Meaning |
| --- | --- |
| 0 | Added to the open list |
| 1 | Replaced a costlier copy already waiting in the open list |
| 2 | Skipped: already in the closed list |
| 3 | Skipped: already in the open list with an equal or cheaper cost |

## Complexity

- Time and space: O(b^(1 + floor(C* / e))), where C* is the optimal cost and e the smallest step cost.
- Complete when every step cost is above 0. Optimal.
- With unit costs it expands the same nodes as Breadth First Search, level by level.

## Solvability

Only half of the 9! = 362,880 arrangements can reach a given goal. Two states are mutually reachable when the parity of their inversion counts matches. The Setup page checks this. For an unsolvable pair, UCS exhausts all 181,440 reachable states and reports Not Found.

## How the game decides right and wrong

`Ucs.distanceMap(goal, model)` runs UCS backwards from the goal over the whole reachable space, giving the exact cost-to-goal of every state. A move from state s to state s' with move cost c is **right** when `dist(s') + c == dist(s)`, which means it lies on a cheapest path. Otherwise it is **wrong**. The optimal answer itself is only computed when the player solves the puzzle or gives up.

## Memory estimate

The Solution Summary shows an approximate figure: 48 bytes per stored node, plus 16 bytes per peak open list entry and per closed state. It is labelled Low below 400 KB, Medium below 4 MB and High above that. It is an estimate from node counts, not a measurement of the browser.
