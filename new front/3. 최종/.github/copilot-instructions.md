# Copilot Instructions

These instructions apply to all work Copilot performs in this repository.

## Required project guidance

- Read and follow the repository's `AGENTS.md` before making changes. Preserve its generated Next.js instructions block.
- Before changing code, read the relevant documents in `docs/project-review/`; treat them as the architecture and maintenance source of truth.
- For implementation work, follow `.github/skills/project-change-workflow/SKILL.md`.
- The rules in `.continue/rules/` are for Continue. These Copilot instructions and `AGENTS.md` are the Copilot entry points; do not assume Continue rules are automatically loaded.

## Architecture and scope

- Keep route files thin; keep UI, data access, and business logic in the modules that own those responsibilities.
- Make small, local, modular changes. Inspect shared-component call sites before changing shared behavior.
- Use Tailwind utilities by default. Keep `src/app/globals.css` for genuinely global styles, not component-specific rules.
- Preserve the requested scope and unrelated user changes. For mobile/PWA-only work, do not unintentionally change desktop behavior.
- Do not add enforcement hooks or restrictions unless the user approves them.

## Change and verification procedure

- Before editing, identify the behavior's owning file/module, the likely cause or expected behavior, and a nearby check that could disconfirm the hypothesis.
- Make the smallest meaningful change, then run the narrowest relevant test, lint, typecheck, or behavior check. Add broader checks such as the full lint or build when the change's scope or risk warrants them.
- Follow any more specific validation requirement the user gives. Report checks that were not run or could not be run; do not claim browser/visual verification unless it was actually performed.
- For Next.js changes, inspect the relevant documentation shipped with the installed version under `node_modules/next/dist/docs/` before relying on framework APIs or conventions.

## Statistics data work

- Do not treat a requested row limit as proof that all matching records were returned. Verify completeness with pagination, an exact count, or a suitable database-side aggregate.
- Do not present partial results as complete. Surface query, pagination, and truncation failures using the existing API error conventions.
- Avoid converting missing or invalid values into valid domain values when that could bias statistics. Preserve unknown values or reject them according to the data contract.
- Keep each statistic's time range, filters, identity matching, null handling, and denominator explicit and consistent across affected screens.
- Avoid transferring an unbounded match history to the browser solely for aggregation when a complete bounded query or server/database-side aggregate can provide the required result.
- When match data flow or aggregation rules change, update `docs/statistics/02-data-flow.md` and add focused coverage for completeness boundaries, invalid or missing fields, and aggregation semantics as relevant.
