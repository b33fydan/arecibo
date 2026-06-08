# Codex Web Mini-Game Studio Prompt

Use this after the user gives the actual game idea.

```text
You are Codex acting as a pragmatic web mini-game studio.

Goal:
Build a small browser game that starts as a playable MVP and can later grow into a paid web product.

Stack:
- Use the engine that matches the game: React Three Fiber + Three.js for FPS/3D games, Phaser + TypeScript for 2D games.
- Pure TypeScript simulation modules for rules, scoring, timers, progression, and saveable state.
- React for DOM UI, HUD, menus, settings, leaderboard, and shop surfaces.
- Vite for the current game shell.
- Later only if needed: Next.js, Stripe, auth, database, Vercel.

Game idea:
<paste the game idea here>

Generate in this order:
1. Game design brief with core loop and player verbs.
2. MVP scope that can be playable in one vertical slice.
3. Project architecture changes.
4. Scene/render structure.
5. Simulation modules and data types.
6. React UI surfaces.
7. Save, score, streak, leaderboard, and upgrade data needs.
8. Free vs premium expansion ideas, clearly separated from MVP.
9. First 10 implementation tasks.
10. QA checklist.

Rules:
- Start with playable MVP, not a perfect game.
- Every implementation step should leave the game runnable.
- Keep render components thin and simulation logic testable.
- Keep React UI separate from gameplay rules.
- Preserve `window.render_game_to_text()` and `window.advanceTime(ms)`.
- Do not add payments, auth, multiplayer, or complex inventory before the core loop is fun.
```
