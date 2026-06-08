# Claude Post To Codex Conversion

The X post is useful as a pattern, not as an exact implementation plan.

## Keep
- React + TypeScript as the browser-game foundation.
- Choose Phaser for 2D games and React Three Fiber + Three.js for FPS or 3D games.
- Vertical-slice development.
- Daily return mechanics, streaks, leaderboards, and progression as later retention systems.
- Pure game logic tests.
- A repo instruction file that keeps the agent aligned across sessions.
- A launch checklist and QA checklist for every playable feature.

## Current Project Override
`Drumstick` is FPS-style, so this repo now uses React Three Fiber + Three.js instead of the Phaser template from the post. The Phaser reference repo remains useful for bridge patterns and Vite conventions, but it is no longer the active runtime target.

## Convert
- `CLAUDE.md` becomes `AGENTS.md`.
- "Claude Code Game Studios" becomes Codex working rules, skills, and repo-local prompts.
- Broad revenue claims become optional product hypotheses to validate after playability.
- "Build the full SaaS stack this weekend" becomes "defer auth, billing, and backend until the core loop has proof of fun."

## Defer
- Next.js SaaS starter.
- Stripe.
- Authentication.
- Database schema.
- Multiplayer.
- Subscription paywalls.

These are product-layer decisions. They should be added after the first game loop, scoring, restart flow, and retention mechanic are working.
