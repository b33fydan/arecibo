Original prompt: User brought an X post about a Claude Code browser-game stack and asked to convert the Claude-tailored guidance to GPT-5.5 Codex, create AGENTS.md focused on web mini games if useful, and scaffold before the game idea arrives.

## Notes
- Converted the useful post guidance into Codex-native repo instructions in `AGENTS.md`.
- Updated baseline for Drumstick FPS: Vite + React + TypeScript + React Three Fiber + Three.js.
- Product-layer items from the post, including Next.js, Stripe, auth, subscriptions, streaks, and leaderboards, are intentionally deferred until the core game concept is playable.
- Verification produced visible screenshots and JSON state under `output/web-game`; `output/` is ignored.
- The four repositories from the post were shallow-cloned into ignored `reference-repos/` and indexed in `docs/reference/local-reference-repos.md`.
- Drumstick direction: FPS-style timing mini-game with a balloon dummy target for the first slice. Keep the tone slapstick and non-graphic while leaving room for unlockable drumstick upgrades and later destructible scenery.
- Implemented the first FPS slice with a timing meter, foreground drumstick, balloon dummy launch, replay camera, low-poly field, trees, and breakable placeholders.
- Desktop and mobile responsive screenshots were checked under `output/drumstick-responsive`; no viewport overflow, no Restart/meter overlap, WebGL pixels were non-transparent, and no console errors were captured.
- Added the first feel pass: faster timing meter, maximum-hit threshold, stronger top-end launch, breakable scoring, visible debris, impact rings/confetti, echo-style Web Audio cues, and speech-synthesis announcer callouts.
- Verified maximum-hit path in `output/drumstick-maximum`: meter 97+, `MAXIMUM DRUMSTRIKE`, replay launch, one broken crate, 13k+ score, and no console errors.

## TODO
- Tune camera beats further so very long launches feel more dynamic instead of drifting into a distant follow shot.
- Keep `window.render_game_to_text()` and `window.advanceTime(ms)` working during gameplay changes.
- Consider Rapier physics after the simple ballistic replay proves fun.
