# AGENTS.md

Guidance for coding agents working in this repository.

## Project Snapshot

- Stack: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS.
- Main experience: client-side knowledge graph generation from text/PDF, plus graph-grounded chat.
- Core UI shell lives in `app/page.tsx`.
- Most runtime logic lives in `public/app.js` (D3 graph, PDF parsing, Gemini API calls, chat, popups).

## Setup And Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Production build: `npm run build`
- Start production server: `npm start`

Use `npm` commands for consistency with the lockfile.

## File Map

- `app/layout.tsx`: global page wrapper and metadata.
- `app/page.tsx`: DOM structure and script loading.
- `app/globals.css`: global styles, graph styles, chat styles.
- `public/app.js`: app behavior and AI integration.
- `vercel.json`: deployment configuration.

## Implementation Rules

- Keep UI element IDs in `app/page.tsx` and selector usage in `public/app.js` synchronized.
- Preserve the current client-first architecture unless explicitly asked to introduce a backend/API route.
- Avoid introducing secrets in source code. API keys are user-provided at runtime in the UI.
- Keep changes minimal and focused; do not do unrelated refactors.
- Prefer TypeScript in `app/*`; keep browser runtime logic stable if editing `public/app.js`.

## Quality Checklist Before Finishing

1. Run `npm run lint`.
2. If behavior changed, run `npm run build`.
3. Verify key flow manually:
   - Open app
   - Generate graph from sample text
   - Open chat and ask one question
   - Click a node to confirm popup summary still works

## Notes

- External libraries are loaded via CDN scripts/imports (D3, PDF.js, Firebase web modules).
- This project currently does not include automated tests.
