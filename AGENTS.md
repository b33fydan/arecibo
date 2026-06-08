# Arecibo Codex Game Studio

## Product
This repo is a Codex-ready studio for small browser games that can grow into paid web products.

## Stack
- React Three Fiber + Three.js for first-person 3D gameplay rendering.
- Pure TypeScript simulation modules for rules, scoring, timers, progression, and saveable state.
- React for DOM UI, HUD, menus, settings, and product surfaces.
- Vite for the playable game shell.
- Future product layer: Next.js, auth, Stripe, leaderboard APIs, streaks, and subscriptions only after the core game is playable.

## Development Rules
- Keep the game playable after every meaningful change.
- Build vertical slices: one small loop that can be played, tested, and improved.
- Keep Three.js/R3F render components thin. The scene renders state; simulation modules own rules.
- Keep React UI separate from gameplay logic.
- Add or update tests for pure game logic.
- Run `npm run build` before calling a task complete.
- For gameplay changes, expose and preserve `window.render_game_to_text()` and `window.advanceTime(ms)`.
- Prefer deterministic state transitions so automated playtests can reproduce issues.
- Do not add backend, payments, auth, multiplayer, inventory complexity, or monetization before the game loop is fun.

## Current Architecture
- `src/game/simulation/`: source of truth for rules and saveable state.
- `src/game/input/`: action names and physical key bindings.
- `src/game/bridge/`: browser events between React UI, the 3D game loop, and test hooks.
- `src/render/`: React Three Fiber scene components that adapt simulation state into visuals.
- `src/ui/`: React overlays and HUD.
- `reference-repos/`: ignored local clones of the four source repositories from the original post. Use them for patterns and prompt translation, not as vendored project code.

## Mini-Game MVP Checklist
- Main menu or start state.
- One playable loop.
- Player movement or primary interaction.
- Score, timer, win/loss, or reset condition.
- Game over or run-complete state.
- Restart flow.
- Text-state renderer for automation.
- Unit tests for core rules.

## Product Expansion Checklist
- Daily streak tracking.
- Leaderboard.
- Upgrade or progression system.
- Free vs premium feature split.
- Stripe subscription integration.
- Vercel deployment.
- Launch and QA checklist.

## Codex Working Prompt
When a game idea arrives, first turn it into:
1. Concise game design brief.
2. Core loop and player verbs.
3. Scene and simulation module changes.
4. React UI surfaces.
5. Data needed for streaks, scores, upgrades, or subscriptions.
6. First 10 implementation tasks ordered as playable vertical slices.
7. QA checklist with automated and manual checks.

Then implement the first playable slice before expanding scope.

## Local Reference Repositories
See `docs/reference/local-reference-repos.md` before using the cloned reference repos.
