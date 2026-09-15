# CreFlux

CreFlux is a small BYOK brainstorming app that turns a rough prompt into 15 creative directions, expands them, and scores each idea for syntax, feasibility, relevance, and novelty.

## Public Release Notes

- No shared API keys or bundled provider credits are included.
- Users enter their own provider key in the browser.
- Keys are kept in app state and sent directly to the selected provider.
- The app supports OpenAI, Groq, Google Gemini, xAI Grok, OpenRouter, and custom OpenAI-compatible endpoints.
- Experimental scraping and unofficial translation test scripts are not part of the public app.

## Run Locally

```bash
npm install
npm run dev
```

The Vite dev server serves the app at `/CreFlux/` because this repository is configured for GitHub Pages under that path.

## Build

```bash
npm run build
```

The production build is written to `docs/` for GitHub Pages deployment.

To serve the production build locally:

```bash
npm start
```

## Deploy

```bash
npm run deploy
```
