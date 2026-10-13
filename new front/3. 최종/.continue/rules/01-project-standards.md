---
name: Project Standards
description: Project-wide architecture, scope, and verification rules for ttt2_web_v2.
alwaysApply: true
---

# Project Standards

Before changing code, read the relevant documents in `docs/project-review/`. Treat them as the source of truth for architecture and maintenance; do not replace them with assumptions or duplicate their full contents here.

## Scope and Structure

- Identify the component or module that directly owns the behavior before editing. Keep the change small and local; preserve the project's modular boundaries.
- Respect the user's stated scope. For mobile/PWA-only work, preserve desktop behavior and verify the desktop breakpoint remains unchanged.
- Treat shared components as shared: inspect relevant call sites before changing their behavior.
- Prefer Tailwind utilities and component-local styling. Do not add component-specific styles to `src/app/globals.css`; only change it when a genuinely global concern requires it.
- Preserve unrelated user changes. Do not revert or overwrite work outside the requested change.

## Work and Verification

- Before editing, identify the local cause or expected behavior and a nearby check that could disconfirm it. For multi-step work, give the user a concise plan first.
- Make the smallest meaningful edit, then immediately run the narrowest relevant test, lint, typecheck, or behavior check before expanding scope.
- If a check fails, fix the same slice and rerun that check. Report checks that could not be run; do not claim visual verification without checking the UI in a browser or screenshot.

These rules guide model behavior; they do not technically prevent an edit or guarantee compliance.