---
name: project-change-workflow
description: 'Use whenever implementing or modifying this repository, especially UI fixes, responsive behavior, refactors, and bug fixes. Follow the project review rules and keep changes scoped, modular, and verified.'
argument-hint: 'Describe the behavior to change and any device or file scope'
---

# Project Change Workflow

Use this workflow for code changes in this repository. The governing architecture rules are in `docs/project-review/`; read the relevant sections before editing.

## Procedure

1. Identify the concrete file, symbol, failing behavior, test, or nearby implementation that owns the behavior. Read only enough neighboring code and project guidance to understand the local boundary.
2. Before editing, state a falsifiable hypothesis about the cause or expected behavior and one cheap check that could disconfirm it. If the task has multiple meaningful steps, give the user a short plan.
3. Preserve the user's requested scope. For mobile/PWA-only changes, keep desktop behavior unchanged; inspect responsive breakpoints and shared component call sites before changing shared styles or components.
4. Make the smallest modular change at the owning component or module. Prefer existing Tailwind patterns. Do not add component-specific styles to `globals.css`; use a component-local utility/class or an appropriate module instead.
5. Immediately after the first substantive edit, run the narrowest relevant test, lint, typecheck, or other behavior-scoped check. Do not broaden the work before this check unless blocked.
6. If validation fails, fix the same slice and rerun that check. Then run other required project checks only when the change's risk or repository guidance calls for them.
7. Report what changed, what was verified, and any verification that could not be run. Never claim visual behavior is verified without checking it in a browser or screenshot.

## Guardrails

- Do not reformat unrelated code, modify unrelated files, or overwrite user changes.
- Treat shared components as shared: verify whether a change affects dashboards, profiles, charts, and desktop layouts before editing them.
- `AGENTS.md` contains Next.js-generated instructions. Preserve its generated block.
- This skill and repository instructions are guidance, not deterministic enforcement. Do not create hooks or restrictions without the user's approval.