# DeepGraph

DeepGraph is a Next.js (TypeScript) web experience for turning research reports into interactive knowledge graphs. Upload a PDF or paste text, generate a graph, and chat with an AI about the relationships it uncovers.

## Project Structure

- `app/`: Next.js App Router entry points and global styling.
- `public/`: Static assets, including the client-side graph/AI logic in `app.js`.
- `vercel.json`: Security headers for deployments.

## Prerequisites

- Node.js 18 or later
- npm 9 or later

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Available Scripts

- `npm run dev` – Start the Next.js dev server.
- `npm run build` – Create an optimized production build.
- `npm start` – Run the production server (after `npm run build`).
- `npm run lint` – Lint the project with Next.js defaults.

## Deployment

The app is ready to deploy to Vercel. Security headers are defined in `vercel.json`; adjust them if you need project-specific policies.
