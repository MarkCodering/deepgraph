# DeepGraph

DeepGraph is a Next.js app that turns long-form research text into an interactive knowledge graph. You can upload a PDF or paste raw text, generate connected concepts with Gemini, and ask follow-up questions in an in-app chat.

## Features

- Generate graph nodes and links from research text.
- Parse PDF files in the browser and extract text automatically.
- Explore relationships through an interactive D3 force-directed graph.
- Ask graph-grounded questions in the built-in chat panel.
- Click nodes for short AI-generated summaries.

## Tech Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS
- D3.js (graph rendering)
- PDF.js (PDF extraction)
- Gemini API (`gemini-2.0-flash`)

## Requirements

- Node.js 18+
- npm 9+
- A Gemini API key

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## How To Use

1. Click **Get Started**.
2. Enter your Gemini API key.
3. Upload a PDF or paste report text.
4. Click **Generate** to build the graph.
5. Use the chat button to ask questions about the generated graph.
6. Click graph nodes to view short summaries.

## Project Structure

- `app/page.tsx`: Main UI shell and app sections.
- `public/app.js`: Client-side logic for graph generation, D3 rendering, PDF parsing, and chat.
- `app/globals.css`: Global styles and graph/chat styling.
- `vercel.json`: Deployment headers and policy configuration.

## Scripts

- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm start`: Run production server.
- `npm run lint`: Run lint checks.

## Security Notes

- Your API key is entered in the browser UI and sent directly to the Gemini API from the client.
- Do not use high-privilege keys in shared/public environments.
- This project currently has no backend key proxy.

## Deployment

Deploy on Vercel or any platform that supports Next.js.  
If needed, adjust headers and policy settings in `vercel.json`.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
