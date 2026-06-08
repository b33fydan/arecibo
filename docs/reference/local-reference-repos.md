# Local Reference Repositories

These repositories were cloned from the original X post as local references. They are intentionally stored under ignored `reference-repos/` so this project does not vendor unrelated source code.

| Repo | Local path | Current head | Use for |
| --- | --- | --- | --- |
| `Donchitos/Claude-Code-Game-Studios` | `reference-repos/Claude-Code-Game-Studios` | `984023d` | Translate Claude-specific agents, skills, and hooks into Codex repo guidance when useful. |
| `phaserjs/template-react-ts` | `reference-repos/phaser-template-react-ts` | `c726597` | Compare Phaser + React + TypeScript + Vite project structure and bridge patterns. |
| `nextjs/saas-starter` | `reference-repos/nextjs-saas-starter` | `6e33e58` | Later product-layer reference for auth, dashboard, Stripe, and subscription flows. |
| `HermeticOrmus/claude-code-game-development` | `reference-repos/claude-code-game-development` | `4a060fe` | Translate useful Claude game-dev prompts and examples into Codex implementation plans. |

## Usage Rules
- Read only the relevant reference files for the current task.
- Prefer this repo's architecture in `AGENTS.md` over copying reference code directly.
- Convert Claude-specific instructions into Codex-native prompts or docs before use.
- Do not integrate Next.js, Stripe, auth, or database code until the core game loop is already playable and worth productizing.
- Keep these repos ignored unless the user explicitly asks to vendor or submodule them.
