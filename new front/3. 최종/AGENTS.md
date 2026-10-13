<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Instructions

- Before changing project code, read and follow the relevant rules in `docs/project-review/`. Treat those documents as the project's architecture and maintenance standards.
- For implementation tasks, use the `project-change-workflow` skill in `.github/skills/project-change-workflow/SKILL.md` to inspect, plan, edit, and verify the smallest relevant slice.
- Keep changes modular and local to the component or module that owns the behavior. Prefer Tailwind utilities; do not add component-specific rules to `src/app/globals.css`.
- Preserve explicitly stated scope. If a request is mobile/PWA-only, verify that desktop styles and behavior remain unchanged.
- Do not overwrite or revert unrelated user changes. After the first edit, run the narrowest relevant validation before doing more work.
- These instructions guide agent behavior; they do not technically block tools or guarantee compliance. Ask before adding enforcement hooks or restrictions.
